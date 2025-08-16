// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IInsuranceFund
 * @dev Interface for insurance fund management with three-gate protection mechanism
 * @notice Manages insurance funds, loss compensation, and Safe-Mode activation
 */
interface IInsuranceFund {
    
    // ============ Enums ============
    
    enum SafeModeLevel {
        NONE,       // Normal operations
        L1,         // Light restrictions
        L2,         // Moderate restrictions  
        L3,         // Heavy restrictions
        L4          // Emergency mode
    }
    
    enum TriggerType {
        B_EVENT,    // 0.08% TVL single event
        FIFTEEN_MIN, // 0.20% TVL in 15 minutes
        DAILY       // 2% TVL in 24 hours
    }
    
    // ============ Structs ============
    
    struct InsuranceFundInfo {
        uint256 totalFund;          // Total insurance fund balance
        uint256 availableFund;      // Available fund for compensation
        uint256 reservedFund;       // Reserved fund for extreme cases
        uint256 totalClaimed;       // Total amount claimed
        uint256 lastDepositTime;    // Last deposit timestamp
        uint256 fundUtilizationRate; // Current utilization rate (basis points)
    }
    
    struct ProtectionLimits {
        uint256 bEventLimit;        // 0.08% TVL limit for single event
        uint256 fifteenMinLimit;    // 0.20% TVL limit for 15 minutes
        uint256 dailyLimit;         // 2% TVL limit for 24 hours
        uint256 bEventUsed;         // Used amount for B_EVENT
        uint256 fifteenMinUsed;     // Used amount in current 15min window
        uint256 dailyUsed;          // Used amount in current 24h window
        uint256 lastResetTime;      // Last reset timestamp
        uint256 fifteenMinWindow;   // Start of current 15min window
        uint256 dailyWindow;        // Start of current 24h window
    }
    
    struct SafeModeConfig {
        SafeModeLevel currentLevel;
        uint256 activationTime;
        uint256 l1Threshold;        // L1 activation threshold (% of fund depletion)
        uint256 l2Threshold;        // L2 activation threshold
        uint256 l3Threshold;        // L3 activation threshold  
        uint256 l4Threshold;        // L4 activation threshold
        bool autoActivation;        // Whether to auto-activate safe mode
    }
    
    struct CompensationRequest {
        address recipient;
        uint256 amount;
        TriggerType triggerType;
        string reason;
        uint256 requestTime;
        bool approved;
        bool executed;
        address approver;
    }
    
    struct FundContribution {
        address contributor;
        uint256 amount;
        uint256 timestamp;
        string source;              // Source of the contribution
    }
    
    // ============ Events ============
    
    event FundsDeposited(address indexed contributor, uint256 amount, string source);
    event CompensationRequested(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        TriggerType triggerType,
        string reason
    );
    event CompensationApproved(uint256 indexed requestId, address indexed approver);
    event CompensationExecuted(uint256 indexed requestId, address indexed recipient, uint256 amount);
    event SafeModeActivated(SafeModeLevel level, string reason, uint256 timestamp);
    event SafeModeDeactivated(SafeModeLevel previousLevel, uint256 timestamp);
    event ProtectionLimitTriggered(TriggerType triggerType, uint256 amount, uint256 limit);
    event FundThresholdReached(uint256 currentBalance, uint256 threshold, SafeModeLevel newLevel);
    event EmergencyAction(string action, address indexed executor, uint256 timestamp);
    event LimitsReset(TriggerType triggerType, uint256 timestamp);
    
    // ============ View Functions ============
    
    /**
     * @notice Get current insurance fund information
     * @return fundInfo Current fund information
     */
    function getInsuranceFundInfo() external view returns (InsuranceFundInfo memory fundInfo);
    
    /**
     * @notice Get current protection limits and usage
     * @return limits Current protection limits
     */
    function getProtectionLimits() external view returns (ProtectionLimits memory limits);
    
    /**
     * @notice Get current safe mode configuration
     * @return config Current safe mode configuration
     */
    function getSafeModeConfig() external view returns (SafeModeConfig memory config);
    
    /**
     * @notice Get compensation request details
     * @param requestId Request ID to query
     * @return request Compensation request details
     */
    function getCompensationRequest(uint256 requestId) 
        external view returns (CompensationRequest memory request);
    
    /**
     * @notice Get all pending compensation requests
     * @return requests Array of pending compensation requests
     */
    function getPendingRequests() external view returns (CompensationRequest[] memory requests);
    
    /**
     * @notice Check if compensation amount is within limits
     * @param amount Compensation amount
     * @param triggerType Type of trigger
     * @param currentTVL Current TVL for percentage calculation
     * @return allowed Whether the compensation is allowed
     * @return reason Reason if not allowed
     */
    function checkCompensationLimits(uint256 amount, TriggerType triggerType, uint256 currentTVL) 
        external view returns (bool allowed, string memory reason);
    
    /**
     * @notice Get fund utilization rate
     * @return rate Current utilization rate in basis points
     */
    function getFundUtilizationRate() external view returns (uint256 rate);
    
