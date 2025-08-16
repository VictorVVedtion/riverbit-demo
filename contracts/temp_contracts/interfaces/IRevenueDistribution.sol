// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ILPBucketManager.sol";

/**
 * @title IRevenueDistribution
 * @dev Interface for revenue distribution system
 * @notice Manages multi-source revenue aggregation and distribution to LP buckets
 */
interface IRevenueDistribution {
    
    // ============ Enums ============
    
    enum RevenueSource {
        TRADING_FEES,       // 交易手续费
        FUNDING_FEES,       // 资金费用
        LIQUIDATION_FEES,   // 清算费用
        AMM_SPREADS,        // AMM价差
        LENDING_INTEREST,   // 借贷利息
        OTHER              // 其他收入
    }
    
    // ============ Structs ============
    
    struct RevenueInfo {
        RevenueSource source;
        uint256 amount;
        uint256 timestamp;
        address contributor;
        string description;
    }
    
    struct DistributionRule {
        ILPBucketManager.BucketType bucketType;
        uint256 percentage;         // Distribution percentage in basis points
        uint256 minAmount;          // Minimum amount to distribute
        bool isActive;              // Whether this rule is active
    }
    
    struct RevenueSnapshot {
        uint256 totalRevenue;
        uint256 distributedAmount;
        uint256 pendingAmount;
        uint256 timestamp;
        mapping(ILPBucketManager.BucketType => uint256) bucketDistributions;
    }
    
    struct UserRevenueInfo {
        uint256 totalEarned;        // Total revenue earned
        uint256 totalClaimed;       // Total revenue claimed
        uint256 pendingClaim;       // Pending claim amount
        uint256 lastClaimTime;      // Last claim timestamp
        mapping(RevenueSource => uint256) sourceEarnings;
    }
    
    struct PerformanceMetrics {
        uint256 totalFeesGenerated;
        uint256 averageDailyRevenue;
        uint256 peakDailyRevenue;
        uint256 revenueGrowthRate;  // Monthly growth rate in basis points
        uint256 lastUpdateTime;
    }
    
    // ============ Events ============
    
    event RevenueReceived(
        RevenueSource indexed source,
        uint256 amount,
        address indexed contributor,
        uint256 timestamp
    );
    
    event RevenueDistributed(
        uint256 indexed snapshotId,
        uint256 totalAmount,
        uint256 timestamp
    );
    
    event BucketRevenueAllocated(
        ILPBucketManager.BucketType indexed bucketType,
        uint256 amount,
        uint256 percentage,
        uint256 timestamp
    );
    
    event UserRevenueClaimed(
        address indexed user,
        uint256 amount,
        RevenueSource indexed source,
        uint256 timestamp
    );
    
    event DistributionRuleUpdated(
        ILPBucketManager.BucketType indexed bucketType,
        uint256 oldPercentage,
        uint256 newPercentage
    );
    
    event RevenueSourceToggled(RevenueSource indexed source, bool enabled);
    
    event EmergencyWithdrawal(address indexed recipient, uint256 amount, string reason);
    
    // ============ View Functions ============
    
    /**
     * @notice Get total revenue for a specific source
     * @param source Revenue source to query
     * @return totalAmount Total revenue from this source
     */
    function getTotalRevenueBySource(RevenueSource source) external view returns (uint256 totalAmount);
    
    /**
     * @notice Get total revenue across all sources
     * @return totalRevenue Total revenue amount
     */
    function getTotalRevenue() external view returns (uint256 totalRevenue);
    
    /**
     * @notice Get pending revenue waiting for distribution
     * @return pendingAmount Amount pending distribution
     */
    function getPendingRevenue() external view returns (uint256 pendingAmount);
    
    /**
     * @notice Get user's revenue information
     * @param user User address
     * @return UserRevenueInfo struct with user's revenue data
     */
    function getUserRevenueInfo(address user) external view returns (
        uint256 totalEarned,
        uint256 totalClaimed,
        uint256 pendingClaim,
        uint256 lastClaimTime
    );
    
    /**
     * @notice Get user's earnings from specific source
     * @param user User address
     * @param source Revenue source
     * @return earnings Amount earned from this source
     */
    function getUserEarningsBySource(address user, RevenueSource source) 
        external view returns (uint256 earnings);
    
    /**
     * @notice Get distribution rules for all buckets
     * @return rules Array of distribution rules
     */
    function getDistributionRules() external view returns (DistributionRule[] memory rules);
    
    /**
     * @notice Get distribution rule for specific bucket
     * @param bucketType Bucket to query
     * @return rule Distribution rule for the bucket
     */
    function getDistributionRule(ILPBucketManager.BucketType bucketType) 
        external view returns (DistributionRule memory rule);
    
