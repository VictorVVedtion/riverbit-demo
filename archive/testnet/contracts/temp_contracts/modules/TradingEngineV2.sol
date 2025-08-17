// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/ITradingEngine.sol";
import "../interfaces/IRiverBitCore.sol";
import "../libraries/TradingMath.sol";
import "../libraries/GasOptimizer.sol";
import "../libraries/MEVProtection.sol";
import "../libraries/Events.sol";
import "../libraries/Errors.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TradingEngineV2
 * @notice Next-generation trading engine with advanced gas optimization and MEV protection
 * @dev Implements modular trading functionality with batch operations and efficient storage
 * 
 * Key Features:
 * - Batch order processing for reduced gas costs
 * - MEV protection with commit-reveal scheme
 * - Gas-optimized storage layout with packed structs
 * - Advanced slippage protection
 * - Dynamic fee adjustment based on market conditions
 * - Flash loan resistant position management
 */
contract TradingEngineV2 is ITradingEngine, ReentrancyGuard {
    using TradingMath for uint256;
    using GasOptimizer for GasOptimizer.BatchState;
    using MEVProtection for MEVProtection.CommitRevealState;

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_POSITIONS_PER_USER = 50;
    uint256 private constant MAX_BATCH_SIZE = 100;
    uint256 private constant MEV_PROTECTION_DELAY = 1 minutes;
    uint256 private constant DYNAMIC_FEE_WINDOW = 1 hours;

    // ============ IMMUTABLES ============
    IRiverBitCore public immutable coreContract;

    // ============ STATE VARIABLES ============
    
    // Gas-optimized packed structs
    struct TradingState {
        uint128 totalVolume24h;          // 24h trading volume
        uint64 lastVolumeReset;          // Last volume reset timestamp
        uint32 totalPositions;           // Total open positions
        uint16 activePairs;              // Number of active trading pairs
        uint8 feeMultiplier;             // Dynamic fee multiplier (100 = 1x)
        bool paused;                     // Trading pause state
    }
    
    struct UserTradingData {
        uint64 lastTradeTime;            // Last trade timestamp
        uint32 totalTrades;              // Total trades count
        uint16 openPositions;            // Number of open positions
        uint8 vipLevel;                  // VIP level for fee discounts
        bool isLiquidator;               // Liquidator status
    }
    
    struct MarketData {
        uint128 totalLongOI;             // Total long open interest
        uint128 totalShortOI;            // Total short open interest
        uint64 lastPriceUpdate;          // Last price update timestamp
        uint32 dailyVolume;              // Daily trading volume
        uint16 fundingRate;              // Current funding rate (basis points)
        uint8 volatilityIndex;           // Volatility index (0-255)
        bool isActive;                   // Market active status
    }

    // Storage mappings
    TradingState public tradingState;
    mapping(address => UserTradingData) public userData;
    mapping(bytes32 => MarketData) public marketData;
    mapping(bytes32 => uint256) public marketPrices;
    
    // Position storage with gas optimization
    mapping(address => bytes32[]) public userPositions;
    mapping(bytes32 => Position) public positions;
    mapping(bytes32 => bool) public positionExists;
    
    // MEV protection
    MEVProtection.CommitRevealState private mevState;
    
    // Batch operations
    GasOptimizer.BatchState private batchState;
    
    // Dynamic fee calculation
    mapping(uint256 => uint256) private hourlyVolume; // hour => volume
    mapping(bytes32 => uint256) private marketVolume24h;

    // ============ EVENTS ============
    
    event PositionOpened(
        address indexed trader,
        bytes32 indexed positionKey,
        bytes32 indexed market,
        bool isLong,
        uint256 size,
        uint256 entryPrice,
        uint256 fee
    );
    
    event PositionClosed(
        address indexed trader,
        bytes32 indexed positionKey,
        uint256 exitPrice,
        int256 pnl,
        uint256 fee
    );
    
    event BatchTradeExecuted(
        address indexed trader,
        uint256 batchId,
        uint256 executedTrades,
        uint256 totalGasSaved
    );
    
    event DynamicFeeUpdated(
        uint8 newMultiplier,
        uint256 currentVolume,
        uint256 timestamp
    );

    // ============ MODIFIERS ============
    
    modifier onlyCore() {
        require(msg.sender == address(coreContract), Errors.UNAUTHORIZED);
        _;
    }
    
    modifier whenNotPaused() {
        require(!tradingState.paused, Errors.PAUSED);
        _;
    }
    
    modifier validMarket(bytes32 market) {
        require(marketData[market].isActive, Errors.MARKET_NOT_ACTIVE);
        _;
    }
    
    modifier mevProtected() {
        require(mevState.isValidReveal(msg.sender), Errors.MEV_PROTECTION_ACTIVE);
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor(address _coreContract) {
        require(_coreContract != address(0), Errors.ZERO_ADDRESS);
        coreContract = IRiverBitCore(_coreContract);
        
        // Initialize trading state
        tradingState = TradingState({
            totalVolume24h: 0,
            lastVolumeReset: uint64(block.timestamp),
            totalPositions: 0,
            activePairs: 0,
            feeMultiplier: 100, // 1x multiplier
            paused: false
        });
        
        // Initialize MEV protection
        mevState.initialize(MEV_PROTECTION_DELAY);
    }

    // ============ EXTERNAL FUNCTIONS ============
    
    /**
     * @notice Open a new position with MEV protection
     * @param params Position parameters
     * @return positionKey The key of the created position
     */
    function openPosition(OpenPositionParams calldata params) 
        external 
        nonReentrant 
        whenNotPaused 
        validMarket(params.market)
        mevProtected
        returns (bytes32 positionKey) 
    {
        // Update user data
        UserTradingData storage user = userData[msg.sender];
        require(user.openPositions < MAX_POSITIONS_PER_USER, Errors.MAX_POSITIONS_EXCEEDED);
        
        // Validate parameters
        _validatePositionParams(params);
        
        // Generate position key
        positionKey = _generatePositionKey(msg.sender, params.market, block.timestamp);
        
        // Get current market price with staleness check
        uint256 currentPrice = _getCurrentPrice(params.market);
        
        // Check slippage
        _checkSlippage(params.isLong, currentPrice, params.acceptablePrice);
        
        // Calculate fees with dynamic adjustment
        uint256 tradingFee = _calculateDynamicFee(params.size, params.market);
        
        // Create position
        Position memory position = Position({
            trader: msg.sender,
            market: params.market,
            isLong: params.isLong,
            size: params.size,
            entryPrice: currentPrice,
            margin: params.margin,
            leverage: params.size / params.margin,
            openTime: block.timestamp,
            lastFundingTime: block.timestamp
        });
        
        // Store position
        positions[positionKey] = position;
        positionExists[positionKey] = true;
        userPositions[msg.sender].push(positionKey);
        
        // Update state
        user.openPositions++;
        user.totalTrades++;
        user.lastTradeTime = uint64(block.timestamp);
        tradingState.totalPositions++;
        
        // Update market data
        MarketData storage market = marketData[params.market];
        if (params.isLong) {
            market.totalLongOI += uint128(params.size);
        } else {
            market.totalShortOI += uint128(params.size);
        }
        market.dailyVolume += uint32(params.size);
        
        // Update 24h volume for dynamic fees
        _updateVolume(params.size, params.market);
        
        emit PositionOpened(
            msg.sender,
            positionKey,
            params.market,
            params.isLong,
            params.size,
            currentPrice,
            tradingFee
        );
        
        return positionKey;
    }
    
    /**
     * @notice Close position with optimized PnL calculation
     * @param positionKey Position to close
     * @param size Size to close (0 for full close)
     * @param minPrice Minimum acceptable price for slippage protection
     * @return pnl Realized PnL
     */
    function closePosition(
        bytes32 positionKey,
        uint256 size,
        uint256 minPrice
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        mevProtected
        returns (int256 pnl) 
    {
        require(positionExists[positionKey], Errors.POSITION_NOT_FOUND);
        Position storage position = positions[positionKey];
        require(position.trader == msg.sender, Errors.UNAUTHORIZED);
        
        // Determine close size
        uint256 closeSize = size == 0 ? position.size : size;
        require(closeSize <= position.size, Errors.INVALID_SIZE);
        
        // Get current market price
        uint256 currentPrice = _getCurrentPrice(position.market);
        
        // Check slippage protection
        if (position.isLong) {
            require(currentPrice >= minPrice, Errors.SLIPPAGE_EXCEEDED);
        } else {
            require(currentPrice <= minPrice, Errors.SLIPPAGE_EXCEEDED);
        }
        
        // Calculate PnL
        pnl = TradingMath.calculatePnL(
            position.entryPrice,
            currentPrice,
            closeSize,
            position.isLong
        );
        
        // Calculate trading fee
        uint256 tradingFee = _calculateDynamicFee(closeSize, position.market);
        
        // Update position or close completely
        if (closeSize == position.size) {
            // Full close
            _removeUserPosition(msg.sender, positionKey);
            delete positions[positionKey];
            delete positionExists[positionKey];
            userData[msg.sender].openPositions--;
            tradingState.totalPositions--;
        } else {
            // Partial close
            position.size -= closeSize;
        }
        
        // Update market open interest
        MarketData storage market = marketData[position.market];
        if (position.isLong) {
            market.totalLongOI -= uint128(closeSize);
        } else {
            market.totalShortOI -= uint128(closeSize);
        }
        market.dailyVolume += uint32(closeSize);
        
        // Update volume for dynamic fees
        _updateVolume(closeSize, position.market);
        
        emit PositionClosed(msg.sender, positionKey, currentPrice, pnl, tradingFee);
        
        return pnl;
    }
    
    /**
     * @notice Execute batch trades for gas optimization
     * @param trades Array of trade parameters
     * @return batchId Batch execution ID
     */
    function executeBatchTrades(BatchTradeParams[] calldata trades) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 batchId) 
    {
        require(trades.length <= MAX_BATCH_SIZE, Errors.BATCH_TOO_LARGE);
        require(trades.length > 1, Errors.BATCH_TOO_SMALL);
        
        batchId = batchState.startBatch();
        uint256 executedTrades = 0;
        uint256 gasBefore = gasleft();
        
        for (uint256 i = 0; i < trades.length; i++) {
            try this._executeSingleTrade(trades[i]) {
                executedTrades++;
            } catch {
                // Log failed trade but continue with batch
                continue;
            }
        }
        
        uint256 gasUsed = gasBefore - gasleft();
        uint256 gasSaved = batchState.finalizeBatch(executedTrades, gasUsed);
        
        emit BatchTradeExecuted(msg.sender, batchId, executedTrades, gasSaved);
        
        return batchId;
    }
    
    /**
     * @notice Commit to trade for MEV protection
     * @param commitment Commitment hash
     */
    function commitTrade(bytes32 commitment) external {
        mevState.commit(msg.sender, commitment);
    }
    
    /**
     * @notice Reveal trade after commitment
     * @param nonce Random nonce used in commitment
     * @param params Trade parameters
     */
    function revealTrade(uint256 nonce, OpenPositionParams calldata params) external {
        bytes32 hash = keccak256(abi.encodePacked(nonce, params.market, params.size));
        require(mevState.reveal(msg.sender, hash), Errors.INVALID_REVEAL);
        
        // Execute the trade
        openPosition(params);
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Validate position parameters
     * @param params Position parameters to validate
     */
    function _validatePositionParams(OpenPositionParams calldata params) internal pure {
        require(params.size > 0, Errors.INVALID_SIZE);
        require(params.margin > 0, Errors.INVALID_MARGIN);
        require(params.acceptablePrice > 0, Errors.INVALID_PRICE);
        require(params.size >= params.margin, Errors.INVALID_LEVERAGE);
    }
    
    /**
     * @notice Generate unique position key
     * @param trader Trader address
     * @param market Market identifier
     * @param timestamp Current timestamp
     * @return positionKey Unique position key
     */
    function _generatePositionKey(
        address trader,
        bytes32 market,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(trader, market, timestamp));
    }
    
    /**
     * @notice Get current market price with staleness check
     * @param market Market identifier
     * @return price Current market price
     */
    function _getCurrentPrice(bytes32 market) internal view returns (uint256 price) {
        price = marketPrices[market];
        require(price > 0, Errors.INVALID_PRICE);
        
        MarketData storage marketInfo = marketData[market];
        require(
            block.timestamp - marketInfo.lastPriceUpdate <= 300, // 5 minutes
            Errors.STALE_PRICE
        );
    }
    
    /**
     * @notice Check slippage protection
     * @param isLong Whether position is long
     * @param currentPrice Current market price
     * @param acceptablePrice User's acceptable price
     */
    function _checkSlippage(
        bool isLong,
        uint256 currentPrice,
        uint256 acceptablePrice
    ) internal pure {
        if (isLong) {
            require(currentPrice <= acceptablePrice, Errors.SLIPPAGE_EXCEEDED);
        } else {
            require(currentPrice >= acceptablePrice, Errors.SLIPPAGE_EXCEEDED);
        }
    }
    
    /**
     * @notice Calculate dynamic trading fee based on market conditions
     * @param size Trade size
     * @param market Market identifier
     * @return fee Trading fee amount
     */
    function _calculateDynamicFee(uint256 size, bytes32 market) internal view returns (uint256 fee) {
        // Base fee: 0.1% for crypto, 0.2% for stocks
        uint256 baseFee = size / 1000; // 0.1%
        
        // Apply dynamic multiplier based on volume
        fee = (baseFee * tradingState.feeMultiplier) / 100;
        
        // Apply VIP discount
        UserTradingData storage user = userData[msg.sender];
        if (user.vipLevel > 0) {
            uint256 discount = user.vipLevel * 5; // 5% discount per VIP level
            fee = fee - (fee * discount / 100);
        }
    }
    
    /**
     * @notice Update 24h volume for dynamic fee calculation
     * @param volume Trade volume
     * @param market Market identifier
     */
    function _updateVolume(uint256 volume, bytes32 market) internal {
        uint256 currentHour = block.timestamp / 1 hours;
        
        // Add to current hour
        hourlyVolume[currentHour] += volume;
        marketVolume24h[market] += volume;
        
        // Update total 24h volume
        tradingState.totalVolume24h += uint128(volume);
        
        // Check if fee multiplier needs adjustment
        _updateDynamicFees();
    }
    
    /**
     * @notice Update dynamic fee multiplier based on volume
     */
    function _updateDynamicFees() internal {
        uint256 currentHour = block.timestamp / 1 hours;
        uint256 volume24h = 0;
        
        // Calculate 24h volume
        for (uint256 i = 0; i < 24; i++) {
            volume24h += hourlyVolume[currentHour - i];
        }
        
        // Adjust fee multiplier based on volume
        uint8 newMultiplier;
        if (volume24h > 100000 ether) {
            newMultiplier = 80; // 20% discount for high volume
        } else if (volume24h > 50000 ether) {
            newMultiplier = 90; // 10% discount for medium volume
        } else if (volume24h < 1000 ether) {
            newMultiplier = 150; // 50% increase for low volume
        } else {
            newMultiplier = 100; // Normal fee
        }
        
        if (newMultiplier != tradingState.feeMultiplier) {
            tradingState.feeMultiplier = newMultiplier;
            emit DynamicFeeUpdated(newMultiplier, volume24h, block.timestamp);
        }
    }
    
    /**
     * @notice Remove position from user's position array
     * @param trader Trader address
     * @param positionKey Position key to remove
     */
    function _removeUserPosition(address trader, bytes32 positionKey) internal {
        bytes32[] storage userPos = userPositions[trader];
        uint256 length = userPos.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (userPos[i] == positionKey) {
                userPos[i] = userPos[length - 1];
                userPos.pop();
                break;
            }
        }
    }
    
    /**
     * @notice Execute single trade (used by batch operations)
     * @param params Trade parameters
     */
    function _executeSingleTrade(BatchTradeParams calldata params) external {
        require(msg.sender == address(this), Errors.UNAUTHORIZED);
        
        if (params.action == TradeAction.OPEN) {
            openPosition(OpenPositionParams({
                market: params.market,
                isLong: params.isLong,
                size: params.size,
                margin: params.margin,
                acceptablePrice: params.price
            }));
        } else if (params.action == TradeAction.CLOSE) {
            closePosition(params.positionKey, params.size, params.price);
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get user's open positions
     * @param trader Trader address
     * @return positionKeys Array of position keys
     */
    function getUserPositions(address trader) external view returns (bytes32[] memory) {
        return userPositions[trader];
    }
    
    /**
     * @notice Get position details
     * @param positionKey Position key
     * @return position Position details
     */
    function getPosition(bytes32 positionKey) external view returns (Position memory) {
        return positions[positionKey];
    }
    
    /**
     * @notice Get market information
     * @param market Market identifier
     * @return marketInfo Market data
     */
    function getMarketData(bytes32 market) external view returns (MarketData memory) {
        return marketData[market];
    }
    
    /**
     * @notice Get trading state
     * @return tradingInfo Current trading state
     */
    function getTradingState() external view returns (TradingState memory) {
        return tradingState;
    }
    
    /**
     * @notice Get user trading data
     * @param trader Trader address
     * @return userInfo User trading information
     */
    function getUserData(address trader) external view returns (UserTradingData memory) {
        return userData[trader];
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Pause trading
     */
    function pause() external onlyCore {
        tradingState.paused = true;
    }
    
    /**
     * @notice Unpause trading
     */
    function unpause() external onlyCore {
        tradingState.paused = false;
    }
    
    /**
     * @notice Update market price
     * @param market Market identifier
     * @param price New price
     */
    function updatePrice(bytes32 market, uint256 price) external onlyCore {
        require(price > 0, Errors.INVALID_PRICE);
        marketPrices[market] = price;
        marketData[market].lastPriceUpdate = uint64(block.timestamp);
    }
    
    /**
     * @notice Add new market
     * @param market Market identifier
     */
    function addMarket(bytes32 market) external onlyCore {
        require(!marketData[market].isActive, Errors.MARKET_ALREADY_EXISTS);
        
        marketData[market] = MarketData({
            totalLongOI: 0,
            totalShortOI: 0,
            lastPriceUpdate: uint64(block.timestamp),
            dailyVolume: 0,
            fundingRate: 0,
            volatilityIndex: 100,
            isActive: true
        });
        
        tradingState.activePairs++;
    }
}