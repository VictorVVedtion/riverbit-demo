// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IRiverBitCoreV3
 * @notice Enhanced interface for RiverBit Core V3 - Non-custodial perpetual trading platform
 * @dev Implements comprehensive trading, settlement, and LP management system
 * 
 * Key Features:
 * - Non-custodial architecture with Three Iron Laws enforcement
 * - S-Auth signature-based settlement with batch processing
 * - Multi-source oracle integration with health scoring
 * - Four-bucket LP architecture with automated rebalancing
 * - Advanced risk management with graduated margins
 * - ETMA engine for after-hours stock trading
 */
interface IRiverBitCoreV3 {

    // ============ ENUMS ============

    enum MarketType {
        CRYPTO,     // BTC, ETH, SOL (1-100x leverage)
        STOCK       // US stocks (1.5-20x leverage)
    }

    enum MarginMode {
        CROSS,      // Shared margin pool
        ISOLATED    // Position-specific margin
    }

    enum OrderType {
        MARKET,
        LIMIT,
        STOP_LOSS,
        TAKE_PROFIT
    }

    enum PositionSide {
        LONG,
        SHORT
    }

    enum ProtocolStatus {
        NORMAL,
        MAINTENANCE,
        EMERGENCY,
        ETMA_ACTIVE  // Event-Triggered Market Auction
    }

    enum SafeModeLevel {
        NONE,       // Normal operation
        L1,         // 10% fund depletion - reduce position limits
        L2,         // 25% fund depletion - restrict new positions
        L3,         // 50% fund depletion - liquidation only
        L4          // 75% fund depletion - emergency shutdown
    }

    enum LPBucketType {
        A_BUCKET,   // 45% - Passive maker
        B_BUCKET,   // 20% - Active rebalancer
        L1_BUCKET,  // 25% - Primary liquidator
        L2_BUCKET   // 10% - Backstop liquidator
    }

    // ============ STRUCTS ============

    struct Market {
        bytes32 symbol;
        MarketType marketType;
        bool isActive;
        uint256 maxLeverage;
        uint256 minMarginBps;           // Minimum margin in basis points
        uint256 maintenanceMarginBps;   // Maintenance margin in basis points
        uint256 liquidationFeeBps;      // Liquidation fee in basis points
        uint256 fundingRate;            // Current funding rate (per 8 hours)
        uint256 openInterestLong;       // Total long open interest
        uint256 openInterestShort;      // Total short open interest
        uint256 lastFundingTime;        // Last funding payment time
        uint256 maxOpenInterest;        // Maximum allowed open interest
        bool isETMAActive;              // Whether ETMA is currently active
        uint256 etmaStartTime;          // ETMA session start time
        uint256 etmaEndTime;            // ETMA session end time
    }

    struct Position {
        bytes32 market;
        address trader;
        PositionSide side;
        uint256 size;                   // Position size in base asset
        uint256 entryPrice;             // Average entry price
        uint256 margin;                 // Allocated margin
        uint256 leverage;               // Position leverage
        MarginMode marginMode;          // Cross or isolated
        uint256 lastFundingPayment;     // Last funding payment timestamp
        int256 unrealizedPnL;           // Current unrealized P&L
        uint256 liquidationPrice;       // Liquidation price
        uint256 openTimestamp;          // Position open time
        bool isLiquidated;             // Whether position is liquidated
    }

    struct SAuthTicket {
        address trader;
        bytes32 market;
        OrderType orderType;
        PositionSide side;
        uint256 size;
        uint256 price;
        uint256 margin;
        uint256 leverage;
        MarginMode marginMode;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    struct BatchSettlement {
        SAuthTicket[] tickets;
        bytes32 merkleRoot;             // Merkle root for batch validation
        uint256 timestamp;
        address settler;
        bytes32 batchId;
    }

    struct OracleData {
        address oracle;
        uint256 price;
        uint256 timestamp;
        uint256 healthScore;            // 0-100, higher is better
        bool isActive;
        uint256 heartbeat;              // Maximum staleness tolerance
        uint256 deviationThreshold;     // Maximum price deviation
    }

    struct PriceAggregation {
        uint256 price;                  // Aggregated price
        uint256 confidence;             // Confidence score (0-100)
        uint256 timestamp;
        uint256 sourceCount;            // Number of active sources
        bool isFBLActive;               // First Bar Lock status
        bool isHealthy;                 // Overall health status
    }

