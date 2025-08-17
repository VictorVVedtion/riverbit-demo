// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ETMAEngine
 * @notice Evening Trading Matching Algorithm for xStock night trading
 * @dev Implements windowed matching with threshold-based execution for after-hours trading
 * 
 * Key Features:
 * - Windowed order collection (6 PM - 10 PM)
 * - Threshold-based matching algorithm
 * - Volume-weighted average pricing
 * - Fair order execution priority
 * - Anti-manipulation safeguards
 */
contract ETMAEngine is 
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant MATCHING_ROLE = keccak256("MATCHING_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_ORDERS_PER_USER = 50;
    uint256 private constant MIN_MATCHING_THRESHOLD = 10000 * PRECISION; // $10k
    uint256 private constant MAX_PRICE_DEVIATION = 1000; // 10%

    // ============ STRUCTS ============

    // ETMA order structure
    struct ETMAOrder {
        bytes32 orderId;
        address trader;
        bytes32 market;
        bool isLong;
        uint256 size;
        uint256 limitPrice;
        uint256 minFillSize;
        uint256 timestamp;
        uint256 priority; // Based on size and timing
        OrderStatus status;
        uint256 filledSize;
        uint256 averageFillPrice;
    }

    // Order status
    enum OrderStatus {
        PENDING,
        PARTIALLY_FILLED,
        FILLED,
        CANCELLED,
        EXPIRED
    }

    // Matching window configuration
    struct MatchingWindow {
        uint256 startHour; // 18 (6 PM)
        uint256 endHour;   // 22 (10 PM)
        uint256 matchingThreshold;
        uint256 maxPriceDeviation;
        bool isActive;
    }

    // Market matching state
    struct MarketMatchingState {
        uint256 totalLongVolume;
        uint256 totalShortVolume;
        uint256 weightedLongPrice;
        uint256 weightedShortPrice;
        uint256 lastMatchingTime;
        uint256 matchingCount;
        bool thresholdReached;
    }

    // Matching result
    struct MatchingResult {
        bytes32 marketId;
        uint256 matchingPrice;
        uint256 totalVolume;
        uint256 longOrdersFilled;
        uint256 shortOrdersFilled;
        uint256 timestamp;
        bytes32[] filledOrders;
    }

    // User trading statistics
    struct UserTradingStats {
        uint256 totalOrders;
        uint256 totalVolume;
        uint256 averageOrderSize;
        uint256 successfulMatches;
        uint256 lastActivityTime;
    }

    // ============ STATE VARIABLES ============

    IERC20 public baseAsset;
    address public coreContract;

    // Window configuration
    MatchingWindow public matchingWindow;
    
    // Market states
    mapping(bytes32 => MarketMatchingState) public marketStates;
    mapping(bytes32 => bool) public activeMarkets;
    bytes32[] public marketList;
    
    // Orders
    mapping(bytes32 => ETMAOrder) public orders;
    mapping(bytes32 => bytes32[]) public marketOrders; // market => order IDs
    mapping(address => bytes32[]) public userOrders; // user => order IDs
    mapping(address => uint256) public userOrderCounts;
    
    // Matching history
    mapping(bytes32 => MatchingResult[]) public marketMatchingHistory;
    mapping(bytes32 => MatchingResult) public latestMatchingResults;
    uint256 public totalMatchingEvents;
    
    // User statistics
    mapping(address => UserTradingStats) public userStats;
    
    // Price feeds (simplified - would use oracles)
    mapping(bytes32 => uint256) public referencePrices;
    mapping(bytes32 => uint256) public priceUpdateTimestamp;
    
    // Emergency controls
    bool public emergencyPaused;
    mapping(bytes32 => bool) public marketPaused;

    // ============ EVENTS ============

    event ETMAOrderSubmitted(
        bytes32 indexed orderId,
        address indexed trader,
        bytes32 indexed market,
        bool isLong,
        uint256 size,
        uint256 limitPrice
    );

    event MatchingExecuted(
        bytes32 indexed marketId,
        uint256 matchingPrice,
        uint256 totalVolume,
        uint256 longOrdersFilled,
        uint256 shortOrdersFilled,
        uint256 timestamp
    );

    event OrderFilled(
        bytes32 indexed orderId,
        address indexed trader,
        uint256 filledSize,
        uint256 fillPrice,
        uint256 timestamp
    );

    event OrderCancelled(
        bytes32 indexed orderId,
        address indexed trader,
        string reason
    );

    event MatchingThresholdReached(
        bytes32 indexed marketId,
        uint256 totalVolume,
        uint256 timestamp
    );

    event MatchingWindowUpdated(
        uint256 startHour,
        uint256 endHour,
        uint256 matchingThreshold
    );

    // ============ MODIFIERS ============

    modifier onlyActiveMarket(bytes32 market) {
        require(activeMarkets[market], "Market not active");
        _;
    }

    modifier onlyInMatchingWindow() {
        require(_isInMatchingWindow(), "Outside matching window");
        _;
    }

    modifier notEmergencyPaused() {
        require(!emergencyPaused, "Emergency paused");
        _;
    }

    modifier marketNotPaused(bytes32 market) {
        require(!marketPaused[market], "Market paused");
        _;
    }

    // ============ INITIALIZATION ============

    /**
     * @notice Initialize the contract
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
        _grantRole(MATCHING_ROLE, _admin);

        // Initialize matching window (6 PM - 10 PM UTC)
        matchingWindow = MatchingWindow({
            startHour: 18,
            endHour: 22,
            matchingThreshold: 100000 * PRECISION, // $100k threshold
            maxPriceDeviation: 500, // 5%
            isActive: true
        });
    }

    // ============ ORDER SUBMISSION ============

    /**
     * @notice Submit ETMA order for evening trading
     * @param market Market identifier (must be xStock)
     * @param isLong Trade direction (true for long, false for short)
     * @param size Order size in USD
     * @param limitPrice Maximum price for long, minimum for short
     * @param minFillSize Minimum fill size (0 for any)
     * @return orderId Generated order ID
     */
    function submitETMAOrder(
        bytes32 market,
        bool isLong,
        uint256 size,
        uint256 limitPrice,
        uint256 minFillSize
    ) external 
        nonReentrant 
        notEmergencyPaused 
        onlyActiveMarket(market) 
        marketNotPaused(market)
        onlyInMatchingWindow
        returns (bytes32 orderId) 
    {
        require(size > 0, "Invalid size");
        require(limitPrice > 0, "Invalid limit price");
        require(userOrderCounts[msg.sender] < MAX_ORDERS_PER_USER, "Too many orders");
        
        // Validate against reference price
        uint256 refPrice = referencePrices[market];
        require(refPrice > 0, "No reference price");
        require(_validateLimitPrice(limitPrice, refPrice, isLong), "Price out of range");
        
        // Generate order ID
        orderId = keccak256(abi.encodePacked(
            msg.sender,
            market,
            isLong,
            size,
            limitPrice,
            block.timestamp,
            userOrderCounts[msg.sender]
        ));
        
        // Calculate priority (larger orders and earlier submissions get higher priority)
        uint256 priority = _calculateOrderPriority(size, block.timestamp);
        
        // Create order
        orders[orderId] = ETMAOrder({
            orderId: orderId,
            trader: msg.sender,
            market: market,
            isLong: isLong,
            size: size,
            limitPrice: limitPrice,
            minFillSize: minFillSize > 0 ? minFillSize : size / 10, // Default to 10% min fill
            timestamp: block.timestamp,
            priority: priority,
            status: OrderStatus.PENDING,
            filledSize: 0,
            averageFillPrice: 0
        });
        
        // Add to tracking arrays
        marketOrders[market].push(orderId);
        userOrders[msg.sender].push(orderId);
        userOrderCounts[msg.sender]++;
        
        // Update market state
        MarketMatchingState storage marketState = marketStates[market];
        if (isLong) {
            marketState.totalLongVolume += size;
            marketState.weightedLongPrice = _updateWeightedPrice(
                marketState.weightedLongPrice,
                marketState.totalLongVolume - size,
                limitPrice,
                size
            );
        } else {
            marketState.totalShortVolume += size;
            marketState.weightedShortPrice = _updateWeightedPrice(
                marketState.weightedShortPrice,
                marketState.totalShortVolume - size,
                limitPrice,
                size
            );
        }
        
        // Update user statistics
        UserTradingStats storage stats = userStats[msg.sender];
        stats.totalOrders++;
        stats.totalVolume += size;
        stats.averageOrderSize = stats.totalVolume / stats.totalOrders;
        stats.lastActivityTime = block.timestamp;
        
        // Check if matching threshold reached
        uint256 totalVolume = marketState.totalLongVolume + marketState.totalShortVolume;
        if (totalVolume >= matchingWindow.matchingThreshold && !marketState.thresholdReached) {
            marketState.thresholdReached = true;
            emit MatchingThresholdReached(market, totalVolume, block.timestamp);
        }
        
        emit ETMAOrderSubmitted(orderId, msg.sender, market, isLong, size, limitPrice);
        
        return orderId;
    }

    /**
     * @notice Cancel ETMA order
     * @param orderId Order ID to cancel
     */
    function cancelETMAOrder(bytes32 orderId) external nonReentrant {
        ETMAOrder storage order = orders[orderId];
        require(order.trader == msg.sender, "Not order owner");
        require(order.status == OrderStatus.PENDING, "Cannot cancel");
        require(_isInMatchingWindow(), "Outside cancellation window");
        
        // Update order status
        order.status = OrderStatus.CANCELLED;
        
        // Update market state (remove from volume calculations)
        MarketMatchingState storage marketState = marketStates[order.market];
        if (order.isLong) {
            marketState.totalLongVolume -= order.size;
        } else {
            marketState.totalShortVolume -= order.size;
        }
        
        // Recalculate weighted prices
        _recalculateMarketPrices(order.market);
        
        emit OrderCancelled(orderId, msg.sender, "User cancelled");
    }

    // ============ MATCHING EXECUTION ============

    /**
     * @notice Execute matching for a market
     * @param market Market to execute matching for
     * @return success Whether matching was successful
     */
    function executeMatching(bytes32 market) 
        external 
        onlyRole(MATCHING_ROLE) 
        onlyActiveMarket(market) 
        returns (bool success) 
    {
        MarketMatchingState storage marketState = marketStates[market];
        
        // Check if threshold reached
        uint256 totalVolume = marketState.totalLongVolume + marketState.totalShortVolume;
        require(totalVolume >= matchingWindow.matchingThreshold, "Threshold not reached");
        
        // Calculate matching price
        uint256 matchingPrice = _calculateMatchingPrice(market);
        require(matchingPrice > 0, "Cannot determine matching price");
        
        // Execute the matching
        MatchingResult memory result = _performMatching(market, matchingPrice);
        
        // Store result
        marketMatchingHistory[market].push(result);
        latestMatchingResults[market] = result;
        totalMatchingEvents++;
        
        // Reset market state for next window
        _resetMarketState(market);
        
        emit MatchingExecuted(
            market,
            matchingPrice,
            result.totalVolume,
            result.longOrdersFilled,
            result.shortOrdersFilled,
            block.timestamp
        );
        
        return true;
    }

    /**
     * @notice Execute matching for all markets with sufficient volume
     */
    function executeAllMatching() external onlyRole(MATCHING_ROLE) {
        uint256 successfulMatches = 0;
        
        for (uint256 i = 0; i < marketList.length; i++) {
            bytes32 market = marketList[i];
            
            if (!activeMarkets[market] || marketPaused[market]) continue;
            
            MarketMatchingState memory marketState = marketStates[market];
            uint256 totalVolume = marketState.totalLongVolume + marketState.totalShortVolume;
            
            if (totalVolume >= matchingWindow.matchingThreshold) {
                try this.executeMatching(market) returns (bool success) {
                    if (success) successfulMatches++;
                } catch {
                    // Continue with other markets if one fails
                    continue;
                }
            }
        }
    }

    // ============ INTERNAL MATCHING LOGIC ============

    /**
     * @notice Calculate matching price using volume-weighted approach
     * @param market Market identifier
     * @return matchingPrice Calculated matching price
     */
    function _calculateMatchingPrice(bytes32 market) internal view returns (uint256 matchingPrice) {
        MarketMatchingState memory marketState = marketStates[market];
        uint256 refPrice = referencePrices[market];
        
        if (marketState.totalLongVolume == 0 || marketState.totalShortVolume == 0) {
            return refPrice; // Fallback to reference price
        }
        
        // Volume-weighted average of long and short prices
        uint256 totalVolume = marketState.totalLongVolume + marketState.totalShortVolume;
        uint256 longWeight = (marketState.totalLongVolume * PRECISION) / totalVolume;
        uint256 shortWeight = (marketState.totalShortVolume * PRECISION) / totalVolume;
        
        matchingPrice = (marketState.weightedLongPrice * longWeight + 
                        marketState.weightedShortPrice * shortWeight) / PRECISION;
        
        // Ensure price is within deviation limits from reference
        uint256 maxDeviation = (refPrice * matchingWindow.maxPriceDeviation) / BASIS_POINTS;
        uint256 minPrice = refPrice - maxDeviation;
        uint256 maxPrice = refPrice + maxDeviation;
        
        if (matchingPrice < minPrice) {
            matchingPrice = minPrice;
        } else if (matchingPrice > maxPrice) {
            matchingPrice = maxPrice;
        }
        
        return matchingPrice;
    }

    /**
     * @notice Perform the actual order matching
     * @param market Market identifier
     * @param matchingPrice Price to match at
     * @return result Matching result
     */
    function _performMatching(
        bytes32 market, 
        uint256 matchingPrice
    ) internal returns (MatchingResult memory result) {
        bytes32[] memory marketOrderIds = marketOrders[market];
        bytes32[] memory filledOrders = new bytes32[](marketOrderIds.length);
        uint256 filledCount = 0;
        
        result.marketId = market;
        result.matchingPrice = matchingPrice;
        result.timestamp = block.timestamp;
        
        // Sort orders by priority
        bytes32[] memory sortedOrders = _sortOrdersByPriority(marketOrderIds);
        
        // Match orders
        for (uint256 i = 0; i < sortedOrders.length; i++) {
            bytes32 orderId = sortedOrders[i];
            ETMAOrder storage order = orders[orderId];
            
            if (order.status != OrderStatus.PENDING) continue;
            
            // Check if order can be filled at matching price
            bool canFill = order.isLong ? 
                matchingPrice <= order.limitPrice : 
                matchingPrice >= order.limitPrice;
                
            if (canFill) {
                // Fill the order
                order.filledSize = order.size;
                order.averageFillPrice = matchingPrice;
                order.status = OrderStatus.FILLED;
                
                // Update result
                result.totalVolume += order.size;
                if (order.isLong) {
                    result.longOrdersFilled++;
                } else {
                    result.shortOrdersFilled++;
                }
                
                // Update user statistics
                userStats[order.trader].successfulMatches++;
                
                // Add to filled orders
                filledOrders[filledCount] = orderId;
                filledCount++;
                
                emit OrderFilled(
                    orderId,
                    order.trader,
                    order.size,
                    matchingPrice,
                    block.timestamp
                );
            } else {
                // Mark as expired if not fillable
                order.status = OrderStatus.EXPIRED;
            }
        }
        
        // Resize filled orders array
        result.filledOrders = new bytes32[](filledCount);
        for (uint256 i = 0; i < filledCount; i++) {
            result.filledOrders[i] = filledOrders[i];
        }
        
        return result;
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Check if current time is in matching window
     * @return inWindow Whether in matching window
     */
    function _isInMatchingWindow() internal view returns (bool inWindow) {
        if (!matchingWindow.isActive) return false;
        
        uint256 currentHour = (block.timestamp / 3600) % 24;
        return currentHour >= matchingWindow.startHour && currentHour < matchingWindow.endHour;
    }

    /**
     * @notice Validate limit price against reference price
     * @param limitPrice Limit price to validate
     * @param refPrice Reference price
     * @param isLong Whether this is a long order
     * @return valid Whether price is valid
     */
    function _validateLimitPrice(
        uint256 limitPrice, 
        uint256 refPrice, 
        bool isLong
    ) internal view returns (bool valid) {
        uint256 maxDeviation = (refPrice * MAX_PRICE_DEVIATION) / BASIS_POINTS;
        
        if (isLong) {
            // Long orders: limit price shouldn't be too far above reference
            return limitPrice <= refPrice + maxDeviation;
        } else {
            // Short orders: limit price shouldn't be too far below reference
            return limitPrice >= refPrice - maxDeviation;
        }
    }

    /**
     * @notice Calculate order priority
     * @param size Order size
     * @param timestamp Order timestamp
     * @return priority Calculated priority
     */
    function _calculateOrderPriority(
        uint256 size, 
        uint256 timestamp
    ) internal view returns (uint256 priority) {
        // Higher priority for larger orders and earlier submissions
        uint256 sizeWeight = (size * 70) / PRECISION; // 70% weight for size
        uint256 timeWeight = (block.timestamp - timestamp) * 30; // 30% weight for timing
        
        priority = sizeWeight + timeWeight;
    }

    /**
     * @notice Update volume-weighted price
     * @param currentPrice Current weighted price
     * @param currentVolume Current total volume
     * @param newPrice New order price
     * @param newVolume New order volume
     * @return updatedPrice Updated weighted price
     */
    function _updateWeightedPrice(
        uint256 currentPrice,
        uint256 currentVolume,
        uint256 newPrice,
        uint256 newVolume
    ) internal pure returns (uint256 updatedPrice) {
        if (currentVolume == 0) {
            return newPrice;
        }
        
        uint256 totalVolume = currentVolume + newVolume;
        updatedPrice = ((currentPrice * currentVolume) + (newPrice * newVolume)) / totalVolume;
    }

    /**
     * @notice Sort orders by priority (simplified - would use more efficient sorting)
     * @param orderIds Array of order IDs
     * @return sortedIds Sorted array of order IDs
     */
    function _sortOrdersByPriority(
        bytes32[] memory orderIds
    ) internal view returns (bytes32[] memory sortedIds) {
        sortedIds = orderIds; // Simplified - in production would implement proper sorting
        
        // Bubble sort by priority (simplified for demo)
        for (uint256 i = 0; i < sortedIds.length; i++) {
            for (uint256 j = i + 1; j < sortedIds.length; j++) {
                if (orders[sortedIds[i]].priority < orders[sortedIds[j]].priority) {
                    bytes32 temp = sortedIds[i];
                    sortedIds[i] = sortedIds[j];
                    sortedIds[j] = temp;
                }
            }
        }
    }

    /**
     * @notice Recalculate market prices after order cancellation
     * @param market Market identifier
     */
    function _recalculateMarketPrices(bytes32 market) internal {
        bytes32[] memory marketOrderIds = marketOrders[market];
        MarketMatchingState storage marketState = marketStates[market];
        
        // Reset and recalculate
        marketState.weightedLongPrice = 0;
        marketState.weightedShortPrice = 0;
        uint256 longVolume = 0;
        uint256 shortVolume = 0;
        
        for (uint256 i = 0; i < marketOrderIds.length; i++) {
            ETMAOrder memory order = orders[marketOrderIds[i]];
            
            if (order.status != OrderStatus.PENDING) continue;
            
            if (order.isLong) {
                marketState.weightedLongPrice = _updateWeightedPrice(
                    marketState.weightedLongPrice,
                    longVolume,
                    order.limitPrice,
                    order.size
                );
                longVolume += order.size;
            } else {
                marketState.weightedShortPrice = _updateWeightedPrice(
                    marketState.weightedShortPrice,
                    shortVolume,
                    order.limitPrice,
                    order.size
                );
                shortVolume += order.size;
            }
        }
        
        marketState.totalLongVolume = longVolume;
        marketState.totalShortVolume = shortVolume;
    }

    /**
     * @notice Reset market state after matching
     * @param market Market identifier
     */
    function _resetMarketState(bytes32 market) internal {
        MarketMatchingState storage marketState = marketStates[market];
        marketState.totalLongVolume = 0;
        marketState.totalShortVolume = 0;
        marketState.weightedLongPrice = 0;
        marketState.weightedShortPrice = 0;
        marketState.lastMatchingTime = block.timestamp;
        marketState.matchingCount++;
        marketState.thresholdReached = false;
        
        // Clear pending orders for this market
        bytes32[] memory marketOrderIds = marketOrders[market];
        for (uint256 i = 0; i < marketOrderIds.length; i++) {
            ETMAOrder storage order = orders[marketOrderIds[i]];
            if (order.status == OrderStatus.PENDING) {
                order.status = OrderStatus.EXPIRED;
            }
        }
        
        // Clear market orders array
        delete marketOrders[market];
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Add new market for ETMA trading
     * @param market Market identifier
     */
    function addMarket(bytes32 market) external onlyRole(ADMIN_ROLE) {
        require(!activeMarkets[market], "Market already active");
        
        activeMarkets[market] = true;
        marketList.push(market);
        
        // Initialize market state
        marketStates[market] = MarketMatchingState({
            totalLongVolume: 0,
            totalShortVolume: 0,
            weightedLongPrice: 0,
            weightedShortPrice: 0,
            lastMatchingTime: 0,
            matchingCount: 0,
            thresholdReached: false
        });
    }

    /**
     * @notice Update matching window configuration
     * @param startHour New start hour (0-23)
     * @param endHour New end hour (0-23)
     * @param matchingThreshold New matching threshold
     */
    function updateMatchingWindow(
        uint256 startHour,
        uint256 endHour,
        uint256 matchingThreshold
    ) external onlyRole(ADMIN_ROLE) {
        require(startHour < 24 && endHour < 24, "Invalid hours");
        require(startHour != endHour, "Window too small");
        require(matchingThreshold >= MIN_MATCHING_THRESHOLD, "Threshold too low");
        
        matchingWindow.startHour = startHour;
        matchingWindow.endHour = endHour;
        matchingWindow.matchingThreshold = matchingThreshold;
        
        emit MatchingWindowUpdated(startHour, endHour, matchingThreshold);
    }

    /**
     * @notice Update reference price for market
     * @param market Market identifier
     * @param price New reference price
     */
    function updateReferencePrice(bytes32 market, uint256 price) 
        external 
        onlyRole(OPERATOR_ROLE) 
    {
        require(price > 0, "Invalid price");
        referencePrices[market] = price;
        priceUpdateTimestamp[market] = block.timestamp;
    }

    /**
     * @notice Pause/unpause market
     * @param market Market identifier
     * @param paused Whether to pause
     */
    function setMarketPaused(bytes32 market, bool paused) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        marketPaused[market] = paused;
    }

    /**
     * @notice Emergency pause all operations
     * @param paused Whether to pause
     */
    function setEmergencyPaused(bool paused) external onlyRole(ADMIN_ROLE) {
        emergencyPaused = paused;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get order details
     * @param orderId Order identifier
     * @return order Order details
     */
    function getOrder(bytes32 orderId) external view returns (ETMAOrder memory order) {
        return orders[orderId];
    }

    /**
     * @notice Get user orders
     * @param user User address
     * @return orderIds Array of order IDs
     */
    function getUserOrders(address user) external view returns (bytes32[] memory orderIds) {
        return userOrders[user];
    }

    /**
     * @notice Get market orders
     * @param market Market identifier
     * @return orderIds Array of order IDs
     */
    function getMarketOrders(bytes32 market) external view returns (bytes32[] memory orderIds) {
        return marketOrders[market];
    }

    /**
     * @notice Get market matching state
     * @param market Market identifier
     * @return state Market matching state
     */
    function getMarketState(bytes32 market) 
        external 
        view 
        returns (MarketMatchingState memory state) 
    {
        return marketStates[market];
    }

    /**
     * @notice Get latest matching result for market
     * @param market Market identifier
     * @return result Latest matching result
     */
    function getLatestMatchingResult(bytes32 market) 
        external 
        view 
        returns (MatchingResult memory result) 
    {
        return latestMatchingResults[market];
    }

    /**
     * @notice Get matching history for market
     * @param market Market identifier
     * @return results Array of matching results
     */
    function getMatchingHistory(bytes32 market) 
        external 
        view 
        returns (MatchingResult[] memory results) 
    {
        return marketMatchingHistory[market];
    }

    /**
     * @notice Get user trading statistics
     * @param user User address
     * @return stats User trading statistics
     */
    function getUserStats(address user) 
        external 
        view 
        returns (UserTradingStats memory stats) 
    {
        return userStats[user];
    }

    /**
     * @notice Check if currently in matching window
     * @return inWindow Whether in matching window
     */
    function isInMatchingWindow() external view returns (bool inWindow) {
        return _isInMatchingWindow();
    }

    /**
     * @notice Get current time info
     * @return currentHour Current hour (0-23)
     * @return inWindow Whether in matching window
     */
    function getCurrentTimeInfo() 
        external 
        view 
        returns (uint256 currentHour, bool inWindow) 
    {
        currentHour = (block.timestamp / 3600) % 24;
        inWindow = _isInMatchingWindow();
    }
}