    /**
     * @notice Get revenue history for a time period
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return revenues Array of revenue info within the time period
     */
    function getRevenueHistory(uint256 startTime, uint256 endTime) 
        external view returns (RevenueInfo[] memory revenues);
    
    /**
     * @notice Get performance metrics
     * @return metrics Current performance metrics
     */
    function getPerformanceMetrics() external view returns (PerformanceMetrics memory metrics);
    
    /**
     * @notice Calculate projected revenue for a bucket
     * @param bucketType Bucket to calculate for
     * @param pendingRevenue Amount of pending revenue
     * @return projectedAmount Projected revenue amount for the bucket
     */
    function calculateBucketRevenue(ILPBucketManager.BucketType bucketType, uint256 pendingRevenue) 
        external view returns (uint256 projectedAmount);
    
    /**
     * @notice Get revenue snapshot by ID
     * @param snapshotId Snapshot ID to query
     * @return totalRevenue Total revenue in snapshot
     * @return distributedAmount Amount distributed
     * @return timestamp Snapshot timestamp
     */
    function getRevenueSnapshot(uint256 snapshotId) external view returns (
        uint256 totalRevenue,
        uint256 distributedAmount,
        uint256 timestamp
    );
    
    // ============ Revenue Collection Functions ============
    
    /**
     * @notice Record revenue from trading fees
     * @param amount Revenue amount
     * @param trader Address of the trader (optional)
     */
    function recordTradingFees(uint256 amount, address trader) external;
    
    /**
     * @notice Record revenue from funding fees
     * @param amount Revenue amount
     * @param position Position address or identifier
     */
    function recordFundingFees(uint256 amount, address position) external;
    
    /**
     * @notice Record revenue from liquidation fees
     * @param amount Revenue amount
     * @param liquidatedPosition Address of liquidated position
     */
    function recordLiquidationFees(uint256 amount, address liquidatedPosition) external;
    
    /**
     * @notice Record revenue from AMM spreads
     * @param amount Revenue amount
     * @param pair Trading pair identifier
     */
    function recordAMMSpreads(uint256 amount, string calldata pair) external;
    
    /**
     * @notice Record revenue from external sources
     * @param source Revenue source type
     * @param amount Revenue amount
     * @param description Description of the revenue
     */
    function recordRevenue(RevenueSource source, uint256 amount, string calldata description) external;
    
    // ============ Distribution Functions ============
    
    /**
     * @notice Distribute pending revenue to buckets
     * @return snapshotId ID of the created distribution snapshot
     */
    function distributeRevenue() external returns (uint256 snapshotId);
    
    /**
     * @notice Claim accumulated revenue for a user
     * @param user User address
     * @return claimedAmount Amount claimed
     */
    function claimRevenue(address user) external returns (uint256 claimedAmount);
    
    /**
     * @notice Claim revenue from specific source for a user
     * @param user User address
     * @param source Revenue source to claim from
     * @return claimedAmount Amount claimed
     */
    function claimRevenueBySource(address user, RevenueSource source) 
        external returns (uint256 claimedAmount);
    
    /**
     * @notice Batch claim revenue for multiple users
     * @param users Array of user addresses
     * @return totalClaimed Total amount claimed across all users
     */
    function batchClaimRevenue(address[] calldata users) external returns (uint256 totalClaimed);
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update distribution rule for a bucket
     * @param bucketType Bucket to update
     * @param percentage New distribution percentage (basis points)
     * @param minAmount Minimum amount to distribute
     */
    function updateDistributionRule(
        ILPBucketManager.BucketType bucketType,
        uint256 percentage,
        uint256 minAmount
    ) external;
    
    /**
     * @notice Toggle revenue source collection
     * @param source Revenue source to toggle
     * @param enabled Whether to enable collection from this source
     */
    function toggleRevenueSource(RevenueSource source, bool enabled) external;
    
    /**
     * @notice Set minimum distribution amount
     * @param minAmount New minimum amount
     */
    function setMinimumDistributionAmount(uint256 minAmount) external;
    
    /**
     * @notice Emergency withdrawal of stuck funds
     * @param recipient Address to receive funds
     * @param amount Amount to withdraw
     * @param reason Reason for emergency withdrawal
     */
    function emergencyWithdraw(address recipient, uint256 amount, string calldata reason) external;
    
    /**
     * @notice Update performance metrics
     * @param metrics New performance metrics
     */
    function updatePerformanceMetrics(PerformanceMetrics calldata metrics) external;
    
    /**
     * @notice Redistribute failed distributions
     * @param snapshotId Snapshot ID to redistribute
     */
    function redistributeRevenue(uint256 snapshotId) external;
}