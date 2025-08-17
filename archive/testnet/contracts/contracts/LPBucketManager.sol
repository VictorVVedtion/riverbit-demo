// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title LPBucketManager
 * @notice Manages the four-bucket LP architecture with hard-capped losses
 * @dev Implements A/B/L1/L2 bucket system with automated rebalancing and risk management
 * 
 * Bucket Allocation:
 * - A Bucket (45%): Passive market making with low risk
 * - B Bucket (20%): Active rebalancing with medium risk  
 * - L1 Bucket (25%): Primary liquidation with high risk
 * - L2 Bucket (10%): Emergency backstop with very high risk
 * 
 * Key Features:
 * - Hard-capped loss limits per bucket
 * - Automated rebalancing based on performance
 * - Insurance fund integration for loss coverage
 * - Performance-based fee distribution
 * - Emergency isolation mechanisms
 */
contract LPBucketManager is 
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant BUCKET_MANAGER_ROLE = keccak256("BUCKET_MANAGER_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant REBALANCE_THRESHOLD = 500; // 5% deviation
    uint256 private constant MIN_REBALANCE_INTERVAL = 4 hours;
    uint256 private constant HARD_CAP_BUFFER = 100; // 1% buffer before hard cap

    // ============ ENUMS ============

    enum BucketType {
        A_PASSIVE_MAKER,      // 45% allocation, 5% hard cap
        B_ACTIVE_REBALANCER,  // 20% allocation, 8% hard cap
        L1_PRIMARY_LIQUIDATOR, // 25% allocation, 12% hard cap
        L2_BACKSTOP           // 10% allocation, 20% hard cap
    }

    enum BucketStatus {
        ACTIVE,
        PAUSED,
        EMERGENCY_STOPPED,
        LIQUIDATING
    }

    // ============ STRUCTS ============

    // LP Bucket configuration and state
    struct LPBucket {
        BucketType bucketType;
        BucketStatus status;
        
        // Allocation and weights
        uint256 allocation;         // Current USD allocation
        uint256 targetWeight;       // Target weight in basis points
        uint256 currentWeight;      // Current weight in basis points
        
        // Risk management
        uint256 hardCapLoss;        // Hard cap loss percentage (basis points)
        uint256 currentLoss;        // Current loss from peak
        uint256 peakValue;          // Historical peak value
        bool hardCapTriggered;      // Whether hard cap was triggered
        
        // Performance tracking
        int256 totalPnL;            // Total P&L since inception
        int256 dailyPnL;            // Daily P&L
        uint256 totalFees;          // Total fees generated
        uint256 trades;             // Number of trades executed
        
        // Management
        address manager;            // Bucket manager address
        uint256 managementFee;      // Management fee (basis points)
        uint256 performanceFee;     // Performance fee (basis points)
        uint256 lastRebalanceTime;  // Last rebalance timestamp
        uint256 lastPnLUpdate;      // Last P&L update timestamp
        
        // Insurance and coverage
        uint256 insuranceCoverage;  // Insurance coverage percentage
        uint256 insuranceClaimed;   // Total insurance claimed
        uint256 emergencyWithdrawals; // Emergency withdrawals made
    }

    // Rebalancing parameters
    struct RebalanceConfig {
        uint256 maxWeightDeviation;    // Maximum allowed weight deviation
        uint256 rebalanceInterval;     // Minimum time between rebalances
        uint256 minRebalanceAmount;    // Minimum amount to trigger rebalance
        bool autoRebalanceEnabled;     // Whether auto-rebalancing is enabled
        uint256 slippageTolerance;     // Maximum slippage for rebalancing
        uint256 emergencyThreshold;    // Emergency stop threshold
    }

    // Performance metrics
    struct PerformanceMetrics {
        uint256 sharpeRatio;           // Risk-adjusted return
        uint256 maxDrawdown;           // Maximum drawdown percentage
        uint256 volatility;            // Volatility measure
        uint256 winRate;               // Percentage of profitable periods
        uint256 averageWin;            // Average winning amount
        uint256 averageLoss;           // Average losing amount
        uint256 lastUpdated;           // Last metrics update time
    }

    // Insurance claim structure
    struct InsuranceClaim {
        bytes32 claimId;
        BucketType bucketType;
        uint256 lossAmount;
        uint256 claimAmount;
        uint256 timestamp;
        bool approved;
        bool executed;
        string reason;
    }

    // ============ STATE VARIABLES ============

    IERC20 public baseAsset;
    address public coreContract;
    address public insuranceFund;
    address public revenueDistribution;

    // Bucket management
    mapping(BucketType => LPBucket) public buckets;
    BucketType[] public bucketTypes;
    uint256 public totalManagedAssets;
    
    // Configuration
    RebalanceConfig public rebalanceConfig;
    mapping(BucketType => PerformanceMetrics) public performanceMetrics;
    
    // Rebalancing state
    uint256 public lastGlobalRebalance;
    bool public rebalancingInProgress;
    mapping(BucketType => uint256) public targetAllocations;
    
    // Insurance and claims
    mapping(bytes32 => InsuranceClaim) public insuranceClaims;
    bytes32[] public allClaims;
    mapping(BucketType => uint256) public totalInsuranceClaimed;
    
    // Emergency controls
    bool public globalEmergencyMode;
    mapping(BucketType => bool) public bucketEmergencyStop;
    uint256 public emergencyStopCount;
    
    // Revenue tracking
    mapping(BucketType => uint256) public bucketRevenue;
    mapping(address => uint256) public managerRevenue;
    uint256 public totalRevenueGenerated;
    
    // Historical data
    mapping(BucketType => uint256[]) public allocationHistory;
    mapping(BucketType => int256[]) public pnlHistory;
    mapping(uint256 => uint256) public dailySnapshots; // timestamp => total value

    // ============ EVENTS ============

    event BucketInitialized(
        BucketType indexed bucketType,
        uint256 targetWeight,
        uint256 hardCapLoss,
        address manager
    );

    event RebalanceExecuted(
        uint256 timestamp,
        uint256 totalAssets,
        BucketType[] rebalancedBuckets,
        uint256[] oldAllocations,
        uint256[] newAllocations
    );

    event HardCapTriggered(
        BucketType indexed bucketType,
        uint256 currentLoss,
        uint256 hardCap,
        uint256 timestamp
    );

    event InsuranceClaimFiled(
        bytes32 indexed claimId,
        BucketType indexed bucketType,
        uint256 lossAmount,
        uint256 claimAmount
    );

    event InsuranceClaimExecuted(
        bytes32 indexed claimId,
        BucketType indexed bucketType,
        uint256 compensationAmount
    );

    event BucketEmergencyStop(
        BucketType indexed bucketType,
        string reason,
        address executor
    );

    event ManagerUpdated(
        BucketType indexed bucketType,
        address oldManager,
        address newManager
    );

    event PerformanceFeePaid(
        BucketType indexed bucketType,
        address manager,
        uint256 feeAmount,
        uint256 performancePeriod
    );

    // ============ MODIFIERS ============

    modifier onlyBucketManager(BucketType bucketType) {
        require(
            buckets[bucketType].manager == msg.sender || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not bucket manager"
        );
        _;
    }

    modifier notGlobalEmergency() {
        require(!globalEmergencyMode, "Global emergency mode active");
        _;
    }

    modifier bucketActive(BucketType bucketType) {
        require(
            buckets[bucketType].status == BucketStatus.ACTIVE,
            "Bucket not active"
        );
        _;
    }

    modifier notRebalancing() {
        require(!rebalancingInProgress, "Rebalancing in progress");
        _;
    }

    // ============ INITIALIZATION ============

    /**
     * @notice Initialize the LP Bucket Manager
     * @param _baseAsset Base asset token (USDC)
     * @param _coreContract Core contract address
     * @param _admin Admin address
     */
    function initialize(
        address _baseAsset,
        address _coreContract,
        address _admin
    ) external initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();

        require(_baseAsset != address(0), "Invalid base asset");
        require(_coreContract != address(0), "Invalid core contract");
        require(_admin != address(0), "Invalid admin");

        baseAsset = IERC20(_baseAsset);
        coreContract = _coreContract;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(BUCKET_MANAGER_ROLE, _admin);
        _grantRole(REBALANCER_ROLE, _admin);

        // Initialize bucket types array
        bucketTypes = [
            BucketType.A_PASSIVE_MAKER,
            BucketType.B_ACTIVE_REBALANCER,
            BucketType.L1_PRIMARY_LIQUIDATOR,
            BucketType.L2_BACKSTOP
        ];

        // Initialize buckets with default configurations
        _initializeBuckets();
        
        // Initialize rebalance configuration
        rebalanceConfig = RebalanceConfig({
            maxWeightDeviation: REBALANCE_THRESHOLD,
            rebalanceInterval: MIN_REBALANCE_INTERVAL,
            minRebalanceAmount: 10000 * PRECISION, // $10k minimum
            autoRebalanceEnabled: true,
            slippageTolerance: 100, // 1%
            emergencyThreshold: 2000 // 20% loss triggers emergency
        });

        lastGlobalRebalance = block.timestamp;
    }

    // ============ BUCKET INITIALIZATION ============

    /**
     * @notice Initialize all buckets with default configurations
     */
    function _initializeBuckets() internal {
        // A Bucket: Passive Market Maker (45%, 5% hard cap)
        buckets[BucketType.A_PASSIVE_MAKER] = LPBucket({
            bucketType: BucketType.A_PASSIVE_MAKER,
            status: BucketStatus.ACTIVE,
            allocation: 0,
            targetWeight: 4500, // 45%
            currentWeight: 0,
            hardCapLoss: 500,   // 5%
            currentLoss: 0,
            peakValue: 0,
            hardCapTriggered: false,
            totalPnL: 0,
            dailyPnL: 0,
            totalFees: 0,
            trades: 0,
            manager: address(0),
            managementFee: 200,  // 2%
            performanceFee: 1000, // 10%
            lastRebalanceTime: block.timestamp,
            lastPnLUpdate: block.timestamp,
            insuranceCoverage: 8000, // 80%
            insuranceClaimed: 0,
            emergencyWithdrawals: 0
        });

        // B Bucket: Active Rebalancer (20%, 8% hard cap)
        buckets[BucketType.B_ACTIVE_REBALANCER] = LPBucket({
            bucketType: BucketType.B_ACTIVE_REBALANCER,
            status: BucketStatus.ACTIVE,
            allocation: 0,
            targetWeight: 2000, // 20%
            currentWeight: 0,
            hardCapLoss: 800,   // 8%
            currentLoss: 0,
            peakValue: 0,
            hardCapTriggered: false,
            totalPnL: 0,
            dailyPnL: 0,
            totalFees: 0,
            trades: 0,
            manager: address(0),
            managementFee: 250,  // 2.5%
            performanceFee: 1500, // 15%
            lastRebalanceTime: block.timestamp,
            lastPnLUpdate: block.timestamp,
            insuranceCoverage: 7000, // 70%
            insuranceClaimed: 0,
            emergencyWithdrawals: 0
        });

        // L1 Bucket: Primary Liquidator (25%, 12% hard cap)
        buckets[BucketType.L1_PRIMARY_LIQUIDATOR] = LPBucket({
            bucketType: BucketType.L1_PRIMARY_LIQUIDATOR,
            status: BucketStatus.ACTIVE,
            allocation: 0,
            targetWeight: 2500, // 25%
            currentWeight: 0,
            hardCapLoss: 1200,  // 12%
            currentLoss: 0,
            peakValue: 0,
            hardCapTriggered: false,
            totalPnL: 0,
            dailyPnL: 0,
            totalFees: 0,
            trades: 0,
            manager: address(0),
            managementFee: 300,  // 3%
            performanceFee: 2000, // 20%
            lastRebalanceTime: block.timestamp,
            lastPnLUpdate: block.timestamp,
            insuranceCoverage: 6000, // 60%
            insuranceClaimed: 0,
            emergencyWithdrawals: 0
        });

        // L2 Bucket: Emergency Backstop (10%, 20% hard cap)
        buckets[BucketType.L2_BACKSTOP] = LPBucket({
            bucketType: BucketType.L2_BACKSTOP,
            status: BucketStatus.ACTIVE,
            allocation: 0,
            targetWeight: 1000, // 10%
            currentWeight: 0,
            hardCapLoss: 2000,  // 20%
            currentLoss: 0,
            peakValue: 0,
            hardCapTriggered: false,
            totalPnL: 0,
            dailyPnL: 0,
            totalFees: 0,
            trades: 0,
            manager: address(0),
            managementFee: 400,  // 4%
            performanceFee: 2500, // 25%
            lastRebalanceTime: block.timestamp,
            lastPnLUpdate: block.timestamp,
            insuranceCoverage: 5000, // 50%
            insuranceClaimed: 0,
            emergencyWithdrawals: 0
        });

        // Emit initialization events
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            LPBucket storage bucket = buckets[bucketType];
            
            emit BucketInitialized(
                bucketType,
                bucket.targetWeight,
                bucket.hardCapLoss,
                bucket.manager
            );
        }
    }

    // ============ REBALANCING ============

    /**
     * @notice Execute global rebalancing across all buckets
     * @return success Whether rebalancing was successful
     */
    function executeGlobalRebalance() 
        external 
        onlyRole(REBALANCER_ROLE) 
        nonReentrant 
        notGlobalEmergency 
        notRebalancing 
        returns (bool success) 
    {
        require(_shouldRebalance(), "Rebalancing not needed");
        
        rebalancingInProgress = true;
        
        // Calculate target allocations
        _calculateTargetAllocations();
        
        // Store old allocations for events
        BucketType[] memory rebalancedBuckets = new BucketType[](bucketTypes.length);
        uint256[] memory oldAllocations = new uint256[](bucketTypes.length);
        uint256[] memory newAllocations = new uint256[](bucketTypes.length);
        
        uint256 rebalancedCount = 0;
        
        // Execute rebalancing for each bucket
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            LPBucket storage bucket = buckets[bucketType];
            
            if (bucket.status != BucketStatus.ACTIVE) continue;
            if (bucketEmergencyStop[bucketType]) continue;
            
            uint256 targetAllocation = targetAllocations[bucketType];
            uint256 currentAllocation = bucket.allocation;
            
            // Check if rebalancing is needed for this bucket
            uint256 deviation = currentAllocation > targetAllocation ?
                currentAllocation - targetAllocation :
                targetAllocation - currentAllocation;
                
            if (deviation >= rebalanceConfig.minRebalanceAmount) {
                oldAllocations[rebalancedCount] = currentAllocation;
                
                // Execute the rebalancing
                if (_executeBucketRebalance(bucketType, targetAllocation)) {
                    rebalancedBuckets[rebalancedCount] = bucketType;
                    newAllocations[rebalancedCount] = targetAllocation;
                    rebalancedCount++;
                }
            }
        }
        
        // Update global state
        lastGlobalRebalance = block.timestamp;
        rebalancingInProgress = false;
        
        // Record daily snapshot
        dailySnapshots[_getDayTimestamp()] = totalManagedAssets;
        
        // Emit rebalancing event
        if (rebalancedCount > 0) {
            // Resize arrays to actual size
            BucketType[] memory finalBuckets = new BucketType[](rebalancedCount);
            uint256[] memory finalOldAllocations = new uint256[](rebalancedCount);
            uint256[] memory finalNewAllocations = new uint256[](rebalancedCount);
            
            for (uint256 i = 0; i < rebalancedCount; i++) {
                finalBuckets[i] = rebalancedBuckets[i];
                finalOldAllocations[i] = oldAllocations[i];
                finalNewAllocations[i] = newAllocations[i];
            }
            
            emit RebalanceExecuted(
                block.timestamp,
                totalManagedAssets,
                finalBuckets,
                finalOldAllocations,
                finalNewAllocations
            );
        }
        
        return true;
    }

    /**
     * @notice Execute rebalancing for a specific bucket
     * @param bucketType Bucket to rebalance
     * @param targetAllocation Target allocation amount
     * @return success Whether rebalancing was successful
     */
    function _executeBucketRebalance(
        BucketType bucketType,
        uint256 targetAllocation
    ) internal returns (bool success) {
        LPBucket storage bucket = buckets[bucketType];
        
        // Check hard cap constraints
        if (bucket.hardCapTriggered) {
            return false;
        }
        
        uint256 oldAllocation = bucket.allocation;
        
        // Update bucket allocation
        bucket.allocation = targetAllocation;
        bucket.currentWeight = totalManagedAssets > 0 ?
            (targetAllocation * BASIS_POINTS) / totalManagedAssets : 0;
        bucket.lastRebalanceTime = block.timestamp;
        
        // Update allocation history
        allocationHistory[bucketType].push(targetAllocation);
        
        // Check if we need to trigger hard cap monitoring
        _checkHardCapConstraints(bucketType);
        
        return true;
    }

    // ============ HARD CAP MANAGEMENT ============

    /**
     * @notice Check and enforce hard cap constraints for a bucket
     * @param bucketType Bucket to check
     */
    function _checkHardCapConstraints(BucketType bucketType) internal {
        LPBucket storage bucket = buckets[bucketType];
        
        // Update peak value if current allocation is higher
        if (bucket.allocation > bucket.peakValue) {
            bucket.peakValue = bucket.allocation;
            bucket.currentLoss = 0; // Reset loss tracking
            return;
        }
        
        // Calculate current loss from peak
        if (bucket.peakValue > 0) {
            uint256 currentValue = bucket.allocation;
            uint256 lossAmount = bucket.peakValue - currentValue;
            uint256 lossPercentage = (lossAmount * BASIS_POINTS) / bucket.peakValue;
            
            bucket.currentLoss = lossPercentage;
            
            // Check if hard cap is triggered
            if (lossPercentage >= bucket.hardCapLoss - HARD_CAP_BUFFER) {
                _triggerHardCap(bucketType, lossPercentage);
            }
        }
    }

    /**
     * @notice Trigger hard cap protection for a bucket
     * @param bucketType Bucket that triggered hard cap
     * @param currentLoss Current loss percentage
     */
    function _triggerHardCap(BucketType bucketType, uint256 currentLoss) internal {
        LPBucket storage bucket = buckets[bucketType];
        
        if (bucket.hardCapTriggered) return; // Already triggered
        
        bucket.hardCapTriggered = true;
        bucket.status = BucketStatus.EMERGENCY_STOPPED;
        bucketEmergencyStop[bucketType] = true;
        emergencyStopCount++;
        
        // File insurance claim automatically
        _fileInsuranceClaim(bucketType, currentLoss);
        
        emit HardCapTriggered(bucketType, currentLoss, bucket.hardCapLoss, block.timestamp);
        emit BucketEmergencyStop(bucketType, "Hard cap triggered", address(this));
    }

    // ============ INSURANCE INTEGRATION ============

    /**
     * @notice File insurance claim for bucket losses
     * @param bucketType Bucket that incurred losses
     * @param lossPercentage Loss percentage in basis points
     * @return claimId Generated claim ID
     */
    function _fileInsuranceClaim(
        BucketType bucketType,
        uint256 lossPercentage
    ) internal returns (bytes32 claimId) {
        LPBucket storage bucket = buckets[bucketType];
        
        uint256 lossAmount = (bucket.peakValue * lossPercentage) / BASIS_POINTS;
        uint256 claimAmount = (lossAmount * bucket.insuranceCoverage) / BASIS_POINTS;
        
        claimId = keccak256(abi.encodePacked(
            bucketType,
            lossAmount,
            block.timestamp,
            block.number
        ));
        
        insuranceClaims[claimId] = InsuranceClaim({
            claimId: claimId,
            bucketType: bucketType,
            lossAmount: lossAmount,
            claimAmount: claimAmount,
            timestamp: block.timestamp,
            approved: false,
            executed: false,
            reason: "Hard cap loss triggered"
        });
        
        allClaims.push(claimId);
        
        emit InsuranceClaimFiled(claimId, bucketType, lossAmount, claimAmount);
        
        return claimId;
    }

    /**
     * @notice Execute approved insurance claim
     * @param claimId Claim ID to execute
     * @return success Whether execution was successful
     */
    function executeInsuranceClaim(bytes32 claimId) 
        external 
        onlyRole(ADMIN_ROLE) 
        returns (bool success) 
    {
        InsuranceClaim storage claim = insuranceClaims[claimId];
        
        require(claim.claimId != bytes32(0), "Claim not found");
        require(claim.approved, "Claim not approved");
        require(!claim.executed, "Claim already executed");
        require(insuranceFund != address(0), "Insurance fund not set");
        
        // Mark as executed
        claim.executed = true;
        
        // Update bucket state
        LPBucket storage bucket = buckets[claim.bucketType];
        bucket.insuranceClaimed += claim.claimAmount;
        bucket.allocation += claim.claimAmount; // Add compensation to bucket
        totalInsuranceClaimed[claim.bucketType] += claim.claimAmount;
        
        // Request funds from insurance fund (would call insurance contract)
        // For now, we'll emit an event to indicate the claim execution
        
        emit InsuranceClaimExecuted(claimId, claim.bucketType, claim.claimAmount);
        
        return true;
    }

    // ============ PERFORMANCE TRACKING ============

    /**
     * @notice Update bucket P&L and performance metrics
     * @param bucketType Bucket to update
     * @param pnlChange P&L change amount (can be negative)
     * @param fees Fees generated
     * @param tradeCount Number of trades executed
     */
    function updateBucketPerformance(
        BucketType bucketType,
        int256 pnlChange,
        uint256 fees,
        uint256 tradeCount
    ) external onlyBucketManager(bucketType) {
        LPBucket storage bucket = buckets[bucketType];
        
        // Update P&L
        bucket.totalPnL += pnlChange;
        bucket.dailyPnL += pnlChange;
        bucket.totalFees += fees;
        bucket.trades += tradeCount;
        bucket.lastPnLUpdate = block.timestamp;
        
        // Update allocation based on P&L
        if (pnlChange != 0) {
            uint256 newAllocation = bucket.allocation;
            if (pnlChange > 0) {
                newAllocation += uint256(pnlChange);
            } else {
                uint256 loss = uint256(-pnlChange);
                if (loss <= newAllocation) {
                    newAllocation -= loss;
                } else {
                    newAllocation = 0; // Bucket wiped out
                }
            }
            bucket.allocation = newAllocation;
        }
        
        // Add to P&L history
        pnlHistory[bucketType].push(pnlChange);
        
        // Update total managed assets
        _updateTotalManagedAssets();
        
        // Check hard cap constraints after P&L update
        _checkHardCapConstraints(bucketType);
        
        // Update performance metrics periodically
        if (block.timestamp >= bucket.lastPnLUpdate + 1 days) {
            _updatePerformanceMetrics(bucketType);
        }
    }

    /**
     * @notice Update performance metrics for a bucket
     * @param bucketType Bucket to update metrics for
     */
    function _updatePerformanceMetrics(BucketType bucketType) internal {
        // This would calculate various performance metrics
        // Simplified implementation for demonstration
        PerformanceMetrics storage metrics = performanceMetrics[bucketType];
        LPBucket storage bucket = buckets[bucketType];
        
        // Calculate simple metrics based on P&L history
        int256[] memory pnlData = pnlHistory[bucketType];
        if (pnlData.length >= 30) { // Need at least 30 data points
            
            // Calculate volatility (simplified)
            uint256 positiveCount = 0;
            int256 totalReturn = 0;
            
            for (uint256 i = 0; i < pnlData.length; i++) {
                totalReturn += pnlData[i];
                if (pnlData[i] > 0) positiveCount++;
            }
            
            metrics.winRate = (positiveCount * BASIS_POINTS) / pnlData.length;
            metrics.lastUpdated = block.timestamp;
            
            // Additional metrics would be calculated here in production
        }
    }

    // ============ REVENUE DISTRIBUTION ============

    /**
     * @notice Distribute management and performance fees
     * @param bucketType Bucket to distribute fees for
     */
    function distributeBucketFees(BucketType bucketType) 
        external 
        onlyRole(OPERATOR_ROLE) 
        bucketActive(bucketType) 
    {
        LPBucket storage bucket = buckets[bucketType];
        
        require(bucket.manager != address(0), "No bucket manager");
        require(bucket.totalFees > 0, "No fees to distribute");
        
        uint256 managementFeeAmount = (bucket.allocation * bucket.managementFee) / (BASIS_POINTS * 365); // Daily rate
        uint256 performanceFeeAmount = 0;
        
        // Performance fee only on positive daily P&L
        if (bucket.dailyPnL > 0) {
            performanceFeeAmount = (uint256(bucket.dailyPnL) * bucket.performanceFee) / BASIS_POINTS;
        }
        
        uint256 totalFeeAmount = managementFeeAmount + performanceFeeAmount;
        
        if (totalFeeAmount > 0) {
            // Track revenue
            bucketRevenue[bucketType] += totalFeeAmount;
            managerRevenue[bucket.manager] += totalFeeAmount;
            totalRevenueGenerated += totalFeeAmount;
            
            // Reset daily P&L after fee calculation
            bucket.dailyPnL = 0;
            
            emit PerformanceFeePaid(
                bucketType,
                bucket.manager,
                totalFeeAmount,
                block.timestamp
            );
        }
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Check if global rebalancing is needed
     * @return needed Whether rebalancing is needed
     */
    function _shouldRebalance() internal view returns (bool needed) {
        // Check time interval
        if (block.timestamp < lastGlobalRebalance + rebalanceConfig.rebalanceInterval) {
            return false;
        }
        
        // Check if auto-rebalancing is enabled
        if (!rebalanceConfig.autoRebalanceEnabled) {
            return false;
        }
        
        // Check weight deviations
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            LPBucket storage bucket = buckets[bucketType];
            
            if (bucket.status != BucketStatus.ACTIVE) continue;
            
            uint256 currentWeight = totalManagedAssets > 0 ?
                (bucket.allocation * BASIS_POINTS) / totalManagedAssets : 0;
            
            uint256 deviation = currentWeight > bucket.targetWeight ?
                currentWeight - bucket.targetWeight :
                bucket.targetWeight - currentWeight;
                
            if (deviation >= rebalanceConfig.maxWeightDeviation) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * @notice Calculate target allocations for all buckets
     */
    function _calculateTargetAllocations() internal {
        uint256 totalWeight = 0;
        uint256 availableAssets = totalManagedAssets;
        
        // First pass: calculate total available weight (excluding stopped buckets)
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            LPBucket storage bucket = buckets[bucketType];
            
            if (bucket.status == BucketStatus.ACTIVE && !bucketEmergencyStop[bucketType]) {
                totalWeight += bucket.targetWeight;
            }
        }
        
        // Second pass: calculate target allocations
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            BucketType bucketType = bucketTypes[i];
            LPBucket storage bucket = buckets[bucketType];
            
            if (bucket.status == BucketStatus.ACTIVE && !bucketEmergencyStop[bucketType]) {
                targetAllocations[bucketType] = (availableAssets * bucket.targetWeight) / totalWeight;
            } else {
                targetAllocations[bucketType] = 0; // No allocation for inactive buckets
            }
        }
    }

    /**
     * @notice Update total managed assets across all buckets
     */
    function _updateTotalManagedAssets() internal {
        uint256 total = 0;
        
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            total += buckets[bucketTypes[i]].allocation;
        }
        
        totalManagedAssets = total;
    }

    /**
     * @notice Get day timestamp for daily snapshots
     * @return dayTimestamp Timestamp rounded to day
     */
    function _getDayTimestamp() internal view returns (uint256 dayTimestamp) {
        return (block.timestamp / 1 days) * 1 days;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Set bucket manager
     * @param bucketType Bucket type
     * @param manager New manager address
     */
    function setBucketManager(BucketType bucketType, address manager) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(manager != address(0), "Invalid manager");
        
        address oldManager = buckets[bucketType].manager;
        buckets[bucketType].manager = manager;
        
        // Grant bucket manager role
        _grantRole(BUCKET_MANAGER_ROLE, manager);
        
        emit ManagerUpdated(bucketType, oldManager, manager);
    }

    /**
     * @notice Update bucket target weight
     * @param bucketType Bucket type
     * @param newWeight New target weight in basis points
     */
    function updateBucketWeight(BucketType bucketType, uint256 newWeight) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(newWeight <= BASIS_POINTS, "Weight exceeds 100%");
        
        buckets[bucketType].targetWeight = newWeight;
        
        // Verify total weights don't exceed 100%
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            totalWeight += buckets[bucketTypes[i]].targetWeight;
        }
        require(totalWeight <= BASIS_POINTS, "Total weights exceed 100%");
    }

    /**
     * @notice Emergency stop a bucket
     * @param bucketType Bucket to stop
     * @param reason Reason for emergency stop
     */
    function emergencyStopBucket(BucketType bucketType, string calldata reason) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        buckets[bucketType].status = BucketStatus.EMERGENCY_STOPPED;
        bucketEmergencyStop[bucketType] = true;
        emergencyStopCount++;
        
        emit BucketEmergencyStop(bucketType, reason, msg.sender);
    }

    /**
     * @notice Resume bucket operations
     * @param bucketType Bucket to resume
     */
    function resumeBucket(BucketType bucketType) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(bucketEmergencyStop[bucketType], "Bucket not stopped");
        
        buckets[bucketType].status = BucketStatus.ACTIVE;
        buckets[bucketType].hardCapTriggered = false; // Reset hard cap
        bucketEmergencyStop[bucketType] = false;
        emergencyStopCount--;
    }

    /**
     * @notice Set insurance fund address
     * @param _insuranceFund Insurance fund contract address
     */
    function setInsuranceFund(address _insuranceFund) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        insuranceFund = _insuranceFund;
    }

    /**
     * @notice Approve insurance claim
     * @param claimId Claim ID to approve
     */
    function approveInsuranceClaim(bytes32 claimId) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(insuranceClaims[claimId].claimId != bytes32(0), "Claim not found");
        require(!insuranceClaims[claimId].executed, "Claim already executed");
        
        insuranceClaims[claimId].approved = true;
    }

    /**
     * @notice Toggle global emergency mode
     * @param enabled Whether to enable emergency mode
     */
    function setGlobalEmergencyMode(bool enabled) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        globalEmergencyMode = enabled;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get bucket information
     * @param bucketType Bucket type
     * @return bucket Bucket information
     */
    function getBucket(BucketType bucketType) 
        external 
        view 
        returns (LPBucket memory bucket) 
    {
        return buckets[bucketType];
    }

    /**
     * @notice Get all bucket allocations
     * @return allocations Array of current allocations
     */
    function getAllAllocations() 
        external 
        view 
        returns (uint256[] memory allocations) 
    {
        allocations = new uint256[](bucketTypes.length);
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            allocations[i] = buckets[bucketTypes[i]].allocation;
        }
    }

    /**
     * @notice Get bucket performance metrics
     * @param bucketType Bucket type
     * @return metrics Performance metrics
     */
    function getBucketMetrics(BucketType bucketType) 
        external 
        view 
        returns (PerformanceMetrics memory metrics) 
    {
        return performanceMetrics[bucketType];
    }

    /**
     * @notice Get insurance claim details
     * @param claimId Claim ID
     * @return claim Insurance claim details
     */
    function getInsuranceClaim(bytes32 claimId) 
        external 
        view 
        returns (InsuranceClaim memory claim) 
    {
        return insuranceClaims[claimId];
    }

    /**
     * @notice Check if rebalancing is needed
     * @return needed Whether rebalancing is needed
     */
    function shouldRebalance() external view returns (bool needed) {
        return _shouldRebalance();
    }

    /**
     * @notice Get current target allocations
     * @return targets Array of target allocations
     */
    function getTargetAllocations() external view returns (uint256[] memory targets) {
        targets = new uint256[](bucketTypes.length);
        for (uint256 i = 0; i < bucketTypes.length; i++) {
            targets[i] = targetAllocations[bucketTypes[i]];
        }
    }

    /**
     * @notice Get bucket revenue statistics
     * @param bucketType Bucket type
     * @return totalRevenue Total revenue generated
     * @return managerRevenue_ Revenue earned by manager
     * @return insuranceClaimed Total insurance claimed
     */
    function getBucketRevenue(BucketType bucketType) 
        external 
        view 
        returns (uint256 totalRevenue, uint256 managerRevenue_, uint256 insuranceClaimed) 
    {
        totalRevenue = bucketRevenue[bucketType];
        managerRevenue_ = managerRevenue[buckets[bucketType].manager];
        insuranceClaimed = totalInsuranceClaimed[bucketType];
    }
}