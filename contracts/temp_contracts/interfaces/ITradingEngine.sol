// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title ITradingEngine
 * @notice Interface for the trading engine module
 */
interface ITradingEngine {
    
    // ============ ENUMS ============
    
    enum TradeDirection {
        LONG,
        SHORT
    }
    
    enum TradeAction {
        OPEN,
        CLOSE,
        MODIFY
    }

    // ============ STRUCTS ============
    
    struct Position {
        address trader;
        bytes32 market;
        bool isLong;
        uint256 size;
        uint256 entryPrice;
        uint256 margin;
        uint256 leverage;
        uint256 openTime;
        uint256 lastFundingTime;
    }
    
    struct TradeResult {
        bytes32 positionKey;
        uint256 executedSize;
        uint256 executedPrice;
        uint256 fee;
        int256 pnl;
        uint256 newPositionSize;
        uint256 newMargin;
    }
    
    struct OpenPositionParams {
        bytes32 market;
        bool isLong;
        uint256 size;
        uint256 margin;
        uint256 acceptablePrice;
    }
    
    struct BatchTradeParams {
        TradeAction action;
        bytes32 market;
        bytes32 positionKey;
        bool isLong;
        uint256 size;
        uint256 price;
    }

    // ============ EVENTS ============
    
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
        uint256 exitPrice,
        int256 pnl,
        uint256 fee
    );
    
    event PositionLiquidated(
        address indexed trader,
        bytes32 indexed positionKey,
        uint256 liquidationPrice,
        address liquidator,
        uint256 reward
    );
    
    event FundingPaid(
        address indexed trader,
        bytes32 indexed positionKey,
        int256 amount
    );

    // ============ FUNCTIONS ============
    
    function openPosition(OpenPositionParams calldata params) external returns (bytes32 positionKey);
    function closePosition(bytes32 positionKey, uint256 size, uint256 minPrice) external returns (int256 pnl);
    function executeBatchTrades(BatchTradeParams[] calldata trades) external returns (uint256 batchId);
    function liquidatePosition(address trader, bytes32 positionKey) external returns (uint256 liquidatorReward);
    function getPosition(bytes32 positionKey) external view returns (Position memory);
    function getUserPositions(address trader) external view returns (bytes32[] memory);
}