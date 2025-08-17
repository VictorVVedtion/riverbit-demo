// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./IMarginManager.sol";

/**
 * @title IPerpetualTrading
 * @notice Interface for the PerpetualTrading contract
 * @dev Handles perpetual contract trading for crypto and xStock markets
 */
interface IPerpetualTrading {
    /// @notice Trade direction
    enum TradeDirection {
        LONG,
        SHORT
    }

    /// @notice Trade execution result
    struct TradeResult {
        bytes32 positionKey;
        uint256 executedSize;
        uint256 executedPrice;
        uint256 fee;
        int256 pnl;
        uint256 newPositionSize;
        uint256 newMargin;
    }

    /// @notice Funding rate information
    struct FundingRate {
        int256 rate;           // Current funding rate (18 decimals)
        uint256 lastUpdate;    // Last update timestamp
        uint256 interval;      // Funding interval in seconds
    }

    // Events
    event TradeExecuted(
        address indexed trader,
        bytes32 indexed positionKey,
        TradeDirection direction,
        uint256 size,
        uint256 price,
        uint256 fee,
        int256 pnl
    );
    
    event PositionClosed(
        address indexed trader,
        bytes32 indexed positionKey,
        uint256 closePrice,
        int256 pnl,
        uint256 fee
    );
    
    event FundingPaid(
        address indexed trader,
        bytes32 indexed positionKey,
        int256 fundingAmount
    );
    
    event PositionLiquidated(
        address indexed trader,
        bytes32 indexed positionKey,
        uint256 liquidationPrice,
        address indexed liquidator,
        uint256 liquidatorReward
    );

    // Core trading functions
    function openPosition(
        bytes32 market,
        TradeDirection direction,
        uint256 size,
        uint256 maxPrice,
        IMarginManager.MarginMode marginMode
    ) external returns (TradeResult memory);

    function closePosition(
        bytes32 positionKey,
        uint256 size,
        uint256 minPrice
    ) external returns (TradeResult memory);

    function adjustMargin(
        bytes32 positionKey,
        int256 marginDelta
    ) external;

    function liquidatePosition(
        address trader,
        bytes32 positionKey
    ) external returns (uint256 liquidatorReward);

    // Funding functions
    function updateFunding(bytes32 market) external;
    function claimFunding(bytes32 positionKey) external;

    // View functions
    function getPosition(address trader, bytes32 positionKey) external view returns (IMarginManager.Position memory);
    function getUnrealizedPnL(address trader, bytes32 positionKey, uint256 currentPrice) external view returns (int256);
    function getFundingRate(bytes32 market) external view returns (FundingRate memory);
    function getPositionKey(address trader, bytes32 market) external pure returns (bytes32);
    function isPositionLiquidatable(address trader, bytes32 positionKey, uint256 currentPrice) external view returns (bool);
    function getMaxPositionSize(address trader, bytes32 market, uint256 leverage) external view returns (uint256);
}