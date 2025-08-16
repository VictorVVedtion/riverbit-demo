// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/ILPBucketManager.sol";
import "../interfaces/IRevenueDistribution.sol";
import "../interfaces/IInsuranceFund.sol";

/**
 * @title LPBucketManager
 * @dev Manages the four-bucket LP architecture with automated rebalancing and risk management
 * @notice A桶(45%) + B桶(20%) + L1桶(25%) + L2桶(10%) = 100% allocation
 */
contract LPBucketManager is ILPBucketManager, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant BUCKET_MANAGER_ROLE = keccak256("BUCKET_MANAGER_ROLE");
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_WEIGHT_DEVIATION = 1000; // 10% max deviation
    uint256 public constant REBALANCE_INTERVAL = 4 hours;
    
    // Default target weights (in basis points)
    uint256 public constant A_BUCKET_WEIGHT = 4500;  // 45%
    uint256 public constant B_BUCKET_WEIGHT = 2000;  // 20%
    uint256 public constant L1_BUCKET_WEIGHT = 2500; // 25%
    uint256 public constant L2_BUCKET_WEIGHT = 1000; // 10%
    
    // ============ State Variables ============
    
    IERC20 public immutable baseAsset;
    IRevenueDistribution public revenueDistribution;
    IInsuranceFund public insuranceFund;
    
    mapping(BucketType => BucketInfo) public buckets;
    BucketType[] public bucketTypes;
    
    RebalanceParams public rebalanceParams;
    LossProtection public lossProtection;
    RiskMetrics public riskMetrics;
    
    uint256 public totalManagedAssets;
    uint256 public lastGlobalRebalance;
    
    // Performance tracking
    mapping(BucketType => uint256) public bucketPerformance;
    mapping(BucketType => uint256) public bucketMaxDrawdown;
    mapping(BucketType => uint256) public bucketVolatility;
    
    // Emergency controls
    bool public emergencyMode;
    mapping(BucketType => bool) public bucketStopped;
    
    // ============ Events ============
    
    event BucketInitialized(BucketType indexed bucketType, address indexed manager, uint256 targetWeight);
    event AllocationUpdated(BucketType indexed bucketType, uint256 oldAmount, uint256 newAmount);
    event RebalanceCompleted(uint256 timestamp, uint256 totalAssets);
    event LossProtectionActivated(BucketType indexed bucketType, uint256 lossAmount);
    event BucketEmergencyStop(BucketType indexed bucketType, address indexed executor, string reason);
    
    // ============ Modifiers ============
    
    modifier onlyBucketManager(BucketType bucketType) {
        require(
            msg.sender == buckets[bucketType].manager || hasRole(ADMIN_ROLE, msg.sender),
            "LPBucketManager: Not bucket manager"
        );
        _;
    }
    
    modifier notEmergencyMode() {
        require(!emergencyMode, "LPBucketManager: Emergency mode active");
        _;
    }
    
    modifier bucketNotStopped(BucketType bucketType) {
        require(!bucketStopped[bucketType], "LPBucketManager: Bucket stopped");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _baseAsset,
        address _admin
    ) {
        require(_baseAsset != address(0), "LPBucketManager: Invalid base asset");
        require(_admin != address(0), "LPBucketManager: Invalid admin");
        
        baseAsset = IERC20(_baseAsset);
        
        // Initialize bucket types
        bucketTypes = [
            BucketType.A_PASSIVE_MAKER,
            BucketType.B_ACTIVE_REBALANCER,
            BucketType.L1_PRIMARY_LIQUIDATOR,
            BucketType.L2_BACKSTOP
        ];
        
        // Initialize buckets with default weights
        _initializeBucket(BucketType.A_PASSIVE_MAKER, A_BUCKET_WEIGHT, address(0));
        _initializeBucket(BucketType.B_ACTIVE_REBALANCER, B_BUCKET_WEIGHT, address(0));
        _initializeBucket(BucketType.L1_PRIMARY_LIQUIDATOR, L1_BUCKET_WEIGHT, address(0));
        _initializeBucket(BucketType.L2_BACKSTOP, L2_BUCKET_WEIGHT, address(0));
        
        // Initialize rebalance parameters
        rebalanceParams = RebalanceParams({
            maxWeightDeviation: MAX_WEIGHT_DEVIATION,
            rebalanceInterval: REBALANCE_INTERVAL,
            minRebalanceAmount: 1000 * 10**18, // 1000 base tokens
            autoRebalanceEnabled: true
        });
        
        // Initialize loss protection
        lossProtection = LossProtection({
            maxLossPercentage: 500, // 5% max loss before protection
            protectionBuffer: 200,  // 2% buffer
            insuranceCoverage: 8000, // 80% insurance coverage
            protectionActive: true
        });
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(BUCKET_MANAGER_ROLE, _admin);
        
        lastGlobalRebalance = block.timestamp;
    }
    
    // ============ View Functions ============
    
    function getBucketInfo(BucketType bucketType) external view override returns (BucketInfo memory) {
        return buckets[bucketType];
    }
    
    function getAllBuckets() external view override returns (BucketInfo[] memory) {
        BucketInfo[] memory allBuckets = new BucketInfo[](bucketTypes.length);
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            allBuckets[i] = buckets[bucketTypes[i]];
        }
        return allBuckets;
    }
    
    function getCurrentAllocations() external view override returns (uint256[] memory allocations) {
        allocations = new uint256[](bucketTypes.length);
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            allocations[i] = buckets[bucketTypes[i]].allocation;
        }
    }
    
    function getTargetWeights() external view override returns (uint256[] memory weights) {
        weights = new uint256[](bucketTypes.length);
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            weights[i] = buckets[bucketTypes[i]].targetWeight;
        }
    }
    
    function calculateRebalancing(uint256 totalTVL) external view override returns (int256[] memory rebalanceAmounts) {
        rebalanceAmounts = new int256[](bucketTypes.length);
        
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            BucketInfo memory bucket = buckets[bucketType];
            
            uint256 targetAllocation = (totalTVL * bucket.targetWeight) / BASIS_POINTS;
            rebalanceAmounts[i] = int256(targetAllocation) - int256(bucket.allocation);
        }
    }
    
    function needsRebalancing(uint256 totalTVL) external view override returns (bool) {
        if (!rebalanceParams.autoRebalanceEnabled) return false;
        if (block.timestamp < lastGlobalRebalance + rebalanceParams.rebalanceInterval) return false;
        
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            BucketInfo memory bucket = buckets[bucketType];
            
            uint256 currentWeight = totalTVL > 0 ? (bucket.allocation * BASIS_POINTS) / totalTVL : 0;
            uint256 weightDeviation = currentWeight > bucket.targetWeight 
                ? currentWeight - bucket.targetWeight 
                : bucket.targetWeight - currentWeight;
            
            if (weightDeviation > rebalanceParams.maxWeightDeviation) {
                return true;
            }
        }
        
        return false;
    }
    
    function getRebalanceParams() external view override returns (RebalanceParams memory) {
        return rebalanceParams;
    }
    
    function getLossProtection() external view override returns (LossProtection memory) {
        return lossProtection;
    }
    
    function getRiskMetrics() external view override returns (RiskMetrics memory) {
        return riskMetrics;
    }
    
    function getBucketPerformance(BucketType bucketType) 
        external 
        view 
        override 
        returns (uint256 totalReturn, uint256 volatility, uint256 maxDrawdown) 
    {
        totalReturn = bucketPerformance[bucketType];
        volatility = bucketVolatility[bucketType];
        maxDrawdown = bucketMaxDrawdown[bucketType];
    }
    
    function getProjectedAllocation(BucketType bucketType, uint256 totalTVL) 
        external 
        view 
        override 
        returns (uint256 newAllocation) 
    {
        BucketInfo memory bucket = buckets[bucketType];
        newAllocation = (totalTVL * bucket.targetWeight) / BASIS_POINTS;
    }
    
    // ============ Management Functions ============
    
    function executeRebalance(uint256 totalTVL) 
        external 
        override 
        nonReentrant 
        onlyRole(OPERATOR_ROLE) 
        notEmergencyMode 
    {
        require(totalTVL > 0, "LPBucketManager: Invalid TVL");
        
        // Calculate rebalancing needs
        int256[] memory rebalanceAmounts = new int256[](bucketTypes.length);
        uint256 totalRebalanced = 0;
        
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            if (bucketStopped[bucketType]) continue;
            
            BucketInfo storage bucket = buckets[bucketType];
            uint256 targetAllocation = (totalTVL * bucket.targetWeight) / BASIS_POINTS;
            int256 rebalanceAmount = int256(targetAllocation) - int256(bucket.allocation);
            
            if (rebalanceAmount != 0 && uint256(rebalanceAmount > 0 ? rebalanceAmount : -rebalanceAmount) >= rebalanceParams.minRebalanceAmount) {
                rebalanceAmounts[i] = rebalanceAmount;
                bucket.allocation = targetAllocation;
                bucket.currentWeight = bucket.targetWeight;
                bucket.lastRebalanceTime = block.timestamp;
                
                totalRebalanced += uint256(rebalanceAmount > 0 ? rebalanceAmount : -rebalanceAmount);
                
                emit BucketRebalanced(bucketType, bucket.allocation, targetAllocation);
            }
        }
        
        // Update global state
        totalManagedAssets = totalTVL;
        lastGlobalRebalance = block.timestamp;
        
        emit RebalanceExecuted(block.timestamp, totalTVL);
        emit RebalanceCompleted(block.timestamp, totalTVL);
    }
    
    function adjustBucketAllocation(BucketType bucketType, uint256 newAllocation) 
        external 
        override 
        onlyBucketManager(bucketType) 
        bucketNotStopped(bucketType) 
    {
        BucketInfo storage bucket = buckets[bucketType];
        uint256 oldAllocation = bucket.allocation;
        
        bucket.allocation = newAllocation;
        bucket.currentWeight = totalManagedAssets > 0 ? (newAllocation * BASIS_POINTS) / totalManagedAssets : 0;
        
        emit AllocationUpdated(bucketType, oldAllocation, newAllocation);
    }
    
    function updateTargetWeight(BucketType bucketType, uint256 newWeight) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(newWeight <= BASIS_POINTS, "LPBucketManager: Weight exceeds 100%");
        
        uint256 oldWeight = buckets[bucketType].targetWeight;
        buckets[bucketType].targetWeight = newWeight;
        
        // Verify total weights don't exceed 100%
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            totalWeight += buckets[bucketTypes[i]].targetWeight;
        }
        require(totalWeight <= BASIS_POINTS, "LPBucketManager: Total weights exceed 100%");
        
        emit WeightAdjusted(bucketType, oldWeight, newWeight);
    }
    
    function updateBucketManager(BucketType bucketType, address newManager) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(newManager != address(0), "LPBucketManager: Invalid manager address");
        
        address oldManager = buckets[bucketType].manager;
        buckets[bucketType].manager = newManager;
        
        // Grant bucket manager role
        _grantRole(BUCKET_MANAGER_ROLE, newManager);
        if (oldManager != address(0)) {
            _revokeRole(BUCKET_MANAGER_ROLE, oldManager);
        }
        
        emit ManagerUpdated(bucketType, oldManager, newManager);
    }
    
    function setAutoRebalancing(bool enabled) external override onlyRole(ADMIN_ROLE) {
        rebalanceParams.autoRebalanceEnabled = enabled;
        emit AutoRebalanceToggled(enabled);
    }
    
    function updateRebalanceParams(RebalanceParams calldata params) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(params.maxWeightDeviation <= 2000, "LPBucketManager: Max deviation too high"); // 20% max
        require(params.rebalanceInterval >= 1 hours, "LPBucketManager: Interval too short");
        
        rebalanceParams = params;
    }
    
    function updateLossProtection(LossProtection calldata protection) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(protection.maxLossPercentage <= 2000, "LPBucketManager: Max loss too high"); // 20% max
        require(protection.insuranceCoverage <= BASIS_POINTS, "LPBucketManager: Coverage exceeds 100%");
        
        lossProtection = protection;
    }
    
    function triggerLossProtection(BucketType bucketType, uint256 lossAmount) 
        external 
        override 
        onlyBucketManager(bucketType) 
    {
        require(lossProtection.protectionActive, "LPBucketManager: Protection not active");
        
        BucketInfo storage bucket = buckets[bucketType];
        
        // Calculate loss percentage
        uint256 lossPercentage = bucket.allocation > 0 ? (lossAmount * BASIS_POINTS) / bucket.allocation : 0;
        
        if (lossPercentage >= lossProtection.maxLossPercentage) {
            // Calculate compensation amount
            uint256 compensationAmount = (lossAmount * lossProtection.insuranceCoverage) / BASIS_POINTS;
            
            // Request compensation from insurance fund
            if (address(insuranceFund) != address(0)) {
                // This would trigger insurance fund compensation
                emit LossProtectionTriggered(bucketType, lossAmount, compensationAmount);
            }
            
            // Update bucket P&L
            bucket.totalPnL -= int256(lossAmount);
            
            emit LossProtectionActivated(bucketType, lossAmount);
        }
    }
    
    function emergencyStopBucket(BucketType bucketType, string calldata reason) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        bucketStopped[bucketType] = true;
        buckets[bucketType].isActive = false;
        
        emit EmergencyStop(bucketType, reason);
        emit BucketEmergencyStop(bucketType, msg.sender, reason);
    }
    
    function resumeBucket(BucketType bucketType) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        bucketStopped[bucketType] = false;
        buckets[bucketType].isActive = true;
    }
    
    function updateRiskMetrics(
        uint256 volatility,
        uint256 maxDrawdown,
        uint256 sharpeRatio
    ) external override onlyRole(OPERATOR_ROLE) {
        riskMetrics = RiskMetrics({
            volatility: volatility,
            maxDrawdown: maxDrawdown,
            sharpeRatio: sharpeRatio,
            lastUpdateTime: block.timestamp
        });
        
        emit RiskMetricsUpdated(volatility, maxDrawdown, sharpeRatio);
    }
    
    function distributeRevenue(uint256 totalRevenue) 
        external 
        override 
        onlyRole(OPERATOR_ROLE) 
        notEmergencyMode 
    {
        require(totalRevenue > 0, "LPBucketManager: Invalid revenue amount");
        
        // Distribute revenue based on performance and allocation
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            if (bucketStopped[bucketType]) continue;
            
            BucketInfo storage bucket = buckets[bucketType];
            
            // Calculate revenue share based on current weight and performance
            uint256 baseShare = (totalRevenue * bucket.currentWeight) / BASIS_POINTS;
            
            // Performance adjustment (simplified)
            uint256 performanceMultiplier = bucket.totalPnL >= 0 ? 11000 : 9000; // +10% or -10%
            uint256 adjustedShare = (baseShare * performanceMultiplier) / BASIS_POINTS;
            
            bucket.totalPnL += int256(adjustedShare);
            
            // Transfer to bucket manager if revenue distribution is set
            if (address(revenueDistribution) != address(0) && bucket.manager != address(0)) {
                baseAsset.safeTransfer(bucket.manager, adjustedShare);
            }
        }
    }
    
    // ============ Emergency Functions ============
    
    function setEmergencyMode(bool enabled) external onlyRole(ADMIN_ROLE) {
        emergencyMode = enabled;
    }
    
    function emergencyWithdraw(address to, uint256 amount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(emergencyMode, "LPBucketManager: Only in emergency mode");
        baseAsset.safeTransfer(to, amount);
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ Configuration Functions ============
    
    function setRevenueDistribution(address _revenueDistribution) external onlyRole(ADMIN_ROLE) {
        revenueDistribution = IRevenueDistribution(_revenueDistribution);
    }
    
    function setInsuranceFund(address _insuranceFund) external onlyRole(ADMIN_ROLE) {
        insuranceFund = IInsuranceFund(_insuranceFund);
    }
    
    // ============ Internal Functions ============
    
    function _initializeBucket(BucketType bucketType, uint256 targetWeight, address manager) internal {
        buckets[bucketType] = BucketInfo({
            bucketType: bucketType,
            allocation: 0,
            targetWeight: targetWeight,
            currentWeight: 0,
            totalPnL: 0,
            lastRebalanceTime: block.timestamp,
            manager: manager,
            isActive: true,
            riskScore: 5000 // Default medium risk
        });
        
        emit BucketCreated(bucketType, manager, targetWeight);
        emit BucketInitialized(bucketType, manager, targetWeight);
    }
}