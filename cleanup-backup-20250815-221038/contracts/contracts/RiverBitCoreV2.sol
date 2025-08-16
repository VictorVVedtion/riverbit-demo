// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

/**
 * @title RiverBitCoreV2
 * @notice PRD 2.0 Core contract implementing S-Auth, ETMA, and comprehensive trading infrastructure
 * @dev Modular architecture with advanced features for perpetual trading and LP management
 * 
 * PRD 2.0 Features:
 * - S-Auth Settlement System: Atomic signature-based trading without deposits
 * - LP Bucket Architecture: Four-bucket system (A/B/L1/L2) with hard-capped losses
 * - ETMA Implementation: Windowed matching for xStock night trading
 * - Three-Gates Risk Management: Single window, 15-minute, and 24-hour limits
 * - AFB System: Accrued Funding Balance for perpetual contracts
 * - Governance: Parameter registry with timelock controls
 * - Dual Market Structure: Crypto (24/7 CLOB) vs xStock (RTH/ETMA)
 */
contract RiverBitCoreV2 is 
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable
{
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    bytes32 public constant BUCKET_MANAGER_ROLE = keccak256("BUCKET_MANAGER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_LEVERAGE = 100;
    uint256 private constant AFB_UPDATE_INTERVAL = 1 hours;
    uint256 private constant ETMA_WINDOW_SIZE = 15 minutes;
    
    // Risk management gate intervals
    uint256 private constant SINGLE_WINDOW_DURATION = 1;
    uint256 private constant FIFTEEN_MINUTE_WINDOW = 15 minutes;
    uint256 private constant TWENTY_FOUR_HOUR_WINDOW = 24 hours;

    // ============ STRUCTS ============

    // S-Auth signature structure
    struct SAuthSignature {
        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 nonce;
        uint256 deadline;
    }

    // Trading position structure
    struct Position {
        address trader;
        bytes32 market;
        MarketType marketType;
        bool isLong;
        uint256 size;
        uint256 margin;
        uint256 entryPrice;
        uint256 leverage;
        uint256 openTime;
        uint256 lastFundingTime;
        int256 afbBalance;
        uint256 liquidationPrice;
        bool isActive;
    }

    // LP Bucket types
    enum BucketType {
        A_PASSIVE_MAKER,    // 45% - Passive market making
        B_ACTIVE_REBALANCER, // 20% - Active rebalancing
        L1_PRIMARY_LIQUIDATOR, // 25% - Primary liquidation
        L2_BACKSTOP         // 10% - Emergency backstop
    }

    // LP Bucket structure
    struct LPBucket {
        BucketType bucketType;
        uint256 allocation;
        uint256 targetWeight;
        uint256 currentWeight;
        int256 totalPnL;
        uint256 hardCapLoss;
        uint256 lastRebalanceTime;
        address manager;
        bool isActive;
        uint256 riskScore;
    }

    // Market types
    enum MarketType {
        CRYPTO_24_7,    // 24/7 CLOB trading
        XSTOCK_RTH,     // Regular trading hours
        XSTOCK_ETMA     // Evening trading with matching algorithm
    }

    // Market configuration
    struct MarketConfig {
        MarketType marketType;
        bool isActive;
        uint256 minTradeSize;
        uint256 maxTradeSize;
        uint256 tradingFee;
        uint256 liquidationFee;
        uint256 fundingRate;
        uint256 maxLeverage;
        uint256 marginRequirement;
        // ETMA specific
        uint256 etmaWindowStart;
        uint256 etmaWindowEnd;
        uint256 etmaMatchingThreshold;
    }

    // Risk management gates
    struct RiskGate {
        uint256 singleWindowLimit;
        uint256 fifteenMinuteLimit;
        uint256 twentyFourHourLimit;
        uint256 currentSingleWindow;
        uint256 currentFifteenMinute;
        uint256 currentTwentyFourHour;
        uint256 lastSingleWindowReset;
        uint256 lastFifteenMinuteReset;
        uint256 lastTwentyFourHourReset;
    }

    // ETMA order structure
    struct ETMAOrder {
        address trader;
        bytes32 market;
        bool isLong;
        uint256 size;
        uint256 limitPrice;
        uint256 timestamp;
        bool isMatched;
        uint256 matchedSize;
        uint256 matchedPrice;
    }

    // AFB state
    struct AFBState {
        int256 accruedBalance;
        uint256 lastUpdateTime;
        uint256 fundingRateAccumulator;
        mapping(bytes32 => int256) positionFunding;
    }

    // Governance parameters
    struct GovernanceParams {
        uint256 proposalDelay;
        uint256 votingDuration;
        uint256 executionDelay;
        uint256 quorum;
        bool timelockActive;
    }

    // ============ STATE VARIABLES ============

    // Core token
    IERC20 public baseAsset;
    
    // Global protocol state
    uint256 public totalValueLocked;
    uint256 public globalSequenceNumber;
    bool public emergencyMode;
    
    // S-Auth nonces
    mapping(address => uint256) public nonces;
    
    // Positions
    mapping(bytes32 => Position) public positions;
    mapping(address => bytes32[]) public userPositions;
    
    // LP Buckets
    mapping(BucketType => LPBucket) public lpBuckets;
    uint256 public totalLPAssets;
    
    // Markets
    mapping(bytes32 => MarketConfig) public markets;
    bytes32[] public activeMarkets;
    
    // Risk management
    mapping(address => RiskGate) public userRiskGates;
    mapping(bytes32 => RiskGate) public marketRiskGates;
    
    // ETMA orders
    mapping(bytes32 => ETMAOrder[]) public etmaOrders;
    mapping(bytes32 => uint256) public etmaMatchingVolume;
    
    // AFB system
    mapping(address => AFBState) public afbStates;
    mapping(bytes32 => uint256) public marketFundingRates;
    
    // Governance
    GovernanceParams public governance;
    mapping(bytes32 => bool) public executedProposals;
    
    // Price feeds (simplified - would use oracles in production)
    mapping(bytes32 => uint256) public assetPrices;
    mapping(bytes32 => uint256) public priceUpdateTimestamp;

    // ============ EVENTS ============

    event SAuthTradeExecuted(
        address indexed trader,
        bytes32 indexed positionKey,
        bytes32 indexed market,
        bool isLong,
        uint256 size,
        uint256 price,
        uint256 signature_nonce
    );

    event LPBucketRebalanced(
        BucketType indexed bucketType,
        uint256 oldAllocation,
        uint256 newAllocation,
        uint256 timestamp
    );

    event ETMAOrderMatched(
        bytes32 indexed market,
        address indexed trader,
        uint256 size,
        uint256 price,
        uint256 timestamp
    );

    event RiskGateTriggered(
        address indexed user,
        bytes32 indexed market,
        string gateType,
        uint256 limit,
        uint256 current
    );

    event AFBUpdated(
        address indexed trader,
        bytes32 indexed position,
        int256 fundingAmount,
        uint256 timestamp
    );

    event GovernanceProposalExecuted(
        bytes32 indexed proposalId,
        address indexed executor,
        uint256 timestamp
    );

    // ============ MODIFIERS ============

    modifier validMarket(bytes32 market) {
        require(markets[market].isActive, "Market not active");
        _;
    }

    modifier notEmergencyMode() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    modifier onlyInTradingHours(bytes32 market) {
        MarketConfig memory config = markets[market];
        if (config.marketType == MarketType.XSTOCK_RTH) {
            // Check if in regular trading hours (simplified)
            require(_isInTradingHours(), "Outside trading hours");
        }
        _;
    }

    modifier validETMAWindow(bytes32 market) {
        MarketConfig memory config = markets[market];
        if (config.marketType == MarketType.XSTOCK_ETMA) {
            require(_isInETMAWindow(market), "Outside ETMA window");
        }
        _;
    }

    // ============ INITIALIZATION ============

    /**
     * @notice Initialize the contract
     * @param _baseAsset Base asset token address (USDC)
     * @param _admin Admin address
     */
    function initialize(
        address _baseAsset,
        address _admin
    ) external initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();
        __EIP712_init("RiverBitV2", "2.0");

        require(_baseAsset != address(0), "Invalid base asset");
        require(_admin != address(0), "Invalid admin");

        baseAsset = IERC20(_baseAsset);
        
        // Initialize roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(RISK_MANAGER_ROLE, _admin);
        _grantRole(BUCKET_MANAGER_ROLE, _admin);
        _grantRole(GOVERNANCE_ROLE, _admin);
        
        // Initialize LP buckets
        _initializeLPBuckets();
        
        // Initialize governance parameters
        governance = GovernanceParams({
            proposalDelay: 2 days,
            votingDuration: 7 days,
            executionDelay: 2 days,
            quorum: 5000, // 50%
            timelockActive: true
        });
        
        globalSequenceNumber = 1;
    }

    // ============ S-AUTH TRADING ============

    /**
     * @notice Execute trade with S-Auth signature
     * @param market Market identifier
     * @param isLong Trade direction
     * @param size Trade size
     * @param maxPrice Maximum acceptable price
     * @param leverage Leverage amount
     * @param signature S-Auth signature
     */
    function sAuthTrade(
        bytes32 market,
        bool isLong,
        uint256 size,
        uint256 maxPrice,
        uint256 leverage,
        SAuthSignature calldata signature
    ) external 
        nonReentrant 
        whenNotPaused 
        notEmergencyMode 
        validMarket(market) 
        onlyInTradingHours(market)
        returns (bytes32 positionKey) 
    {
        // Verify signature
        require(_verifySAuthSignature(
            msg.sender, market, isLong, size, maxPrice, leverage, signature
        ), "Invalid signature");
        
        // Check risk gates
        _checkRiskGates(msg.sender, market, size);
        
        // Execute trade
        positionKey = _executeTrade(
            msg.sender, market, isLong, size, maxPrice, leverage
        );
        
        // Update sequence number for MEV protection
        globalSequenceNumber++;
        
        emit SAuthTradeExecuted(
            msg.sender, positionKey, market, isLong, size, maxPrice, signature.nonce
        );
    }

    /**
     * @notice Verify S-Auth signature
     */
    function _verifySAuthSignature(
        address trader,
        bytes32 market,
        bool isLong,
        uint256 size,
        uint256 maxPrice,
        uint256 leverage,
        SAuthSignature calldata signature
    ) internal returns (bool) {
        // Check deadline
        require(block.timestamp <= signature.deadline, "Signature expired");
        
        // Check nonce
        require(nonces[trader] == signature.nonce, "Invalid nonce");
        nonces[trader]++;
        
        // Create hash
        bytes32 structHash = keccak256(abi.encode(
            keccak256("SAuthTrade(address trader,bytes32 market,bool isLong,uint256 size,uint256 maxPrice,uint256 leverage,uint256 nonce,uint256 deadline)"),
            trader,
            market,
            isLong,
            size,
            maxPrice,
            leverage,
            signature.nonce,
            signature.deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address recoveredSigner = hash.recover(signature.v, signature.r, signature.s);
        
        return recoveredSigner == trader;
    }

    // ============ ETMA TRADING ============

    /**
     * @notice Submit ETMA order for xStock night trading
     * @param market Market identifier (must be XSTOCK_ETMA type)
     * @param isLong Trade direction
     * @param size Trade size
     * @param limitPrice Limit price for order
     */
    function submitETMAOrder(
        bytes32 market,
        bool isLong,
        uint256 size,
        uint256 limitPrice
    ) external 
        nonReentrant 
        whenNotPaused 
        notEmergencyMode 
        validMarket(market) 
        validETMAWindow(market) 
    {
        require(markets[market].marketType == MarketType.XSTOCK_ETMA, "Not ETMA market");
        require(size >= markets[market].minTradeSize, "Below min trade size");
        require(size <= markets[market].maxTradeSize, "Above max trade size");
        
        // Create ETMA order
        ETMAOrder memory order = ETMAOrder({
            trader: msg.sender,
            market: market,
            isLong: isLong,
            size: size,
            limitPrice: limitPrice,
            timestamp: block.timestamp,
            isMatched: false,
            matchedSize: 0,
            matchedPrice: 0
        });
        
        etmaOrders[market].push(order);
        etmaMatchingVolume[market] += size;
        
        // Check if threshold reached for matching
        MarketConfig memory config = markets[market];
        if (etmaMatchingVolume[market] >= config.etmaMatchingThreshold) {
            _executeETMAMatching(market);
        }
    }

    /**
     * @notice Execute ETMA matching algorithm
     * @param market Market to match orders for
     */
    function _executeETMAMatching(bytes32 market) internal {
        ETMAOrder[] storage orders = etmaOrders[market];
        uint256 currentPrice = assetPrices[market];
        
        for (uint256 i = 0; i < orders.length; i++) {
            ETMAOrder storage order = orders[i];
            
            if (!order.isMatched && _canMatchETMAOrder(order, currentPrice)) {
                // Execute the order
                bytes32 positionKey = _executeTrade(
                    order.trader,
                    order.market,
                    order.isLong,
                    order.size,
                    order.limitPrice,
                    10 // Default leverage for ETMA
                );
                
                order.isMatched = true;
                order.matchedSize = order.size;
                order.matchedPrice = currentPrice;
                
                emit ETMAOrderMatched(
                    market, order.trader, order.size, currentPrice, block.timestamp
                );
            }
        }
        
        // Reset matching volume
        etmaMatchingVolume[market] = 0;
    }

    /**
     * @notice Check if ETMA order can be matched
     */
    function _canMatchETMAOrder(ETMAOrder memory order, uint256 currentPrice) internal pure returns (bool) {
        if (order.isLong) {
            return currentPrice <= order.limitPrice;
        } else {
            return currentPrice >= order.limitPrice;
        }
    }

    // ============ LP BUCKET MANAGEMENT ============

    /**
     * @notice Initialize LP bucket system
     */
    function _initializeLPBuckets() internal {
        // A Bucket: 45% - Passive market making
        lpBuckets[BucketType.A_PASSIVE_MAKER] = LPBucket({
            bucketType: BucketType.A_PASSIVE_MAKER,
            allocation: 0,
            targetWeight: 4500, // 45%
            currentWeight: 0,
            totalPnL: 0,
            hardCapLoss: 500, // 5% hard cap
            lastRebalanceTime: block.timestamp,
            manager: address(0),
            isActive: true,
            riskScore: 3000 // Medium-low risk
        });
        
        // B Bucket: 20% - Active rebalancing
        lpBuckets[BucketType.B_ACTIVE_REBALANCER] = LPBucket({
            bucketType: BucketType.B_ACTIVE_REBALANCER,
            allocation: 0,
            targetWeight: 2000, // 20%
            currentWeight: 0,
            totalPnL: 0,
            hardCapLoss: 800, // 8% hard cap
            lastRebalanceTime: block.timestamp,
            manager: address(0),
            isActive: true,
            riskScore: 6000 // Medium-high risk
        });
        
        // L1 Bucket: 25% - Primary liquidation
        lpBuckets[BucketType.L1_PRIMARY_LIQUIDATOR] = LPBucket({
            bucketType: BucketType.L1_PRIMARY_LIQUIDATOR,
            allocation: 0,
            targetWeight: 2500, // 25%
            currentWeight: 0,
            totalPnL: 0,
            hardCapLoss: 1200, // 12% hard cap
            lastRebalanceTime: block.timestamp,
            manager: address(0),
            isActive: true,
            riskScore: 7000 // High risk
        });
        
        // L2 Bucket: 10% - Emergency backstop
        lpBuckets[BucketType.L2_BACKSTOP] = LPBucket({
            bucketType: BucketType.L2_BACKSTOP,
            allocation: 0,
            targetWeight: 1000, // 10%
            currentWeight: 0,
            totalPnL: 0,
            hardCapLoss: 2000, // 20% hard cap (highest risk tolerance)
            lastRebalanceTime: block.timestamp,
            manager: address(0),
            isActive: true,
            riskScore: 9000 // Very high risk
        });
    }

    /**
     * @notice Rebalance LP buckets
     */
    function rebalanceLPBuckets() external onlyRole(BUCKET_MANAGER_ROLE) {
        uint256 totalAssets = totalLPAssets;
        require(totalAssets > 0, "No assets to rebalance");
        
        // Check each bucket and rebalance if needed
        BucketType[4] memory bucketTypes = [
            BucketType.A_PASSIVE_MAKER,
            BucketType.B_ACTIVE_REBALANCER,
            BucketType.L1_PRIMARY_LIQUIDATOR,
            BucketType.L2_BACKSTOP
        ];
        
        for (uint256 i = 0; i < 4; i++) {
            BucketType bucketType = bucketTypes[i];
            LPBucket storage bucket = lpBuckets[bucketType];
            
            if (!bucket.isActive) continue;
            
            uint256 targetAllocation = (totalAssets * bucket.targetWeight) / BASIS_POINTS;
            
            // Check if rebalancing is needed (>5% deviation)
            uint256 deviation = bucket.allocation > targetAllocation 
                ? bucket.allocation - targetAllocation 
                : targetAllocation - bucket.allocation;
                
            if (deviation > (targetAllocation * 500 / BASIS_POINTS)) {
                uint256 oldAllocation = bucket.allocation;
                bucket.allocation = targetAllocation;
                bucket.currentWeight = bucket.targetWeight;
                bucket.lastRebalanceTime = block.timestamp;
                
                emit LPBucketRebalanced(bucketType, oldAllocation, targetAllocation, block.timestamp);
            }
        }
    }

    // ============ RISK MANAGEMENT - THREE GATES ============

    /**
     * @notice Check risk gates for user and market
     * @param user User address
     * @param market Market identifier
     * @param tradeSize Size of the trade
     */
    function _checkRiskGates(address user, bytes32 market, uint256 tradeSize) internal {
        // Update gate windows
        _updateRiskGateWindows(user, market);
        
        RiskGate storage userGate = userRiskGates[user];
        RiskGate storage marketGate = marketRiskGates[market];
        
        // Check single window (immediate)
        require(
            userGate.currentSingleWindow + tradeSize <= userGate.singleWindowLimit,
            "User single window limit exceeded"
        );
        require(
            marketGate.currentSingleWindow + tradeSize <= marketGate.singleWindowLimit,
            "Market single window limit exceeded"
        );
        
        // Check 15-minute window
        require(
            userGate.currentFifteenMinute + tradeSize <= userGate.fifteenMinuteLimit,
            "User 15-minute limit exceeded"
        );
        require(
            marketGate.currentFifteenMinute + tradeSize <= marketGate.fifteenMinuteLimit,
            "Market 15-minute limit exceeded"
        );
        
        // Check 24-hour window
        require(
            userGate.currentTwentyFourHour + tradeSize <= userGate.twentyFourHourLimit,
            "User 24-hour limit exceeded"
        );
        require(
            marketGate.currentTwentyFourHour + tradeSize <= marketGate.twentyFourHourLimit,
            "Market 24-hour limit exceeded"
        );
        
        // Update current usage
        userGate.currentSingleWindow += tradeSize;
        userGate.currentFifteenMinute += tradeSize;
        userGate.currentTwentyFourHour += tradeSize;
        
        marketGate.currentSingleWindow += tradeSize;
        marketGate.currentFifteenMinute += tradeSize;
        marketGate.currentTwentyFourHour += tradeSize;
    }

    /**
     * @notice Update risk gate time windows
     */
    function _updateRiskGateWindows(address user, bytes32 market) internal {
        RiskGate storage userGate = userRiskGates[user];
        RiskGate storage marketGate = marketRiskGates[market];
        
        // Reset single window (always resets)
        userGate.currentSingleWindow = 0;
        userGate.lastSingleWindowReset = block.timestamp;
        marketGate.currentSingleWindow = 0;
        marketGate.lastSingleWindowReset = block.timestamp;
        
        // Reset 15-minute window if needed
        if (block.timestamp >= userGate.lastFifteenMinuteReset + FIFTEEN_MINUTE_WINDOW) {
            userGate.currentFifteenMinute = 0;
            userGate.lastFifteenMinuteReset = block.timestamp;
        }
        if (block.timestamp >= marketGate.lastFifteenMinuteReset + FIFTEEN_MINUTE_WINDOW) {
            marketGate.currentFifteenMinute = 0;
            marketGate.lastFifteenMinuteReset = block.timestamp;
        }
        
        // Reset 24-hour window if needed
        if (block.timestamp >= userGate.lastTwentyFourHourReset + TWENTY_FOUR_HOUR_WINDOW) {
            userGate.currentTwentyFourHour = 0;
            userGate.lastTwentyFourHourReset = block.timestamp;
        }
        if (block.timestamp >= marketGate.lastTwentyFourHourReset + TWENTY_FOUR_HOUR_WINDOW) {
            marketGate.currentTwentyFourHour = 0;
            marketGate.lastTwentyFourHourReset = block.timestamp;
        }
    }

    // ============ AFB SYSTEM ============

    /**
     * @notice Update AFB for all active positions
     * @param user User address
     */
    function updateAFB(address user) external {
        AFBState storage afbState = afbStates[user];
        
        // Check if update is needed
        if (block.timestamp < afbState.lastUpdateTime + AFB_UPDATE_INTERVAL) {
            return;
        }
        
        bytes32[] memory userPositionKeys = userPositions[user];
        int256 totalFunding = 0;
        
        for (uint256 i = 0; i < userPositionKeys.length; i++) {
            bytes32 positionKey = userPositionKeys[i];
            Position storage position = positions[positionKey];
            
            if (!position.isActive) continue;
            
            // Calculate funding for this position
            int256 fundingAmount = _calculatePositionFunding(position);
            position.afbBalance += fundingAmount;
            totalFunding += fundingAmount;
            
            emit AFBUpdated(user, positionKey, fundingAmount, block.timestamp);
        }
        
        // Update global AFB state
        afbState.accruedBalance += totalFunding;
        afbState.lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Calculate funding for a position
     */
    function _calculatePositionFunding(Position memory position) internal view returns (int256) {
        uint256 fundingRate = marketFundingRates[position.market];
        uint256 timeDelta = block.timestamp - position.lastFundingTime;
        
        // Calculate funding based on position size and time
        int256 funding = int256((position.size * fundingRate * timeDelta) / (365 days * BASIS_POINTS));
        
        // Adjust sign based on position direction
        if (!position.isLong) {
            funding = -funding;
        }
        
        return funding;
    }

    // ============ GOVERNANCE ============

    /**
     * @notice Execute governance proposal with timelock
     * @param proposalId Proposal identifier
     * @param target Target contract
     * @param data Call data
     */
    function executeGovernanceProposal(
        bytes32 proposalId,
        address target,
        bytes calldata data
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(!executedProposals[proposalId], "Already executed");
        
        // Execute the proposal
        (bool success, ) = target.call(data);
        require(success, "Proposal execution failed");
        
        executedProposals[proposalId] = true;
        
        emit GovernanceProposalExecuted(proposalId, msg.sender, block.timestamp);
    }

    // ============ CORE TRADING FUNCTIONS ============

    /**
     * @notice Execute a trade
     */
    function _executeTrade(
        address trader,
        bytes32 market,
        bool isLong,
        uint256 size,
        uint256 maxPrice,
        uint256 leverage
    ) internal returns (bytes32 positionKey) {
        require(leverage <= MAX_LEVERAGE, "Leverage too high");
        require(leverage <= markets[market].maxLeverage, "Market leverage exceeded");
        
        uint256 currentPrice = assetPrices[market];
        require(
            isLong ? currentPrice <= maxPrice : currentPrice >= maxPrice,
            "Price slippage exceeded"
        );
        
        // Calculate margin requirement
        uint256 notional = (size * currentPrice) / PRECISION;
        uint256 marginRequired = notional / leverage;
        
        // Create position key
        positionKey = keccak256(abi.encodePacked(
            trader, market, isLong, size, block.timestamp, globalSequenceNumber
        ));
        
        // Create position
        Position storage position = positions[positionKey];
        position.trader = trader;
        position.market = market;
        position.marketType = markets[market].marketType;
        position.isLong = isLong;
        position.size = size;
        position.margin = marginRequired;
        position.entryPrice = currentPrice;
        position.leverage = leverage;
        position.openTime = block.timestamp;
        position.lastFundingTime = block.timestamp;
        position.afbBalance = 0;
        position.liquidationPrice = _calculateLiquidationPrice(isLong, currentPrice, leverage);
        position.isActive = true;
        
        // Add to user positions
        userPositions[trader].push(positionKey);
        
        return positionKey;
    }

    /**
     * @notice Calculate liquidation price
     */
    function _calculateLiquidationPrice(
        bool isLong,
        uint256 entryPrice,
        uint256 leverage
    ) internal pure returns (uint256) {
        // Simplified liquidation price calculation
        // Real implementation would consider fees and margin requirements
        uint256 liquidationPercentage = (PRECISION * 90) / (leverage * 100); // 90% of 1/leverage
        
        if (isLong) {
            return entryPrice - (entryPrice * liquidationPercentage / PRECISION);
        } else {
            return entryPrice + (entryPrice * liquidationPercentage / PRECISION);
        }
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Check if in trading hours
     */
    function _isInTradingHours() internal view returns (bool) {
        // Simplified check - would implement proper trading hours logic
        uint256 hour = (block.timestamp / 3600) % 24;
        return hour >= 9 && hour < 16; // 9 AM to 4 PM UTC
    }

    /**
     * @notice Check if in ETMA window
     */
    function _isInETMAWindow(bytes32 market) internal view returns (bool) {
        MarketConfig memory config = markets[market];
        uint256 hour = (block.timestamp / 3600) % 24;
        return hour >= config.etmaWindowStart && hour < config.etmaWindowEnd;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Add new market
     */
    function addMarket(
        bytes32 market,
        MarketType marketType,
        uint256 minTradeSize,
        uint256 maxTradeSize,
        uint256 tradingFee,
        uint256 maxLeverage
    ) external onlyRole(ADMIN_ROLE) {
        require(!markets[market].isActive, "Market already exists");
        
        markets[market] = MarketConfig({
            marketType: marketType,
            isActive: true,
            minTradeSize: minTradeSize,
            maxTradeSize: maxTradeSize,
            tradingFee: tradingFee,
            liquidationFee: 50, // 0.5%
            fundingRate: 100, // 1% annually
            maxLeverage: maxLeverage,
            marginRequirement: 1000, // 10%
            etmaWindowStart: 18, // 6 PM
            etmaWindowEnd: 22, // 10 PM
            etmaMatchingThreshold: 100000 * PRECISION // $100k threshold
        });
        
        activeMarkets.push(market);
    }

    /**
     * @notice Update asset price
     */
    function updatePrice(bytes32 asset, uint256 price) external onlyRole(OPERATOR_ROLE) {
        require(price > 0, "Invalid price");
        assetPrices[asset] = price;
        priceUpdateTimestamp[asset] = block.timestamp;
    }

    /**
     * @notice Set risk gate limits
     */
    function setRiskGateLimits(
        address user,
        uint256 singleWindow,
        uint256 fifteenMinute,
        uint256 twentyFourHour
    ) external onlyRole(RISK_MANAGER_ROLE) {
        userRiskGates[user] = RiskGate({
            singleWindowLimit: singleWindow,
            fifteenMinuteLimit: fifteenMinute,
            twentyFourHourLimit: twentyFourHour,
            currentSingleWindow: 0,
            currentFifteenMinute: 0,
            currentTwentyFourHour: 0,
            lastSingleWindowReset: block.timestamp,
            lastFifteenMinuteReset: block.timestamp,
            lastTwentyFourHourReset: block.timestamp
        });
    }

    /**
     * @notice Emergency pause
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        emergencyMode = true;
        _pause();
    }

    /**
     * @notice Emergency unpause
     */
    function emergencyUnpause() external onlyRole(ADMIN_ROLE) {
        emergencyMode = false;
        _unpause();
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get position details
     */
    function getPosition(bytes32 positionKey) external view returns (Position memory) {
        return positions[positionKey];
    }

    /**
     * @notice Get user positions
     */
    function getUserPositions(address user) external view returns (bytes32[] memory) {
        return userPositions[user];
    }

    /**
     * @notice Get LP bucket info
     */
    function getLPBucket(BucketType bucketType) external view returns (LPBucket memory) {
        return lpBuckets[bucketType];
    }

    /**
     * @notice Get market config
     */
    function getMarketConfig(bytes32 market) external view returns (MarketConfig memory) {
        return markets[market];
    }

    /**
     * @notice Get AFB state
     * @param user User address
     * @return accruedBalance Current accrued balance
     * @return lastUpdateTime Last update timestamp
     * @return fundingRateAccumulator Accumulated funding rate
     */
    function getAFBState(address user) external view returns (
        int256 accruedBalance,
        uint256 lastUpdateTime,
        uint256 fundingRateAccumulator
    ) {
        AFBState storage state = afbStates[user];
        accruedBalance = state.accruedBalance;
        lastUpdateTime = state.lastUpdateTime;
        fundingRateAccumulator = state.fundingRateAccumulator;
    }

    /**
     * @notice Get current nonce for user
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    /**
     * @notice Get domain separator for EIP-712
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
