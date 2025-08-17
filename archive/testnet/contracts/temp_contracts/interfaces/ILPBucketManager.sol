// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ILPBucketManager
 * @dev Interface for LP four-bucket management system
 * @notice Manages A, B, L1, L2 buckets with specific weight allocations and rebalancing
 */
interface ILPBucketManager {
    
    // ============ Enums ============
    
    enum BucketType {
        A_PASSIVE_MAKER,        // A桶: 被动主力，近端三价，45%权重
        B_ACTIVE_REBALANCER,    // B桶: 小额主动回中，20%权重  
        L1_PRIMARY_LIQUIDATOR,  // L1桶: 清算承接与尾部深度，25%权重
        L2_BACKSTOP            // L2桶: 极端清算/尾部兜底，10%权重
    }
    
    // ============ Structs ============
    
    struct BucketInfo {
        BucketType bucketType;
        uint256 allocation;         // Current allocation amount
        uint256 targetWeight;       // Target weight percentage (basis points)
        uint256 currentWeight;      // Current weight percentage (basis points)
        uint256 totalPnL;          // Total P&L for this bucket
        uint256 lastRebalanceTime; // Last rebalance timestamp
        address manager;           // Bucket manager address
        bool isActive;             // Whether bucket is active
        uint256 riskScore;         // Current risk score (0-10000)
    }
    
    struct RebalanceParams {
        uint256 maxWeightDeviation; // Maximum weight deviation allowed (±10%)
        uint256 rebalanceInterval;  // Rebalance interval (4 hours)
        uint256 minRebalanceAmount; // Minimum amount to trigger rebalance
        bool autoRebalanceEnabled;  // Whether auto-rebalancing is enabled
    }
    
    struct LossProtection {
        uint256 maxLossPercentage;  // Maximum loss percentage before protection kicks in
        uint256 protectionBuffer;   // Protection buffer amount
        uint256 insuranceCoverage;  // Insurance coverage percentage
        bool protectionActive;      // Whether protection is currently active
    }
    
    struct RiskMetrics {
        uint256 volatility;         // Portfolio volatility
        uint256 maxDrawdown;        // Maximum drawdown
        uint256 sharpeRatio;        // Sharpe ratio * 10000
        uint256 lastUpdateTime;     // Last risk metrics update
    }
    
    // ============ Events ============
    
    event BucketCreated(BucketType indexed bucketType, address indexed manager, uint256 targetWeight);
    event BucketRebalanced(BucketType indexed bucketType, uint256 oldAllocation, uint256 newAllocation);
    event WeightAdjusted(BucketType indexed bucketType, uint256 oldWeight, uint256 newWeight);
    event ManagerUpdated(BucketType indexed bucketType, address indexed oldManager, address indexed newManager);
    event RebalanceExecuted(uint256 timestamp, uint256 totalRebalanced);
    event AutoRebalanceToggled(bool enabled);
    event LossProtectionTriggered(BucketType indexed bucketType, uint256 lossAmount, uint256 compensationAmount);
    event RiskMetricsUpdated(uint256 volatility, uint256 maxDrawdown, uint256 sharpeRatio);
    event EmergencyStop(BucketType indexed bucketType, string reason);
    
    // ============ View Functions ============
    
    /**
     * @notice Get information for a specific bucket
     * @param bucketType Type of bucket to query
     * @return BucketInfo struct with bucket details
     */
    function getBucketInfo(BucketType bucketType) external view returns (BucketInfo memory);
    
    /**
     * @notice Get all bucket information
     * @return Array of BucketInfo for all buckets
     */
    function getAllBuckets() external view returns (BucketInfo[] memory);
    
    /**
     * @notice Get current bucket allocations
     * @return allocations Array of current allocations for each bucket
     */
    function getCurrentAllocations() external view returns (uint256[] memory allocations);
    
    /**
     * @notice Get target weights for all buckets
     * @return weights Array of target weights in basis points
     */
    function getTargetWeights() external view returns (uint256[] memory weights);
    
