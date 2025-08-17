// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Errors
 * @dev Centralized error definitions for RiverPool system contracts
 * @notice Custom errors for gas-efficient error handling across all contracts
 */
library Errors {
    
    // ============ General Errors ============
    
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientBalance();
    error InsufficientAllowance();
    error TransferFailed();
    error Unauthorized();
    error Paused();
    error NotPaused();
    error Reentrancy();
    error InvalidInput();
    error ArrayLengthMismatch();
    error ZeroValue();
    error ExceedsMaxValue();
    error BelowMinValue();
    
    // ============ RiverPool Errors ============
    
    error PoolPaused();
    error SafeModeActive();
    error OperationLimited();
    error BelowMinimumDeposit();
    error BelowMinimumWithdraw();
    error InsufficientShares();
    error SlippageExceeded();
    error InvalidNAV();
    error DailyRedemptionLimitExceeded();
    error RedemptionFeeExceeded();
    error EmergencyWithdrawNotAllowed();
    error NAVUpdateTooFrequent();
    error InvalidSharesAmount();
    error PoolCapacityExceeded();
    
    // ============ LP Bucket Manager Errors ============
    
    error BucketNotFound();
    error BucketInactive();
    error BucketStopped();
    error InvalidBucketType();
    error InvalidTargetWeight();
    error WeightDeviationExceeded();
    error TotalWeightExceeds100Percent();
    error RebalanceIntervalNotMet();
    error RebalanceNotNeeded();
    error AutoRebalanceDisabled();
    error EmergencyModeActive();
    error BucketManagerNotSet();
    error InvalidRebalanceAmount();
    error LossProtectionNotActive();
    error MaxLossExceeded();
    error InsufficientBucketBalance();
    error BucketAllocationFailed();
    
    // ============ Revenue Distribution Errors ============
    
    error RevenueSourceDisabled();
    error RevenueSourceBlocked();
    error BelowMinimumDistribution();
    error NoRevenueToClaim();
    error ClaimAlreadyProcessed();
    error InvalidRevenueSource();
    error DistributionRuleNotFound();
    error DistributionPercentageExceeded();
    error RevenueCollectionFailed();
    error SnapshotNotFound();
    error SnapshotAlreadyProcessed();
    error UserNotFound();
    error NoEarningsFromSource();
    error BatchClaimFailed();
    error RevenueRecordingFailed();
    
    // ============ Insurance Fund Errors ============
    
    error CompensationPaused();
    error InvalidTriggerType();
    error RequestNotFound();
    error RequestAlreadyApproved();
    error RequestAlreadyExecuted();
    error RequestNotApproved();
    error CompensationLimitExceeded();
    error BEventLimitExceeded();
    error FifteenMinuteLimitExceeded();
    error DailyLimitExceeded();
    error InsufficientInsuranceFunds();
    error InvalidSafeModeLevel();
    error SafeModeAlreadyActive();
    error SafeModeNotActive();
    error AutoActivationDisabled();
    error ThresholdConfigurationInvalid();
    error ProtectionLimitTooHigh();
    error TVLOracleNotSet();
    error TVLUpdateTooFrequent();
    error InvalidCompensationAmount();
    error FundDepletionDetected();
    error ReservedFundsExceeded();
    
    // ============ Access Control Errors ============
    
    error NotAdmin();
    error NotOperator();
    error NotAuthorizedUpdater();
    error NotBucketManager();
    error NotRevenueCollector();
    error NotCompensationApprover();
    error NotEmergencyRole();
    error NotTVLOracle();
    error RoleNotGranted();
    error RoleAlreadyGranted();
    error CannotRenounceLastAdmin();
    
    // ============ Configuration Errors ============
    
    error InvalidConfiguration();
    error ConfigurationLocked();
    error ParameterOutOfRange();
    error InvalidTimeParameter();
    error InvalidPercentageParameter();
    error DependencyNotSet();
    error CircularDependency();
    error ConfigurationConflict();
    error UpgradeNotAllowed();
    error ContractNotInitialized();
    
    // ============ Mathematical Errors ============
    
    error DivisionByZero();
    error Overflow();
    error Underflow();
    error InvalidCalculation();
    error PrecisionLoss();
    error NegativeValue();
    error InvalidRatio();
    error CalculationFailed();
    
    // ============ Time-based Errors ============
    
    error TooEarly();
    error TooLate();
    error TimeWindowExpired();
    error CooldownPeriodActive();
    error InvalidTimestamp();
    error TimeWindowNotOpen();
    error LockPeriodActive();
    
    // ============ Emergency Errors ============
    
    error EmergencyShutdown();
    error EmergencyModeRequired();
    error EmergencyActionFailed();
    error RecoveryModeActive();
    error ForceExecutionRequired();
    error EmergencyTimeoutExceeded();
    error CriticalSystemFailure();
    
    // ============ Integration Errors ============
    
    error ExternalCallFailed();
    error OracleUpdateFailed();
    error ContractInteractionFailed();
    error DataFeedStale();
    error PriceFeedInvalid();
    error ChainlinkCallFailed();
    error MultisigCallFailed();
    error CrossChainCallFailed();
    
    // ============ Validation Errors ============
    
    error InvalidSignature();
    error SignatureExpired();
    error NonceAlreadyUsed();
    error InvalidProof();
    error MerkleProofInvalid();
    error HashMismatch();
    error ChecksumInvalid();
    error ValidationFailed();
    
    // ============ State Errors ============
    
    error InvalidState();
    error StateTransitionNotAllowed();
    error ContractLocked();
    error OperationNotAllowed();
    error SystemNotReady();
    error MaintenanceModeActive();
    error UpgradePending();
    error MigrationInProgress();
    
    // ============ Liquidity Errors ============
    
    error InsufficientLiquidity();
    error LiquidityLocked();
    error PositionNotLiquidatable();
    error LiquidationFailed();
    error SlippageTooHigh();
    error MarketImpactTooHigh();
    error PriceImpactTooHigh();
    error LiquidityFragmented();
    
    // ============ Risk Management Errors ============
    
    error RiskLimitExceeded();
    error ExposureLimitExceeded();
    error ConcentrationRiskTooHigh();
    error VolatilityTooHigh();
    error MaxDrawdownExceeded();
    error VaRLimitExceeded();
    error CorrelationRiskTooHigh();
    error RiskModelFailed();
    
    // ============ Governance Errors ============
    
    error ProposalNotFound();
    error ProposalAlreadyExecuted();
    error VotingPeriodEnded();
    error VotingPeriodNotStarted();
    error InsufficientVotingPower();
    error QuorumNotReached();
    error ProposalRejected();
    error TimeoutExceeded();
    error GovernanceActionFailed();
    
    // ============ Fee Errors ============
    
    error FeeTooHigh();
    error FeeCalculationFailed();
    error FeeRecipientNotSet();
    error FeeTransferFailed();
    error InvalidFeeStructure();
    error FeeExemptionNotAllowed();
    error FeeRefundFailed();
    
    // ============ Oracle Errors ============
    
    error OracleNotSet();
    error OracleDataStale();
    error OraclePriceDeviation();
    error OracleRoundNotComplete();
    error InvalidOracleData();
    error OracleSequencerDown();
    error OracleTimeout();
    error MultipleOracleFailure();
}