    struct LPBucket {
        LPBucketType bucketType;
        uint256 allocation;             // Current allocation in USDC
        uint256 targetWeight;           // Target weight percentage (basis points)
        uint256 performance;            // Performance metrics
        address manager;                // Bucket manager address
        bool isActive;
        uint256 lastRebalance;
        uint256 maxDrawdown;
        uint256 totalReturn;
    }

    struct UserAccount {
        uint256 totalBalance;           // Total USDC balance
        uint256 availableBalance;       // Available for trading
        uint256 totalMargin;            // Total margin across positions
        uint256 crossMargin;            // Cross margin pool
        uint256 lpShares;               // RiverPool LP shares
        uint256 lastActivityTime;
        MarginMode defaultMarginMode;
        mapping(bytes32 => Position) positions;
    }

    struct RiskParameters {
        uint256 maxPositionsPerUser;
        uint256 maxLeverageForTier;
        uint256 liquidationThreshold;
        uint256 maintenanceMargin;
        uint256 maxDailyVolume;
        uint256 maxOpenInterest;
        bool emergencyLiquidationOnly;
    }

    struct ETMASession {
        bytes32 market;
        uint256 startTime;
        uint256 endTime;
        uint256 triggerPrice;           // Price that triggered ETMA
        uint256 auctionPrice;           // Current auction price
        uint256 volume;                 // Accumulated volume
        bool isActive;
        address[] participants;
        mapping(address => uint256) bids;
    }

    // ============ EVENTS ============

    event PositionOpened(
        address indexed trader,
        bytes32 indexed market,
        PositionSide side,
        uint256 size,
        uint256 price,
        uint256 margin,
        uint256 leverage
    );

    event PositionClosed(
        address indexed trader,
        bytes32 indexed market,
        uint256 size,
        int256 pnl,
        uint256 fee
    );

    event PositionLiquidated(
        address indexed trader,
        bytes32 indexed market,
        address indexed liquidator,
        uint256 size,
        uint256 liquidationPrice,
        uint256 fee
    );

    event BatchSettlementExecuted(
        bytes32 indexed batchId,
        address indexed settler,
        uint256 successCount,
        uint256 totalCount,
        bytes32 merkleRoot
    );

    event FundingPayment(
        bytes32 indexed market,
        uint256 fundingRate,
        uint256 totalPayment,
        uint256 timestamp
    );

    event MarketStatusChanged(
        bytes32 indexed market,
        bool isActive,
        ProtocolStatus status
    );

    event ETMATriggered(
        bytes32 indexed market,
        uint256 triggerPrice,
        uint256 startTime,
        uint256 endTime
    );

    event RiskParametersUpdated(
        bytes32 indexed market,
        uint256 maxLeverage,
        uint256 minMargin,
        uint256 maintenanceMargin
    );

    event LPBucketRebalanced(
        LPBucketType indexed bucketType,
        uint256 oldAllocation,
        uint256 newAllocation,
        uint256 targetWeight
    );

    event OracleHealthUpdated(
        address indexed oracle,
        uint256 healthScore,
        bool isActive
    );

    event SafeModeActivated(
        SafeModeLevel level,
        string reason,
        uint256 timestamp
    );

    event EmergencyAction(
        string action,
        address indexed admin,
        string reason,
        uint256 timestamp
    );

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Execute batch settlement of S-Auth tickets
     * @param settlement Batch settlement data with Merkle proof
     * @return batchId Unique identifier for the batch
     * @return successCount Number of successfully settled tickets
     */
    function executeBatchSettlement(BatchSettlement calldata settlement)
        external
        returns (bytes32 batchId, uint256 successCount);

    /**
     * @notice Open or modify a position
     * @param ticket S-Auth ticket with signature
     * @return positionId Unique position identifier
     */
    function openPosition(SAuthTicket calldata ticket)
        external
        returns (bytes32 positionId);

    /**
     * @notice Close a position (full or partial)
     * @param market Market symbol
     * @param size Size to close (0 for full close)
     * @param minPrice Minimum acceptable price (slippage protection)
     * @return pnl Realized P&L
     */
    function closePosition(
        bytes32 market,
        uint256 size,
        uint256 minPrice
    ) external returns (int256 pnl);

    /**
     * @notice Liquidate an undercollateralized position
     * @param trader Position owner
     * @param market Market symbol
     * @return liquidationFee Fee earned by liquidator
     */
    function liquidatePosition(
        address trader,
        bytes32 market
    ) external returns (uint256 liquidationFee);

    /**
     * @notice Update funding rates for all markets
     */
    function updateFundingRates() external;

    /**
     * @notice Process funding payments for a specific market
     * @param market Market symbol
     * @return totalPayment Total funding payment processed
     */
    function processFundingPayments(bytes32 market)
        external
        returns (uint256 totalPayment);

