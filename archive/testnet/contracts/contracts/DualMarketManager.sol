// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title DualMarketManager
 * @notice Manages dual market structure: Crypto (24/7 CLOB) vs xStock (RTH/ETMA)
 * @dev Coordinates different trading mechanisms based on asset type and time
 * 
 * Market Types:
 * - Crypto Markets: 24/7 Central Limit Order Book (CLOB) trading
 * - xStock Markets: Regular Trading Hours (RTH) + Evening Trading Matching Algorithm (ETMA)
 * 
 * Key Features:
 * - Time-based market switching for xStock
 * - Separate order books and matching engines
 * - Market-specific risk parameters
 * - Automated transitions between trading modes
 * - Cross-market position management
 */
contract DualMarketManager is 
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant MARKET_MAKER_ROLE = keccak256("MARKET_MAKER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant CRYPTO_MARKET_FEE = 30; // 0.3%
    uint256 private constant XSTOCK_MARKET_FEE = 50; // 0.5%

    // ============ ENUMS ============

    enum MarketType {
        CRYPTO_24_7,     // 24/7 CLOB trading
        XSTOCK_RTH,      // Regular trading hours only
        XSTOCK_ETMA      // Regular + Evening trading
    }

    enum TradingMode {
        CLOSED,          // Market closed
        RTH,             // Regular trading hours
        ETMA,            // Evening trading matching
        CONTINUOUS       // 24/7 trading
    }

    enum OrderType {
        MARKET,
        LIMIT,
        STOP,
        STOP_LIMIT
    }

    // ============ STRUCTS ============

    // Market configuration
    struct MarketConfig {
        bytes32 marketId;
        MarketType marketType;
        TradingMode currentMode;
        
        // Trading hours
        uint256 rthStart;           // Regular trading hours start (hour)
        uint256 rthEnd;             // Regular trading hours end (hour)
        uint256 etmaStart;          // ETMA trading start (hour)
        uint256 etmaEnd;            // ETMA trading end (hour)
        
        // Market parameters
        uint256 tickSize;           // Minimum price increment
        uint256 minOrderSize;       // Minimum order size
        uint256 maxOrderSize;       // Maximum order size
        uint256 tradingFee;         // Trading fee in basis points
        uint256 maxLeverage;        // Maximum leverage allowed
        
        // CLOB parameters (for crypto)
        uint256 spreadTolerance;    // Maximum allowed spread
        uint256 depthRequirement;   // Minimum order book depth
        
        // ETMA parameters (for xStock)
        uint256 matchingThreshold;  // Volume threshold for matching
        uint256 priceDeviationLimit; // Maximum price deviation
        
        // Status
        bool isActive;
        bool tradingPaused;
        uint256 lastModeSwitch;
    }

    // Order book entry
    struct OrderBookEntry {
        uint256 price;
        uint256 size;
        address trader;
        uint256 timestamp;
        bytes32 orderId;
        bool isLong;
    }

    // Market statistics
    struct MarketStats {
        uint256 totalVolume24h;     // 24h trading volume
        uint256 totalTrades24h;     // 24h number of trades
        uint256 lastPrice;          // Last traded price
        uint256 bid;                // Best bid price
        uint256 ask;                // Best ask price
        uint256 spread;             // Current spread
        uint256 depth;              // Order book depth
        uint256 volatility;         // Price volatility
        uint256 openInterest;       // Total open interest
        uint256 lastUpdate;         // Last update timestamp
    }

    // Trading session data
    struct TradingSession {
        TradingMode mode;
        uint256 startTime;
        uint256 endTime;
        uint256 volumeTraded;
        uint256 tradesExecuted;
        uint256 openPrice;
        uint256 highPrice;
        uint256 lowPrice;
        uint256 closePrice;
        bool isActive;
    }

    // Market transition event
    struct ModeTransition {
        bytes32 marketId;
        TradingMode fromMode;
        TradingMode toMode;
        uint256 timestamp;
        string reason;
        address triggeredBy;
    }

    // Cross-market position
    struct CrossMarketPosition {
        address trader;
        mapping(bytes32 => uint256) marketExposures; // marketId => exposure
        uint256 totalExposure;
        uint256 crossMarginUsed;
        uint256 lastUpdate;
        bool isActive;
    }

    // ============ STATE VARIABLES ============

    IERC20 public baseAsset;
    address public coreContract;
    address public etmaEngine;
    address public orderManager;

    // Market management
    mapping(bytes32 => MarketConfig) public markets;
    mapping(MarketType => bytes32[]) public marketsByType;
    bytes32[] public allMarkets;
    uint256 public totalMarkets;

    // Order books (simplified representation)
    mapping(bytes32 => OrderBookEntry[]) public bids; // marketId => bid orders
    mapping(bytes32 => OrderBookEntry[]) public asks; // marketId => ask orders
    mapping(bytes32 => mapping(uint256 => uint256)) public priceLevel; // marketId => price => total size

    // Market statistics and monitoring
    mapping(bytes32 => MarketStats) public marketStats;
    mapping(bytes32 => TradingSession) public currentSessions;
    mapping(bytes32 => ModeTransition[]) public modeTransitionHistory;

    // Cross-market position management
    mapping(address => CrossMarketPosition) public crossMarketPositions;
    mapping(bytes32 => uint256) public marketLimits; // Cross-market exposure limits

    // Time zone and trading hours
    int256 public timeZoneOffset; // UTC offset in seconds
    mapping(uint256 => bool) public marketHolidays; // timestamp => is holiday
    uint256[] public holidayDates;

    // Global settings
    uint256 public globalTradingFee;
    uint256 public maxCrossMarketExposure;
    bool public emergencyMode;
    bool public globalTradingPaused;

    // Market maker incentives
    mapping(address => uint256) public makerRebates; // address => rebate rate
    mapping(bytes32 => uint256) public marketMakerRewards; // market => total rewards

    // Statistics
    uint256 public totalTradingVolume;
    uint256 public totalTrades;
    mapping(MarketType => uint256) public volumeByType;
    mapping(TradingMode => uint256) public volumeByMode;

    // ============ EVENTS ============

    event MarketCreated(
        bytes32 indexed marketId,
        MarketType marketType,
        string symbol,
        address creator
    );

    event TradingModeChanged(
        bytes32 indexed marketId,
        TradingMode oldMode,
        TradingMode newMode,
        uint256 timestamp,
        string reason
    );

    event OrderBookUpdated(
        bytes32 indexed marketId,
        uint256 bestBid,
        uint256 bestAsk,
        uint256 spread,
        uint256 depth
    );

    event CrossMarketTradeExecuted(
        address indexed trader,
        bytes32[] markets,
        uint256[] amounts,
        uint256 totalValue,
        uint256 timestamp
    );

    event MarketStatsUpdated(
        bytes32 indexed marketId,
        uint256 volume24h,
        uint256 trades24h,
        uint256 lastPrice,
        uint256 volatility
    );

    event MarketHolidaySet(
        uint256 indexed date,
        bool isHoliday,
        string description
    );

    event EmergencyModeToggled(
        bool enabled,
        address admin,
        string reason
    );

    // ============ MODIFIERS ============

    modifier marketExists(bytes32 marketId) {
        require(markets[marketId].isActive, "Market does not exist");
        _;
    }

    modifier notEmergencyMode() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    modifier notGloballyPaused() {
        require(!globalTradingPaused, "Global trading paused");
        _;
    }

    modifier onlyActiveMarket(bytes32 marketId) {
        MarketConfig storage market = markets[marketId];
        require(market.isActive && !market.tradingPaused, "Market not active");
        _;
    }

    // ============ INITIALIZATION ============

    /**
     * @notice Initialize the dual market manager
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
        _grantRole(ORACLE_ROLE, _admin);

        // Initialize global settings
        globalTradingFee = 30; // 0.3%
        maxCrossMarketExposure = 10000000 * PRECISION; // $10M
        timeZoneOffset = 0; // UTC
    }

    // ============ MARKET CREATION ============

    /**
     * @notice Create a new market
     * @param marketId Market identifier
     * @param marketType Type of market (crypto/xStock)
     * @param symbol Market symbol
     * @param tickSize Minimum price increment
     * @param minOrderSize Minimum order size
     * @param maxOrderSize Maximum order size
     * @param maxLeverage Maximum leverage
     * @return success Whether market creation succeeded
     */
    function createMarket(
        bytes32 marketId,
        MarketType marketType,
        string calldata symbol,
        uint256 tickSize,
        uint256 minOrderSize,
        uint256 maxOrderSize,
        uint256 maxLeverage
    ) external onlyRole(ADMIN_ROLE) returns (bool success) {
        require(marketId != bytes32(0), "Invalid market ID");
        require(!markets[marketId].isActive, "Market already exists");
        require(tickSize > 0, "Invalid tick size");
        require(minOrderSize > 0, "Invalid min order size");
        require(maxOrderSize >= minOrderSize, "Invalid max order size");

        // Set market-specific parameters based on type
        (uint256 tradingFee, TradingMode initialMode) = _getMarketTypeDefaults(marketType);

        markets[marketId] = MarketConfig({
            marketId: marketId,
            marketType: marketType,
            currentMode: initialMode,
            
            // Trading hours (default to US market hours)
            rthStart: 9,  // 9 AM EST
            rthEnd: 16,   // 4 PM EST
            etmaStart: 18, // 6 PM EST
            etmaEnd: 22,   // 10 PM EST
            
            // Market parameters
            tickSize: tickSize,
            minOrderSize: minOrderSize,
            maxOrderSize: maxOrderSize,
            tradingFee: tradingFee,
            maxLeverage: maxLeverage,
            
            // CLOB parameters
            spreadTolerance: 100, // 1%
            depthRequirement: 100000 * PRECISION, // $100k
            
            // ETMA parameters
            matchingThreshold: 50000 * PRECISION, // $50k
            priceDeviationLimit: 200, // 2%
            
            // Status
            isActive: true,
            tradingPaused: false,
            lastModeSwitch: block.timestamp
        });

        // Add to tracking arrays
        allMarkets.push(marketId);
        marketsByType[marketType].push(marketId);
        totalMarkets++;

        // Initialize market statistics
        marketStats[marketId] = MarketStats({
            totalVolume24h: 0,
            totalTrades24h: 0,
            lastPrice: 0,
            bid: 0,
            ask: 0,
            spread: 0,
            depth: 0,
            volatility: 0,
            openInterest: 0,
            lastUpdate: block.timestamp
        });

        // Initialize current session
        _initializeTradingSession(marketId);

        emit MarketCreated(marketId, marketType, symbol, msg.sender);

        return true;
    }

    // ============ TRADING MODE MANAGEMENT ============

    /**
     * @notice Update trading modes for all markets based on current time
     */
    function updateTradingModes() external onlyRole(OPERATOR_ROLE) {
        uint256 currentHour = _getCurrentHour();
        bool isHoliday = _isMarketHoliday();

        for (uint256 i = 0; i < allMarkets.length; i++) {
            bytes32 marketId = allMarkets[i];
            MarketConfig storage market = markets[marketId];

            if (!market.isActive) continue;

            TradingMode newMode = _determineTradingMode(market, currentHour, isHoliday);
            
            if (newMode != market.currentMode) {
                _switchTradingMode(marketId, newMode, "Scheduled transition");
            }
        }
    }

    /**
     * @notice Switch trading mode for a specific market
     * @param marketId Market to switch
     * @param newMode New trading mode
     * @param reason Reason for switch
     */
    function _switchTradingMode(
        bytes32 marketId,
        TradingMode newMode,
        string memory reason
    ) internal {
        MarketConfig storage market = markets[marketId];
        TradingMode oldMode = market.currentMode;

        // Handle mode transition logic
        if (oldMode == TradingMode.RTH && newMode == TradingMode.ETMA) {
            // Transition from RTH to ETMA
            _prepareETMATransition(marketId);
        } else if (oldMode == TradingMode.ETMA && newMode == TradingMode.CLOSED) {
            // Execute ETMA matching before closing
            if (etmaEngine != address(0)) {
                // Call ETMA engine to execute final matching
                _executeETMAMatching(marketId);
            }
        } else if (oldMode == TradingMode.CLOSED && newMode == TradingMode.RTH) {
            // Opening market - reset daily statistics
            _resetDailyStats(marketId);
        }

        // Update market mode
        market.currentMode = newMode;
        market.lastModeSwitch = block.timestamp;

        // Update current session
        TradingSession storage session = currentSessions[marketId];
        session.mode = newMode;
        session.endTime = block.timestamp;

        // Start new session if market is opening
        if (newMode != TradingMode.CLOSED) {
            _initializeTradingSession(marketId);
        }

        // Record transition
        modeTransitionHistory[marketId].push(ModeTransition({
            marketId: marketId,
            fromMode: oldMode,
            toMode: newMode,
            timestamp: block.timestamp,
            reason: reason,
            triggeredBy: msg.sender
        }));

        emit TradingModeChanged(marketId, oldMode, newMode, block.timestamp, reason);
    }

    /**
     * @notice Determine appropriate trading mode based on market type and time
     * @param market Market configuration
     * @param currentHour Current hour of day
     * @param isHoliday Whether it's a market holiday
     * @return mode Appropriate trading mode
     */
    function _determineTradingMode(
        MarketConfig memory market,
        uint256 currentHour,
        bool isHoliday
    ) internal pure returns (TradingMode mode) {
        if (market.marketType == MarketType.CRYPTO_24_7) {
            return TradingMode.CONTINUOUS; // Crypto markets are always open
        }

        if (isHoliday) {
            return TradingMode.CLOSED; // All xStock markets closed on holidays
        }

        // For xStock markets
        if (currentHour >= market.rthStart && currentHour < market.rthEnd) {
            return TradingMode.RTH; // Regular trading hours
        } else if (market.marketType == MarketType.XSTOCK_ETMA && 
                   currentHour >= market.etmaStart && currentHour < market.etmaEnd) {
            return TradingMode.ETMA; // Evening trading
        } else {
            return TradingMode.CLOSED; // Market closed
        }
    }

    // ============ ORDER BOOK MANAGEMENT ============

    /**
     * @notice Add order to market order book
     * @param marketId Market identifier
     * @param isLong Whether order is long (buy) or short (sell)
     * @param price Order price
     * @param size Order size
     * @param trader Trader address
     * @param orderId Order identifier
     */
    function addToOrderBook(
        bytes32 marketId,
        bool isLong,
        uint256 price,
        uint256 size,
        address trader,
        bytes32 orderId
    ) external onlyRole(OPERATOR_ROLE) onlyActiveMarket(marketId) {
        MarketConfig storage market = markets[marketId];
        
        // Only add to order book for CLOB markets in appropriate modes
        require(
            market.marketType == MarketType.CRYPTO_24_7 || 
            market.currentMode == TradingMode.RTH,
            "Order book not active"
        );

        OrderBookEntry memory entry = OrderBookEntry({
            price: price,
            size: size,
            trader: trader,
            timestamp: block.timestamp,
            orderId: orderId,
            isLong: isLong
        });

        if (isLong) {
            bids[marketId].push(entry);
            _sortOrderBook(marketId, true); // Sort bids descending
        } else {
            asks[marketId].push(entry);
            _sortOrderBook(marketId, false); // Sort asks ascending
        }

        // Update price level aggregation
        priceLevel[marketId][price] += size;

        // Update market statistics
        _updateOrderBookStats(marketId);
    }

    /**
     * @notice Remove order from order book
     * @param marketId Market identifier
     * @param orderId Order identifier
     * @param isLong Whether order is long
     */
    function removeFromOrderBook(
        bytes32 marketId,
        bytes32 orderId,
        bool isLong
    ) external onlyRole(OPERATOR_ROLE) marketExists(marketId) {
        OrderBookEntry[] storage orders = isLong ? bids[marketId] : asks[marketId];

        for (uint256 i = 0; i < orders.length; i++) {
            if (orders[i].orderId == orderId) {
                // Update price level
                priceLevel[marketId][orders[i].price] -= orders[i].size;
                
                // Remove order
                orders[i] = orders[orders.length - 1];
                orders.pop();
                
                // Re-sort if needed
                if (orders.length > 1) {
                    _sortOrderBook(marketId, isLong);
                }
                
                break;
            }
        }

        _updateOrderBookStats(marketId);
    }

    /**
     * @notice Sort order book (simplified bubble sort for demo)
     * @param marketId Market identifier
     * @param isBids Whether sorting bids (true) or asks (false)
     */
    function _sortOrderBook(bytes32 marketId, bool isBids) internal {
        OrderBookEntry[] storage orders = isBids ? bids[marketId] : asks[marketId];
        
        if (orders.length <= 1) return;

        // Simplified sorting - in production would use more efficient algorithm
        for (uint256 i = 0; i < orders.length - 1; i++) {
            for (uint256 j = 0; j < orders.length - i - 1; j++) {
                bool shouldSwap = isBids ? 
                    orders[j].price < orders[j + 1].price : // Bids: highest first
                    orders[j].price > orders[j + 1].price;  // Asks: lowest first

                if (shouldSwap) {
                    OrderBookEntry memory temp = orders[j];
                    orders[j] = orders[j + 1];
                    orders[j + 1] = temp;
                }
            }
        }
    }

    // ============ CROSS-MARKET POSITION MANAGEMENT ============

    /**
     * @notice Execute cross-market trade
     * @param trader Trader address
     * @param marketIds Array of market IDs
     * @param amounts Array of trade amounts
     * @param isLongs Array of trade directions
     * @return success Whether trade succeeded
     */
    function executeCrossMarketTrade(
        address trader,
        bytes32[] calldata marketIds,
        uint256[] calldata amounts,
        bool[] calldata isLongs
    ) external 
        onlyRole(OPERATOR_ROLE) 
        nonReentrant 
        notEmergencyMode 
        notGloballyPaused 
        returns (bool success) 
    {
        require(
            marketIds.length == amounts.length && 
            amounts.length == isLongs.length,
            "Array length mismatch"
        );
        require(marketIds.length > 1, "Need multiple markets for cross-market trade");

        CrossMarketPosition storage position = crossMarketPositions[trader];
        uint256 totalValue = 0;

        // Calculate total exposure and validate limits
        for (uint256 i = 0; i < marketIds.length; i++) {
            bytes32 marketId = marketIds[i];
            uint256 amount = amounts[i];

            require(markets[marketId].isActive, "Market not active");
            require(amount >= markets[marketId].minOrderSize, "Below min order size");
            require(amount <= markets[marketId].maxOrderSize, "Above max order size");

            totalValue += amount;
            position.marketExposures[marketId] += amount;
        }

        // Check cross-market exposure limits
        require(
            position.totalExposure + totalValue <= maxCrossMarketExposure,
            "Exceeds cross-market exposure limit"
        );

        // Update position
        position.trader = trader;
        position.totalExposure += totalValue;
        position.lastUpdate = block.timestamp;
        position.isActive = true;

        // Execute individual trades (simplified)
        for (uint256 i = 0; i < marketIds.length; i++) {
            _executeSingleMarketTrade(trader, marketIds[i], amounts[i], isLongs[i]);
        }

        emit CrossMarketTradeExecuted(trader, marketIds, amounts, totalValue, block.timestamp);

        return true;
    }

    // ============ MARKET STATISTICS ============

    /**
     * @notice Update market statistics after trade
     * @param marketId Market identifier
     * @param price Trade price
     * @param size Trade size
     */
    function updateMarketStats(
        bytes32 marketId,
        uint256 price,
        uint256 size
    ) external onlyRole(OPERATOR_ROLE) marketExists(marketId) {
        MarketStats storage stats = marketStats[marketId];
        TradingSession storage session = currentSessions[marketId];

        // Update basic stats
        stats.lastPrice = price;
        stats.totalVolume24h += size;
        stats.totalTrades24h++;
        stats.lastUpdate = block.timestamp;

        // Update session stats
        session.volumeTraded += size;
        session.tradesExecuted++;
        session.closePrice = price;

        // Update session price range
        if (session.openPrice == 0) {
            session.openPrice = price;
            session.highPrice = price;
            session.lowPrice = price;
        } else {
            if (price > session.highPrice) session.highPrice = price;
            if (price < session.lowPrice) session.lowPrice = price;
        }

        // Update global statistics
        totalTradingVolume += size;
        totalTrades++;
        volumeByType[markets[marketId].marketType] += size;
        volumeByMode[markets[marketId].currentMode] += size;

        // Calculate volatility (simplified)
        _updateVolatility(marketId, price);

        emit MarketStatsUpdated(
            marketId,
            stats.totalVolume24h,
            stats.totalTrades24h,
            price,
            stats.volatility
        );
    }

    /**
     * @notice Update order book statistics
     * @param marketId Market identifier
     */
    function _updateOrderBookStats(bytes32 marketId) internal {
        MarketStats storage stats = marketStats[marketId];
        
        // Get best bid and ask
        OrderBookEntry[] storage bidOrders = bids[marketId];
        OrderBookEntry[] storage askOrders = asks[marketId];

        if (bidOrders.length > 0) {
            stats.bid = bidOrders[0].price; // Highest bid
        }

        if (askOrders.length > 0) {
            stats.ask = askOrders[0].price; // Lowest ask
        }

        // Calculate spread
        if (stats.bid > 0 && stats.ask > 0) {
            stats.spread = ((stats.ask - stats.bid) * BASIS_POINTS) / stats.bid;
        }

        // Calculate depth (simplified - sum of top 5 levels)
        uint256 bidDepth = 0;
        uint256 askDepth = 0;
        
        for (uint256 i = 0; i < Math.min(5, bidOrders.length); i++) {
            bidDepth += bidOrders[i].size;
        }
        
        for (uint256 i = 0; i < Math.min(5, askOrders.length); i++) {
            askDepth += askOrders[i].size;
        }
        
        stats.depth = bidDepth + askDepth;

        emit OrderBookUpdated(marketId, stats.bid, stats.ask, stats.spread, stats.depth);
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Get current hour of day
     * @return hour Current hour (0-23)
     */
    function _getCurrentHour() internal view returns (uint256 hour) {
        return ((block.timestamp + uint256(timeZoneOffset)) / 3600) % 24;
    }

    /**
     * @notice Check if current date is a market holiday
     * @return isHoliday Whether it's a holiday
     */
    function _isMarketHoliday() internal view returns (bool isHoliday) {
        uint256 currentDate = _getCurrentDate();
        return marketHolidays[currentDate];
    }

    /**
     * @notice Get current date as timestamp
     * @return date Current date timestamp
     */
    function _getCurrentDate() internal view returns (uint256 date) {
        return ((block.timestamp + uint256(timeZoneOffset)) / 86400) * 86400;
    }

    /**
     * @notice Get market type defaults
     * @param marketType Market type
     * @return tradingFee Default trading fee
     * @return initialMode Initial trading mode
     */
    function _getMarketTypeDefaults(MarketType marketType) 
        internal 
        pure 
        returns (uint256 tradingFee, TradingMode initialMode) 
    {
        if (marketType == MarketType.CRYPTO_24_7) {
            return (CRYPTO_MARKET_FEE, TradingMode.CONTINUOUS);
        } else {
            return (XSTOCK_MARKET_FEE, TradingMode.CLOSED);
        }
    }

    /**
     * @notice Initialize trading session for market
     * @param marketId Market identifier
     */
    function _initializeTradingSession(bytes32 marketId) internal {
        MarketConfig storage market = markets[marketId];
        
        currentSessions[marketId] = TradingSession({
            mode: market.currentMode,
            startTime: block.timestamp,
            endTime: 0,
            volumeTraded: 0,
            tradesExecuted: 0,
            openPrice: 0,
            highPrice: 0,
            lowPrice: 0,
            closePrice: 0,
            isActive: market.currentMode != TradingMode.CLOSED
        });
    }

    /**
     * @notice Reset daily statistics for market
     * @param marketId Market identifier
     */
    function _resetDailyStats(bytes32 marketId) internal {
        MarketStats storage stats = marketStats[marketId];
        stats.totalVolume24h = 0;
        stats.totalTrades24h = 0;
    }

    /**
     * @notice Prepare market for ETMA transition
     * @param marketId Market identifier
     */
    function _prepareETMATransition(bytes32 marketId) internal {
        // Clear order book for ETMA mode
        delete bids[marketId];
        delete asks[marketId];
        
        // Any additional preparation logic would go here
    }

    /**
     * @notice Execute ETMA matching (placeholder)
     * @param marketId Market identifier
     */
    function _executeETMAMatching(bytes32 marketId) internal {
        // This would call the ETMA engine to execute matching
        // Placeholder for actual implementation
    }

    /**
     * @notice Execute single market trade (simplified)
     * @param trader Trader address
     * @param marketId Market identifier
     * @param amount Trade amount
     * @param isLong Trade direction
     */
    function _executeSingleMarketTrade(
        address trader,
        bytes32 marketId,
        uint256 amount,
        bool isLong
    ) internal {
        // Simplified trade execution - would integrate with core contract
        MarketStats storage stats = marketStats[marketId];
        
        // Update basic statistics
        stats.totalVolume24h += amount;
        stats.totalTrades24h++;
        stats.lastUpdate = block.timestamp;
    }

    /**
     * @notice Update volatility calculation (simplified)
     * @param marketId Market identifier
     * @param price Current price
     */
    function _updateVolatility(bytes32 marketId, uint256 price) internal {
        MarketStats storage stats = marketStats[marketId];
        
        // Simplified volatility calculation
        if (stats.lastPrice > 0) {
            uint256 priceChange = price > stats.lastPrice ? 
                price - stats.lastPrice : 
                stats.lastPrice - price;
            uint256 percentChange = (priceChange * BASIS_POINTS) / stats.lastPrice;
            
            // Simple moving average of price changes
            stats.volatility = (stats.volatility * 9 + percentChange) / 10;
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Set market holiday
     * @param date Holiday date (timestamp)
     * @param isHoliday Whether it's a holiday
     * @param description Holiday description
     */
    function setMarketHoliday(
        uint256 date,
        bool isHoliday,
        string calldata description
    ) external onlyRole(ADMIN_ROLE) {
        marketHolidays[date] = isHoliday;
        
        if (isHoliday) {
            holidayDates.push(date);
        }

        emit MarketHolidaySet(date, isHoliday, description);
    }

    /**
     * @notice Set ETMA engine address
     * @param _etmaEngine ETMA engine contract address
     */
    function setETMAEngine(address _etmaEngine) external onlyRole(ADMIN_ROLE) {
        etmaEngine = _etmaEngine;
    }

    /**
     * @notice Set order manager address
     * @param _orderManager Order manager contract address
     */
    function setOrderManager(address _orderManager) external onlyRole(ADMIN_ROLE) {
        orderManager = _orderManager;
    }

    /**
     * @notice Update market trading hours
     * @param marketId Market identifier
     * @param rthStart RTH start hour
     * @param rthEnd RTH end hour
     * @param etmaStart ETMA start hour
     * @param etmaEnd ETMA end hour
     */
    function updateTradingHours(
        bytes32 marketId,
        uint256 rthStart,
        uint256 rthEnd,
        uint256 etmaStart,
        uint256 etmaEnd
    ) external onlyRole(ADMIN_ROLE) marketExists(marketId) {
        require(rthStart < 24 && rthEnd < 24, "Invalid RTH hours");
        require(etmaStart < 24 && etmaEnd < 24, "Invalid ETMA hours");
        require(rthStart < rthEnd, "Invalid RTH range");
        require(etmaStart < etmaEnd, "Invalid ETMA range");

        MarketConfig storage market = markets[marketId];
        market.rthStart = rthStart;
        market.rthEnd = rthEnd;
        market.etmaStart = etmaStart;
        market.etmaEnd = etmaEnd;
    }

    /**
     * @notice Pause/unpause market trading
     * @param marketId Market identifier
     * @param paused Whether to pause trading
     */
    function setMarketPaused(bytes32 marketId, bool paused) 
        external 
        onlyRole(ADMIN_ROLE) 
        marketExists(marketId) 
    {
        markets[marketId].tradingPaused = paused;
    }

    /**
     * @notice Toggle global emergency mode
     * @param enabled Whether to enable emergency mode
     * @param reason Reason for toggle
     */
    function setEmergencyMode(bool enabled, string calldata reason) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        emergencyMode = enabled;
        emit EmergencyModeToggled(enabled, msg.sender, reason);
    }

    /**
     * @notice Set time zone offset
     * @param offsetSeconds UTC offset in seconds
     */
    function setTimeZoneOffset(int256 offsetSeconds) external onlyRole(ADMIN_ROLE) {
        require(offsetSeconds >= -43200 && offsetSeconds <= 43200, "Invalid timezone"); // ±12 hours
        timeZoneOffset = offsetSeconds;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get market configuration
     * @param marketId Market identifier
     * @return config Market configuration
     */
    function getMarketConfig(bytes32 marketId) 
        external 
        view 
        marketExists(marketId) 
        returns (MarketConfig memory config) 
    {
        return markets[marketId];
    }

    /**
     * @notice Get market statistics
     * @param marketId Market identifier
     * @return stats Market statistics
     */
    function getMarketStats(bytes32 marketId) 
        external 
        view 
        marketExists(marketId) 
        returns (MarketStats memory stats) 
    {
        return marketStats[marketId];
    }

    /**
     * @notice Get current trading session
     * @param marketId Market identifier
     * @return session Current trading session
     */
    function getCurrentSession(bytes32 marketId) 
        external 
        view 
        marketExists(marketId) 
        returns (TradingSession memory session) 
    {
        return currentSessions[marketId];
    }

    /**
     * @notice Get order book depth
     * @param marketId Market identifier
     * @param levels Number of price levels to return
     * @return bidPrices Bid prices
     * @return bidSizes Bid sizes
     * @return askPrices Ask prices
     * @return askSizes Ask sizes
     */
    function getOrderBookDepth(bytes32 marketId, uint256 levels) 
        external 
        view 
        marketExists(marketId) 
        returns (
            uint256[] memory bidPrices,
            uint256[] memory bidSizes,
            uint256[] memory askPrices,
            uint256[] memory askSizes
        ) 
    {
        OrderBookEntry[] storage bidOrders = bids[marketId];
        OrderBookEntry[] storage askOrders = asks[marketId];

        uint256 bidLevels = Math.min(levels, bidOrders.length);
        uint256 askLevels = Math.min(levels, askOrders.length);

        bidPrices = new uint256[](bidLevels);
        bidSizes = new uint256[](bidLevels);
        askPrices = new uint256[](askLevels);
        askSizes = new uint256[](askLevels);

        for (uint256 i = 0; i < bidLevels; i++) {
            bidPrices[i] = bidOrders[i].price;
            bidSizes[i] = bidOrders[i].size;
        }

        for (uint256 i = 0; i < askLevels; i++) {
            askPrices[i] = askOrders[i].price;
            askSizes[i] = askOrders[i].size;
        }
    }

    /**
     * @notice Get markets by type
     * @param marketType Market type
     * @return marketIds Array of market IDs
     */
    function getMarketsByType(MarketType marketType) 
        external 
        view 
        returns (bytes32[] memory marketIds) 
    {
        return marketsByType[marketType];
    }

    /**
     * @notice Get cross-market position
     * @param trader Trader address
     * @return totalExposure Total exposure across markets
     * @return lastUpdate Last update timestamp
     * @return isActive Whether position is active
     */
    function getCrossMarketPosition(address trader) 
        external 
        view 
        returns (uint256 totalExposure, uint256 lastUpdate, bool isActive) 
    {
        CrossMarketPosition storage position = crossMarketPositions[trader];
        return (position.totalExposure, position.lastUpdate, position.isActive);
    }

    /**
     * @notice Get current time info
     * @return currentHour Current hour
     * @return isHoliday Whether it's a holiday
     * @return timestamp Current timestamp
     */
    function getCurrentTimeInfo() 
        external 
        view 
        returns (uint256 currentHour, bool isHoliday, uint256 timestamp) 
    {
        currentHour = _getCurrentHour();
        isHoliday = _isMarketHoliday();
        timestamp = block.timestamp;
    }

    /**
     * @notice Get global trading statistics
     * @return totalVolume Total trading volume
     * @return totalTradesCount Total number of trades
     * @return cryptoVolume Crypto market volume
     * @return xStockVolume xStock market volume
     */
    function getGlobalStats() 
        external 
        view 
        returns (
            uint256 totalVolume,
            uint256 totalTradesCount,
            uint256 cryptoVolume,
            uint256 xStockVolume
        ) 
    {
        totalVolume = totalTradingVolume;
        totalTradesCount = totalTrades;
        cryptoVolume = volumeByType[MarketType.CRYPTO_24_7];
        xStockVolume = volumeByType[MarketType.XSTOCK_RTH] + volumeByType[MarketType.XSTOCK_ETMA];
    }
}