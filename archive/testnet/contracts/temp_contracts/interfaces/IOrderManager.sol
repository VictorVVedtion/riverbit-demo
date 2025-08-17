// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./IPerpetualTrading.sol";
import "./IMarginManager.sol";

/**
 * @title IOrderManager
 * @notice Interface for the OrderManager contract
 * @dev Handles order creation, execution, and management with MEV protection
 */
interface IOrderManager {
    /// @notice Order types supported
    enum OrderType {
        MARKET,      // Execute immediately at market price
        LIMIT,       // Execute when price reaches limit
        STOP_LOSS,   // Stop loss order
        TAKE_PROFIT  // Take profit order
    }

    /// @notice Order status
    enum OrderStatus {
        PENDING,     // Order created but not executed
        EXECUTED,    // Order successfully executed
        CANCELLED,   // Order cancelled by user
        EXPIRED,     // Order expired
        FAILED       // Order execution failed
    }

    /// @notice Order structure
    struct Order {
        bytes32 orderId;                    // Unique order identifier
        address trader;                     // Order creator
        bytes32 market;                     // Market identifier (BTC-USD, ETH-USD, etc.)
        OrderType orderType;                // Type of order
        IPerpetualTrading.TradeDirection direction; // Long or short
        uint256 size;                       // Order size in USD
        uint256 triggerPrice;               // Price at which order triggers (0 for market orders)
        uint256 limitPrice;                 // Limit price for execution
        uint256 margin;                     // Margin allocated for this order
        IMarginManager.MarginMode marginMode; // Margin mode
        uint256 createdAt;                  // Order creation timestamp
        uint256 expiresAt;                  // Order expiration timestamp (0 for GTC)
        OrderStatus status;                 // Current order status
        uint256 executedSize;               // Amount already executed (for partial fills)
        uint256 executedPrice;              // Average execution price
        uint256 nonce;                      // MEV protection nonce
        bytes32 commitment;                 // Commitment hash for MEV protection
    }

    /// @notice MEV protection parameters
    struct MEVProtection {
        uint256 commitRevealDelay;  // Delay between commit and reveal (seconds)
        uint256 maxSlippage;        // Maximum allowed slippage (basis points)
        bool enabled;               // MEV protection enabled
    }

    // Events
    event OrderCreated(
        bytes32 indexed orderId,
        address indexed trader,
        bytes32 indexed market,
        OrderType orderType,
        IPerpetualTrading.TradeDirection direction,
        uint256 size,
        uint256 triggerPrice
    );

    event OrderExecuted(
        bytes32 indexed orderId,
        address indexed trader,
        uint256 executedSize,
        uint256 executedPrice,
        uint256 fee
    );

    event OrderCancelled(
        bytes32 indexed orderId,
        address indexed trader,
        string reason
    );

    event OrderExpired(
        bytes32 indexed orderId,
        address indexed trader
    );

    event MEVProtectionUpdated(
        uint256 commitRevealDelay,
        uint256 maxSlippage,
        bool enabled
    );

    // Order management functions
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
    ) external returns (bytes32 orderId);

    function createOrderWithCommitment(
        bytes32 commitment
    ) external returns (bytes32 orderId);

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
    ) external;

    function cancelOrder(bytes32 orderId) external;
    
    function executeOrder(bytes32 orderId) external returns (bool success);

    function batchExecuteOrders(bytes32[] calldata orderIds) external returns (uint256 successCount);

    // View functions
    function getOrder(bytes32 orderId) external view returns (Order memory);
    function getUserOrders(address trader) external view returns (bytes32[] memory);
    function getPendingOrders(bytes32 market) external view returns (bytes32[] memory);
    function isOrderExecutable(bytes32 orderId, uint256 currentPrice) external view returns (bool);
    function getMEVProtection() external view returns (MEVProtection memory);
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
    ) external pure returns (bytes32);

    // Admin functions
    function updateMEVProtection(
        uint256 commitRevealDelay,
        uint256 maxSlippage,
        bool enabled
    ) external;

    function cleanupExpiredOrders(bytes32[] calldata orderIds) external;
}