    // ============ LP FUNCTIONS ============

    /**
     * @notice Deposit USDC to receive LP shares
     * @param amount USDC amount to deposit
     * @return shares LP shares received
     */
    function depositToLP(uint256 amount) external returns (uint256 shares);

    /**
     * @notice Withdraw LP shares for USDC
     * @param shares LP shares to withdraw
     * @return amount USDC amount received
     */
    function withdrawFromLP(uint256 shares) external returns (uint256 amount);

    /**
     * @notice Trigger LP bucket rebalancing
     * @return totalRebalanced Total amount rebalanced
     */
    function rebalanceLPBuckets() external returns (uint256 totalRebalanced);

    // ============ ORACLE FUNCTIONS ============

    /**
     * @notice Update price from multiple oracle sources
     * @param market Market symbol
     * @param oracleData Array of oracle price data
     * @return aggregatedPrice Final aggregated price
     */
    function updatePrice(
        bytes32 market,
        OracleData[] calldata oracleData
    ) external returns (uint256 aggregatedPrice);

    /**
     * @notice Get current aggregated price for market
     * @param market Market symbol
     * @return priceData Current price aggregation data
     */
    function getPrice(bytes32 market)
        external
        view
        returns (PriceAggregation memory priceData);

    // ============ ETMA FUNCTIONS ============

    /**
     * @notice Trigger ETMA session for stock market
     * @param market Stock market symbol
     * @param triggerPrice Price that triggered the session
     * @return sessionId ETMA session identifier
     */
    function triggerETMA(
        bytes32 market,
        uint256 triggerPrice
    ) external returns (bytes32 sessionId);

    /**
     * @notice Participate in ETMA auction
     * @param market Stock market symbol
     * @param price Bid price
     * @param size Bid size
     */
    function participateInETMA(
        bytes32 market,
        uint256 price,
        uint256 size
    ) external;

    /**
     * @notice Finalize ETMA session
     * @param market Stock market symbol
     * @return finalPrice Final auction price
     */
    function finalizeETMA(bytes32 market)
        external
        returns (uint256 finalPrice);

    // ============ RISK MANAGEMENT ============

    /**
     * @notice Check if position can be liquidated
     * @param trader Position owner
     * @param market Market symbol
     * @return canLiquidate Whether position can be liquidated
     * @return liquidationPrice Price at which liquidation occurs
     */
    function checkLiquidation(
        address trader,
        bytes32 market
    ) external view returns (bool canLiquidate, uint256 liquidationPrice);

    /**
     * @notice Get user's total margin requirement
     * @param user User address
     * @return totalMargin Total margin requirement
     * @return availableMargin Available margin for new positions
     */
    function getMarginRequirement(address user)
        external
        view
        returns (uint256 totalMargin, uint256 availableMargin);

    /**
     * @notice Activate emergency safe mode
     * @param level Safe mode level
     * @param reason Reason for activation
     */
    function activateSafeMode(
        SafeModeLevel level,
        string calldata reason
    ) external;

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get user's complete account information
     * @param user User address
     * @return account User account data
     */
    function getUserAccount(address user)
        external
        view
        returns (UserAccount memory account);

    /**
     * @notice Get position information
     * @param trader Position owner
     * @param market Market symbol
     * @return position Position data
     */
    function getPosition(
        address trader,
        bytes32 market
    ) external view returns (Position memory position);

    /**
     * @notice Get market information
     * @param market Market symbol
     * @return marketData Market configuration and state
     */
    function getMarket(bytes32 market)
        external
        view
        returns (Market memory marketData);

    /**
     * @notice Get LP bucket information
     * @param bucketType Bucket type
     * @return bucket Bucket data
     */
    function getLPBucket(LPBucketType bucketType)
        external
        view
        returns (LPBucket memory bucket);

    /**
     * @notice Get current protocol status
     * @return status Current protocol status
     */
    function getProtocolStatus()
        external
        view
        returns (ProtocolStatus status);

    /**
     * @notice Calculate position P&L
     * @param trader Position owner
     * @param market Market symbol
     * @param currentPrice Current market price
     * @return unrealizedPnL Unrealized P&L
     */
    function calculatePnL(
        address trader,
        bytes32 market,
        uint256 currentPrice
    ) external view returns (int256 unrealizedPnL);

    /**
     * @notice Get Three Iron Laws compliance status
     * @return isCompliant Whether all laws are being followed
     * @return violations Array of any current violations
     */
    function getThreeIronLawsStatus()
        external
        view
        returns (bool isCompliant, string[] memory violations);
}