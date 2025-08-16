// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IRevenueDistribution.sol";
import "../interfaces/ILPBucketManager.sol";

/**
 * @title RevenueDistribution
 * @dev Manages multi-source revenue aggregation and distribution to LP buckets
 * @notice Collects revenue from trading fees, funding fees, liquidation fees, AMM spreads, and other sources
 */
contract RevenueDistribution is IRevenueDistribution, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant REVENUE_COLLECTOR_ROLE = keccak256("REVENUE_COLLECTOR_ROLE");
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_DISTRIBUTION_PERCENTAGE = 5000; // 50% max to any single bucket
    
    // ============ State Variables ============
    
    IERC20 public immutable baseAsset;
    ILPBucketManager public bucketManager;
    
    // Revenue tracking
    mapping(RevenueSource => uint256) public totalRevenueBySource;
    mapping(RevenueSource => bool) public revenueSourceEnabled;
    uint256 public totalRevenue;
    uint256 public totalDistributed;
    uint256 public pendingRevenue;
    
    // Distribution rules
    mapping(ILPBucketManager.BucketType => DistributionRule) public distributionRules;
    ILPBucketManager.BucketType[] public activeBuckets;
    
    // User revenue tracking
    mapping(address => uint256) public userTotalEarned;
    mapping(address => uint256) public userTotalClaimed;
    mapping(address => uint256) public userPendingClaim;
    mapping(address => uint256) public userLastClaimTime;
    mapping(address => mapping(RevenueSource => uint256)) public userSourceEarnings;
    
    // Revenue history
    RevenueInfo[] public revenueHistory;
    mapping(uint256 => uint256) public snapshotTotalRevenue;
    mapping(uint256 => uint256) public snapshotDistributedAmount;
    mapping(uint256 => uint256) public snapshotTimestamp;
    mapping(uint256 => mapping(ILPBucketManager.BucketType => uint256)) public snapshotBucketDistributions;
    
    uint256 public nextSnapshotId;
    uint256 public minimumDistributionAmount;
    
    // Performance metrics
    PerformanceMetrics public performanceMetrics;
    
    // Emergency controls
    bool public emergencyMode;
    mapping(RevenueSource => bool) public sourceBlocked;
    
    // ============ Events ============
    
    event RevenueRecorded(RevenueSource indexed source, uint256 amount, address indexed contributor);
    event DistributionExecuted(uint256 indexed snapshotId, uint256 totalAmount);
    event UserRevenueUpdated(address indexed user, uint256 newEarnings, RevenueSource indexed source);
    event DistributionRuleSet(ILPBucketManager.BucketType indexed bucketType, uint256 percentage);
    
    // ============ Modifiers ============
    
    modifier onlyRevenueCollector() {
        require(
            hasRole(REVENUE_COLLECTOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "RevenueDistribution: Not authorized collector"
        );
        _;
    }
    
    modifier sourceEnabled(RevenueSource source) {
        require(revenueSourceEnabled[source], "RevenueDistribution: Source disabled");
        require(!sourceBlocked[source], "RevenueDistribution: Source blocked");
        _;
    }
    
    modifier notEmergencyMode() {
        require(!emergencyMode, "RevenueDistribution: Emergency mode active");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _baseAsset,
        address _admin
    ) {
        require(_baseAsset != address(0), "RevenueDistribution: Invalid base asset");
        require(_admin != address(0), "RevenueDistribution: Invalid admin");
        
        baseAsset = IERC20(_baseAsset);
        minimumDistributionAmount = 1000 * 10**18; // 1000 base tokens
        
        // Enable all revenue sources by default
        revenueSourceEnabled[RevenueSource.TRADING_FEES] = true;
        revenueSourceEnabled[RevenueSource.FUNDING_FEES] = true;
        revenueSourceEnabled[RevenueSource.LIQUIDATION_FEES] = true;
        revenueSourceEnabled[RevenueSource.AMM_SPREADS] = true;
        revenueSourceEnabled[RevenueSource.LENDING_INTEREST] = true;
        revenueSourceEnabled[RevenueSource.OTHER] = true;
        
        // Initialize active buckets
        activeBuckets = [
            ILPBucketManager.BucketType.A_PASSIVE_MAKER,
            ILPBucketManager.BucketType.B_ACTIVE_REBALANCER,
            ILPBucketManager.BucketType.L1_PRIMARY_LIQUIDATOR,
            ILPBucketManager.BucketType.L2_BACKSTOP
        ];
        
        // Set default distribution rules based on bucket weights
        _setDistributionRule(ILPBucketManager.BucketType.A_PASSIVE_MAKER, 4500, 100 * 10**18); // 45%
        _setDistributionRule(ILPBucketManager.BucketType.B_ACTIVE_REBALANCER, 2000, 50 * 10**18); // 20%
        _setDistributionRule(ILPBucketManager.BucketType.L1_PRIMARY_LIQUIDATOR, 2500, 75 * 10**18); // 25%
        _setDistributionRule(ILPBucketManager.BucketType.L2_BACKSTOP, 1000, 25 * 10**18); // 10%
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(REVENUE_COLLECTOR_ROLE, _admin);
        
        nextSnapshotId = 1;
    }
    
    // ============ View Functions ============
    
    function getTotalRevenueBySource(RevenueSource source) external view override returns (uint256 totalAmount) {
        return totalRevenueBySource[source];
    }
    
    function getTotalRevenue() external view override returns (uint256) {
        return totalRevenue;
    }
    
    function getPendingRevenue() external view override returns (uint256) {
        return pendingRevenue;
    }
    
    function getUserRevenueInfo(address user) external view override returns (
        uint256 totalEarned,
        uint256 totalClaimed,
        uint256 pendingClaim,
        uint256 lastClaimTime
    ) {
        return (
            userTotalEarned[user],
            userTotalClaimed[user],
            userPendingClaim[user],
            userLastClaimTime[user]
        );
    }
    
    function getUserEarningsBySource(address user, RevenueSource source) 
        external 
        view 
        override 
        returns (uint256 earnings) 
    {
        return userSourceEarnings[user][source];
    }
    
    function getDistributionRules() external view override returns (DistributionRule[] memory rules) {
        rules = new DistributionRule[](activeBuckets.length);
        for (uint256 i = 0; i < activeBuckets.length; i++) {
            rules[i] = distributionRules[activeBuckets[i]];
        }
    }
    
    function getDistributionRule(ILPBucketManager.BucketType bucketType) 
        external 
        view 
        override 
        returns (DistributionRule memory rule) 
    {
        return distributionRules[bucketType];
    }
    
    function getRevenueHistory(uint256 startTime, uint256 endTime) 
        external 
        view 
        override 
        returns (RevenueInfo[] memory revenues) 
    {
        uint256 count = 0;
        
        // Count matching entries
        for (uint256 i = 0; i < revenueHistory.length; i++) {
            if (revenueHistory[i].timestamp >= startTime && revenueHistory[i].timestamp <= endTime) {
                count++;
            }
        }
        
        // Build result array
        revenues = new RevenueInfo[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < revenueHistory.length; i++) {
            if (revenueHistory[i].timestamp >= startTime && revenueHistory[i].timestamp <= endTime) {
                revenues[index] = revenueHistory[i];
                index++;
            }
        }
    }
    
    function getPerformanceMetrics() external view override returns (PerformanceMetrics memory metrics) {
        return performanceMetrics;
    }
    
    function calculateBucketRevenue(ILPBucketManager.BucketType bucketType, uint256 pendingRevenueAmount) 
        external 
        view 
        override 
        returns (uint256 projectedAmount) 
    {
        DistributionRule memory rule = distributionRules[bucketType];
        if (!rule.isActive || pendingRevenueAmount < rule.minAmount) {
            return 0;
        }
        
        return (pendingRevenueAmount * rule.percentage) / BASIS_POINTS;
    }
    
    function getRevenueSnapshot(uint256 snapshotId) external view override returns (
        uint256 totalRevenueAmount,
        uint256 distributedAmount,
        uint256 timestamp
    ) {
        return (
            snapshotTotalRevenue[snapshotId],
            snapshotDistributedAmount[snapshotId],
            snapshotTimestamp[snapshotId]
        );
    }
    
    // ============ Revenue Collection Functions ============
    
    function recordTradingFees(uint256 amount, address trader) 
        external 
        override 
        onlyRevenueCollector 
        sourceEnabled(RevenueSource.TRADING_FEES) 
        notEmergencyMode 
    {
        _recordRevenue(RevenueSource.TRADING_FEES, amount, trader, "Trading fees");
    }
    
    function recordFundingFees(uint256 amount, address position) 
        external 
        override 
        onlyRevenueCollector 
        sourceEnabled(RevenueSource.FUNDING_FEES) 
        notEmergencyMode 
    {
        _recordRevenue(RevenueSource.FUNDING_FEES, amount, position, "Funding fees");
    }
    
    function recordLiquidationFees(uint256 amount, address liquidatedPosition) 
        external 
        override 
        onlyRevenueCollector 
        sourceEnabled(RevenueSource.LIQUIDATION_FEES) 
        notEmergencyMode 
    {
        _recordRevenue(RevenueSource.LIQUIDATION_FEES, amount, liquidatedPosition, "Liquidation fees");
    }
    
    function recordAMMSpreads(uint256 amount, string calldata pair) 
        external 
        override 
        onlyRevenueCollector 
        sourceEnabled(RevenueSource.AMM_SPREADS) 
        notEmergencyMode 
    {
        _recordRevenue(RevenueSource.AMM_SPREADS, amount, msg.sender, string(abi.encodePacked("AMM spreads: ", pair)));
    }
    
    function recordRevenue(RevenueSource source, uint256 amount, string calldata description) 
        external 
        override 
        onlyRevenueCollector 
        sourceEnabled(source) 
        notEmergencyMode 
    {
        _recordRevenue(source, amount, msg.sender, description);
    }
    
    // ============ Distribution Functions ============
    
    function distributeRevenue() 
        external 
        override 
        nonReentrant 
        onlyRole(OPERATOR_ROLE) 
        notEmergencyMode 
        returns (uint256 snapshotId) 
    {
        require(pendingRevenue >= minimumDistributionAmount, "RevenueDistribution: Below minimum amount");
        
        snapshotId = nextSnapshotId++;
        uint256 distributionAmount = pendingRevenue;
        
        // Create snapshot
        snapshotTotalRevenue[snapshotId] = distributionAmount;
        snapshotTimestamp[snapshotId] = block.timestamp;
        
        uint256 totalDistributedInSnapshot = 0;
        
        // Distribute to each active bucket
        for (uint256 i = 0; i < activeBuckets.length; i++) {
            ILPBucketManager.BucketType bucketType = activeBuckets[i];
            DistributionRule memory rule = distributionRules[bucketType];
            
            if (rule.isActive && distributionAmount >= rule.minAmount) {
                uint256 bucketAmount = (distributionAmount * rule.percentage) / BASIS_POINTS;
                
                if (bucketAmount > 0 && address(bucketManager) != address(0)) {
                    // Get bucket info to send to bucket manager
                    try bucketManager.getBucketInfo(bucketType) returns (ILPBucketManager.BucketInfo memory bucketInfo) {
                        if (bucketInfo.isActive && bucketInfo.manager != address(0)) {
                            baseAsset.safeTransfer(bucketInfo.manager, bucketAmount);
                            totalDistributedInSnapshot += bucketAmount;
                            
                            snapshotBucketDistributions[snapshotId][bucketType] = bucketAmount;
                            
                            emit BucketRevenueAllocated(bucketType, bucketAmount, rule.percentage, block.timestamp);
                        }
                    } catch {
                        // If bucket info retrieval fails, skip this bucket
                        continue;
                    }
                }
            }
        }
        
        // Update state
        snapshotDistributedAmount[snapshotId] = totalDistributedInSnapshot;
        pendingRevenue -= totalDistributedInSnapshot;
        totalDistributed += totalDistributedInSnapshot;
        
        emit RevenueDistributed(snapshotId, totalDistributedInSnapshot, block.timestamp);
        emit DistributionExecuted(snapshotId, totalDistributedInSnapshot);
    }
    
    function claimRevenue(address user) 
        external 
        override 
        nonReentrant 
        returns (uint256 claimedAmount) 
    {
        require(user != address(0), "RevenueDistribution: Invalid user");
        
        claimedAmount = userPendingClaim[user];
        require(claimedAmount > 0, "RevenueDistribution: No pending claims");
        
        userPendingClaim[user] = 0;
        userTotalClaimed[user] += claimedAmount;
        userLastClaimTime[user] = block.timestamp;
        
        baseAsset.safeTransfer(user, claimedAmount);
        
        emit UserRevenueClaimed(user, claimedAmount, RevenueSource.OTHER, block.timestamp);
    }
    
    function claimRevenueBySource(address user, RevenueSource source) 
        external 
        override 
        nonReentrant 
        returns (uint256 claimedAmount) 
    {
        require(user != address(0), "RevenueDistribution: Invalid user");
        
        claimedAmount = userSourceEarnings[user][source];
        require(claimedAmount > 0, "RevenueDistribution: No earnings from source");
        
        userSourceEarnings[user][source] = 0;
        userTotalClaimed[user] += claimedAmount;
        userLastClaimTime[user] = block.timestamp;
        
        baseAsset.safeTransfer(user, claimedAmount);
        
        emit UserRevenueClaimed(user, claimedAmount, source, block.timestamp);
    }
    
    function batchClaimRevenue(address[] calldata users) 
        external 
        override 
        nonReentrant 
        onlyRole(OPERATOR_ROLE) 
        returns (uint256 totalClaimed) 
    {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 claimAmount = userPendingClaim[user];
            
            if (claimAmount > 0) {
                userPendingClaim[user] = 0;
                userTotalClaimed[user] += claimAmount;
                userLastClaimTime[user] = block.timestamp;
                totalClaimed += claimAmount;
                
                baseAsset.safeTransfer(user, claimAmount);
                
                emit UserRevenueClaimed(user, claimAmount, RevenueSource.OTHER, block.timestamp);
            }
        }
    }
    
    // ============ Admin Functions ============
    
    function updateDistributionRule(
        ILPBucketManager.BucketType bucketType,
        uint256 percentage,
        uint256 minAmount
    ) external override onlyRole(ADMIN_ROLE) {
        require(percentage <= MAX_DISTRIBUTION_PERCENTAGE, "RevenueDistribution: Percentage too high");
        
        _setDistributionRule(bucketType, percentage, minAmount);
    }
    
    function toggleRevenueSource(RevenueSource source, bool enabled) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        revenueSourceEnabled[source] = enabled;
        emit RevenueSourceToggled(source, enabled);
    }
    
    function setMinimumDistributionAmount(uint256 minAmount) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        minimumDistributionAmount = minAmount;
    }
    
    function emergencyWithdraw(address recipient, uint256 amount, string calldata reason) 
        external 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(emergencyMode, "RevenueDistribution: Only in emergency mode");
        baseAsset.safeTransfer(recipient, amount);
        emit EmergencyWithdrawal(recipient, amount, reason);
    }
    
    function updatePerformanceMetrics(PerformanceMetrics calldata metrics) 
        external 
        override 
        onlyRole(OPERATOR_ROLE) 
    {
        performanceMetrics = metrics;
    }
    
    function redistributeRevenue(uint256 snapshotId) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(snapshotTimestamp[snapshotId] > 0, "RevenueDistribution: Invalid snapshot");
        require(snapshotDistributedAmount[snapshotId] == 0, "RevenueDistribution: Already distributed");
        
        uint256 amount = snapshotTotalRevenue[snapshotId];
        pendingRevenue += amount;
        
        // Reset snapshot
        snapshotTotalRevenue[snapshotId] = 0;
        snapshotTimestamp[snapshotId] = 0;
    }
    
    // ============ Configuration Functions ============
    
    function setBucketManager(address _bucketManager) external onlyRole(ADMIN_ROLE) {
        require(_bucketManager != address(0), "RevenueDistribution: Invalid address");
        bucketManager = ILPBucketManager(_bucketManager);
    }
    
    function setEmergencyMode(bool enabled) external onlyRole(ADMIN_ROLE) {
        emergencyMode = enabled;
    }
    
    function blockRevenueSource(RevenueSource source, bool blocked) external onlyRole(ADMIN_ROLE) {
        sourceBlocked[source] = blocked;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ Internal Functions ============
    
    function _recordRevenue(
        RevenueSource source,
        uint256 amount,
        address contributor,
        string memory description
    ) internal {
        require(amount > 0, "RevenueDistribution: Invalid amount");
        
        // Update totals
        totalRevenueBySource[source] += amount;
        totalRevenue += amount;
        pendingRevenue += amount;
        
        // Record revenue info
        revenueHistory.push(RevenueInfo({
            source: source,
            amount: amount,
            timestamp: block.timestamp,
            contributor: contributor,
            description: description
        }));
        
        // Transfer tokens to this contract
        baseAsset.safeTransferFrom(contributor, address(this), amount);
        
        // Update performance metrics
        _updatePerformanceMetrics(amount);
        
        emit RevenueReceived(source, amount, contributor, block.timestamp);
        emit RevenueRecorded(source, amount, contributor);
    }
    
    function _setDistributionRule(
        ILPBucketManager.BucketType bucketType,
        uint256 percentage,
        uint256 minAmount
    ) internal {
        distributionRules[bucketType] = DistributionRule({
            bucketType: bucketType,
            percentage: percentage,
            minAmount: minAmount,
            isActive: true
        });
        
        emit DistributionRuleUpdated(bucketType, 0, percentage);
        emit DistributionRuleSet(bucketType, percentage);
    }
    
    function _updatePerformanceMetrics(uint256 newRevenue) internal {
        PerformanceMetrics storage metrics = performanceMetrics;
        
        // Update total fees generated
        metrics.totalFeesGenerated += newRevenue;
        
        // Update daily average (simplified calculation)
        uint256 daysSinceUpdate = (block.timestamp - metrics.lastUpdateTime) / 1 days;
        if (daysSinceUpdate > 0) {
            metrics.averageDailyRevenue = (metrics.averageDailyRevenue * 29 + newRevenue) / 30; // 30-day moving average
        }
        
        // Update peak if necessary
        if (newRevenue > metrics.peakDailyRevenue) {
            metrics.peakDailyRevenue = newRevenue;
        }
        
        metrics.lastUpdateTime = block.timestamp;
    }
}