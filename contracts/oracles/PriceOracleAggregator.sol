// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IRiverBitCoreV3.sol";

/**
 * @title PriceOracleAggregator
 * @notice Multi-source price oracle system with health scoring and FBL protection
 * @dev Aggregates price feeds from multiple sources with confidence scoring and market-specific logic
 * 
 * Key Features:
 * - Multi-source price aggregation with weighted averaging
 * - Health scoring system (0-100) for each oracle source
 * - FBL (First Bar Lock) protection for market open periods
 * - ETMA (Event-Triggered Market Auction) integration for stocks
 * - Circuit breakers and deviation detection
 * - Crypto and stock market specialized logic
 */
contract PriceOracleAggregator is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using Math for uint256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");
    bytes32 public constant PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_DEVIATION = 1000; // 10% max deviation
    uint256 private constant MIN_HEALTH_SCORE = 50; // Minimum health score to use oracle
    uint256 private constant CONFIDENCE_THRESHOLD = 70; // Minimum confidence for price acceptance
    uint256 private constant FBL_DURATION = 15 minutes; // First Bar Lock duration

    // ============ ENUMS ============
    enum OracleType {
        CHAINLINK,
        PYTH,
        BINANCE,
        COINBASE,
        NASDAQ, // For stock prices
        POLYGON, // For alternative stock data
        CUSTOM
    }

    enum MarketSession {
        CLOSED,        // Market closed
        PRE_MARKET,    // Pre-market session
        REGULAR,       // Regular trading hours
        AFTER_HOURS,   // After-hours session
        FBL_ACTIVE,    // First Bar Lock active
        ETMA_ACTIVE    // Event-Triggered Market Auction active
    }

    enum PriceStatus {
        HEALTHY,       // Price is healthy and usable
        STALE,         // Price is stale but usable with caution
        SUSPICIOUS,    // Price shows suspicious movement
        FAILED,        // Oracle failed to provide price
        BLACKLISTED    // Oracle is temporarily blacklisted
    }

    // ============ STRUCTS ============

    struct OracleSource {
        address oracleAddress;
        OracleType oracleType;
        uint256 weight;                 // Weight in aggregation (basis points)
        uint256 healthScore;            // 0-100 health score
        uint256 maxDeviation;           // Maximum allowed price deviation
        uint256 heartbeat;              // Maximum staleness tolerance
        uint256 lastUpdateTime;
        uint256 lastPrice;
        PriceStatus status;
        bool isActive;
        bool isCrypto;                  // Whether this oracle handles crypto
        bool isStock;                   // Whether this oracle handles stocks
        string description;
    }

    struct MarketConfig {
        bytes32 symbol;
        IRiverBitCoreV3.MarketType marketType;
        bool isActive;
        uint256 confidenceThreshold;
        uint256 maxPriceAge;
        uint256 fblStartTime;           // Daily FBL start time (UTC seconds)
        uint256 fblEndTime;             // Daily FBL end time (UTC seconds)
        uint256 marketOpenTime;         // Daily market open (UTC seconds)
        uint256 marketCloseTime;        // Daily market close (UTC seconds)
        bool isFBLEnabled;
        bool requiresETMA;              // Whether market requires ETMA for after-hours
        uint256[] oracleIds;           // Array of oracle IDs for this market
    }

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 confidence;             // 0-100 confidence score
        uint256 sourceCount;            // Number of sources used
        MarketSession session;
        bool isFBLActive;
        bool isHealthy;
        uint256 blockNumber;
    }

    struct HealthMetrics {
        uint256 successfulUpdates;
        uint256 failedUpdates;
        uint256 totalDeviations;
        uint256 maxDeviation;
        uint256 lastFailureTime;
        uint256 uptimePercentage;
        uint256 averageResponseTime;
        bool isUnderReview;
    }

    struct FBLStatus {
        bool isActive;
        uint256 startTime;
        uint256 endTime;
        uint256 lockedPrice;
        uint256 lastValidPrice;
        uint256 violationCount;
    }

    struct AggregationParams {
        uint256 minSources;             // Minimum sources required
        uint256 maxSources;             // Maximum sources to use
        bool useWeightedAverage;
        bool excludeOutliers;
        uint256 outlierThreshold;       // Basis points
        bool requireCryptoSources;
        bool requireStockSources;
    }

    // ============ STATE VARIABLES ============

    mapping(uint256 => OracleSource) public oracles;
    uint256 public oracleCounter;

    mapping(bytes32 => MarketConfig) public markets;
    mapping(bytes32 => PriceData) public currentPrices;
    mapping(bytes32 => FBLStatus) public fblStatus;
    mapping(uint256 => HealthMetrics) public oracleHealth;

    // Oracle combinations for different scenarios
    mapping(bytes32 => AggregationParams) public aggregationParams;
    
    // Price history for trend analysis
    mapping(bytes32 => mapping(uint256 => uint256)) public priceHistory;
    mapping(bytes32 => uint256) public priceHistoryIndex;

    // Emergency controls
    bool public emergencyMode;
    mapping(bytes32 => bool) public marketEmergencyPause;
    mapping(uint256 => bool) public oracleEmergencyPause;

    // System parameters
    uint256 public globalConfidenceThreshold;
    uint256 public maxPriceAge;
    uint256 public priceHistoryDepth;
    address public etmaEngine;

    // ============ EVENTS ============

    event OracleAdded(
        uint256 indexed oracleId,
        address indexed oracleAddress,
        OracleType oracleType,
        uint256 weight,
        string description
    );

    event OracleUpdated(
        uint256 indexed oracleId,
        uint256 newWeight,
        uint256 newHealthScore,
        PriceStatus newStatus
    );

    event PriceUpdated(
        bytes32 indexed market,
        uint256 price,
        uint256 confidence,
        uint256 sourceCount,
        MarketSession session,
        uint256 timestamp
    );

    event HealthScoreUpdated(
        uint256 indexed oracleId,
        uint256 oldScore,
        uint256 newScore,
        string reason
    );

    event FBLActivated(
        bytes32 indexed market,
        uint256 startTime,
        uint256 endTime,
        uint256 lockedPrice
    );

    event FBLViolationDetected(
        bytes32 indexed market,
        uint256 attemptedPrice,
        uint256 lockedPrice,
        uint256 violationCount
    );

    event AggregationFailed(
        bytes32 indexed market,
        string reason,
        uint256 availableSources,
        uint256 requiredSources
    );

    event EmergencyAction(
        string action,
        address indexed admin,
        string reason,
        uint256 timestamp
    );

    event MarketSessionChanged(
        bytes32 indexed market,
        MarketSession oldSession,
        MarketSession newSession,
        uint256 timestamp
    );

    // ============ MODIFIERS ============

    modifier onlyActiveOracle(uint256 oracleId) {
        require(oracles[oracleId].isActive, "Oracle not active");
        require(!oracleEmergencyPause[oracleId], "Oracle emergency paused");
        _;
    }

    modifier onlyActiveMarket(bytes32 market) {
        require(markets[market].isActive, "Market not active");
        require(!marketEmergencyPause[market], "Market emergency paused");
        _;
    }

    modifier notEmergencyMode() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    // ============ INITIALIZATION ============

    function initialize(
        address _admin,
        address _etmaEngine
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();

        require(_admin != address(0), "Invalid admin");
        require(_etmaEngine != address(0), "Invalid ETMA engine");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(ORACLE_MANAGER_ROLE, _admin);
        _grantRole(PRICE_UPDATER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);

        etmaEngine = _etmaEngine;
        globalConfidenceThreshold = CONFIDENCE_THRESHOLD;
        maxPriceAge = 5 minutes;
        priceHistoryDepth = 100;
    }

    // ============ ORACLE MANAGEMENT ============

    /**
     * @notice Add new oracle source
     * @param oracleAddress Oracle contract address
     * @param oracleType Type of oracle
     * @param weight Weight in aggregation
     * @param maxDeviation Maximum price deviation allowed
     * @param heartbeat Maximum staleness tolerance
     * @param isCrypto Whether oracle handles crypto
     * @param isStock Whether oracle handles stocks
     * @param description Oracle description
     */
    function addOracle(
        address oracleAddress,
        OracleType oracleType,
        uint256 weight,
        uint256 maxDeviation,
        uint256 heartbeat,
        bool isCrypto,
        bool isStock,
        string calldata description
    ) external onlyRole(ORACLE_MANAGER_ROLE) {
        require(oracleAddress != address(0), "Invalid oracle address");
        require(weight <= BASIS_POINTS, "Weight too high");
        require(maxDeviation <= MAX_DEVIATION, "Deviation too high");

        uint256 oracleId = ++oracleCounter;

        oracles[oracleId] = OracleSource({
            oracleAddress: oracleAddress,
            oracleType: oracleType,
            weight: weight,
            healthScore: 100, // Start with perfect health
            maxDeviation: maxDeviation,
            heartbeat: heartbeat,
            lastUpdateTime: 0,
            lastPrice: 0,
            status: PriceStatus.HEALTHY,
            isActive: true,
            isCrypto: isCrypto,
            isStock: isStock,
            description: description
        });

        // Initialize health metrics
        oracleHealth[oracleId] = HealthMetrics({
            successfulUpdates: 0,
            failedUpdates: 0,
            totalDeviations: 0,
            maxDeviation: 0,
            lastFailureTime: 0,
            uptimePercentage: 100,
            averageResponseTime: 0,
            isUnderReview: false
        });

        emit OracleAdded(oracleId, oracleAddress, oracleType, weight, description);
    }

    /**
     * @notice Update oracle health score and status
     * @param oracleId Oracle ID
     * @param newHealthScore New health score (0-100)
     * @param newStatus New status
     * @param reason Reason for update
     */
    function updateOracleHealth(
        uint256 oracleId,
        uint256 newHealthScore,
        PriceStatus newStatus,
        string calldata reason
    ) external onlyRole(ORACLE_MANAGER_ROLE) {
        require(oracleId <= oracleCounter, "Invalid oracle ID");
        require(newHealthScore <= 100, "Invalid health score");

        uint256 oldScore = oracles[oracleId].healthScore;
        oracles[oracleId].healthScore = newHealthScore;
        oracles[oracleId].status = newStatus;

        // Automatically deactivate if health is too low
        if (newHealthScore < MIN_HEALTH_SCORE) {
            oracles[oracleId].isActive = false;
        }

        emit HealthScoreUpdated(oracleId, oldScore, newHealthScore, reason);
        emit OracleUpdated(oracleId, oracles[oracleId].weight, newHealthScore, newStatus);
    }

    // ============ MARKET MANAGEMENT ============

    /**
     * @notice Add or update market configuration
     * @param symbol Market symbol
     * @param marketType Market type (CRYPTO or STOCK)
     * @param confidenceThreshold Minimum confidence threshold
     * @param fblStartTime Daily FBL start time (UTC seconds from midnight)
     * @param fblEndTime Daily FBL end time (UTC seconds from midnight)
     * @param marketOpenTime Daily market open time (UTC seconds from midnight)
     * @param marketCloseTime Daily market close time (UTC seconds from midnight)
     * @param isFBLEnabled Whether FBL is enabled
     * @param requiresETMA Whether market requires ETMA
     * @param oracleIds Array of oracle IDs for this market
     */
    function updateMarket(
        bytes32 symbol,
        IRiverBitCoreV3.MarketType marketType,
        uint256 confidenceThreshold,
        uint256 fblStartTime,
        uint256 fblEndTime,
        uint256 marketOpenTime,
        uint256 marketCloseTime,
        bool isFBLEnabled,
        bool requiresETMA,
        uint256[] calldata oracleIds
    ) external onlyRole(ADMIN_ROLE) {
        require(symbol != bytes32(0), "Invalid symbol");
        require(confidenceThreshold <= 100, "Invalid confidence threshold");
        require(oracleIds.length > 0, "No oracles specified");

        // Validate oracle IDs
        for (uint256 i = 0; i < oracleIds.length; i++) {
            require(oracleIds[i] <= oracleCounter, "Invalid oracle ID");
            
            // Check if oracle is suitable for market type
            if (marketType == IRiverBitCoreV3.MarketType.CRYPTO) {
                require(oracles[oracleIds[i]].isCrypto, "Oracle not suitable for crypto");
            } else {
                require(oracles[oracleIds[i]].isStock, "Oracle not suitable for stocks");
            }
        }

        markets[symbol] = MarketConfig({
            symbol: symbol,
            marketType: marketType,
            isActive: true,
            confidenceThreshold: confidenceThreshold,
            maxPriceAge: maxPriceAge,
            fblStartTime: fblStartTime,
            fblEndTime: fblEndTime,
            marketOpenTime: marketOpenTime,
            marketCloseTime: marketCloseTime,
            isFBLEnabled: isFBLEnabled,
            requiresETMA: requiresETMA,
            oracleIds: oracleIds
        });

        // Initialize aggregation parameters
        if (marketType == IRiverBitCoreV3.MarketType.CRYPTO) {
            aggregationParams[symbol] = AggregationParams({
                minSources: 2,
                maxSources: 5,
                useWeightedAverage: true,
                excludeOutliers: true,
                outlierThreshold: 500, // 5%
                requireCryptoSources: true,
                requireStockSources: false
            });
        } else {
            aggregationParams[symbol] = AggregationParams({
                minSources: 1,
                maxSources: 3,
                useWeightedAverage: true,
                excludeOutliers: false,
                outlierThreshold: 200, // 2%
                requireCryptoSources: false,
                requireStockSources: true
            });
        }
    }

    // ============ PRICE UPDATE FUNCTIONS ============

    /**
     * @notice Update price from multiple oracle sources
     * @param market Market symbol
     * @param oracleData Array of oracle price data
     * @return aggregatedPrice Final aggregated price
     */
    function updatePrice(
        bytes32 market,
        IRiverBitCoreV3.OracleData[] calldata oracleData
    )
        external
        onlyRole(PRICE_UPDATER_ROLE)
        onlyActiveMarket(market)
        notEmergencyMode
        returns (uint256 aggregatedPrice)
    {
        require(oracleData.length > 0, "No oracle data provided");
        
        MarketConfig storage marketConfig = markets[market];
        MarketSession currentSession = _getCurrentMarketSession(market);
        
        // Check FBL status
        bool shouldCheckFBL = marketConfig.isFBLEnabled && 
                             _shouldEnforceFBL(market, currentSession);
        
        if (shouldCheckFBL && fblStatus[market].isActive) {
            _checkFBLViolation(market, oracleData);
        }

        // Validate and filter oracle data
        uint256[] memory validPrices = new uint256[](oracleData.length);
        uint256[] memory weights = new uint256[](oracleData.length);
        uint256 validCount = 0;

        for (uint256 i = 0; i < oracleData.length; i++) {
            if (_validateOracleData(market, oracleData[i])) {
                validPrices[validCount] = oracleData[i].price;
                weights[validCount] = _getOracleWeight(oracleData[i].oracle);
                validCount++;
            }
        }

        require(validCount >= aggregationParams[market].minSources, "Insufficient valid sources");

        // Aggregate prices
        (aggregatedPrice, uint256 confidence) = _aggregatePrices(
            market,
            validPrices,
            weights,
            validCount
        );

        require(confidence >= marketConfig.confidenceThreshold, "Confidence too low");

        // Update price data
        currentPrices[market] = PriceData({
            price: aggregatedPrice,
            timestamp: block.timestamp,
            confidence: confidence,
            sourceCount: validCount,
            session: currentSession,
            isFBLActive: fblStatus[market].isActive,
            isHealthy: confidence >= globalConfidenceThreshold,
            blockNumber: block.number
        });

        // Store in price history
        _updatePriceHistory(market, aggregatedPrice);

        // Update oracle health metrics
        _updateOracleHealthMetrics(market, oracleData, validCount);

        // Check if FBL should be activated
        if (shouldCheckFBL && !fblStatus[market].isActive) {
            _activateFBL(market, aggregatedPrice);
        }

        emit PriceUpdated(market, aggregatedPrice, confidence, validCount, currentSession, block.timestamp);

        return aggregatedPrice;
    }

    /**
     * @notice Force price update during emergency
     * @param market Market symbol
     * @param price Emergency price
     * @param reason Reason for emergency update
     */
    function emergencyPriceUpdate(
        bytes32 market,
        uint256 price,
        string calldata reason
    ) external onlyRole(EMERGENCY_ROLE) {
        require(price > 0, "Invalid price");
        
        currentPrices[market] = PriceData({
            price: price,
            timestamp: block.timestamp,
            confidence: 0, // Mark as emergency
            sourceCount: 0,
            session: MarketSession.CLOSED,
            isFBLActive: false,
            isHealthy: false,
            blockNumber: block.number
        });

        emit PriceUpdated(market, price, 0, 0, MarketSession.CLOSED, block.timestamp);
        emit EmergencyAction("EMERGENCY_PRICE_UPDATE", msg.sender, reason, block.timestamp);
    }

    // ============ PRICE AGGREGATION ============

    /**
     * @notice Aggregate prices from multiple sources
     * @param market Market symbol
     * @param prices Array of valid prices
     * @param weights Array of weights
     * @param count Number of valid prices
     * @return aggregatedPrice Aggregated price
     * @return confidence Confidence score
     */
    function _aggregatePrices(
        bytes32 market,
        uint256[] memory prices,
        uint256[] memory weights,
        uint256 count
    ) internal view returns (uint256 aggregatedPrice, uint256 confidence) {
        AggregationParams memory params = aggregationParams[market];
        
        // Limit to max sources
        if (count > params.maxSources) {
            count = params.maxSources;
        }

        // Remove outliers if enabled
        if (params.excludeOutliers && count > 2) {
            (prices, weights, count) = _removeOutliers(prices, weights, count, params.outlierThreshold);
        }

        // Calculate weighted average
        if (params.useWeightedAverage) {
            (aggregatedPrice, confidence) = _calculateWeightedAverage(prices, weights, count);
        } else {
            (aggregatedPrice, confidence) = _calculateSimpleAverage(prices, count);
        }

        // Adjust confidence based on source count and variance
        confidence = _adjustConfidenceScore(confidence, count, prices, aggregatedPrice);

        return (aggregatedPrice, confidence);
    }

    /**
     * @notice Calculate weighted average of prices
     * @param prices Array of prices
     * @param weights Array of weights
     * @param count Number of elements
     * @return weightedPrice Weighted average price
     * @return confidence Base confidence score
     */
    function _calculateWeightedAverage(
        uint256[] memory prices,
        uint256[] memory weights,
        uint256 count
    ) internal pure returns (uint256 weightedPrice, uint256 confidence) {
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;

        for (uint256 i = 0; i < count; i++) {
            weightedSum += prices[i] * weights[i];
            totalWeight += weights[i];
        }

        require(totalWeight > 0, "No valid weights");
        
        weightedPrice = weightedSum / totalWeight;
        confidence = totalWeight > BASIS_POINTS ? 100 : (totalWeight * 100) / BASIS_POINTS;

        return (weightedPrice, confidence);
    }

    /**
     * @notice Calculate simple average of prices
     * @param prices Array of prices
     * @param count Number of elements
     * @return averagePrice Simple average price
     * @return confidence Base confidence score
     */
    function _calculateSimpleAverage(
        uint256[] memory prices,
        uint256 count
    ) internal pure returns (uint256 averagePrice, uint256 confidence) {
        uint256 sum = 0;
        
        for (uint256 i = 0; i < count; i++) {
            sum += prices[i];
        }
        
        averagePrice = sum / count;
        confidence = count >= 3 ? 100 : (count * 33); // 33% per source, max 100%

        return (averagePrice, confidence);
    }

    /**
     * @notice Remove outlier prices
     * @param prices Array of prices
     * @param weights Array of weights
     * @param count Number of elements
     * @param threshold Outlier threshold in basis points
     * @return filteredPrices Prices without outliers
     * @return filteredWeights Weights without outliers
     * @return newCount New count after filtering
     */
    function _removeOutliers(
        uint256[] memory prices,
        uint256[] memory weights,
        uint256 count,
        uint256 threshold
    ) internal pure returns (
        uint256[] memory filteredPrices,
        uint256[] memory filteredWeights,
        uint256 newCount
    ) {
        // Calculate median
        uint256[] memory sortedPrices = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            sortedPrices[i] = prices[i];
        }
        
        // Simple bubble sort for small arrays
        for (uint256 i = 0; i < count - 1; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (sortedPrices[j] > sortedPrices[j + 1]) {
                    uint256 temp = sortedPrices[j];
                    sortedPrices[j] = sortedPrices[j + 1];
                    sortedPrices[j + 1] = temp;
                }
            }
        }
        
        uint256 median = count % 2 == 0 ? 
            (sortedPrices[count / 2 - 1] + sortedPrices[count / 2]) / 2 :
            sortedPrices[count / 2];

        // Filter outliers
        filteredPrices = new uint256[](count);
        filteredWeights = new uint256[](count);
        newCount = 0;

        for (uint256 i = 0; i < count; i++) {
            uint256 deviation = prices[i] > median ? 
                ((prices[i] - median) * BASIS_POINTS) / median :
                ((median - prices[i]) * BASIS_POINTS) / median;
            
            if (deviation <= threshold) {
                filteredPrices[newCount] = prices[i];
                filteredWeights[newCount] = weights[i];
                newCount++;
            }
        }

        return (filteredPrices, filteredWeights, newCount);
    }

    /**
     * @notice Adjust confidence score based on various factors
     * @param baseConfidence Base confidence score
     * @param sourceCount Number of sources
     * @param prices Array of prices
     * @param aggregatedPrice Final aggregated price
     * @return adjustedConfidence Adjusted confidence score
     */
    function _adjustConfidenceScore(
        uint256 baseConfidence,
        uint256 sourceCount,
        uint256[] memory prices,
        uint256 aggregatedPrice
    ) internal pure returns (uint256 adjustedConfidence) {
        adjustedConfidence = baseConfidence;

        // Bonus for multiple sources
        if (sourceCount >= 3) {
            adjustedConfidence = Math.min(adjustedConfidence + 10, 100);
        }

        // Calculate price variance
        uint256 variance = 0;
        for (uint256 i = 0; i < sourceCount; i++) {
            uint256 deviation = prices[i] > aggregatedPrice ?
                prices[i] - aggregatedPrice :
                aggregatedPrice - prices[i];
            variance += (deviation * BASIS_POINTS) / aggregatedPrice;
        }
        variance /= sourceCount;

        // Penalty for high variance
        if (variance > 100) { // >1% average deviation
            uint256 penalty = Math.min(variance / 10, 20); // Max 20% penalty
            adjustedConfidence = adjustedConfidence > penalty ? 
                adjustedConfidence - penalty : 0;
        }

        return adjustedConfidence;
    }

    // ============ FBL (FIRST BAR LOCK) FUNCTIONS ============

    /**
     * @notice Activate FBL for market
     * @param market Market symbol
     * @param lockPrice Price to lock
     */
    function _activateFBL(bytes32 market, uint256 lockPrice) internal {
        MarketConfig memory config = markets[market];
        
        uint256 currentTime = block.timestamp % 86400; // Seconds from midnight UTC
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + FBL_DURATION;

        fblStatus[market] = FBLStatus({
            isActive: true,
            startTime: startTime,
            endTime: endTime,
            lockedPrice: lockPrice,
            lastValidPrice: lockPrice,
            violationCount: 0
        });

        emit FBLActivated(market, startTime, endTime, lockPrice);
    }

    /**
     * @notice Check for FBL violations
     * @param market Market symbol
     * @param oracleData Array of oracle data
     */
    function _checkFBLViolation(
        bytes32 market,
        IRiverBitCoreV3.OracleData[] calldata oracleData
    ) internal {
        FBLStatus storage fbl = fblStatus[market];
        
        for (uint256 i = 0; i < oracleData.length; i++) {
            uint256 deviation = oracleData[i].price > fbl.lockedPrice ?
                ((oracleData[i].price - fbl.lockedPrice) * BASIS_POINTS) / fbl.lockedPrice :
                ((fbl.lockedPrice - oracleData[i].price) * BASIS_POINTS) / fbl.lockedPrice;
            
            if (deviation > 50) { // 0.5% tolerance
                fbl.violationCount++;
                
                emit FBLViolationDetected(
                    market,
                    oracleData[i].price,
                    fbl.lockedPrice,
                    fbl.violationCount
                );
                
                // Blacklist oracle if too many violations
                if (fbl.violationCount > 3) {
                    _updateOracleStatus(oracleData[i].oracle, PriceStatus.BLACKLISTED);
                }
            }
        }

        // Deactivate FBL if time expired
        if (block.timestamp > fbl.endTime) {
            fbl.isActive = false;
        }
    }

    /**
     * @notice Check if FBL should be enforced
     * @param market Market symbol
     * @param session Current market session
     * @return shouldEnforce Whether FBL should be enforced
     */
    function _shouldEnforceFBL(
        bytes32 market,
        MarketSession session
    ) internal view returns (bool shouldEnforce) {
        MarketConfig memory config = markets[market];
        
        if (!config.isFBLEnabled || config.marketType == IRiverBitCoreV3.MarketType.CRYPTO) {
            return false;
        }

        uint256 currentTime = block.timestamp % 86400; // Seconds from midnight UTC
        
        return (session == MarketSession.REGULAR || session == MarketSession.PRE_MARKET) &&
               currentTime >= config.fblStartTime &&
               currentTime <= config.fblEndTime;
    }

    // ============ MARKET SESSION MANAGEMENT ============

    /**
     * @notice Get current market session
     * @param market Market symbol
     * @return session Current market session
     */
    function _getCurrentMarketSession(bytes32 market) internal view returns (MarketSession session) {
        MarketConfig memory config = markets[market];
        
        if (config.marketType == IRiverBitCoreV3.MarketType.CRYPTO) {
            return MarketSession.REGULAR; // Crypto markets are always open
        }

        uint256 currentTime = block.timestamp % 86400; // Seconds from midnight UTC
        
        if (currentTime < config.marketOpenTime) {
            return MarketSession.PRE_MARKET;
        } else if (currentTime < config.marketCloseTime) {
            return MarketSession.REGULAR;
        } else {
            return config.requiresETMA ? MarketSession.ETMA_ACTIVE : MarketSession.AFTER_HOURS;
        }
    }

    // ============ VALIDATION FUNCTIONS ============

    /**
     * @notice Validate oracle data
     * @param market Market symbol
     * @param oracleData Oracle data to validate
     * @return valid Whether data is valid
     */
    function _validateOracleData(
        bytes32 market,
        IRiverBitCoreV3.OracleData calldata oracleData
    ) internal view returns (bool valid) {
        // Find oracle ID
        uint256 oracleId = _findOracleId(oracleData.oracle);
        if (oracleId == 0) return false;

        OracleSource memory oracle = oracles[oracleId];
        
        // Check if oracle is active and healthy
        if (!oracle.isActive || oracle.status == PriceStatus.BLACKLISTED) {
            return false;
        }

        // Check health score
        if (oracle.healthScore < MIN_HEALTH_SCORE) {
            return false;
        }

        // Check price age
        if (block.timestamp > oracleData.timestamp + oracle.heartbeat) {
            return false;
        }

        // Check price validity
        if (oracleData.price == 0) {
            return false;
        }

        // Check if oracle is suitable for market type
        MarketConfig memory config = markets[market];
        if (config.marketType == IRiverBitCoreV3.MarketType.CRYPTO && !oracle.isCrypto) {
            return false;
        }
        if (config.marketType == IRiverBitCoreV3.MarketType.STOCK && !oracle.isStock) {
            return false;
        }

        return true;
    }

    /**
     * @notice Find oracle ID by address
     * @param oracleAddress Oracle address
     * @return oracleId Oracle ID (0 if not found)
     */
    function _findOracleId(address oracleAddress) internal view returns (uint256 oracleId) {
        for (uint256 i = 1; i <= oracleCounter; i++) {
            if (oracles[i].oracleAddress == oracleAddress) {
                return i;
            }
        }
        return 0;
    }

    /**
     * @notice Get oracle weight
     * @param oracleAddress Oracle address
     * @return weight Oracle weight
     */
    function _getOracleWeight(address oracleAddress) internal view returns (uint256 weight) {
        uint256 oracleId = _findOracleId(oracleAddress);
        return oracleId > 0 ? oracles[oracleId].weight : 0;
    }

    /**
     * @notice Update oracle status
     * @param oracleAddress Oracle address
     * @param newStatus New status
     */
    function _updateOracleStatus(address oracleAddress, PriceStatus newStatus) internal {
        uint256 oracleId = _findOracleId(oracleAddress);
        if (oracleId > 0) {
            oracles[oracleId].status = newStatus;
        }
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Update price history
     * @param market Market symbol
     * @param price New price
     */
    function _updatePriceHistory(bytes32 market, uint256 price) internal {
        uint256 index = priceHistoryIndex[market];
        priceHistory[market][index] = price;
        priceHistoryIndex[market] = (index + 1) % priceHistoryDepth;
    }

    /**
     * @notice Update oracle health metrics
     * @param market Market symbol
     * @param oracleData Array of oracle data
     * @param validCount Number of valid sources
     */
    function _updateOracleHealthMetrics(
        bytes32 market,
        IRiverBitCoreV3.OracleData[] calldata oracleData,
        uint256 validCount
    ) internal {
        for (uint256 i = 0; i < oracleData.length; i++) {
            uint256 oracleId = _findOracleId(oracleData[i].oracle);
            if (oracleId == 0) continue;

            HealthMetrics storage health = oracleHealth[oracleId];
            
            if (_validateOracleData(market, oracleData[i])) {
                health.successfulUpdates++;
            } else {
                health.failedUpdates++;
                health.lastFailureTime = block.timestamp;
            }

            // Update uptime percentage
            uint256 totalUpdates = health.successfulUpdates + health.failedUpdates;
            if (totalUpdates > 0) {
                health.uptimePercentage = (health.successfulUpdates * 100) / totalUpdates;
            }

            // Auto-adjust health score based on recent performance
            if (totalUpdates > 10) {
                uint256 newHealthScore = health.uptimePercentage;
                if (newHealthScore != oracles[oracleId].healthScore) {
                    oracles[oracleId].healthScore = newHealthScore;
                    emit HealthScoreUpdated(
                        oracleId,
                        oracles[oracleId].healthScore,
                        newHealthScore,
                        "Auto-adjustment based on performance"
                    );
                }
            }
        }
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get current price for market
     * @param market Market symbol
     * @return priceData Current price data
     */
    function getPrice(bytes32 market)
        external
        view
        returns (IRiverBitCoreV3.PriceAggregation memory priceData)
    {
        PriceData memory data = currentPrices[market];
        
        return IRiverBitCoreV3.PriceAggregation({
            price: data.price,
            confidence: data.confidence,
            timestamp: data.timestamp,
            sourceCount: data.sourceCount,
            isFBLActive: data.isFBLActive,
            isHealthy: data.isHealthy
        });
    }

    /**
     * @notice Get oracle information
     * @param oracleId Oracle ID
     * @return oracle Oracle data
     */
    function getOracle(uint256 oracleId)
        external
        view
        returns (OracleSource memory oracle)
    {
        require(oracleId <= oracleCounter, "Invalid oracle ID");
        return oracles[oracleId];
    }

    /**
     * @notice Get market configuration
     * @param market Market symbol
     * @return config Market configuration
     */
    function getMarketConfig(bytes32 market)
        external
        view
        returns (MarketConfig memory config)
    {
        return markets[market];
    }

    /**
     * @notice Get FBL status
     * @param market Market symbol
     * @return status FBL status
     */
    function getFBLStatus(bytes32 market)
        external
        view
        returns (FBLStatus memory status)
    {
        return fblStatus[market];
    }

    /**
     * @notice Get oracle health metrics
     * @param oracleId Oracle ID
     * @return health Health metrics
     */
    function getOracleHealth(uint256 oracleId)
        external
        view
        returns (HealthMetrics memory health)
    {
        require(oracleId <= oracleCounter, "Invalid oracle ID");
        return oracleHealth[oracleId];
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Emergency pause all operations
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        emergencyMode = true;
        emit EmergencyAction("EMERGENCY_PAUSE", msg.sender, "Emergency pause activated", block.timestamp);
    }

    /**
     * @notice Resume operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        emergencyMode = false;
        emit EmergencyAction("UNPAUSE", msg.sender, "Operations resumed", block.timestamp);
    }

    /**
     * @notice Pause specific market
     * @param market Market symbol
     */
    function pauseMarket(bytes32 market) external onlyRole(EMERGENCY_ROLE) {
        marketEmergencyPause[market] = true;
        emit EmergencyAction("MARKET_PAUSED", msg.sender, "Market paused", block.timestamp);
    }

    /**
     * @notice Pause specific oracle
     * @param oracleId Oracle ID
     */
    function pauseOracle(uint256 oracleId) external onlyRole(EMERGENCY_ROLE) {
        require(oracleId <= oracleCounter, "Invalid oracle ID");
        oracleEmergencyPause[oracleId] = true;
        emit EmergencyAction("ORACLE_PAUSED", msg.sender, "Oracle paused", block.timestamp);
    }
}