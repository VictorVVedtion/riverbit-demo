// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SignedMath.sol";

/**
 * @title AFBSystem
 * @notice Accrued Funding Balance system for perpetual contracts
 * @dev Manages funding payments, interest accrual, and balance settlements
 * 
 * Key Features:
 * - Continuous funding rate calculation based on market conditions
 * - Individual position funding tracking with compounding
 * - Automated settlement and rebalancing mechanisms
 * - Interest on positive AFB balances
 * - Liquidation integration for negative balances
 * - Cross-margin and isolated margin support
 */
contract AFBSystem is 
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using SafeERC20 for IERC20;
    using Math for uint256;
    using SignedMath for int256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant FUNDING_ORACLE_ROLE = keccak256("FUNDING_ORACLE_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant FUNDING_UPDATE_INTERVAL = 1 hours;
    uint256 private constant MAX_FUNDING_RATE = 500; // 5% per day max
    uint256 private constant INTEREST_RATE = 300; // 3% APY on positive balances

    // ============ ENUMS ============

    enum MarginMode {
        CROSS,
        ISOLATED
    }

    enum SettlementStatus {
        PENDING,
        PARTIAL,
        COMPLETED,
        FAILED
    }

    // ============ STRUCTS ============

    // Individual position AFB tracking
    struct PositionAFB {
        int256 accruedBalance;          // Current accrued funding balance
        int256 lastFundingPayment;      // Last funding payment amount
        uint256 lastUpdateTime;         // Last update timestamp
        uint256 lastSettlementTime;    // Last settlement timestamp
        uint256 cumulativeFunding;      // Cumulative funding index
        uint256 interestAccrued;        // Interest accrued on positive balance
        MarginMode marginMode;          // Cross or isolated margin
        bool autoSettlementEnabled;    // Auto-settlement preference
    }

    // User AFB state aggregation
    struct UserAFBState {
        int256 totalAFB;               // Total AFB across all positions
        int256 crossMarginAFB;         // Cross-margin AFB balance
        uint256 totalInterestEarned;   // Total interest earned
        uint256 totalFundingPaid;      // Total funding payments made
        uint256 totalFundingReceived;  // Total funding payments received
        uint256 lastGlobalUpdate;      // Last global update timestamp
        uint256 settlementDeadline;    // Next mandatory settlement deadline
        bool autoSettlementEnabled;   // Global auto-settlement preference
    }

    // Market funding state
    struct MarketFundingState {
        int256 currentFundingRate;     // Current funding rate (per hour)
        int256 averageFundingRate;     // 24h average funding rate
        uint256 longOpenInterest;      // Total long open interest
        uint256 shortOpenInterest;     // Total short open interest
        uint256 lastRateUpdate;        // Last funding rate update
        uint256 cumulativeLongFunding; // Cumulative long funding index
        uint256 cumulativeShortFunding; // Cumulative short funding index
        int256 fundingPool;            // Available funding pool
        bool fundingActive;            // Whether funding is active
    }

    // Funding payment record
    struct FundingPayment {
        bytes32 paymentId;
        address user;
        bytes32 positionKey;
        bytes32 market;
        int256 amount;                 // Positive = received, negative = paid
        uint256 timestamp;
        uint256 fundingRate;
        SettlementStatus status;
        string reason;
    }

    // Settlement batch
    struct SettlementBatch {
        bytes32 batchId;
        bytes32[] positionKeys;
        int256[] settlementAmounts;
        uint256 timestamp;
        uint256 processedCount;
        SettlementStatus status;
        address executor;
    }

    // AFB interest calculation
    struct InterestCalculation {
        uint256 principalAmount;      // Principal amount for interest
        uint256 interestRate;         // Annual interest rate
        uint256 startTime;            // Interest accrual start time
        uint256 endTime;              // Interest accrual end time
        uint256 compoundingFrequency; // Compounding frequency
        uint256 accruedInterest;      // Calculated accrued interest
    }

    // ============ STATE VARIABLES ============

    IERC20 public baseAsset;
    address public coreContract;
    address public liquidationEngine;

    // AFB tracking
    mapping(bytes32 => PositionAFB) public positionAFBs; // positionKey => AFB state
    mapping(address => UserAFBState) public userAFBStates;
    mapping(bytes32 => MarketFundingState) public marketFundingStates; // market => funding state
    
    // Funding payments
    mapping(bytes32 => FundingPayment) public fundingPayments;
    mapping(address => bytes32[]) public userPaymentHistory;
    mapping(bytes32 => bytes32[]) public marketPaymentHistory;
    bytes32[] public allPayments;
    
    // Settlement batches
    mapping(bytes32 => SettlementBatch) public settlementBatches;
    bytes32[] public allBatches;
    uint256 public totalBatches;
    
    // Interest tracking
    mapping(address => InterestCalculation) public userInterestCalculations;
    mapping(bytes32 => uint256) public positionInterestRates;
    uint256 public totalInterestPaid;
    uint256 public totalInterestPool;
    
    // Global settings
    uint256 public globalFundingMultiplier;     // Global funding rate multiplier
    uint256 public mandatorySettlementPeriod;   // Mandatory settlement period
    uint256 public minSettlementAmount;         // Minimum amount for settlement
    uint256 public maxNegativeAFB;              // Maximum negative AFB before liquidation
    bool public autoSettlementEnabled;         // Global auto-settlement enabled
    bool public interestAccrualEnabled;        // Interest accrual enabled
    
    // Emergency controls
    bool public fundingPaused;
    bool public settlementPaused;
    mapping(bytes32 => bool) public marketFundingPaused;
    
    // Statistics and monitoring
    uint256 public totalFundingVolume;
    uint256 public totalSettlements;
    uint256 public totalPositionsTracked;
    mapping(bytes32 => uint256) public marketFundingVolume;

    // ============ EVENTS ============

    event PositionAFBUpdated(
        bytes32 indexed positionKey,
        address indexed user,
        int256 oldBalance,
        int256 newBalance,
        int256 fundingPayment,
        uint256 timestamp
    );

    event FundingRateUpdated(
        bytes32 indexed market,
        int256 oldRate,
        int256 newRate,
        uint256 longOI,
        uint256 shortOI,
        uint256 timestamp
    );

    event FundingPaymentProcessed(
        bytes32 indexed paymentId,
        address indexed user,
        bytes32 indexed positionKey,
        int256 amount,
        uint256 timestamp
    );

    event AFBSettlementExecuted(
        bytes32 indexed batchId,
        uint256 positionsSettled,
        int256 totalAmount,
        address executor,
        uint256 timestamp
    );

    event InterestAccrued(
        address indexed user,
        bytes32 indexed positionKey,
        uint256 interestAmount,
        uint256 principalAmount,
        uint256 timestamp
    );

    event AutoSettlementTriggered(
        address indexed user,
        bytes32 indexed positionKey,
        int256 settlementAmount,
        string reason
    );

    event FundingPoolRebalanced(
        bytes32 indexed market,
        int256 oldPool,
        int256 newPool,
        int256 adjustment,
        uint256 timestamp
    );

    // ============ MODIFIERS ============

    modifier onlyCore() {
        require(msg.sender == coreContract, "Only core contract");
        _;
    }

    modifier whenFundingActive() {
        require(!fundingPaused, "Funding paused");
        _;
    }

    modifier whenSettlementActive() {
        require(!settlementPaused, "Settlement paused");
        _;
    }

    modifier marketFundingActive(bytes32 market) {
        require(!marketFundingPaused[market], "Market funding paused");
        _;
    }

    // ============ INITIALIZATION ============

    /**
     * @notice Initialize the AFB system
     * @param _baseAsset Base asset token (USDC)
     * @param _coreContract Core contract address
     * @param _admin Admin address
     */
    function initialize(
        address _baseAsset,
        address _coreContract,
        address _admin
    ) external initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();

        require(_baseAsset != address(0), "Invalid base asset");
        require(_coreContract != address(0), "Invalid core contract");
        require(_admin != address(0), "Invalid admin");

        baseAsset = IERC20(_baseAsset);
        coreContract = _coreContract;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(FUNDING_ORACLE_ROLE, _admin);

        // Initialize global settings
        globalFundingMultiplier = BASIS_POINTS; // 1x multiplier
        mandatorySettlementPeriod = 7 days;
        minSettlementAmount = 1 * PRECISION; // $1 minimum
        maxNegativeAFB = 1000 * PRECISION; // $1000 max negative
        autoSettlementEnabled = true;
        interestAccrualEnabled = true;
    }

    // ============ POSITION AFB MANAGEMENT ============

    /**
     * @notice Initialize AFB tracking for a new position
     * @param positionKey Position identifier
     * @param user Position owner
     * @param market Market identifier
     * @param marginMode Margin mode (cross/isolated)
     */
    function initializePositionAFB(
        bytes32 positionKey,
        address user,
        bytes32 market,
        MarginMode marginMode
    ) external onlyCore {
        require(positionAFBs[positionKey].lastUpdateTime == 0, "Position already initialized");

        MarketFundingState storage marketState = marketFundingStates[market];
        
        positionAFBs[positionKey] = PositionAFB({
            accruedBalance: 0,
            lastFundingPayment: 0,
            lastUpdateTime: block.timestamp,
            lastSettlementTime: block.timestamp,
            cumulativeFunding: marginMode == MarginMode.CROSS ? 
                marketState.cumulativeLongFunding : marketState.cumulativeShortFunding,
            interestAccrued: 0,
            marginMode: marginMode,
            autoSettlementEnabled: autoSettlementEnabled
        });

        // Initialize user state if needed
        if (userAFBStates[user].lastGlobalUpdate == 0) {
            userAFBStates[user] = UserAFBState({
                totalAFB: 0,
                crossMarginAFB: 0,
                totalInterestEarned: 0,
                totalFundingPaid: 0,
                totalFundingReceived: 0,
                lastGlobalUpdate: block.timestamp,
                settlementDeadline: block.timestamp + mandatorySettlementPeriod,
                autoSettlementEnabled: autoSettlementEnabled
            });
        }

        totalPositionsTracked++;
    }

    /**
     * @notice Update AFB for a position based on current funding rates
     * @param positionKey Position identifier
     * @param user Position owner
     * @param market Market identifier
     * @param isLong Whether position is long
     * @param positionSize Position size in USD
     * @return fundingPayment Calculated funding payment
     */
    function updatePositionAFB(
        bytes32 positionKey,
        address user,
        bytes32 market,
        bool isLong,
        uint256 positionSize
    ) external onlyCore whenFundingActive returns (int256 fundingPayment) {
        PositionAFB storage positionAFB = positionAFBs[positionKey];
        MarketFundingState storage marketState = marketFundingStates[market];
        
        require(positionAFB.lastUpdateTime > 0, "Position not initialized");

        // Calculate time elapsed since last update
        uint256 timeElapsed = block.timestamp - positionAFB.lastUpdateTime;
        
        if (timeElapsed == 0) return 0; // No time elapsed

        // Calculate funding payment
        fundingPayment = _calculateFundingPayment(
            market,
            isLong,
            positionSize,
            timeElapsed
        );

        // Update position AFB
        int256 oldBalance = positionAFB.accruedBalance;
        positionAFB.accruedBalance += fundingPayment;
        positionAFB.lastFundingPayment = fundingPayment;
        positionAFB.lastUpdateTime = block.timestamp;

        // Update cumulative funding index
        if (isLong) {
            positionAFB.cumulativeFunding = marketState.cumulativeLongFunding;
        } else {
            positionAFB.cumulativeFunding = marketState.cumulativeShortFunding;
        }

        // Calculate and accrue interest on positive balance
        if (interestAccrualEnabled && positionAFB.accruedBalance > 0) {
            uint256 interest = _calculateInterest(
                uint256(positionAFB.accruedBalance),
                INTEREST_RATE,
                timeElapsed
            );
            positionAFB.interestAccrued += interest;
            positionAFB.accruedBalance += int256(interest);
        }

        // Update user AFB state
        _updateUserAFBState(user, fundingPayment);

        // Check for auto-settlement conditions
        if (positionAFB.autoSettlementEnabled) {
            _checkAutoSettlement(positionKey, user, market);
        }

        // Record funding payment
        _recordFundingPayment(positionKey, user, market, fundingPayment);

        emit PositionAFBUpdated(
            positionKey,
            user,
            oldBalance,
            positionAFB.accruedBalance,
            fundingPayment,
            block.timestamp
        );

        return fundingPayment;
    }

    // ============ FUNDING RATE CALCULATION ============

    /**
     * @notice Update funding rate for a market based on open interest imbalance
     * @param market Market identifier
     * @param longOI Long open interest
     * @param shortOI Short open interest
     * @param priceImpact Current price impact indicator
     */
    function updateFundingRate(
        bytes32 market,
        uint256 longOI,
        uint256 shortOI,
        int256 priceImpact
    ) external onlyRole(FUNDING_ORACLE_ROLE) marketFundingActive(market) {
        MarketFundingState storage state = marketFundingStates[market];
        
        // Skip if too soon since last update
        if (block.timestamp < state.lastRateUpdate + FUNDING_UPDATE_INTERVAL) {
            return;
        }

        int256 oldRate = state.currentFundingRate;
        
        // Calculate new funding rate based on OI imbalance
        int256 newRate = _calculateFundingRate(longOI, shortOI, priceImpact);
        
        // Apply global multiplier
        newRate = (newRate * int256(globalFundingMultiplier)) / int256(BASIS_POINTS);
        
        // Cap funding rate
        if (newRate > int256(MAX_FUNDING_RATE)) {
            newRate = int256(MAX_FUNDING_RATE);
        } else if (newRate < -int256(MAX_FUNDING_RATE)) {
            newRate = -int256(MAX_FUNDING_RATE);
        }

        // Update state
        state.currentFundingRate = newRate;
        state.longOpenInterest = longOI;
        state.shortOpenInterest = shortOI;
        state.lastRateUpdate = block.timestamp;

        // Update cumulative funding indices
        uint256 timeElapsed = block.timestamp - state.lastRateUpdate;
        if (timeElapsed > 0) {
            uint256 fundingIncrement = (uint256(newRate.abs()) * timeElapsed) / 3600; // Per hour rate
            
            if (newRate > 0) {
                // Longs pay shorts
                state.cumulativeLongFunding += fundingIncrement;
            } else {
                // Shorts pay longs
                state.cumulativeShortFunding += fundingIncrement;
            }
        }

        // Update 24h average (simplified)
        state.averageFundingRate = (state.averageFundingRate * 23 + newRate) / 24;

        emit FundingRateUpdated(market, oldRate, newRate, longOI, shortOI, block.timestamp);
    }

    /**
     * @notice Calculate funding rate based on market conditions
     * @param longOI Long open interest
     * @param shortOI Short open interest
     * @param priceImpact Price impact indicator
     * @return fundingRate Calculated funding rate (basis points per hour)
     */
    function _calculateFundingRate(
        uint256 longOI,
        uint256 shortOI,
        int256 priceImpact
    ) internal pure returns (int256 fundingRate) {
        if (longOI + shortOI == 0) return 0;

        // Calculate OI imbalance ratio
        int256 imbalance = int256(longOI) - int256(shortOI);
        uint256 totalOI = longOI + shortOI;
        int256 imbalanceRatio = (imbalance * int256(BASIS_POINTS)) / int256(totalOI);

        // Base funding rate from imbalance (max 2% per day = ~0.083% per hour)
        fundingRate = (imbalanceRatio * 83) / int256(BASIS_POINTS); // 0.083% per basis point

        // Adjust for price impact
        fundingRate += priceImpact / 100; // Scale price impact

        return fundingRate;
    }

    /**
     * @notice Calculate funding payment for a position
     * @param market Market identifier
     * @param isLong Whether position is long
     * @param positionSize Position size in USD
     * @param timeElapsed Time elapsed since last update
     * @return payment Funding payment amount
     */
    function _calculateFundingPayment(
        bytes32 market,
        bool isLong,
        uint256 positionSize,
        uint256 timeElapsed
    ) internal view returns (int256 payment) {
        MarketFundingState storage state = marketFundingStates[market];
        
        int256 rate = state.currentFundingRate;
        if (rate == 0) return 0;

        // Calculate hourly funding payment
        int256 hourlyPayment = (int256(positionSize) * rate) / int256(BASIS_POINTS);
        
        // Scale by time elapsed
        payment = (hourlyPayment * int256(timeElapsed)) / int256(3600); // Convert to hourly rate

        // Determine payment direction
        if (rate > 0) {
            // Positive rate: longs pay shorts
            payment = isLong ? -payment : payment;
        } else {
            // Negative rate: shorts pay longs
            payment = isLong ? -payment : payment;
        }

        return payment;
    }

    // ============ INTEREST CALCULATION ============

    /**
     * @notice Calculate interest on positive AFB balance
     * @param principal Principal amount
     * @param annualRate Annual interest rate (basis points)
     * @param timeElapsed Time elapsed in seconds
     * @return interest Calculated interest amount
     */
    function _calculateInterest(
        uint256 principal,
        uint256 annualRate,
        uint256 timeElapsed
    ) internal pure returns (uint256 interest) {
        if (principal == 0 || annualRate == 0 || timeElapsed == 0) {
            return 0;
        }

        // Simple interest calculation
        // Interest = Principal * Rate * Time / Year
        interest = (principal * annualRate * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);

        return interest;
    }

    // ============ SETTLEMENT SYSTEM ============

    /**
     * @notice Execute settlement for a batch of positions
     * @param positionKeys Array of position keys to settle
     * @return batchId Settlement batch identifier
     */
    function executeSettlementBatch(bytes32[] calldata positionKeys)
        external
        onlyRole(OPERATOR_ROLE)
        nonReentrant
        whenSettlementActive
        returns (bytes32 batchId)
    {
        require(positionKeys.length > 0, "No positions provided");
        require(positionKeys.length <= 100, "Batch too large");

        batchId = keccak256(abi.encodePacked(
            positionKeys,
            block.timestamp,
            totalBatches
        ));

        int256[] memory settlementAmounts = new int256[](positionKeys.length);
        uint256 processedCount = 0;
        int256 totalSettlementAmount = 0;

        // Process each position
        for (uint256 i = 0; i < positionKeys.length; i++) {
            bytes32 positionKey = positionKeys[i];
            PositionAFB storage positionAFB = positionAFBs[positionKey];

            if (positionAFB.lastUpdateTime == 0) continue; // Skip uninitialized positions

            int256 settlementAmount = positionAFB.accruedBalance;
            
            if (settlementAmount.abs() >= minSettlementAmount) {
                // Execute settlement
                positionAFB.accruedBalance = 0;
                positionAFB.lastSettlementTime = block.timestamp;
                
                settlementAmounts[i] = settlementAmount;
                totalSettlementAmount += settlementAmount;
                processedCount++;
            }
        }

        // Create settlement batch record
        settlementBatches[batchId] = SettlementBatch({
            batchId: batchId,
            positionKeys: positionKeys,
            settlementAmounts: settlementAmounts,
            timestamp: block.timestamp,
            processedCount: processedCount,
            status: processedCount > 0 ? SettlementStatus.COMPLETED : SettlementStatus.FAILED,
            executor: msg.sender
        });

        allBatches.push(batchId);
        totalBatches++;
        totalSettlements += processedCount;

        emit AFBSettlementExecuted(
            batchId,
            processedCount,
            totalSettlementAmount,
            msg.sender,
            block.timestamp
        );

        return batchId;
    }

    /**
     * @notice Check and trigger auto-settlement for a position
     * @param positionKey Position identifier
     * @param user Position owner
     * @param market Market identifier
     */
    function _checkAutoSettlement(
        bytes32 positionKey,
        address user,
        bytes32 market
    ) internal {
        PositionAFB storage positionAFB = positionAFBs[positionKey];
        UserAFBState storage userState = userAFBStates[user];

        bool shouldSettle = false;
        string memory reason;

        // Check settlement conditions
        if (positionAFB.accruedBalance.abs() >= minSettlementAmount * 10) {
            shouldSettle = true;
            reason = "Large balance threshold";
        } else if (block.timestamp >= userState.settlementDeadline) {
            shouldSettle = true;
            reason = "Mandatory settlement deadline";
        } else if (positionAFB.accruedBalance < 0 && 
                   uint256(-positionAFB.accruedBalance) >= maxNegativeAFB) {
            shouldSettle = true;
            reason = "Negative balance limit";
        }

        if (shouldSettle) {
            int256 settlementAmount = positionAFB.accruedBalance;
            positionAFB.accruedBalance = 0;
            positionAFB.lastSettlementTime = block.timestamp;

            // Update user settlement deadline
            userState.settlementDeadline = block.timestamp + mandatorySettlementPeriod;

            emit AutoSettlementTriggered(user, positionKey, settlementAmount, reason);
        }
    }

    // ============ USER STATE MANAGEMENT ============

    /**
     * @notice Update user AFB state after position update
     * @param user User address
     * @param fundingChange Funding change amount
     */
    function _updateUserAFBState(address user, int256 fundingChange) internal {
        UserAFBState storage userState = userAFBStates[user];
        
        userState.totalAFB += fundingChange;
        userState.lastGlobalUpdate = block.timestamp;

        // Track funding payments vs receipts
        if (fundingChange > 0) {
            userState.totalFundingReceived += uint256(fundingChange);
        } else if (fundingChange < 0) {
            userState.totalFundingPaid += uint256(-fundingChange);
        }
    }

    /**
     * @notice Record funding payment for tracking
     * @param positionKey Position identifier
     * @param user User address
     * @param market Market identifier
     * @param amount Payment amount
     */
    function _recordFundingPayment(
        bytes32 positionKey,
        address user,
        bytes32 market,
        int256 amount
    ) internal {
        bytes32 paymentId = keccak256(abi.encodePacked(
            positionKey,
            user,
            amount,
            block.timestamp,
            allPayments.length
        ));

        MarketFundingState storage marketState = marketFundingStates[market];

        fundingPayments[paymentId] = FundingPayment({
            paymentId: paymentId,
            user: user,
            positionKey: positionKey,
            market: market,
            amount: amount,
            timestamp: block.timestamp,
            fundingRate: uint256(marketState.currentFundingRate.abs()),
            status: SettlementStatus.COMPLETED,
            reason: "Regular funding update"
        });

        allPayments.push(paymentId);
        userPaymentHistory[user].push(paymentId);
        marketPaymentHistory[market].push(paymentId);

        // Update statistics
        totalFundingVolume += amount.abs();
        marketFundingVolume[market] += amount.abs();

        emit FundingPaymentProcessed(paymentId, user, positionKey, amount, block.timestamp);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Initialize market funding state
     * @param market Market identifier
     */
    function initializeMarketFunding(bytes32 market) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(!marketFundingStates[market].fundingActive, "Market already initialized");

        marketFundingStates[market] = MarketFundingState({
            currentFundingRate: 0,
            averageFundingRate: 0,
            longOpenInterest: 0,
            shortOpenInterest: 0,
            lastRateUpdate: block.timestamp,
            cumulativeLongFunding: 0,
            cumulativeShortFunding: 0,
            fundingPool: 0,
            fundingActive: true
        });
    }

    /**
     * @notice Update global AFB settings
     * @param _fundingMultiplier Global funding multiplier
     * @param _settlementPeriod Mandatory settlement period
     * @param _minSettlementAmount Minimum settlement amount
     */
    function updateGlobalSettings(
        uint256 _fundingMultiplier,
        uint256 _settlementPeriod,
        uint256 _minSettlementAmount
    ) external onlyRole(ADMIN_ROLE) {
        require(_fundingMultiplier <= 20000, "Multiplier too high"); // Max 2x
        require(_settlementPeriod >= 1 days, "Period too short");
        require(_minSettlementAmount > 0, "Invalid min amount");

        globalFundingMultiplier = _fundingMultiplier;
        mandatorySettlementPeriod = _settlementPeriod;
        minSettlementAmount = _minSettlementAmount;
    }

    /**
     * @notice Pause/unpause funding for all markets
     * @param paused Whether to pause funding
     */
    function setFundingPaused(bool paused) external onlyRole(ADMIN_ROLE) {
        fundingPaused = paused;
    }

    /**
     * @notice Pause/unpause funding for specific market
     * @param market Market identifier
     * @param paused Whether to pause funding
     */
    function setMarketFundingPaused(bytes32 market, bool paused) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        marketFundingPaused[market] = paused;
    }

    /**
     * @notice Set liquidation engine address
     * @param _liquidationEngine Liquidation engine address
     */
    function setLiquidationEngine(address _liquidationEngine) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        liquidationEngine = _liquidationEngine;
    }

    /**
     * @notice Rebalance funding pool for a market
     * @param market Market identifier
     * @param adjustment Pool adjustment amount
     */
    function rebalanceFundingPool(bytes32 market, int256 adjustment) 
        external 
        onlyRole(OPERATOR_ROLE) 
    {
        MarketFundingState storage state = marketFundingStates[market];
        int256 oldPool = state.fundingPool;
        state.fundingPool += adjustment;

        emit FundingPoolRebalanced(market, oldPool, state.fundingPool, adjustment, block.timestamp);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get position AFB state
     * @param positionKey Position identifier
     * @return afb Position AFB state
     */
    function getPositionAFB(bytes32 positionKey) 
        external 
        view 
        returns (PositionAFB memory afb) 
    {
        return positionAFBs[positionKey];
    }

    /**
     * @notice Get user AFB state
     * @param user User address
     * @return state User AFB state
     */
    function getUserAFBState(address user) 
        external 
        view 
        returns (UserAFBState memory state) 
    {
        return userAFBStates[user];
    }

    /**
     * @notice Get market funding state
     * @param market Market identifier
     * @return state Market funding state
     */
    function getMarketFundingState(bytes32 market) 
        external 
        view 
        returns (MarketFundingState memory state) 
    {
        return marketFundingStates[market];
    }

    /**
     * @notice Get funding payment details
     * @param paymentId Payment identifier
     * @return payment Funding payment details
     */
    function getFundingPayment(bytes32 paymentId) 
        external 
        view 
        returns (FundingPayment memory payment) 
    {
        return fundingPayments[paymentId];
    }

    /**
     * @notice Get settlement batch details
     * @param batchId Batch identifier
     * @return batch Settlement batch details
     */
    function getSettlementBatch(bytes32 batchId) 
        external 
        view 
        returns (SettlementBatch memory batch) 
    {
        return settlementBatches[batchId];
    }

    /**
     * @notice Get user payment history
     * @param user User address
     * @return paymentIds Array of payment IDs
     */
    function getUserPaymentHistory(address user) 
        external 
        view 
        returns (bytes32[] memory paymentIds) 
    {
        return userPaymentHistory[user];
    }

    /**
     * @notice Calculate projected AFB for a position
     * @param positionKey Position identifier
     * @param market Market identifier
     * @param isLong Whether position is long
     * @param positionSize Position size
     * @param projectionTime Future timestamp for projection
     * @return projectedAFB Projected AFB balance
     */
    function calculateProjectedAFB(
        bytes32 positionKey,
        bytes32 market,
        bool isLong,
        uint256 positionSize,
        uint256 projectionTime
    ) external view returns (int256 projectedAFB) {
        PositionAFB storage positionAFB = positionAFBs[positionKey];
        
        if (projectionTime <= positionAFB.lastUpdateTime) {
            return positionAFB.accruedBalance;
        }

        uint256 timeElapsed = projectionTime - positionAFB.lastUpdateTime;
        int256 projectedFunding = _calculateFundingPayment(market, isLong, positionSize, timeElapsed);
        
        projectedAFB = positionAFB.accruedBalance + projectedFunding;

        // Add projected interest if balance is positive
        if (projectedAFB > 0 && interestAccrualEnabled) {
            uint256 projectedInterest = _calculateInterest(
                uint256(projectedAFB),
                INTEREST_RATE,
                timeElapsed
            );
            projectedAFB += int256(projectedInterest);
        }

        return projectedAFB;
    }

    /**
     * @notice Get global AFB statistics
     * @return totalFunding Total funding volume
     * @return totalSettled Total settlements executed
     * @return totalPositions Total positions tracked
     * @return interestPaid Total interest paid
     */
    function getGlobalStats() 
        external 
        view 
        returns (uint256 totalFunding, uint256 totalSettled, uint256 totalPositions, uint256 interestPaid) 
    {
        totalFunding = totalFundingVolume;
        totalSettled = totalSettlements;
        totalPositions = totalPositionsTracked;
        interestPaid = totalInterestPaid;
    }
}