    /**
     * @notice Calculate required rebalancing amounts
     * @param totalTVL Current total TVL
     * @return rebalanceAmounts Array of amounts to rebalance for each bucket
     */
    function calculateRebalancing(uint256 totalTVL) external view returns (int256[] memory rebalanceAmounts);
    
    /**
     * @notice Check if rebalancing is needed
     * @param totalTVL Current total TVL
     * @return true if rebalancing is required
     */
    function needsRebalancing(uint256 totalTVL) external view returns (bool);
    
    /**
     * @notice Get current rebalance parameters
     * @return RebalanceParams struct
     */
    function getRebalanceParams() external view returns (RebalanceParams memory);
    
    /**
     * @notice Get loss protection settings
     * @return LossProtection struct
     */
    function getLossProtection() external view returns (LossProtection memory);
    
    /**
     * @notice Get current risk metrics
     * @return RiskMetrics struct
     */
    function getRiskMetrics() external view returns (RiskMetrics memory);
    
    /**
     * @notice Calculate bucket performance metrics
     * @param bucketType Bucket to analyze
     * @return totalReturn Total return percentage
     * @return volatility Volatility percentage
     * @return maxDrawdown Maximum drawdown percentage
     */
    function getBucketPerformance(BucketType bucketType) 
        external view returns (uint256 totalReturn, uint256 volatility, uint256 maxDrawdown);
    
    // ============ Management Functions ============
    
    /**
     * @notice Execute rebalancing across all buckets
     * @param totalTVL Current total TVL for calculation
     */
    function executeRebalance(uint256 totalTVL) external;
    
    /**
     * @notice Manually adjust bucket allocation
     * @param bucketType Bucket to adjust
     * @param newAllocation New allocation amount
     */
    function adjustBucketAllocation(BucketType bucketType, uint256 newAllocation) external;
    
    /**
     * @notice Update bucket target weight
     * @param bucketType Bucket to update
     * @param newWeight New target weight in basis points
     */
    function updateTargetWeight(BucketType bucketType, uint256 newWeight) external;
    
    /**
     * @notice Update bucket manager address
     * @param bucketType Bucket to update
     * @param newManager New manager address
     */
    function updateBucketManager(BucketType bucketType, address newManager) external;
    
    /**
     * @notice Toggle auto-rebalancing
     * @param enabled Whether to enable auto-rebalancing
     */
    function setAutoRebalancing(bool enabled) external;
    
    /**
     * @notice Update rebalance parameters
     * @param params New rebalance parameters
     */
    function updateRebalanceParams(RebalanceParams calldata params) external;
    
    /**
     * @notice Update loss protection settings
     * @param protection New loss protection settings
     */
    function updateLossProtection(LossProtection calldata protection) external;
    
    /**
     * @notice Trigger loss protection for a bucket
     * @param bucketType Bucket that experienced loss
     * @param lossAmount Amount of loss
     */
    function triggerLossProtection(BucketType bucketType, uint256 lossAmount) external;
    
    /**
     * @notice Emergency stop for a specific bucket
     * @param bucketType Bucket to stop
     * @param reason Reason for emergency stop
     */
    function emergencyStopBucket(BucketType bucketType, string calldata reason) external;
    
    /**
     * @notice Resume a stopped bucket
     * @param bucketType Bucket to resume
     */
    function resumeBucket(BucketType bucketType) external;
    
    /**
     * @notice Update risk metrics for all buckets
     * @param volatility Current portfolio volatility
     * @param maxDrawdown Current maximum drawdown
     * @param sharpeRatio Current Sharpe ratio
     */
    function updateRiskMetrics(
        uint256 volatility,
        uint256 maxDrawdown,
        uint256 sharpeRatio
    ) external;
    
    /**
     * @notice Distribute revenue to buckets based on performance
     * @param totalRevenue Total revenue to distribute
     */
    function distributeRevenue(uint256 totalRevenue) external;
    
    /**
     * @notice Get bucket allocation after potential rebalancing
     * @param bucketType Bucket to query
     * @param totalTVL Current total TVL
     * @return newAllocation Projected allocation after rebalancing
     */
    function getProjectedAllocation(BucketType bucketType, uint256 totalTVL) 
        external view returns (uint256 newAllocation);
}