    /**
     * @notice Check if safe mode should be activated based on fund level
     * @return shouldActivate Whether safe mode should be activated
     * @return suggestedLevel Suggested safe mode level
     */
    function checkSafeModeActivation() external view returns (bool shouldActivate, SafeModeLevel suggestedLevel);
    
    /**
     * @notice Get historical fund contributions
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return contributions Array of contributions in time range
     */
    function getFundContributions(uint256 startTime, uint256 endTime) 
        external view returns (FundContribution[] memory contributions);
    
    /**
     * @notice Calculate remaining capacity for each trigger type
     * @param currentTVL Current TVL
     * @return bEventCapacity Remaining B_EVENT capacity
     * @return fifteenMinCapacity Remaining 15-minute capacity
     * @return dailyCapacity Remaining daily capacity
     */
    function getRemainingCapacity(uint256 currentTVL) external view returns (
        uint256 bEventCapacity,
        uint256 fifteenMinCapacity, 
        uint256 dailyCapacity
    );
    
    // ============ Fund Management Functions ============
    
    /**
     * @notice Deposit funds into insurance fund
     * @param amount Amount to deposit
     * @param source Source of the funds (e.g., "protocol_fees", "community_contribution")
     */
    function depositFunds(uint256 amount, string calldata source) external;
    
    /**
     * @notice Request compensation from insurance fund
     * @param recipient Address to receive compensation
     * @param amount Compensation amount
     * @param triggerType Type of trigger causing the request
     * @param reason Detailed reason for compensation
     * @return requestId ID of the created request
     */
    function requestCompensation(
        address recipient,
        uint256 amount,
        TriggerType triggerType,
        string calldata reason
    ) external returns (uint256 requestId);
    
    /**
     * @notice Approve a compensation request
     * @param requestId Request ID to approve
     */
    function approveCompensation(uint256 requestId) external;
    
    /**
     * @notice Execute an approved compensation request
     * @param requestId Request ID to execute
     */
    function executeCompensation(uint256 requestId) external;
    
    /**
     * @notice Batch execute multiple approved compensation requests
     * @param requestIds Array of request IDs to execute
     */
    function batchExecuteCompensation(uint256[] calldata requestIds) external;
    
    // ============ Safe Mode Management ============
    
    /**
     * @notice Manually activate safe mode
     * @param level Safe mode level to activate
     * @param reason Reason for activation
     */
    function activateSafeMode(SafeModeLevel level, string calldata reason) external;
    
    /**
     * @notice Deactivate safe mode
     * @param reason Reason for deactivation
     */
    function deactivateSafeMode(string calldata reason) external;
    
    /**
     * @notice Update safe mode thresholds
     * @param l1Threshold New L1 threshold
     * @param l2Threshold New L2 threshold
     * @param l3Threshold New L3 threshold
     * @param l4Threshold New L4 threshold
     */
    function updateSafeModeThresholds(
        uint256 l1Threshold,
        uint256 l2Threshold,
        uint256 l3Threshold,
        uint256 l4Threshold
    ) external;
    
    /**
     * @notice Toggle automatic safe mode activation
     * @param enabled Whether to enable automatic activation
     */
    function setAutoActivation(bool enabled) external;
    
    // ============ Protection Limit Management ============
    
    /**
     * @notice Update protection limits
     * @param bEventBasisPoints B_EVENT limit in basis points of TVL (default: 8)
     * @param fifteenMinBasisPoints 15-minute limit in basis points of TVL (default: 20)
     * @param dailyBasisPoints Daily limit in basis points of TVL (default: 200)
     */
    function updateProtectionLimits(
        uint256 bEventBasisPoints,
        uint256 fifteenMinBasisPoints,
        uint256 dailyBasisPoints
    ) external;
    
    /**
     * @notice Reset protection limit usage (emergency function)
     * @param triggerType Type of limit to reset
     * @param reason Reason for reset
     */
    function resetProtectionLimits(TriggerType triggerType, string calldata reason) external;
    
    /**
     * @notice Update fund allocation between available and reserved
     * @param reservedPercentage Percentage to keep as reserved (basis points)
     */
    function updateFundAllocation(uint256 reservedPercentage) external;
    
    // ============ Emergency Functions ============
    
    /**
     * @notice Emergency pause all compensation activities
     * @param reason Reason for pause
     */
    function emergencyPause(string calldata reason) external;
    
    /**
     * @notice Resume compensation activities after pause
     * @param reason Reason for resumption
     */
    function emergencyResume(string calldata reason) external;
    
    /**
     * @notice Emergency withdrawal of funds (governance only)
     * @param recipient Address to receive funds
     * @param amount Amount to withdraw
     * @param reason Reason for emergency withdrawal
     */
    function emergencyWithdraw(address recipient, uint256 amount, string calldata reason) external;
    
    /**
     * @notice Force execute compensation bypassing normal limits (extreme emergency)
     * @param recipient Address to compensate
     * @param amount Compensation amount
     * @param reason Reason for force execution
     */
    function forceCompensation(address recipient, uint256 amount, string calldata reason) external;
}