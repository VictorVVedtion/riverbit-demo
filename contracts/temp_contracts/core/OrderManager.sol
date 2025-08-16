// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/IOrderManager.sol";
import "../interfaces/IPerpetualTrading.sol";
import "../interfaces/IMarginManager.sol";
import "../libraries/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title OrderManager
 * @notice Manages order lifecycle with MEV protection and automated execution
 * @dev Supports market, limit, stop-loss, and take-profit orders with commit-reveal MEV protection
 */
contract OrderManager is 
    IOrderManager,
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable
{
    using SafeMath for uint256;

    // Constants
    uint256 private constant MAX_ORDERS_PER_USER = 100;
    uint256 private constant MAX_ORDER_LIFETIME = 30 days;
    uint256 private constant MIN_COMMIT_REVEAL_DELAY = 1 minutes;
    uint256 private constant MAX_COMMIT_REVEAL_DELAY = 1 hours;

    // State variables
    IPerpetualTrading public perpetualTrading;
    IMarginManager public marginManager;
    
    // Order storage
    mapping(bytes32 => Order) public orders;
    mapping(address => bytes32[]) public userOrders;
    mapping(address => mapping(bytes32 => uint256)) public userOrderIndex;
    mapping(bytes32 => bytes32[]) public marketOrders;
    mapping(bytes32 => mapping(bytes32 => uint256)) public marketOrderIndex;
    
    // MEV protection
    MEVProtection public mevProtection;
    mapping(bytes32 => uint256) public commitments; // commitment hash => commit timestamp
    mapping(bytes32 => bool) public revealedCommitments;
    
    // Order execution
    mapping(address => bool) public executors; // Authorized order executors
    mapping(bytes32 => uint256) public lastExecutionAttempt;
    uint256 public executionCooldown; // Cooldown between execution attempts
    
    // Price feeds (simplified - would use oracles in production)
    mapping(bytes32 => uint256) public marketPrices;
    mapping(bytes32 => uint256) public priceUpdateTimestamp;
    
    // Statistics
    mapping(address => uint256) public userOrderCount;
    uint256 public totalOrders;
    uint256 public executedOrders;
    uint256 public cancelledOrders;

    // Custom errors
    error OrderNotFound();
    error UnauthorizedExecutor();
    error OrderNotExecutable();
    error TooManyOrders();
    error OrderExpired();
    error InvalidCommitment();
    error CommitmentNotReady();
    error CommitmentAlreadyRevealed();
    error ExecutionCooldownActive();
    error InvalidMEVParameters();

    // Events (additional to interface events)
    event ExecutorUpdated(address indexed executor, bool authorized);
    event CommitmentMade(bytes32 indexed commitment, address indexed trader);
    event OrderBatchExecuted(uint256 successCount, uint256 totalCount);

    // Modifiers
    modifier onlyExecutor() {
        if (!executors[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedExecutor();
        }
        _;
    }

    modifier validOrder(bytes32 orderId) {
        if (orders[orderId].trader == address(0)) {
            revert OrderNotFound();
        }
        _;
    }

    modifier onlyOrderOwner(bytes32 orderId) {
        require(orders[orderId].trader == msg.sender, "OrderManager: not order owner");
        _;
    }

    /**
     * @dev Initialize the contract
     * @param _perpetualTrading Address of PerpetualTrading contract
     * @param _marginManager Address of MarginManager contract
     */
    function initialize(
        address _perpetualTrading,
        address _marginManager
    ) external initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init();

        require(_perpetualTrading != address(0), "OrderManager: invalid perpetual trading");
        require(_marginManager != address(0), "OrderManager: invalid margin manager");

        perpetualTrading = IPerpetualTrading(_perpetualTrading);
        marginManager = IMarginManager(_marginManager);

        // Initialize MEV protection
        mevProtection = MEVProtection({
            commitRevealDelay: 5 minutes,
            maxSlippage: 100, // 1%
            enabled: true
        });

        executionCooldown = 30 seconds;
        executors[msg.sender] = true; // Owner is initial executor
    }

    /**
     * @notice Create a new order
     * @param market Market identifier
     * @param orderType Type of order
     * @param direction Long or short
     * @param size Order size in USD
     * @param triggerPrice Price at which order triggers (0 for market orders)
     * @param limitPrice Limit price for execution
     * @param margin Margin to allocate
     * @param marginMode Cross or isolated margin
     * @param expiresAt Expiration timestamp (0 for GTC)
     * @return orderId Unique order identifier
     */
    function createOrder(
        bytes32 market,
        OrderType orderType,
        IPerpetualTrading.TradeDirection direction,
        uint256 size,
        uint256 triggerPrice,
        uint256 limitPrice,
        uint256 margin,
        IMarginManager.MarginMode marginMode,
        uint256 expiresAt
    ) external nonReentrant whenNotPaused returns (bytes32 orderId) {
        require(size > 0, "OrderManager: invalid size");
        require(userOrderCount[msg.sender] < MAX_ORDERS_PER_USER, "OrderManager: too many orders");
        
        if (expiresAt > 0) {
            require(expiresAt > block.timestamp, "OrderManager: invalid expiration");
            require(expiresAt <= block.timestamp + MAX_ORDER_LIFETIME, "OrderManager: expiration too far");
        }

        // Validate order parameters
        _validateOrderParameters(orderType, triggerPrice, limitPrice);

        // Check margin requirements
        uint256 availableMargin = marginManager.getAvailableMargin(msg.sender);
        require(margin <= availableMargin, "OrderManager: insufficient margin");

        // Generate order ID
        orderId = _generateOrderId(msg.sender, market, size, triggerPrice, block.timestamp);

        // Create order
        Order storage order = orders[orderId];
        order.orderId = orderId;
        order.trader = msg.sender;
        order.market = market;
        order.orderType = orderType;
        order.direction = direction;
        order.size = size;
        order.triggerPrice = triggerPrice;
        order.limitPrice = limitPrice;
        order.margin = margin;
        order.marginMode = marginMode;
        order.createdAt = block.timestamp;
        order.expiresAt = expiresAt;
        order.status = OrderStatus.PENDING;
        order.nonce = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp, orderId)));

        // Add to tracking arrays
        userOrders[msg.sender].push(orderId);
        userOrderIndex[msg.sender][orderId] = userOrders[msg.sender].length - 1;
        
        marketOrders[market].push(orderId);
        marketOrderIndex[market][orderId] = marketOrders[market].length - 1;

        // Update counters
        userOrderCount[msg.sender]++;
        totalOrders++;

        // Execute immediately if market order
        if (orderType == OrderType.MARKET) {
            _executeOrderInternal(orderId, marketPrices[market]);
        }

        emit OrderCreated(
            orderId,
            msg.sender,
            market,
            orderType,
            direction,
            size,
            triggerPrice
        );
    }

    /**
     * @notice Create order with MEV protection commitment
     * @param commitment Commitment hash
     * @return orderId Order ID (will be revealed later)
     */
    function createOrderWithCommitment(bytes32 commitment) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 orderId) 
    {
        require(mevProtection.enabled, "OrderManager: MEV protection disabled");
        require(commitment != bytes32(0), "OrderManager: invalid commitment");
        require(commitments[commitment] == 0, "OrderManager: commitment exists");

        commitments[commitment] = block.timestamp;
        
        // Generate temporary order ID
        orderId = keccak256(abi.encodePacked(commitment, msg.sender, block.timestamp));

        emit CommitmentMade(commitment, msg.sender);
    }

    /**
     * @notice Reveal and execute order with MEV protection
     * @param orderId Order ID from commitment phase
     * @param market Market identifier
     * @param orderType Type of order
     * @param direction Long or short
     * @param size Order size
     * @param triggerPrice Trigger price
     * @param limitPrice Limit price
     * @param margin Margin amount
     * @param marginMode Margin mode
     * @param expiresAt Expiration time
     * @param nonce Random nonce
     */
    function revealAndExecuteOrder(
        bytes32 orderId,
        bytes32 market,
        OrderType orderType,
        IPerpetualTrading.TradeDirection direction,
        uint256 size,
        uint256 triggerPrice,
        uint256 limitPrice,
        uint256 margin,
        IMarginManager.MarginMode marginMode,
        uint256 expiresAt,
        uint256 nonce
    ) external nonReentrant whenNotPaused {
        // Generate commitment hash
        bytes32 commitment = generateCommitment(
            market, orderType, direction, size, triggerPrice, 
            limitPrice, margin, marginMode, expiresAt, nonce, msg.sender
        );

        // Verify commitment exists and timing
        uint256 commitTime = commitments[commitment];
        require(commitTime > 0, "OrderManager: commitment not found");
        require(!revealedCommitments[commitment], "OrderManager: already revealed");
        require(
            block.timestamp >= commitTime + mevProtection.commitRevealDelay,
            "OrderManager: reveal too early"
        );
        require(
            block.timestamp <= commitTime + mevProtection.commitRevealDelay + 1 hours,
            "OrderManager: reveal too late"
        );

        // Mark as revealed
        revealedCommitments[commitment] = true;

        // Create and execute order
        bytes32 actualOrderId = createOrder(
            market, orderType, direction, size, triggerPrice,
            limitPrice, margin, marginMode, expiresAt
        );

        // Update the order ID mapping if needed
        if (orderType == OrderType.MARKET) {
            // Market orders are executed immediately in createOrder
            return;
        }
    }

    /**
     * @notice Cancel an existing order
     * @param orderId Order to cancel
     */
    function cancelOrder(bytes32 orderId) 
        external 
        nonReentrant 
        whenNotPaused 
        validOrder(orderId) 
        onlyOrderOwner(orderId) 
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "OrderManager: order not pending");

        order.status = OrderStatus.CANCELLED;
        
        // Remove from tracking arrays
        _removeOrderFromTracking(orderId);

        // Update counters
        userOrderCount[msg.sender]--;
        cancelledOrders++;

        emit OrderCancelled(orderId, msg.sender, "User cancelled");
    }

    /**
     * @notice Execute a pending order
     * @param orderId Order to execute
     * @return success Whether execution succeeded
     */
    function executeOrder(bytes32 orderId) 
        external 
        onlyExecutor 
        nonReentrant 
        whenNotPaused 
        validOrder(orderId)
        returns (bool success) 
    {
        // Check execution cooldown
        if (block.timestamp < lastExecutionAttempt[orderId] + executionCooldown) {
            revert ExecutionCooldownActive();
        }

        lastExecutionAttempt[orderId] = block.timestamp;

        Order storage order = orders[orderId];
        
        // Check if order is executable
        if (!_isOrderExecutable(order)) {
            return false;
        }

        uint256 currentPrice = marketPrices[order.market];
        success = _executeOrderInternal(orderId, currentPrice);
    }

    /**
     * @notice Execute multiple orders in batch
     * @param orderIds Array of order IDs to execute
     * @return successCount Number of successfully executed orders
     */
    function batchExecuteOrders(bytes32[] calldata orderIds) 
        external 
        onlyExecutor 
        nonReentrant 
        whenNotPaused 
        returns (uint256 successCount) 
    {
        uint256 totalCount = orderIds.length;
        
        for (uint256 i = 0; i < totalCount; i++) {
            bytes32 orderId = orderIds[i];
            
            // Skip invalid orders
            if (orders[orderId].trader == address(0)) continue;
            
            // Check cooldown
            if (block.timestamp < lastExecutionAttempt[orderId] + executionCooldown) continue;
            
            lastExecutionAttempt[orderId] = block.timestamp;
            
            Order storage order = orders[orderId];
            if (_isOrderExecutable(order)) {
                uint256 currentPrice = marketPrices[order.market];
                if (_executeOrderInternal(orderId, currentPrice)) {
                    successCount++;
                }
            }
        }

        emit OrderBatchExecuted(successCount, totalCount);
    }

    // View functions

    /**
     * @notice Get order details
     * @param orderId Order identifier
     * @return order Order information
     */
    function getOrder(bytes32 orderId) external view returns (Order memory order) {
        return orders[orderId];
    }

    /**
     * @notice Get user's orders
     * @param trader Trader address
     * @return orderIds Array of order IDs
     */
    function getUserOrders(address trader) external view returns (bytes32[] memory orderIds) {
        return userOrders[trader];
    }

    /**
     * @notice Get pending orders for a market
     * @param market Market identifier
     * @return orderIds Array of pending order IDs
     */
    function getPendingOrders(bytes32 market) external view returns (bytes32[] memory orderIds) {
        bytes32[] memory allMarketOrders = marketOrders[market];
        uint256 pendingCount = 0;
        
        // Count pending orders
        for (uint256 i = 0; i < allMarketOrders.length; i++) {
            if (orders[allMarketOrders[i]].status == OrderStatus.PENDING) {
                pendingCount++;
            }
        }
        
        // Create result array
        orderIds = new bytes32[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allMarketOrders.length; i++) {
            if (orders[allMarketOrders[i]].status == OrderStatus.PENDING) {
                orderIds[index] = allMarketOrders[i];
                index++;
            }
        }
    }

    /**
     * @notice Check if order is executable at current price
     * @param orderId Order identifier
     * @param currentPrice Current market price
     * @return executable Whether order can be executed
     */
    function isOrderExecutable(bytes32 orderId, uint256 currentPrice) 
        external 
        view 
        validOrder(orderId)
        returns (bool executable) 
    {
        Order storage order = orders[orderId];
        return _checkOrderTrigger(order, currentPrice);
    }

    /**
     * @notice Get MEV protection settings
     * @return protection MEV protection configuration
     */
    function getMEVProtection() external view returns (MEVProtection memory protection) {
        return mevProtection;
    }

    /**
     * @notice Generate commitment hash for MEV protection
     * @param market Market identifier
     * @param orderType Order type
     * @param direction Trade direction
     * @param size Order size
     * @param triggerPrice Trigger price
     * @param limitPrice Limit price
     * @param margin Margin amount
     * @param marginMode Margin mode
     * @param expiresAt Expiration time
     * @param nonce Random nonce
     * @param trader Trader address
     * @return commitment Commitment hash
     */
    function generateCommitment(
        bytes32 market,
        OrderType orderType,
        IPerpetualTrading.TradeDirection direction,
        uint256 size,
        uint256 triggerPrice,
        uint256 limitPrice,
        uint256 margin,
        IMarginManager.MarginMode marginMode,
        uint256 expiresAt,
        uint256 nonce,
        address trader
    ) public pure returns (bytes32 commitment) {
        commitment = keccak256(abi.encodePacked(
            market, orderType, direction, size, triggerPrice,
            limitPrice, margin, marginMode, expiresAt, nonce, trader
        ));
    }

    // Internal functions

    /**
     * @dev Check if order meets execution criteria
     * @param order Order to check
     * @return executable Whether order can be executed
     */
    function _isOrderExecutable(Order storage order) internal view returns (bool executable) {
        // Check basic conditions
        if (order.status != OrderStatus.PENDING) return false;
        if (order.expiresAt > 0 && block.timestamp > order.expiresAt) return false;

        // Check price conditions
        uint256 currentPrice = marketPrices[order.market];
        return _checkOrderTrigger(order, currentPrice);
    }

    /**
     * @dev Check if order price conditions are met
     * @param order Order to check
     * @param currentPrice Current market price
     * @return triggered Whether order should trigger
     */
    function _checkOrderTrigger(Order storage order, uint256 currentPrice) 
        internal 
        view 
        returns (bool triggered) 
    {
        if (order.orderType == OrderType.MARKET) {
            return true;
        }

        if (order.orderType == OrderType.LIMIT) {
            if (order.direction == IPerpetualTrading.TradeDirection.LONG) {
                return currentPrice <= order.triggerPrice;
            } else {
                return currentPrice >= order.triggerPrice;
            }
        }

        if (order.orderType == OrderType.STOP_LOSS) {
            if (order.direction == IPerpetualTrading.TradeDirection.LONG) {
                return currentPrice <= order.triggerPrice;
            } else {
                return currentPrice >= order.triggerPrice;
            }
        }

        if (order.orderType == OrderType.TAKE_PROFIT) {
            if (order.direction == IPerpetualTrading.TradeDirection.LONG) {
                return currentPrice >= order.triggerPrice;
            } else {
                return currentPrice <= order.triggerPrice;
            }
        }

        return false;
    }

    /**
     * @dev Execute order internally
     * @param orderId Order to execute
     * @param currentPrice Current market price
     * @return success Whether execution succeeded
     */
    function _executeOrderInternal(bytes32 orderId, uint256 currentPrice) 
        internal 
        returns (bool success) 
    {
        Order storage order = orders[orderId];

        try perpetualTrading.openPosition(
            order.market,
            order.direction,
            order.size,
            order.limitPrice > 0 ? order.limitPrice : currentPrice,
            order.marginMode
        ) returns (IPerpetualTrading.TradeResult memory result) {
            
            // Update order status
            order.status = OrderStatus.EXECUTED;
            order.executedSize = result.executedSize;
            order.executedPrice = result.executedPrice;

            // Remove from tracking arrays
            _removeOrderFromTracking(orderId);

            // Update counters
            userOrderCount[order.trader]--;
            executedOrders++;

            emit OrderExecuted(
                orderId,
                order.trader,
                result.executedSize,
                result.executedPrice,
                result.fee
            );

            success = true;
        } catch {
            // Execution failed - check if order should be cancelled
            if (order.expiresAt > 0 && block.timestamp > order.expiresAt) {
                order.status = OrderStatus.EXPIRED;
                _removeOrderFromTracking(orderId);
                userOrderCount[order.trader]--;
                
                emit OrderExpired(orderId, order.trader);
            }
            success = false;
        }
    }

    /**
     * @dev Remove order from tracking arrays
     * @param orderId Order to remove
     */
    function _removeOrderFromTracking(bytes32 orderId) internal {
        Order storage order = orders[orderId];
        address trader = order.trader;
        bytes32 market = order.market;

        // Remove from user orders
        uint256 userIndex = userOrderIndex[trader][orderId];
        uint256 lastUserIndex = userOrders[trader].length - 1;
        
        if (userIndex != lastUserIndex) {
            bytes32 lastUserOrder = userOrders[trader][lastUserIndex];
            userOrders[trader][userIndex] = lastUserOrder;
            userOrderIndex[trader][lastUserOrder] = userIndex;
        }
        
        userOrders[trader].pop();
        delete userOrderIndex[trader][orderId];

        // Remove from market orders
        uint256 marketIndex = marketOrderIndex[market][orderId];
        uint256 lastMarketIndex = marketOrders[market].length - 1;
        
        if (marketIndex != lastMarketIndex) {
            bytes32 lastMarketOrder = marketOrders[market][lastMarketIndex];
            marketOrders[market][marketIndex] = lastMarketOrder;
            marketOrderIndex[market][lastMarketOrder] = marketIndex;
        }
        
        marketOrders[market].pop();
        delete marketOrderIndex[market][orderId];
    }

    /**
     * @dev Validate order parameters
     * @param orderType Type of order
     * @param triggerPrice Trigger price
     * @param limitPrice Limit price
     */
    function _validateOrderParameters(
        OrderType orderType,
        uint256 triggerPrice,
        uint256 limitPrice
    ) internal pure {
        if (orderType == OrderType.MARKET) {
            require(triggerPrice == 0, "OrderManager: market order cannot have trigger price");
        } else {
            require(triggerPrice > 0, "OrderManager: non-market order needs trigger price");
        }

        if (limitPrice > 0 && triggerPrice > 0) {
            // For limit orders, limit price should be more favorable than trigger price
            // This validation could be enhanced based on specific requirements
        }
    }

    /**
     * @dev Generate unique order ID
     * @param trader Trader address
     * @param market Market identifier
     * @param size Order size
     * @param triggerPrice Trigger price
     * @param timestamp Block timestamp
     * @return orderId Unique order identifier
     */
    function _generateOrderId(
        address trader,
        bytes32 market,
        uint256 size,
        uint256 triggerPrice,
        uint256 timestamp
    ) internal pure returns (bytes32 orderId) {
        orderId = keccak256(abi.encodePacked(
            trader,
            market,
            size,
            triggerPrice,
            timestamp
        ));
    }

    // Admin functions

    /**
     * @notice Update MEV protection settings
     * @param commitRevealDelay New commit-reveal delay
     * @param maxSlippage New maximum slippage
     * @param enabled Whether MEV protection is enabled
     */
    function updateMEVProtection(
        uint256 commitRevealDelay,
        uint256 maxSlippage,
        bool enabled
    ) external onlyOwner {
        require(
            commitRevealDelay >= MIN_COMMIT_REVEAL_DELAY && 
            commitRevealDelay <= MAX_COMMIT_REVEAL_DELAY,
            "OrderManager: invalid commit delay"
        );
        require(maxSlippage <= 1000, "OrderManager: slippage too high"); // Max 10%

        mevProtection.commitRevealDelay = commitRevealDelay;
        mevProtection.maxSlippage = maxSlippage;
        mevProtection.enabled = enabled;

        emit MEVProtectionUpdated(commitRevealDelay, maxSlippage, enabled);
    }

    /**
     * @notice Authorize/deauthorize order executor
     * @param executor Executor address
     * @param authorized Authorization status
     */
    function setExecutor(address executor, bool authorized) external onlyOwner {
        executors[executor] = authorized;
        emit ExecutorUpdated(executor, authorized);
    }

    /**
     * @notice Update execution cooldown
     * @param cooldown New cooldown period in seconds
     */
    function setExecutionCooldown(uint256 cooldown) external onlyOwner {
        require(cooldown <= 300, "OrderManager: cooldown too long"); // Max 5 minutes
        executionCooldown = cooldown;
    }

    /**
     * @notice Update market price (for testing - would use oracles in production)
     * @param market Market identifier
     * @param price New price
     */
    function updatePrice(bytes32 market, uint256 price) external onlyOwner {
        require(price > 0, "OrderManager: invalid price");
        marketPrices[market] = price;
        priceUpdateTimestamp[market] = block.timestamp;
    }

    /**
     * @notice Clean up expired orders
     * @param orderIds Array of order IDs to check and clean
     */
    function cleanupExpiredOrders(bytes32[] calldata orderIds) external onlyExecutor {
        for (uint256 i = 0; i < orderIds.length; i++) {
            bytes32 orderId = orderIds[i];
            Order storage order = orders[orderId];
            
            if (order.trader != address(0) && 
                order.status == OrderStatus.PENDING &&
                order.expiresAt > 0 && 
                block.timestamp > order.expiresAt) {
                
                order.status = OrderStatus.EXPIRED;
                _removeOrderFromTracking(orderId);
                userOrderCount[order.trader]--;
                
                emit OrderExpired(orderId, order.trader);
            }
        }
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