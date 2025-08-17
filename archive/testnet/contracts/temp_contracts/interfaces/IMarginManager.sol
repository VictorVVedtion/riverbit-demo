// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title IMarginManager
 * @notice Interface for the MarginManager contract
 * @dev Handles margin calculations, requirements, and cross/isolated margin modes
 */
interface IMarginManager {
    /// @notice Margin mode types
    enum MarginMode {
        ISOLATED,   // Each position has separate margin
        CROSS      // All positions share margin pool
    }

    /// @notice Market type for different leverage limits
    enum MarketType {
        CRYPTO,    // BTC, ETH, SOL - up to 100x leverage
        XSTOCK     // Stock perpetuals - 1.5x to 3x leverage
    }

    /// @notice Position information structure
    struct Position {
        uint256 size;           // Position size in USD
        uint256 margin;         // Allocated margin
        uint256 entryPrice;     // Average entry price
        bool isLong;            // Long or short position
        MarginMode mode;        // Margin mode
        MarketType marketType;  // Market type
        uint256 lastFundingUpdate; // Last funding payment timestamp
    }

    /// @notice Margin account structure
    struct MarginAccount {
        uint256 balance;        // USDC balance
        uint256 lockedMargin;   // Margin locked in isolated positions
        MarginMode defaultMode; // Default margin mode for new positions
    }

    // Events
    event MarginDeposited(address indexed user, uint256 amount);
    event MarginWithdrawn(address indexed user, uint256 amount);
    event MarginModeChanged(address indexed user, bytes32 indexed positionKey, MarginMode newMode);
    event MarginAdded(address indexed user, bytes32 indexed positionKey, uint256 amount);
    event MarginRemoved(address indexed user, bytes32 indexed positionKey, uint256 amount);
    event PositionLiquidated(address indexed user, bytes32 indexed positionKey, uint256 liquidationPrice);

    // Core functions
    function depositMargin(uint256 amount) external;
    function withdrawMargin(uint256 amount) external;
    function addMargin(bytes32 positionKey, uint256 amount) external;
    function removeMargin(bytes32 positionKey, uint256 amount) external;
    function changeMarginMode(bytes32 positionKey, MarginMode newMode) external;

    // View functions
    function getMarginAccount(address user) external view returns (MarginAccount memory);
    function getPosition(address user, bytes32 positionKey) external view returns (Position memory);
    function getAvailableMargin(address user) external view returns (uint256);
    function getRequiredMargin(address user, bytes32 positionKey, uint256 size, uint256 price, MarketType marketType) external view returns (uint256);
    function getMaintenanceMargin(address user, bytes32 positionKey) external view returns (uint256);
    function isLiquidatable(address user, bytes32 positionKey, uint256 currentPrice) external view returns (bool);
    function getMaxLeverage(MarketType marketType) external pure returns (uint256);
}