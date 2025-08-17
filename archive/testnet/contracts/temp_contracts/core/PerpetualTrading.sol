// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/IPerpetualTrading.sol";
import "../interfaces/IMarginManager.sol";
import "../libraries/SafeMath.sol";
import "../libraries/TradingMath.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title PerpetualTrading
 * @notice Core contract for perpetual trading with support for crypto and xStock markets
 * @dev Handles position management, PnL calculations, and funding payments
 */
contract PerpetualTrading is 
    IPerpetualTrading,
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable
{
    using SafeMath for uint256;

    // Constants
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant FUNDING_INTERVAL = 8 hours;
    uint256 private constant MAX_FUNDING_RATE = 1e16; // 1% per funding period

    // State variables
    IMarginManager public marginManager;
    
    // Market configurations
    mapping(bytes32 => bool) public supportedMarkets;
    mapping(bytes32 => IMarginManager.MarketType) public marketTypes;
    mapping(bytes32 => uint256) public tradingFees; // basis points
    mapping(bytes32 => uint256) public liquidationFees; // basis points
    
    // Price feeds (in production would be Chainlink or other oracle)
    mapping(bytes32 => uint256) public marketPrices;
    mapping(bytes32 => uint256) public priceUpdateTimestamp;
    
    // Funding rates and payments
    mapping(bytes32 => FundingRate) public fundingRates;
    mapping(bytes32 => mapping(address => uint256)) public lastFundingPayment;
    
    // Open interest tracking
    mapping(bytes32 => uint256) public longOpenInterest;
    mapping(bytes32 => uint256) public shortOpenInterest;
    
    // Position tracking for liquidations
    mapping(address => bytes32[]) public userPositions;
    mapping(address => mapping(bytes32 => uint256)) public positionIndex;
    
    // Protocol settings
    uint256 public liquidatorRewardRate; // basis points
    uint256 public maxPositionSize; // max position size per user per market
    address public feeCollector;
    
    // Emergency circuit breaker
    mapping(bytes32 => bool) public marketsPaused;

    // Custom errors
    error MarketNotSupported();
    error MarketPaused();
    error InvalidPrice();
    error InsufficientMargin();
    error PositionNotFound();
    error ExceedsMaxSize();
    error SlippageExceeded();
    error NotLiquidatable();
    error FundingNotDue();

    // Modifiers
    modifier validMarket(bytes32 market) {
        if (!supportedMarkets[market]) revert MarketNotSupported();
        if (marketsPaused[market]) revert MarketPaused();
        _;
    }

    modifier validPrice(uint256 price) {
        if (price == 0) revert InvalidPrice();
        _;
    }

    /**
     * @dev Initialize the contract
     * @param _marginManager Address of the MarginManager contract
     * @param _feeCollector Address to collect trading fees
     */
    function initialize(
        address _marginManager,
        address _feeCollector
    ) external initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init();

        require(_marginManager != address(0), "PerpetualTrading: invalid margin manager");
        require(_feeCollector != address(0), "PerpetualTrading: invalid fee collector");

        marginManager = IMarginManager(_marginManager);
        feeCollector = _feeCollector;
        liquidatorRewardRate = 500; // 5% of liquidated position
        maxPositionSize = 1000000 * 1e18; // $1M max position size

        // Initialize default markets
        _addMarket("BTC-USD", IMarginManager.MarketType.CRYPTO, 10, 50); // 0.1% trading, 0.5% liquidation
        _addMarket("ETH-USD", IMarginManager.MarketType.CRYPTO, 10, 50);
        _addMarket("SOL-USD", IMarginManager.MarketType.CRYPTO, 15, 75); // Higher fees for smaller assets
        _addMarket("AAPL-USD", IMarginManager.MarketType.XSTOCK, 20, 100); // Higher fees for stocks
        _addMarket("TSLA-USD", IMarginManager.MarketType.XSTOCK, 25, 100);
    }

    /**
     * @notice Open a new position or add to existing position
     * @param market Market identifier (e.g., "BTC-USD")
     * @param direction Long or short
     * @param size Position size in USD
     * @param maxPrice Maximum acceptable price for long, minimum for short
     * @param marginMode Cross or isolated margin mode
     * @return result Trade execution result
     */
    function openPosition(
        bytes32 market,
        TradeDirection direction,
        uint256 size,
        uint256 maxPrice,
        IMarginManager.MarginMode marginMode
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        validMarket(market)
        validPrice(maxPrice)
        returns (TradeResult memory result) 
    {
        require(size > 0, "PerpetualTrading: invalid size");
        require(size <= maxPositionSize, "PerpetualTrading: exceeds max size");

        // Get current market price
        uint256 currentPrice = _getCurrentPrice(market);
        
        // Check slippage
        if (direction == TradeDirection.LONG && currentPrice > maxPrice) {
            revert SlippageExceeded();
        }
        if (direction == TradeDirection.SHORT && currentPrice < maxPrice) {
            revert SlippageExceeded();
        }

        // Generate position key
        bytes32 positionKey = getPositionKey(msg.sender, market);
        
        // Get existing position
        IMarginManager.Position memory existingPosition = marginManager.getPosition(msg.sender, positionKey);
        
        // Calculate required margin
        uint256 requiredMargin = marginManager.getRequiredMargin(
            msg.sender,
            positionKey,
            size,
            currentPrice,
            marketTypes[market]
        );

        // Calculate trading fee
        uint256 fee = TradingMath.calculateTradingFee(size, tradingFees[market]);

        if (existingPosition.size == 0) {
            // New position
            marginManager.createPosition(
                msg.sender,
                positionKey,
                size,
                currentPrice,
                direction == TradeDirection.LONG,
                marginMode,
                marketTypes[market],
                requiredMargin
            );

            // Add to user positions tracking
            userPositions[msg.sender].push(positionKey);
            positionIndex[msg.sender][positionKey] = userPositions[msg.sender].length - 1;

            result = TradeResult({
                positionKey: positionKey,
                executedSize: size,
                executedPrice: currentPrice,
                fee: fee,
                pnl: 0,
                newPositionSize: size,
                newMargin: marginMode == IMarginManager.MarginMode.ISOLATED ? requiredMargin : 0
            });
        } else {
            // Adding to existing position
            bool isSameDirection = (direction == TradeDirection.LONG) == existingPosition.isLong;
            require(isSameDirection, "PerpetualTrading: cannot reverse position");

            // Calculate new average entry price
            uint256 newEntryPrice = TradingMath.calculateNewAveragePrice(
                existingPosition.size,
                existingPosition.entryPrice,
                size,
                currentPrice
            );

            uint256 newSize = existingPosition.size.add(size);
            int256 marginDelta = 0;

            if (marginMode == IMarginManager.MarginMode.ISOLATED) {
                marginDelta = SafeMath.toInt256(requiredMargin);
            }

            // Update position
            marginManager.updatePosition(
                msg.sender,
                positionKey,
                newSize,
                newEntryPrice,
                marginDelta
            );

            result = TradeResult({
                positionKey: positionKey,
                executedSize: size,
                executedPrice: currentPrice,
                fee: fee,
                pnl: 0,
                newPositionSize: newSize,
                newMargin: existingPosition.margin.add(SafeMath.toUint256(marginDelta))
            });
        }

        // Update open interest
        if (direction == TradeDirection.LONG) {
            longOpenInterest[market] = longOpenInterest[market].add(size);
        } else {
            shortOpenInterest[market] = shortOpenInterest[market].add(size);
        }

        // Deduct trading fee from margin
        marginManager.updateMarginBalance(msg.sender, -SafeMath.toInt256(fee));

        // Update funding timestamp
        lastFundingPayment[market][msg.sender] = block.timestamp;

        emit TradeExecuted(
            msg.sender,
            positionKey,
            direction,
            size,
            currentPrice,
            fee,
            0
        );
    }

    /**
     * @notice Close position or reduce position size
     * @param positionKey Position identifier
     * @param size Amount to close (0 = close entire position)
     * @param minPrice Minimum acceptable price for long close, maximum for short close
     * @return result Trade execution result
     */
    function closePosition(
        bytes32 positionKey,
        uint256 size,
        uint256 minPrice
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        validPrice(minPrice)
        returns (TradeResult memory result) 
    {
        // Get position
        IMarginManager.Position memory position = marginManager.getPosition(msg.sender, positionKey);
        require(position.size > 0, "PerpetualTrading: position not found");

        // Get market from position key
        bytes32 market = _getMarketFromPositionKey(positionKey);
        if (!supportedMarkets[market]) revert MarketNotSupported();

        // Determine close size
        uint256 closeSize = size == 0 ? position.size : size;
        require(closeSize <= position.size, "PerpetualTrading: exceeds position size");

        // Get current market price
        uint256 currentPrice = _getCurrentPrice(market);

        // Check slippage
        if (position.isLong && currentPrice < minPrice) {
            revert SlippageExceeded();
        }
        if (!position.isLong && currentPrice > minPrice) {
            revert SlippageExceeded();
        }

        // Calculate PnL
        int256 pnl = TradingMath.calculatePnL(
            position.entryPrice,
            currentPrice,
            closeSize,
            position.isLong
        );

        // Calculate trading fee
        uint256 fee = TradingMath.calculateTradingFee(closeSize, tradingFees[market]);

        // Update position or close completely
        if (closeSize == position.size) {
            // Close entire position
            marginManager.closePosition(msg.sender, positionKey);

            // Remove from user positions tracking
            uint256 index = positionIndex[msg.sender][positionKey];
            uint256 lastIndex = userPositions[msg.sender].length - 1;
            
            if (index != lastIndex) {
                bytes32 lastKey = userPositions[msg.sender][lastIndex];
                userPositions[msg.sender][index] = lastKey;
                positionIndex[msg.sender][lastKey] = index;
            }
            
            userPositions[msg.sender].pop();
            delete positionIndex[msg.sender][positionKey];

            result = TradeResult({
                positionKey: positionKey,
                executedSize: closeSize,
                executedPrice: currentPrice,
                fee: fee,
                pnl: pnl,
                newPositionSize: 0,
                newMargin: 0
            });
        } else {
            // Partial close
            uint256 newSize = position.size.sub(closeSize);
            int256 marginDelta = 0;

            if (position.mode == IMarginManager.MarginMode.ISOLATED) {
                // Proportionally reduce margin for isolated positions
                uint256 marginReduction = position.margin.mul(closeSize).div(position.size);
                marginDelta = -SafeMath.toInt256(marginReduction);
            }

            marginManager.updatePosition(
                msg.sender,
                positionKey,
                newSize,
                position.entryPrice, // Entry price stays the same for partial close
                marginDelta
            );

            result = TradeResult({
                positionKey: positionKey,
                executedSize: closeSize,
                executedPrice: currentPrice,
                fee: fee,
                pnl: pnl,
                newPositionSize: newSize,
                newMargin: position.margin.sub(SafeMath.toUint256(-marginDelta))
            });
        }

        // Update open interest
        if (position.isLong) {
            longOpenInterest[market] = longOpenInterest[market].sub(closeSize);
        } else {
            shortOpenInterest[market] = shortOpenInterest[market].sub(closeSize);
        }

        // Apply PnL and deduct fee
        int256 netPnL = pnl - SafeMath.toInt256(fee);
        marginManager.updateMarginBalance(msg.sender, netPnL);

        emit PositionClosed(
            msg.sender,
            positionKey,
            currentPrice,
            pnl,
            fee
        );
    }

    /**
     * @notice Adjust margin for a position
     * @param positionKey Position identifier
     * @param marginDelta Change in margin (positive = add, negative = remove)
     */
    function adjustMargin(
        bytes32 positionKey,
        int256 marginDelta
    ) external nonReentrant whenNotPaused {
        require(marginDelta != 0, "PerpetualTrading: zero margin change");

        if (marginDelta > 0) {
            marginManager.addMargin(positionKey, SafeMath.toUint256(marginDelta));
        } else {
            marginManager.removeMargin(positionKey, SafeMath.toUint256(-marginDelta));
        }
    }

    /**
     * @notice Liquidate an undercollateralized position
     * @param trader Position owner
     * @param positionKey Position to liquidate
     * @return liquidatorReward Reward paid to liquidator
     */
    function liquidatePosition(
        address trader,
        bytes32 positionKey
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 liquidatorReward) 
    {
        // Get position
        IMarginManager.Position memory position = marginManager.getPosition(trader, positionKey);
        require(position.size > 0, "PerpetualTrading: position not found");

        // Get market from position key
        bytes32 market = _getMarketFromPositionKey(positionKey);
        uint256 currentPrice = _getCurrentPrice(market);

        // Check if position is liquidatable
        bool isLiquidatable = marginManager.isLiquidatable(trader, positionKey, currentPrice);
        if (!isLiquidatable) revert NotLiquidatable();

        // Calculate liquidation parameters
        uint256 liquidationFee = TradingMath.calculateTradingFee(position.size, liquidationFees[market]);
        liquidatorReward = position.size.percentage(liquidatorRewardRate);

        // Calculate final PnL
        int256 pnl = TradingMath.calculatePnL(
            position.entryPrice,
            currentPrice,
            position.size,
            position.isLong
        );

        // Close position
        marginManager.closePosition(trader, positionKey);

        // Remove from user positions tracking
        uint256 index = positionIndex[trader][positionKey];
        uint256 lastIndex = userPositions[trader].length - 1;
        
        if (index != lastIndex) {
            bytes32 lastKey = userPositions[trader][lastIndex];
            userPositions[trader][index] = lastKey;
            positionIndex[trader][lastKey] = index;
        }
        
        userPositions[trader].pop();
        delete positionIndex[trader][positionKey];

        // Update open interest
        if (position.isLong) {
            longOpenInterest[market] = longOpenInterest[market].sub(position.size);
        } else {
            shortOpenInterest[market] = shortOpenInterest[market].sub(position.size);
        }

        // Apply PnL and deduct fees
        int256 netPnL = pnl - SafeMath.toInt256(liquidationFee) - SafeMath.toInt256(liquidatorReward);
        marginManager.updateMarginBalance(trader, netPnL);

        // Pay liquidator reward
        marginManager.updateMarginBalance(msg.sender, SafeMath.toInt256(liquidatorReward));

        emit PositionLiquidated(
            trader,
            positionKey,
            currentPrice,
            msg.sender,
            liquidatorReward
        );
    }

    /**
     * @notice Update funding rate for a market
     * @param market Market identifier
     */
    function updateFunding(bytes32 market) external validMarket(market) {
        FundingRate storage funding = fundingRates[market];
        
        require(
            block.timestamp >= funding.lastUpdate + FUNDING_INTERVAL,
            "PerpetualTrading: funding not due"
        );

        // Calculate funding rate based on open interest imbalance
        uint256 totalLong = longOpenInterest[market];
        uint256 totalShort = shortOpenInterest[market];
        uint256 totalOI = totalLong.add(totalShort);

        int256 newRate = 0;
        if (totalOI > 0) {
            if (totalLong > totalShort) {
                // More longs than shorts - positive funding (longs pay shorts)
                uint256 imbalance = totalLong.sub(totalShort);
                uint256 imbalanceRatio = imbalance.mul(PRECISION).div(totalOI);
                newRate = SafeMath.toInt256(imbalanceRatio.mul(MAX_FUNDING_RATE).div(PRECISION));
            } else if (totalShort > totalLong) {
                // More shorts than longs - negative funding (shorts pay longs)
                uint256 imbalance = totalShort.sub(totalLong);
                uint256 imbalanceRatio = imbalance.mul(PRECISION).div(totalOI);
                newRate = -SafeMath.toInt256(imbalanceRatio.mul(MAX_FUNDING_RATE).div(PRECISION));
            }
        }

        // Cap funding rate
        if (newRate > SafeMath.toInt256(MAX_FUNDING_RATE)) {
            newRate = SafeMath.toInt256(MAX_FUNDING_RATE);
        } else if (newRate < -SafeMath.toInt256(MAX_FUNDING_RATE)) {
            newRate = -SafeMath.toInt256(MAX_FUNDING_RATE);
        }

        funding.rate = newRate;
        funding.lastUpdate = block.timestamp;
    }

    /**
     * @notice Claim funding payment for a position
     * @param positionKey Position identifier
     */
    function claimFunding(bytes32 positionKey) external nonReentrant {
        IMarginManager.Position memory position = marginManager.getPosition(msg.sender, positionKey);
        require(position.size > 0, "PerpetualTrading: position not found");

        bytes32 market = _getMarketFromPositionKey(positionKey);
        uint256 lastPayment = lastFundingPayment[market][msg.sender];
        
        require(block.timestamp > lastPayment + FUNDING_INTERVAL, "PerpetualTrading: funding not due");

        FundingRate memory funding = fundingRates[market];
        uint256 timeDelta = block.timestamp - lastPayment;

        int256 fundingPayment = TradingMath.calculateFundingPayment(
            position.size,
            funding.rate,
            timeDelta,
            position.isLong
        );

        if (fundingPayment != 0) {
            marginManager.updateMarginBalance(msg.sender, -fundingPayment);
            lastFundingPayment[market][msg.sender] = block.timestamp;

            emit FundingPaid(msg.sender, positionKey, fundingPayment);
        }
    }

    // View functions

    /**
     * @notice Get position information
     * @param trader Position owner
     * @param positionKey Position identifier
     * @return position Position details
     */
    function getPosition(address trader, bytes32 positionKey) 
        external 
        view 
        returns (IMarginManager.Position memory position) 
    {
        return marginManager.getPosition(trader, positionKey);
    }

    /**
     * @notice Calculate unrealized PnL for a position
     * @param trader Position owner
     * @param positionKey Position identifier
     * @param currentPrice Current market price
     * @return pnl Unrealized PnL
     */
    function getUnrealizedPnL(address trader, bytes32 positionKey, uint256 currentPrice)
        external
        view
        returns (int256 pnl)
    {
        IMarginManager.Position memory position = marginManager.getPosition(trader, positionKey);
        if (position.size == 0) return 0;

        return TradingMath.calculatePnL(
            position.entryPrice,
            currentPrice,
            position.size,
            position.isLong
        );
    }

    /**
     * @notice Get funding rate information for a market
     * @param market Market identifier
     * @return fundingRate Funding rate details
     */
    function getFundingRate(bytes32 market) external view returns (FundingRate memory fundingRate) {
        return fundingRates[market];
    }

    /**
     * @notice Generate position key for a trader and market
     * @param trader Trader address
     * @param market Market identifier
     * @return key Position key
     */
    function getPositionKey(address trader, bytes32 market) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(trader, market));
    }

    /**
     * @notice Check if position is liquidatable
     * @param trader Position owner
     * @param positionKey Position identifier
     * @param currentPrice Current market price
     * @return liquidatable Whether position can be liquidated
     */
    function isPositionLiquidatable(address trader, bytes32 positionKey, uint256 currentPrice)
        external
        view
        returns (bool liquidatable)
    {
        return marginManager.isLiquidatable(trader, positionKey, currentPrice);
    }

    /**
     * @notice Calculate maximum position size for a trader
     * @param trader Trader address
     * @param market Market identifier
     * @param leverage Desired leverage
     * @return maxSize Maximum position size
     */
    function getMaxPositionSize(address trader, bytes32 market, uint256 leverage)
        external
        view
        returns (uint256 maxSize)
    {
        uint256 availableMargin = marginManager.getAvailableMargin(trader);
        uint256 maxLeverage = marginManager.getMaxLeverage(marketTypes[market]);
        
        uint256 effectiveLeverage = leverage > maxLeverage ? maxLeverage : leverage;
        maxSize = TradingMath.calculateMaxPositionSize(availableMargin, effectiveLeverage, 100);
        
        // Apply global position size limit
        if (maxSize > maxPositionSize) {
            maxSize = maxPositionSize;
        }
    }

    /**
     * @notice Get user's open positions
     * @param trader Trader address
     * @return positions Array of position keys
     */
    function getUserPositions(address trader) external view returns (bytes32[] memory positions) {
        return userPositions[trader];
    }

    // Internal functions

    /**
     * @dev Get current price for a market (placeholder for oracle integration)
     * @param market Market identifier
     * @return price Current market price
     */
    function _getCurrentPrice(bytes32 market) internal view returns (uint256 price) {
        price = marketPrices[market];
        require(price > 0, "PerpetualTrading: invalid price");
        
        // Check price freshness (within 5 minutes)
        require(
            block.timestamp - priceUpdateTimestamp[market] <= 300,
            "PerpetualTrading: stale price"
        );
    }

    /**
     * @dev Extract market identifier from position key
     * @param positionKey Position key
     * @return market Market identifier
     */
    function _getMarketFromPositionKey(bytes32 positionKey) internal view returns (bytes32 market) {
        // In a real implementation, this would need to reverse-engineer the market from the position key
        // For now, we'll assume the position key format allows this extraction
        // This is a simplified implementation
        bytes32[] memory userPos = userPositions[msg.sender];
        for (uint256 i = 0; i < userPos.length; i++) {
            if (userPos[i] == positionKey) {
                // Find associated market (this would be stored differently in production)
                if (positionKey == getPositionKey(msg.sender, "BTC-USD")) return "BTC-USD";
                if (positionKey == getPositionKey(msg.sender, "ETH-USD")) return "ETH-USD";
                if (positionKey == getPositionKey(msg.sender, "SOL-USD")) return "SOL-USD";
                if (positionKey == getPositionKey(msg.sender, "AAPL-USD")) return "AAPL-USD";
                if (positionKey == getPositionKey(msg.sender, "TSLA-USD")) return "TSLA-USD";
                break;
            }
        }
        revert("PerpetualTrading: market not found for position");
    }

    /**
     * @dev Add a new market
     * @param market Market identifier
     * @param marketType Market type (crypto or xStock)
     * @param tradingFee Trading fee in basis points
     * @param liquidationFee Liquidation fee in basis points
     */
    function _addMarket(
        bytes32 market,
        IMarginManager.MarketType marketType,
        uint256 tradingFee,
        uint256 liquidationFee
    ) internal {
        supportedMarkets[market] = true;
        marketTypes[market] = marketType;
        tradingFees[market] = tradingFee;
        liquidationFees[market] = liquidationFee;
        
        // Initialize funding rate
        fundingRates[market] = FundingRate({
            rate: 0,
            lastUpdate: block.timestamp,
            interval: FUNDING_INTERVAL
        });
    }

    // Admin functions

    /**
     * @notice Add or update a market
     * @param market Market identifier
     * @param marketType Market type
     * @param tradingFee Trading fee (basis points)
     * @param liquidationFee Liquidation fee (basis points)
     */
    function addMarket(
        bytes32 market,
        IMarginManager.MarketType marketType,
        uint256 tradingFee,
        uint256 liquidationFee
    ) external onlyOwner {
        require(tradingFee <= 1000, "PerpetualTrading: trading fee too high"); // Max 10%
        require(liquidationFee <= 1000, "PerpetualTrading: liquidation fee too high"); // Max 10%
        
        _addMarket(market, marketType, tradingFee, liquidationFee);
    }

    /**
     * @notice Update market price (for testing, would be oracle in production)
     * @param market Market identifier
     * @param price New price
     */
    function updatePrice(bytes32 market, uint256 price) external onlyOwner validPrice(price) {
        marketPrices[market] = price;
        priceUpdateTimestamp[market] = block.timestamp;
    }

    /**
     * @notice Pause/unpause a specific market
     * @param market Market identifier
     * @param paused Pause status
     */
    function setMarketPaused(bytes32 market, bool paused) external onlyOwner {
        marketsPaused[market] = paused;
    }

    /**
     * @notice Update liquidator reward rate
     * @param rate New reward rate (basis points)
     */
    function setLiquidatorRewardRate(uint256 rate) external onlyOwner {
        require(rate <= 1000, "PerpetualTrading: reward rate too high"); // Max 10%
        liquidatorRewardRate = rate;
    }

    /**
     * @notice Update maximum position size
     * @param size New maximum position size
     */
    function setMaxPositionSize(uint256 size) external onlyOwner {
        maxPositionSize = size;
    }

    /**
     * @notice Update fee collector address
     * @param collector New fee collector address
     */
    function setFeeCollector(address collector) external onlyOwner {
        require(collector != address(0), "PerpetualTrading: invalid collector");
        feeCollector = collector;
    }

    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}