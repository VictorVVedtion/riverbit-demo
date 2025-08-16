// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/ILPBucketManager.sol";
import "../interfaces/IRevenueDistribution.sol";
import "../interfaces/IInsuranceFund.sol";

/**
 * @title Events
 * @dev Centralized event definitions for RiverPool system contracts
 * @notice Comprehensive event library for consistent logging across all contracts
 */
library Events {
    
    // ============ RiverPool Events ============
    
    event PoolInitialized(
        address indexed baseAsset,
        string name,
        string symbol,
        uint256 initialNAV,
        address indexed admin
    );
    
    event Deposit(
        address indexed user,
        uint256 amount,
        uint256 shares,
        uint256 nav,
        uint256 timestamp
    );
    
    event Withdraw(
        address indexed user,
        uint256 shares,
        uint256 amount,
        uint256 fee,
        uint256 nav,
        uint256 timestamp
    );
    
    event EmergencyWithdraw(
        address indexed user,
        uint256 shares,
        uint256 amount,
        uint256 penalty,
        uint8 safeModeLevel,
        uint256 timestamp
    );
    
    event NAVUpdated(
        uint256 indexed oldNav,
        uint256 indexed newNav,
        address indexed updater,
        uint256 timestamp,
        string reason
    );
    
    event RebalanceExecuted(
        uint256 indexed timestamp,
        uint256 totalTVL,
        uint256 newNav,
        address indexed executor
    );
    
    event LimitModeToggled(
        bool indexed isLimited,
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    event SafeModeToggled(
        bool indexed enabled,
        uint8 indexed level,
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    event RedemptionFeeUpdated(
        uint256 indexed oldRate,
        uint256 indexed newRate,
        uint256 dailyRedemptionAmount,
        uint256 timestamp
    );
    
    event InsuranceCompensation(
        uint256 indexed amount,
        address indexed recipient,
        string reason,
        uint256 timestamp
    );
    
    event DailyRedemptionReset(
        uint256 previousAmount,
        uint256 timestamp
    );
    
    event MinimumAmountsUpdated(
        uint256 oldMinDeposit,
        uint256 newMinDeposit,
        uint256 oldMinWithdraw,
        uint256 newMinWithdraw
    );
    
    // ============ LP Bucket Manager Events ============
    
    event BucketInitialized(
        ILPBucketManager.BucketType indexed bucketType,
        address indexed manager,
        uint256 targetWeight,
        uint256 timestamp
    );
    
    event BucketRebalanced(
        ILPBucketManager.BucketType indexed bucketType,
        uint256 oldAllocation,
        uint256 newAllocation,
        uint256 timestamp
    );
    
    event WeightAdjusted(
        ILPBucketManager.BucketType indexed bucketType,
        uint256 oldWeight,
        uint256 newWeight,
        address indexed admin,
        uint256 timestamp
    );
    
    event ManagerUpdated(
        ILPBucketManager.BucketType indexed bucketType,
        address indexed oldManager,
        address indexed newManager,
        uint256 timestamp
    );
    
    event RebalanceCompleted(
        uint256 indexed timestamp,
        uint256 totalAssets,
        uint256 totalRebalanced,
        address indexed executor
    );
    
    event AutoRebalanceToggled(
        bool indexed enabled,
        address indexed admin,
        uint256 timestamp
    );
    
    event LossProtectionTriggered(
        ILPBucketManager.BucketType indexed bucketType,
        uint256 lossAmount,
        uint256 compensationAmount,
        uint256 timestamp
    );
    
    event RiskMetricsUpdated(
        uint256 volatility,
        uint256 maxDrawdown,
        uint256 sharpeRatio,
        uint256 timestamp
    );
    
    event EmergencyStop(
        ILPBucketManager.BucketType indexed bucketType,
        address indexed executor,
        string reason,
        uint256 timestamp
    );
    
    event BucketPerformanceUpdated(
        ILPBucketManager.BucketType indexed bucketType,
        uint256 totalReturn,
        uint256 volatility,
        uint256 maxDrawdown,
        uint256 timestamp
    );
    
    // ============ Revenue Distribution Events ============
    
    event RevenueReceived(
        IRevenueDistribution.RevenueSource indexed source,
        uint256 indexed amount,
        address indexed contributor,
        string description,
        uint256 timestamp
    );
    
    event RevenueDistributed(
        uint256 indexed snapshotId,
        uint256 totalAmount,
        uint256 distributedAmount,
        uint256 timestamp
    );
    
    event BucketRevenueAllocated(
        ILPBucketManager.BucketType indexed bucketType,
        uint256 amount,
        uint256 percentage,
        uint256 snapshotId,
        uint256 timestamp
    );
    
    event UserRevenueClaimed(
        address indexed user,
        uint256 amount,
        IRevenueDistribution.RevenueSource indexed source,
        uint256 timestamp
    );
    
    event DistributionRuleUpdated(
        ILPBucketManager.BucketType indexed bucketType,
        uint256 oldPercentage,
        uint256 newPercentage,
        uint256 minAmount,
        uint256 timestamp
    );
    
    event RevenueSourceToggled(
        IRevenueDistribution.RevenueSource indexed source,
        bool enabled,
        address indexed admin,
        uint256 timestamp
    );
    
    event EmergencyWithdrawal(
        address indexed recipient,
        uint256 amount,
        string reason,
        address indexed executor,
        uint256 timestamp
    );
    
    event PerformanceMetricsUpdated(
        uint256 totalFeesGenerated,
        uint256 averageDailyRevenue,
        uint256 peakDailyRevenue,
        uint256 revenueGrowthRate,
        uint256 timestamp
    );
    
    event BatchClaimExecuted(
        address[] users,
        uint256 totalClaimed,
        address indexed executor,
        uint256 timestamp
    );
    
    // ============ Insurance Fund Events ============
    
    event FundsDeposited(
        address indexed contributor,
        uint256 amount,
        string source,
        uint256 totalFund,
        uint256 timestamp
    );
    
    event CompensationRequested(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        IInsuranceFund.TriggerType indexed triggerType,
        string reason,
        address indexed requester,
        uint256 timestamp
    );
    
    event CompensationApproved(
        uint256 indexed requestId,
        address indexed approver,
        uint256 timestamp
    );
    
    event CompensationExecuted(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        IInsuranceFund.TriggerType triggerType,
        uint256 timestamp
    );
    
    event SafeModeActivated(
        IInsuranceFund.SafeModeLevel indexed level,
        string reason,
        uint256 fundUtilization,
        uint256 timestamp
    );
    
    event SafeModeDeactivated(
        IInsuranceFund.SafeModeLevel indexed previousLevel,
        address indexed admin,
        uint256 timestamp
    );
    
    event ProtectionLimitTriggered(
        IInsuranceFund.TriggerType indexed triggerType,
        uint256 amount,
        uint256 limit,
        uint256 used,
        uint256 timestamp
    );
    
    event FundThresholdReached(
        uint256 currentBalance,
        uint256 threshold,
        IInsuranceFund.SafeModeLevel newLevel,
        uint256 timestamp
    );
    
    event EmergencyAction(
        string action,
        address indexed executor,
        string reason,
        uint256 timestamp
    );
    
    event LimitsReset(
        IInsuranceFund.TriggerType indexed triggerType,
        address indexed executor,
        string reason,
        uint256 timestamp
    );
    
    event TVLUpdated(
        uint256 oldTVL,
        uint256 newTVL,
        address indexed updater,
        uint256 timestamp
    );
    
    event FundAllocationUpdated(
        uint256 totalFund,
        uint256 availableFund,
        uint256 reservedFund,
        uint256 reservedPercentage,
        uint256 timestamp
    );
    
    // ============ System-wide Events ============
    
    event ContractUpgraded(
        address indexed oldImplementation,
        address indexed newImplementation,
        address indexed admin,
        uint256 timestamp
    );
    
    event SystemPaused(
        address indexed contract_,
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    event SystemUnpaused(
        address indexed contract_,
        address indexed admin,
        uint256 timestamp
    );
    
    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender,
        address indexed contract_,
        uint256 timestamp
    );
    
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender,
        address indexed contract_,
        uint256 timestamp
    );
    
    event ConfigurationUpdated(
        string parameter,
        uint256 oldValue,
        uint256 newValue,
        address indexed admin,
        uint256 timestamp
    );
    
    event DependencyUpdated(
        string dependencyName,
        address indexed oldAddress,
        address indexed newAddress,
        address indexed admin,
        uint256 timestamp
    );
    
    event MaintenanceModeToggled(
        bool enabled,
        address indexed admin,
        string reason,
        uint256 timestamp
    );
    
    // ============ Risk Management Events ============
    
    event RiskLimitBreached(
        string riskType,
        uint256 currentValue,
        uint256 limit,
        address indexed contract_,
        uint256 timestamp
    );
    
    event RiskParametersUpdated(
        string parameter,
        uint256 oldValue,
        uint256 newValue,
        address indexed admin,
        uint256 timestamp
    );
    
    event CircuitBreakerTriggered(
        string reason,
        address indexed contract_,
        uint256 timestamp
    );
    
    event CircuitBreakerReset(
        address indexed admin,
        uint256 timestamp
    );
    
    // ============ Oracle Events ============
    
    event OracleUpdated(
        address indexed oldOracle,
        address indexed newOracle,
        string oracleType,
        uint256 timestamp
    );
    
    event PriceUpdated(
        string asset,
        uint256 oldPrice,
        uint256 newPrice,
        address indexed oracle,
        uint256 timestamp
    );
    
    event OracleFailure(
        address indexed oracle,
        string reason,
        uint256 timestamp
    );
    
    // ============ Governance Events ============
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 timestamp
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor,
        uint256 timestamp
    );
    
    event VoteCasted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight,
        uint256 timestamp
    );
    
    // ============ Integration Events ============
    
    event ExternalCallExecuted(
        address indexed target,
        bytes4 indexed selector,
        bool success,
        address indexed executor,
        uint256 timestamp
    );
    
    event CrossChainMessage(
        uint256 indexed chainId,
        address indexed target,
        bytes data,
        uint256 timestamp
    );
    
    event BridgeOperation(
        address indexed user,
        uint256 amount,
        uint256 sourceChain,
        uint256 destinationChain,
        uint256 timestamp
    );
}