// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IRiverBitCoreV3.sol";

/**
 * @title FourBucketLPManager
 * @notice Advanced four-bucket liquidity provider architecture with automated rebalancing
 * @dev Implements sophisticated LP management with risk controls and performance optimization
 * 
 * Four-Bucket Architecture:
 * - A桶 (Passive Maker): 45% allocation, near-term three-price passive market making
 * - B桶 (Active Rebalancer): 20% allocation, small-amount active recentering
 * - L1桶 (Primary Liquidator): 25% allocation, liquidation handling and tail depth
 * - L2桶 (Backstop): 10% allocation, extreme liquidation and tail coverage
 * 
 * Key Features:
 * - Automated rebalancing every 4 hours with ±10% weight tolerance
 * - Loss protection mechanism with insurance coverage
 * - Performance-based allocation adjustments
 * - Risk-managed inventory control
 * - JIT (Just-In-Time) auction integration
 */
contract FourBucketLPManager is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant PERFORMANCE_MANAGER_ROLE = keccak256("PERFORMANCE_MANAGER_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant REBALANCE_INTERVAL = 4 hours;
    uint256 private constant WEIGHT_TOLERANCE = 1000; // 10% tolerance
    uint256 private constant MAX_DRAWDOWN_THRESHOLD = 2000; // 20% max drawdown
    uint256 private constant PERFORMANCE_WINDOW = 7 days;

    // ============ ENUMS ============
    enum BucketType {
        A_BUCKET,   // Passive Maker (45%)
        B_BUCKET,   // Active Rebalancer (20%)
        L1_BUCKET,  // Primary Liquidator (25%)
        L2_BUCKET   // Backstop (10%)
    }

    enum BucketStatus {
        ACTIVE,
        MAINTENANCE,
        EMERGENCY_STOP,
        LIQUIDATION_ONLY
    }

    enum RebalanceType {
        SCHEDULED,      // Regular scheduled rebalancing
        EMERGENCY,      // Emergency rebalancing
        PERFORMANCE,    // Performance-based rebalancing
        MANUAL         // Manual administrative rebalancing
    }

    // ============ STRUCTS ============

    struct BucketConfig {
        BucketType bucketType;
        uint256 targetWeight;           // Target weight in basis points
        uint256 minWeight;              // Minimum weight allowed
        uint256 maxWeight;              // Maximum weight allowed
        uint256 allocation;             // Current allocation in USDC
        address manager;                // Bucket manager contract
        BucketStatus status;
        bool isActive;
        string strategy;                // Strategy description
    }

    struct BucketPerformance {
        uint256 totalReturn;            // Total return since inception
        uint256 dailyReturn;            // Daily return
        uint256 weeklyReturn;           // Weekly return
        uint256 monthlyReturn;          // Monthly return
        uint256 volatility;             // Volatility measure
        uint256 maxDrawdown;            // Maximum drawdown
        uint256 sharpeRatio;            // Risk-adjusted return
        uint256 lastUpdateTime;
        uint256 profitLoss;             // Current P&L
        bool isUnderperforming;
    }

    struct RebalanceParams {
        uint256 lastRebalanceTime;
        uint256 nextRebalanceTime;
        uint256 rebalanceThreshold;     // Minimum deviation to trigger rebalance
        bool autoRebalanceEnabled;
        uint256 maxSlippage;            // Maximum slippage allowed
        uint256 gasLimit;               // Gas limit for rebalancing
        bool emergencyRebalanceActive;
    }

    struct LiquidityMetrics {
        uint256 totalTVL;               // Total Value Locked
        uint256 availableLiquidity;     // Available for withdrawals
        uint256 utilizedLiquidity;      // Currently utilized
        uint256 reservedLiquidity;      // Reserved for liquidations
        uint256 performanceFees;        // Accumulated performance fees
        uint256 managementFees;         // Accumulated management fees
        uint256 insuranceFund;          // Insurance fund balance
    }

    struct RiskMetrics {
        uint256 totalExposure;          // Total market exposure
        uint256 concentrationRisk;      // Concentration risk measure
        uint256 liquidationRisk;        // Liquidation risk score
        uint256 correlationRisk;        // Correlation risk between buckets
        uint256 leverageRatio;          // Effective leverage ratio
        bool riskLimitBreached;
        uint256 lastRiskAssessment;
    }

    struct JITAuction {
        uint256 auctionId;
        bytes32 market;
        uint256 liquidationAmount;
        uint256 startPrice;
        uint256 currentPrice;
        uint256 startTime;
        uint256 endTime;
        address liquidatee;
        BucketType participatingBucket;
        bool isActive;
        uint256 totalBids;
    }

    // ============ STATE VARIABLES ============

    IERC20 public baseAsset;
    IRiverBitCoreV3 public coreContract;
    address public insuranceFund;
    
    mapping(BucketType => BucketConfig) public buckets;
    mapping(BucketType => BucketPerformance) public performance;
    mapping(BucketType => mapping(bytes32 => uint256)) public marketExposure;
    
    RebalanceParams public rebalanceParams;
    LiquidityMetrics public liquidityMetrics;
    RiskMetrics public riskMetrics;
    
    // JIT Auction system
    mapping(uint256 => JITAuction) public jitAuctions;
    uint256 public auctionCounter;
    mapping(BucketType => uint256) public auctionParticipation;
    
    // Performance tracking
    mapping(BucketType => uint256[]) public performanceHistory;
    mapping(BucketType => uint256) public performanceIndex;
    uint256 public performanceHistoryDepth;
    
    // Rebalancing history
    struct RebalanceEvent {
        uint256 timestamp;
        RebalanceType rebalanceType;
        uint256[4] oldAllocations;
        uint256[4] newAllocations;
        uint256 totalCost;
        uint256 gasUsed;
        address executor;
    }
    
    mapping(uint256 => RebalanceEvent) public rebalanceHistory;
    uint256 public rebalanceCounter;
    
    // Emergency controls
    bool public emergencyMode;
    mapping(BucketType => bool) public bucketEmergencyStop;
    uint256 public maxDailyRebalances;
    uint256 public dailyRebalanceCount;
    uint256 public lastRebalanceDay;

    // Fee structure
    uint256 public managementFeeRate;      // Annual management fee
    uint256 public performanceFeeRate;     // Performance fee rate
    uint256 public rebalanceFeeRate;       // Rebalancing fee rate
    uint256 public lastFeeCollection;

    // ============ EVENTS ============

    event BucketConfigured(
        BucketType indexed bucketType,
        uint256 targetWeight,
        address manager,
        string strategy
    );

    event RebalanceExecuted(
        uint256 indexed rebalanceId,
        RebalanceType rebalanceType,
        uint256[4] oldAllocations,
        uint256[4] newAllocations,
        uint256 totalCost,
        address indexed executor
    );

    event PerformanceUpdated(
        BucketType indexed bucketType,
        uint256 totalReturn,
        uint256 dailyReturn,
        uint256 maxDrawdown,
        bool isUnderperforming
    );

    event JITAuctionStarted(
        uint256 indexed auctionId,
        bytes32 indexed market,
        uint256 liquidationAmount,
        uint256 startPrice,
        BucketType participatingBucket
    );

    event JITAuctionCompleted(
        uint256 indexed auctionId,
        uint256 finalPrice,
        uint256 totalParticipation,
        BucketType winningBucket
    );

    event RiskLimitBreached(
        string riskType,
        uint256 currentValue,
        uint256 limit,
        BucketType affectedBucket
    );

    event LossProtectionTriggered(
        BucketType indexed bucketType,
        uint256 lossAmount,
        uint256 compensationAmount,
        string reason
    );

    event EmergencyAction(
        string action,
        BucketType bucketType,
        address indexed admin,
        string reason
    );

    event FeesCollected(
        uint256 managementFees,
        uint256 performanceFees,
        uint256 totalFees,
        address indexed collector
    );

    // ============ MODIFIERS ============

    modifier onlyActiveBucket(BucketType bucketType) {
        require(buckets[bucketType].isActive, "Bucket not active");
        require(!bucketEmergencyStop[bucketType], "Bucket emergency stopped");
        _;
    }

    modifier notEmergencyMode() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    modifier rebalanceAllowed() {
        _checkDailyRebalanceLimit();
        _;
    }

    // ============ INITIALIZATION ============

    function initialize(
        address _baseAsset,
        address _coreContract,
        address _insuranceFund,
        address _admin
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();

        require(_baseAsset != address(0), "Invalid base asset");
        require(_coreContract != address(0), "Invalid core contract");
        require(_insuranceFund != address(0), "Invalid insurance fund");
        require(_admin != address(0), "Invalid admin");

        baseAsset = IERC20(_baseAsset);
        coreContract = IRiverBitCoreV3(_coreContract);
        insuranceFund = _insuranceFund;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(REBALANCER_ROLE, _admin);
        _grantRole(LIQUIDATOR_ROLE, _admin);
        _grantRole(PERFORMANCE_MANAGER_ROLE, _admin);

        // Initialize bucket configurations
        _initializeBuckets();
        
        // Initialize rebalance parameters
        rebalanceParams.rebalanceThreshold = WEIGHT_TOLERANCE;
        rebalanceParams.autoRebalanceEnabled = true;
        rebalanceParams.maxSlippage = 100; // 1%
        rebalanceParams.gasLimit = 2000000;
        
        // Initialize fees
        managementFeeRate = 200; // 2% annually
        performanceFeeRate = 2000; // 20% of profits
        rebalanceFeeRate = 10; // 0.1% per rebalance
        
        // Initialize limits
        maxDailyRebalances = 6; // Max 6 rebalances per day
        performanceHistoryDepth = 365; // 1 year of daily data
        lastFeeCollection = block.timestamp;
    }

    /**
     * @notice Initialize default bucket configurations
     */
    function _initializeBuckets() internal {
        // A桶 (Passive Maker) - 45%
        buckets[BucketType.A_BUCKET] = BucketConfig({
            bucketType: BucketType.A_BUCKET,
            targetWeight: 4500,
            minWeight: 3500,
            maxWeight: 5500,
            allocation: 0,
            manager: address(0),
            status: BucketStatus.ACTIVE,
            isActive: true,
            strategy: "Passive market making with three-price depth"
        });

        // B桶 (Active Rebalancer) - 20%
        buckets[BucketType.B_BUCKET] = BucketConfig({
            bucketType: BucketType.B_BUCKET,
            targetWeight: 2000,
            minWeight: 1500,
            maxWeight: 2500,
            allocation: 0,
            manager: address(0),
            status: BucketStatus.ACTIVE,
            isActive: true,
            strategy: "Active rebalancing and recentering"
        });

        // L1桶 (Primary Liquidator) - 25%
        buckets[BucketType.L1_BUCKET] = BucketConfig({
            bucketType: BucketType.L1_BUCKET,
            targetWeight: 2500,
            minWeight: 2000,
            maxWeight: 3000,
            allocation: 0,
            manager: address(0),
            status: BucketStatus.ACTIVE,
            isActive: true,
            strategy: "Primary liquidation handling and tail depth"
        });

        // L2桶 (Backstop) - 10%
        buckets[BucketType.L2_BUCKET] = BucketConfig({
            bucketType: BucketType.L2_BUCKET,
            targetWeight: 1000,
            minWeight: 500,
            maxWeight: 1500,
            allocation: 0,
            manager: address(0),
            status: BucketStatus.ACTIVE,
            isActive: true,
            strategy: "Extreme liquidation and backstop coverage"
        });
    }

    // ============ REBALANCING FUNCTIONS ============

    /**
     * @notice Execute automated rebalancing
     * @return rebalanceId Unique rebalance identifier
     */
    function executeRebalance()
        external
        nonReentrant
        onlyRole(REBALANCER_ROLE)
        notEmergencyMode
        rebalanceAllowed
        returns (uint256 rebalanceId)
    {
        require(_shouldRebalance(), "Rebalancing not needed");
        
        // Calculate target allocations
        uint256[4] memory currentAllocations = _getCurrentAllocations();
        uint256[4] memory targetAllocations = _calculateTargetAllocations();
        
        // Execute rebalancing
        rebalanceId = ++rebalanceCounter;
        uint256 gasStart = gasleft();
        uint256 totalCost = _performRebalance(currentAllocations, targetAllocations);
        uint256 gasUsed = gasStart - gasleft();
        
        // Record rebalance event
        rebalanceHistory[rebalanceId] = RebalanceEvent({
            timestamp: block.timestamp,
            rebalanceType: RebalanceType.SCHEDULED,
            oldAllocations: currentAllocations,
            newAllocations: targetAllocations,
            totalCost: totalCost,
            gasUsed: gasUsed,
            executor: msg.sender
        });
        
        // Update rebalance timing
        rebalanceParams.lastRebalanceTime = block.timestamp;
        rebalanceParams.nextRebalanceTime = block.timestamp + REBALANCE_INTERVAL;
        
        // Update daily rebalance count
        _updateDailyRebalanceCount();
        
        emit RebalanceExecuted(
            rebalanceId,
            RebalanceType.SCHEDULED,
            currentAllocations,
            targetAllocations,
            totalCost,
            msg.sender
        );
        
        return rebalanceId;
    }

    /**
     * @notice Emergency rebalancing
     * @param reason Reason for emergency rebalancing
     * @return rebalanceId Unique rebalance identifier
     */
    function emergencyRebalance(string calldata reason)
        external
        nonReentrant
        onlyRole(ADMIN_ROLE)
        returns (uint256 rebalanceId)
    {
        uint256[4] memory currentAllocations = _getCurrentAllocations();
        uint256[4] memory targetAllocations = _calculateEmergencyAllocations();
        
        rebalanceId = ++rebalanceCounter;
        uint256 gasStart = gasleft();
        uint256 totalCost = _performRebalance(currentAllocations, targetAllocations);
        uint256 gasUsed = gasStart - gasleft();
        
        rebalanceHistory[rebalanceId] = RebalanceEvent({
            timestamp: block.timestamp,
            rebalanceType: RebalanceType.EMERGENCY,
            oldAllocations: currentAllocations,
            newAllocations: targetAllocations,
            totalCost: totalCost,
            gasUsed: gasUsed,
            executor: msg.sender
        });
        
        rebalanceParams.emergencyRebalanceActive = true;
        
        emit RebalanceExecuted(
            rebalanceId,
            RebalanceType.EMERGENCY,
            currentAllocations,
            targetAllocations,
            totalCost,
            msg.sender
        );
        
        emit EmergencyAction("EMERGENCY_REBALANCE", BucketType.A_BUCKET, msg.sender, reason);
        
        return rebalanceId;
    }

    /**
     * @notice Check if rebalancing should be executed
     * @return shouldRebalance Whether rebalancing is needed
     */
    function _shouldRebalance() internal view returns (bool shouldRebalance) {
        // Check time-based rebalancing
        if (block.timestamp >= rebalanceParams.nextRebalanceTime) {
            return true;
        }
        
        // Check deviation-based rebalancing
        uint256[4] memory currentWeights = _getCurrentWeights();
        
        for (uint256 i = 0; i < 4; i++) {
            BucketType bucketType = BucketType(i);
            uint256 targetWeight = buckets[bucketType].targetWeight;
            uint256 currentWeight = currentWeights[i];
            
            uint256 deviation = currentWeight > targetWeight ?
                currentWeight - targetWeight :
                targetWeight - currentWeight;
            
            if (deviation > rebalanceParams.rebalanceThreshold) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * @notice Perform the actual rebalancing
     * @param currentAllocations Current allocations
     * @param targetAllocations Target allocations
     * @return totalCost Total cost of rebalancing
     */
    function _performRebalance(
        uint256[4] memory currentAllocations,
        uint256[4] memory targetAllocations
    ) internal returns (uint256 totalCost) {
        totalCost = 0;
        
        // Calculate required transfers
        for (uint256 i = 0; i < 4; i++) {
            BucketType bucketType = BucketType(i);
            
            if (targetAllocations[i] > currentAllocations[i]) {
                // Need to add funds to this bucket
                uint256 amount = targetAllocations[i] - currentAllocations[i];
                _transferToBucket(bucketType, amount);
                totalCost += _calculateTransferCost(amount);
            } else if (currentAllocations[i] > targetAllocations[i]) {
                // Need to remove funds from this bucket
                uint256 amount = currentAllocations[i] - targetAllocations[i];
                _transferFromBucket(bucketType, amount);
                totalCost += _calculateTransferCost(amount);
            }
            
            // Update bucket allocation
            buckets[bucketType].allocation = targetAllocations[i];
        }
        
        // Collect rebalancing fee
        uint256 rebalanceFee = (liquidityMetrics.totalTVL * rebalanceFeeRate) / BASIS_POINTS;
        totalCost += rebalanceFee;
        liquidityMetrics.managementFees += rebalanceFee;
        
        return totalCost;
    }

    // ============ JIT AUCTION FUNCTIONS ============

    /**
     * @notice Start JIT auction for liquidation
     * @param market Market being liquidated
     * @param liquidationAmount Amount to liquidate
     * @param startPrice Starting price for auction
     * @param liquidatee Address being liquidated
     * @return auctionId Unique auction identifier
     */
    function startJITAuction(
        bytes32 market,
        uint256 liquidationAmount,
        uint256 startPrice,
        address liquidatee
    )
        external
        onlyRole(LIQUIDATOR_ROLE)
        notEmergencyMode
        returns (uint256 auctionId)
    {
        require(liquidationAmount > 0, "Invalid liquidation amount");
        require(startPrice > 0, "Invalid start price");
        require(liquidatee != address(0), "Invalid liquidatee");
        
        auctionId = ++auctionCounter;
        
        // Determine which bucket should participate (L1 first, then L2)
        BucketType participatingBucket = _selectLiquidationBucket(liquidationAmount);
        
        jitAuctions[auctionId] = JITAuction({
            auctionId: auctionId,
            market: market,
            liquidationAmount: liquidationAmount,
            startPrice: startPrice,
            currentPrice: startPrice,
            startTime: block.timestamp,
            endTime: block.timestamp + 5 minutes, // 5-minute auction
            liquidatee: liquidatee,
            participatingBucket: participatingBucket,
            isActive: true,
            totalBids: 0
        });
        
        auctionParticipation[participatingBucket]++;
        
        emit JITAuctionStarted(
            auctionId,
            market,
            liquidationAmount,
            startPrice,
            participatingBucket
        );
        
        return auctionId;
    }

    /**
     * @notice Complete JIT auction
     * @param auctionId Auction identifier
     * @return finalPrice Final auction price
     * @return winningBucket Bucket that won the auction
     */
    function completeJITAuction(uint256 auctionId)
        external
        onlyRole(LIQUIDATOR_ROLE)
        returns (uint256 finalPrice, BucketType winningBucket)
    {
        require(auctionId <= auctionCounter, "Invalid auction ID");
        JITAuction storage auction = jitAuctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended");
        
        finalPrice = auction.currentPrice;
        winningBucket = auction.participatingBucket;
        
        // Execute liquidation
        _executeLiquidation(auction, finalPrice);
        
        // Mark auction as completed
        auction.isActive = false;
        
        emit JITAuctionCompleted(
            auctionId,
            finalPrice,
            auction.totalBids,
            winningBucket
        );
        
        return (finalPrice, winningBucket);
    }

    /**
     * @notice Select appropriate bucket for liquidation
     * @param liquidationAmount Amount to liquidate
     * @return bucketType Selected bucket type
     */
    function _selectLiquidationBucket(uint256 liquidationAmount) 
        internal 
        view 
        returns (BucketType bucketType) 
    {
        // Check L1 bucket capacity first
        if (buckets[BucketType.L1_BUCKET].allocation >= liquidationAmount &&
            buckets[BucketType.L1_BUCKET].status == BucketStatus.ACTIVE) {
            return BucketType.L1_BUCKET;
        }
        
        // Fall back to L2 bucket
        if (buckets[BucketType.L2_BUCKET].allocation >= liquidationAmount &&
            buckets[BucketType.L2_BUCKET].status == BucketStatus.ACTIVE) {
            return BucketType.L2_BUCKET;
        }
        
        // Emergency: use any available bucket
        for (uint256 i = 0; i < 4; i++) {
            BucketType bt = BucketType(i);
            if (buckets[bt].allocation >= liquidationAmount &&
                buckets[bt].status == BucketStatus.ACTIVE) {
                return bt;
            }
        }
        
        revert("No bucket available for liquidation");
    }

    /**
     * @notice Execute liquidation using bucket funds
     * @param auction Auction data
     * @param price Execution price
     */
    function _executeLiquidation(JITAuction memory auction, uint256 price) internal {
        BucketType bucket = auction.participatingBucket;
        
        // Deduct liquidation amount from bucket
        require(buckets[bucket].allocation >= auction.liquidationAmount, "Insufficient bucket funds");
        buckets[bucket].allocation -= auction.liquidationAmount;
        
        // Update liquidation metrics
        liquidityMetrics.utilizedLiquidity += auction.liquidationAmount;
        
        // Record performance impact
        _recordLiquidationImpact(bucket, auction.liquidationAmount, price);
    }

    // ============ PERFORMANCE MANAGEMENT ============

    /**
     * @notice Update bucket performance metrics
     * @param bucketType Bucket type
     * @param newReturn New return value
     * @param newVolatility New volatility value
     * @param newDrawdown New drawdown value
     */
    function updatePerformance(
        BucketType bucketType,
        uint256 newReturn,
        uint256 newVolatility,
        uint256 newDrawdown
    )
        external
        onlyRole(PERFORMANCE_MANAGER_ROLE)
        onlyActiveBucket(bucketType)
    {
        BucketPerformance storage perf = performance[bucketType];
        
        uint256 oldReturn = perf.totalReturn;
        perf.totalReturn = newReturn;
        perf.volatility = newVolatility;
        perf.maxDrawdown = newDrawdown;
        perf.lastUpdateTime = block.timestamp;
        
        // Calculate daily return
        if (oldReturn > 0) {
            perf.dailyReturn = newReturn > oldReturn ?
                ((newReturn - oldReturn) * PRECISION) / oldReturn :
                ((oldReturn - newReturn) * PRECISION) / oldReturn;
        }
        
        // Check if underperforming
        perf.isUnderperforming = _checkUnderperformance(bucketType);
        
        // Store in performance history
        _updatePerformanceHistory(bucketType, newReturn);
        
        // Trigger rebalancing if significant underperformance
        if (perf.isUnderperforming && newDrawdown > MAX_DRAWDOWN_THRESHOLD) {
            _triggerPerformanceRebalance(bucketType);
        }
        
        emit PerformanceUpdated(
            bucketType,
            newReturn,
            perf.dailyReturn,
            newDrawdown,
            perf.isUnderperforming
        );
    }

    /**
     * @notice Check if bucket is underperforming
     * @param bucketType Bucket type
     * @return isUnderperforming Whether bucket is underperforming
     */
    function _checkUnderperformance(BucketType bucketType) 
        internal 
        view 
        returns (bool isUnderperforming) 
    {
        BucketPerformance memory perf = performance[bucketType];
        
        // Check drawdown threshold
        if (perf.maxDrawdown > MAX_DRAWDOWN_THRESHOLD) {
            return true;
        }
        
        // Check relative performance against other buckets
        uint256 avgPerformance = _calculateAveragePerformance();
        if (perf.totalReturn < (avgPerformance * 80) / 100) { // 20% below average
            return true;
        }
        
        return false;
    }

    /**
     * @notice Trigger performance-based rebalancing
     * @param underperformingBucket Underperforming bucket
     */
    function _triggerPerformanceRebalance(BucketType underperformingBucket) internal {
        // Reduce allocation to underperforming bucket
        uint256 currentWeight = buckets[underperformingBucket].targetWeight;
        uint256 newWeight = (currentWeight * 90) / 100; // 10% reduction
        
        // Ensure minimum weight constraints
        if (newWeight < buckets[underperformingBucket].minWeight) {
            newWeight = buckets[underperformingBucket].minWeight;
        }
        
        buckets[underperformingBucket].targetWeight = newWeight;
        
        // Redistribute weight to performing buckets
        _redistributeWeight(underperformingBucket, currentWeight - newWeight);
    }

    // ============ RISK MANAGEMENT ============

    /**
     * @notice Update risk metrics
     */
    function updateRiskMetrics() external onlyRole(PERFORMANCE_MANAGER_ROLE) {
        riskMetrics.totalExposure = _calculateTotalExposure();
        riskMetrics.concentrationRisk = _calculateConcentrationRisk();
        riskMetrics.liquidationRisk = _calculateLiquidationRisk();
        riskMetrics.correlationRisk = _calculateCorrelationRisk();
        riskMetrics.leverageRatio = _calculateLeverageRatio();
        riskMetrics.lastRiskAssessment = block.timestamp;
        
        // Check risk limits
        _checkRiskLimits();
    }

    /**
     * @notice Check risk limits and trigger protections
     */
    function _checkRiskLimits() internal {
        // Check concentration risk
        if (riskMetrics.concentrationRisk > 5000) { // 50% concentration limit
            riskMetrics.riskLimitBreached = true;
            emit RiskLimitBreached(
                "CONCENTRATION_RISK",
                riskMetrics.concentrationRisk,
                5000,
                BucketType.A_BUCKET
            );
        }
        
        // Check liquidation risk
        if (riskMetrics.liquidationRisk > 8000) { // 80% liquidation risk limit
            riskMetrics.riskLimitBreached = true;
            _triggerLossProtection();
        }
        
        // Check leverage ratio
        if (riskMetrics.leverageRatio > 300) { // 3:1 leverage limit
            riskMetrics.riskLimitBreached = true;
            emit RiskLimitBreached(
                "LEVERAGE_RATIO",
                riskMetrics.leverageRatio,
                300,
                BucketType.A_BUCKET
            );
        }
    }

    /**
     * @notice Trigger loss protection mechanism
     */
    function _triggerLossProtection() internal {
        // Calculate total losses across buckets
        uint256 totalLoss = 0;
        BucketType affectedBucket = BucketType.A_BUCKET;
        
        for (uint256 i = 0; i < 4; i++) {
            BucketType bucket = BucketType(i);
            if (performance[bucket].profitLoss < 0) {
                uint256 loss = uint256(-performance[bucket].profitLoss);
                totalLoss += loss;
                affectedBucket = bucket;
            }
        }
        
        if (totalLoss > 0) {
            // Request insurance fund compensation
            uint256 compensation = _requestInsuranceCompensation(totalLoss);
            
            emit LossProtectionTriggered(
                affectedBucket,
                totalLoss,
                compensation,
                "Risk limit breach triggered loss protection"
            );
        }
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Get current allocations for all buckets
     * @return allocations Array of current allocations
     */
    function _getCurrentAllocations() internal view returns (uint256[4] memory allocations) {
        for (uint256 i = 0; i < 4; i++) {
            allocations[i] = buckets[BucketType(i)].allocation;
        }
        return allocations;
    }

    /**
     * @notice Get current weights for all buckets
     * @return weights Array of current weights in basis points
     */
    function _getCurrentWeights() internal view returns (uint256[4] memory weights) {
        uint256 totalAllocation = liquidityMetrics.totalTVL;
        
        if (totalAllocation == 0) {
            return weights; // All zeros
        }
        
        for (uint256 i = 0; i < 4; i++) {
            weights[i] = (buckets[BucketType(i)].allocation * BASIS_POINTS) / totalAllocation;
        }
        
        return weights;
    }

    /**
     * @notice Calculate target allocations based on current TVL and weights
     * @return targetAllocations Array of target allocations
     */
    function _calculateTargetAllocations() internal view returns (uint256[4] memory targetAllocations) {
        uint256 totalTVL = liquidityMetrics.totalTVL;
        
        for (uint256 i = 0; i < 4; i++) {
            targetAllocations[i] = (totalTVL * buckets[BucketType(i)].targetWeight) / BASIS_POINTS;
        }
        
        return targetAllocations;
    }

    /**
     * @notice Calculate emergency allocations (conservative rebalancing)
     * @return emergencyAllocations Array of emergency allocations
     */
    function _calculateEmergencyAllocations() internal view returns (uint256[4] memory emergencyAllocations) {
        uint256 totalTVL = liquidityMetrics.totalTVL;
        
        // Emergency allocation: prioritize L1 and L2 buckets
        emergencyAllocations[uint256(BucketType.A_BUCKET)] = (totalTVL * 3000) / BASIS_POINTS; // 30%
        emergencyAllocations[uint256(BucketType.B_BUCKET)] = (totalTVL * 1500) / BASIS_POINTS; // 15%
        emergencyAllocations[uint256(BucketType.L1_BUCKET)] = (totalTVL * 3500) / BASIS_POINTS; // 35%
        emergencyAllocations[uint256(BucketType.L2_BUCKET)] = (totalTVL * 2000) / BASIS_POINTS; // 20%
        
        return emergencyAllocations;
    }

    /**
     * @notice Check and update daily rebalance limit
     */
    function _checkDailyRebalanceLimit() internal {
        uint256 currentDay = block.timestamp / 86400;
        
        if (currentDay != lastRebalanceDay) {
            dailyRebalanceCount = 0;
            lastRebalanceDay = currentDay;
        }
        
        require(dailyRebalanceCount < maxDailyRebalances, "Daily rebalance limit exceeded");
    }

    /**
     * @notice Update daily rebalance count
     */
    function _updateDailyRebalanceCount() internal {
        dailyRebalanceCount++;
    }

    /**
     * @notice Transfer funds to bucket
     * @param bucketType Target bucket
     * @param amount Amount to transfer
     */
    function _transferToBucket(BucketType bucketType, uint256 amount) internal {
        // Implementation would interact with bucket manager contracts
        // For now, just update the allocation
        buckets[bucketType].allocation += amount;
    }

    /**
     * @notice Transfer funds from bucket
     * @param bucketType Source bucket
     * @param amount Amount to transfer
     */
    function _transferFromBucket(BucketType bucketType, uint256 amount) internal {
        require(buckets[bucketType].allocation >= amount, "Insufficient bucket funds");
        buckets[bucketType].allocation -= amount;
    }

    /**
     * @notice Calculate transfer cost
     * @param amount Transfer amount
     * @return cost Transfer cost
     */
    function _calculateTransferCost(uint256 amount) internal pure returns (uint256 cost) {
        // Simple cost model: 0.05% of transfer amount
        return (amount * 5) / BASIS_POINTS;
    }

    /**
     * @notice Update performance history
     * @param bucketType Bucket type
     * @param newReturn New return value
     */
    function _updatePerformanceHistory(BucketType bucketType, uint256 newReturn) internal {
        uint256 index = performanceIndex[bucketType];
        performanceHistory[bucketType].push(newReturn);
        
        // Remove old data if exceeding depth
        if (performanceHistory[bucketType].length > performanceHistoryDepth) {
            // Shift array elements (simple implementation)
            for (uint256 i = 0; i < performanceHistoryDepth - 1; i++) {
                performanceHistory[bucketType][i] = performanceHistory[bucketType][i + 1];
            }
            performanceHistory[bucketType].pop();
        }
        
        performanceIndex[bucketType] = (index + 1) % performanceHistoryDepth;
    }

    /**
     * @notice Calculate average performance across all buckets
     * @return avgPerformance Average performance
     */
    function _calculateAveragePerformance() internal view returns (uint256 avgPerformance) {
        uint256 totalReturn = 0;
        uint256 activeBuckets = 0;
        
        for (uint256 i = 0; i < 4; i++) {
            if (buckets[BucketType(i)].isActive) {
                totalReturn += performance[BucketType(i)].totalReturn;
                activeBuckets++;
            }
        }
        
        return activeBuckets > 0 ? totalReturn / activeBuckets : 0;
    }

    /**
     * @notice Redistribute weight from underperforming bucket
     * @param fromBucket Source bucket
     * @param weightToRedistribute Weight to redistribute
     */
    function _redistributeWeight(BucketType fromBucket, uint256 weightToRedistribute) internal {
        // Distribute proportionally to performing buckets
        uint256 remainingWeight = weightToRedistribute;
        
        for (uint256 i = 0; i < 4; i++) {
            BucketType bucket = BucketType(i);
            if (bucket != fromBucket && buckets[bucket].isActive && !performance[bucket].isUnderperforming) {
                uint256 additionalWeight = remainingWeight / (4 - i); // Simple distribution
                
                uint256 newWeight = buckets[bucket].targetWeight + additionalWeight;
                if (newWeight <= buckets[bucket].maxWeight) {
                    buckets[bucket].targetWeight = newWeight;
                    remainingWeight -= additionalWeight;
                }
            }
        }
    }

    /**
     * @notice Record liquidation impact on bucket performance
     * @param bucket Affected bucket
     * @param amount Liquidation amount
     * @param price Execution price
     */
    function _recordLiquidationImpact(BucketType bucket, uint256 amount, uint256 price) internal {
        // Simple P&L calculation (would be more sophisticated in practice)
        int256 impact = int256((amount * price) / PRECISION);
        performance[bucket].profitLoss += impact;
    }

    /**
     * @notice Request compensation from insurance fund
     * @param lossAmount Loss amount
     * @return compensation Compensation amount granted
     */
    function _requestInsuranceCompensation(uint256 lossAmount) internal returns (uint256 compensation) {
        // This would integrate with the insurance fund contract
        // For now, simulate compensation at 80% of loss
        compensation = (lossAmount * 80) / 100;
        liquidityMetrics.insuranceFund += compensation;
        return compensation;
    }

    // Risk calculation functions (simplified implementations)
    function _calculateTotalExposure() internal view returns (uint256) {
        return liquidityMetrics.utilizedLiquidity;
    }

    function _calculateConcentrationRisk() internal view returns (uint256) {
        // Simplified: highest bucket allocation as percentage
        uint256 maxAllocation = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (buckets[BucketType(i)].allocation > maxAllocation) {
                maxAllocation = buckets[BucketType(i)].allocation;
            }
        }
        return liquidityMetrics.totalTVL > 0 ? 
            (maxAllocation * BASIS_POINTS) / liquidityMetrics.totalTVL : 0;
    }

    function _calculateLiquidationRisk() internal view returns (uint256) {
        // Simplified: utilized liquidity as percentage of total
        return liquidityMetrics.totalTVL > 0 ?
            (liquidityMetrics.utilizedLiquidity * BASIS_POINTS) / liquidityMetrics.totalTVL : 0;
    }

    function _calculateCorrelationRisk() internal pure returns (uint256) {
        // Simplified implementation
        return 3000; // 30% correlation risk assumption
    }

    function _calculateLeverageRatio() internal view returns (uint256) {
        // Simplified: total exposure / total TVL * 100
        return liquidityMetrics.totalTVL > 0 ?
            (riskMetrics.totalExposure * 100) / liquidityMetrics.totalTVL : 0;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get bucket configuration
     * @param bucketType Bucket type
     * @return config Bucket configuration
     */
    function getBucketConfig(BucketType bucketType)
        external
        view
        returns (BucketConfig memory config)
    {
        return buckets[bucketType];
    }

    /**
     * @notice Get bucket performance
     * @param bucketType Bucket type
     * @return perf Bucket performance
     */
    function getBucketPerformance(BucketType bucketType)
        external
        view
        returns (BucketPerformance memory perf)
    {
        return performance[bucketType];
    }

    /**
     * @notice Get liquidity metrics
     * @return metrics Current liquidity metrics
     */
    function getLiquidityMetrics()
        external
        view
        returns (LiquidityMetrics memory metrics)
    {
        return liquidityMetrics;
    }

    /**
     * @notice Get risk metrics
     * @return metrics Current risk metrics
     */
    function getRiskMetrics()
        external
        view
        returns (RiskMetrics memory metrics)
    {
        return riskMetrics;
    }

    /**
     * @notice Get JIT auction details
     * @param auctionId Auction ID
     * @return auction Auction details
     */
    function getJITAuction(uint256 auctionId)
        external
        view
        returns (JITAuction memory auction)
    {
        require(auctionId <= auctionCounter, "Invalid auction ID");
        return jitAuctions[auctionId];
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update bucket configuration
     * @param bucketType Bucket type
     * @param targetWeight New target weight
     * @param minWeight New minimum weight
     * @param maxWeight New maximum weight
     * @param manager New manager address
     */
    function updateBucketConfig(
        BucketType bucketType,
        uint256 targetWeight,
        uint256 minWeight,
        uint256 maxWeight,
        address manager
    ) external onlyRole(ADMIN_ROLE) {
        require(targetWeight <= BASIS_POINTS, "Invalid target weight");
        require(minWeight <= targetWeight, "Min weight too high");
        require(maxWeight >= targetWeight, "Max weight too low");
        
        buckets[bucketType].targetWeight = targetWeight;
        buckets[bucketType].minWeight = minWeight;
        buckets[bucketType].maxWeight = maxWeight;
        buckets[bucketType].manager = manager;
        
        emit BucketConfigured(bucketType, targetWeight, manager, buckets[bucketType].strategy);
    }

    /**
     * @notice Emergency stop bucket
     * @param bucketType Bucket to stop
     * @param reason Reason for stop
     */
    function emergencyStopBucket(BucketType bucketType, string calldata reason) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        bucketEmergencyStop[bucketType] = true;
        buckets[bucketType].status = BucketStatus.EMERGENCY_STOP;
        
        emit EmergencyAction("BUCKET_EMERGENCY_STOP", bucketType, msg.sender, reason);
    }

    /**
     * @notice Collect accumulated fees
     * @return totalCollected Total fees collected
     */
    function collectFees() external onlyRole(ADMIN_ROLE) returns (uint256 totalCollected) {
        uint256 managementFees = liquidityMetrics.managementFees;
        uint256 performanceFees = liquidityMetrics.performanceFees;
        
        totalCollected = managementFees + performanceFees;
        
        // Reset fee counters
        liquidityMetrics.managementFees = 0;
        liquidityMetrics.performanceFees = 0;
        lastFeeCollection = block.timestamp;
        
        // Transfer fees (implementation would transfer to fee collector)
        
        emit FeesCollected(managementFees, performanceFees, totalCollected, msg.sender);
        
        return totalCollected;
    }
}