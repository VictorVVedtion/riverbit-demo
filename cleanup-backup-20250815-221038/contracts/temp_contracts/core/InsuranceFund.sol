// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IInsuranceFund.sol";

/**
 * @title InsuranceFund
 * @dev Insurance fund with three-gate protection mechanism and Safe-Mode activation
 * @notice Implements B_event (0.08% TVL), 15-minute (0.20% TVL), and 24-hour (2% TVL) limits
 */
contract InsuranceFund is IInsuranceFund, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant COMPENSATION_APPROVER_ROLE = keccak256("COMPENSATION_APPROVER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DEFAULT_B_EVENT_LIMIT = 8;     // 0.08% of TVL
    uint256 public constant DEFAULT_FIFTEEN_MIN_LIMIT = 20; // 0.20% of TVL
    uint256 public constant DEFAULT_DAILY_LIMIT = 200;     // 2% of TVL
    
    uint256 public constant FIFTEEN_MINUTES = 15 * 60;    // 15 minutes
    uint256 public constant TWENTY_FOUR_HOURS = 24 * 60 * 60; // 24 hours
    
    // ============ State Variables ============
    
    IERC20 public immutable baseAsset;
    
    InsuranceFundInfo public fundInfo;
    ProtectionLimits public protectionLimits;
    SafeModeConfig public safeModeConfig;
    
    // Compensation requests
    mapping(uint256 => CompensationRequest) public compensationRequests;
    uint256 public nextRequestId;
    uint256[] public pendingRequestIds;
    
    // Fund contributions
    FundContribution[] public contributions;
    mapping(address => uint256) public contributorTotalAmount;
    
    // TVL tracking for percentage calculations
    uint256 public currentTVL;
    address public tvlOracle; // Address authorized to update TVL
    
    // Emergency controls
    bool public compensationPaused;
    mapping(address => bool) public emergencyOperators;
    
    // ============ Events ============
    
    event TVLUpdated(uint256 oldTVL, uint256 newTVL, address indexed updater);
    event LimitExceeded(TriggerType triggerType, uint256 requested, uint256 available, uint256 limit);
    event FundDepleted(uint256 remainingBalance, SafeModeLevel newLevel);
    event CompensationProcessed(uint256 indexed requestId, address indexed recipient, uint256 amount);
    event SafeModeConfigUpdated(SafeModeLevel oldLevel, SafeModeLevel newLevel);
    
    // ============ Modifiers ============
    
    modifier onlyTVLOracle() {
        require(msg.sender == tvlOracle || hasRole(ADMIN_ROLE, msg.sender), "InsuranceFund: Not TVL oracle");
        _;
    }
    
    modifier notPaused() {
        require(!compensationPaused, "InsuranceFund: Compensation paused");
        _;
    }
    
    modifier validTriggerType(TriggerType triggerType) {
        require(
            triggerType == TriggerType.B_EVENT || 
            triggerType == TriggerType.FIFTEEN_MIN || 
            triggerType == TriggerType.DAILY,
            "InsuranceFund: Invalid trigger type"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _baseAsset,
        address _admin,
        address _tvlOracle
    ) {
        require(_baseAsset != address(0), "InsuranceFund: Invalid base asset");
        require(_admin != address(0), "InsuranceFund: Invalid admin");
        require(_tvlOracle != address(0), "InsuranceFund: Invalid TVL oracle");
        
        baseAsset = IERC20(_baseAsset);
        tvlOracle = _tvlOracle;
        
        // Initialize fund info
        fundInfo = InsuranceFundInfo({
            totalFund: 0,
            availableFund: 0,
            reservedFund: 0,
            totalClaimed: 0,
            lastDepositTime: 0,
            fundUtilizationRate: 0
        });
        
        // Initialize protection limits
        protectionLimits = ProtectionLimits({
            bEventLimit: 0,     // Will be calculated based on TVL
            fifteenMinLimit: 0, // Will be calculated based on TVL
            dailyLimit: 0,      // Will be calculated based on TVL
            bEventUsed: 0,
            fifteenMinUsed: 0,
            dailyUsed: 0,
            lastResetTime: block.timestamp,
            fifteenMinWindow: block.timestamp,
            dailyWindow: block.timestamp
        });
        
        // Initialize safe mode config
        safeModeConfig = SafeModeConfig({
            currentLevel: SafeModeLevel.NONE,
            activationTime: 0,
            l1Threshold: 8000, // 80% fund depletion
            l2Threshold: 6000, // 60% fund depletion
            l3Threshold: 4000, // 40% fund depletion
            l4Threshold: 2000, // 20% fund depletion
            autoActivation: true
        });
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(COMPENSATION_APPROVER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        nextRequestId = 1;
    }
    
    // ============ View Functions ============
    
    function getInsuranceFundInfo() external view override returns (InsuranceFundInfo memory) {
        return fundInfo;
    }
    
    function getProtectionLimits() external view override returns (ProtectionLimits memory) {
        return protectionLimits;
    }
    
    function getSafeModeConfig() external view override returns (SafeModeConfig memory) {
        return safeModeConfig;
    }
    
    function getCompensationRequest(uint256 requestId) 
        external 
        view 
        override 
        returns (CompensationRequest memory) 
    {
        return compensationRequests[requestId];
    }
    
    function getPendingRequests() external view override returns (CompensationRequest[] memory requests) {
        requests = new CompensationRequest[](pendingRequestIds.length);
        for (uint256 i = 0; i < pendingRequestIds.length; i++) {
            requests[i] = compensationRequests[pendingRequestIds[i]];
        }
    }
    
    function checkCompensationLimits(uint256 amount, TriggerType triggerType, uint256 tvl) 
        external 
        view 
        override 
        returns (bool allowed, string memory reason) 
    {
        // Update limits based on current TVL
        uint256 bEventLimit = (tvl * DEFAULT_B_EVENT_LIMIT) / BASIS_POINTS;
        uint256 fifteenMinLimit = (tvl * DEFAULT_FIFTEEN_MIN_LIMIT) / BASIS_POINTS;
        uint256 dailyLimit = (tvl * DEFAULT_DAILY_LIMIT) / BASIS_POINTS;
        
        if (triggerType == TriggerType.B_EVENT) {
            if (protectionLimits.bEventUsed + amount > bEventLimit) {
                return (false, "B_EVENT limit exceeded");
            }
        } else if (triggerType == TriggerType.FIFTEEN_MIN) {
            if (protectionLimits.fifteenMinUsed + amount > fifteenMinLimit) {
                return (false, "15-minute limit exceeded");
            }
        } else if (triggerType == TriggerType.DAILY) {
            if (protectionLimits.dailyUsed + amount > dailyLimit) {
                return (false, "Daily limit exceeded");
            }
        }
        
        // Check fund availability
        if (amount > fundInfo.availableFund) {
            return (false, "Insufficient available funds");
        }
        
        return (true, "");
    }
    
    function getFundUtilizationRate() external view override returns (uint256 rate) {
        if (fundInfo.totalFund == 0) return 0;
        return (fundInfo.totalClaimed * BASIS_POINTS) / fundInfo.totalFund;
    }
    
    function checkSafeModeActivation() 
        external 
        view 
        override 
        returns (bool shouldActivate, SafeModeLevel suggestedLevel) 
    {
        if (!safeModeConfig.autoActivation || fundInfo.totalFund == 0) {
            return (false, SafeModeLevel.NONE);
        }
        
        uint256 currentUtilization = (fundInfo.totalClaimed * BASIS_POINTS) / fundInfo.totalFund;
        
        if (currentUtilization >= safeModeConfig.l4Threshold) {
            return (true, SafeModeLevel.L4);
        } else if (currentUtilization >= safeModeConfig.l3Threshold) {
            return (true, SafeModeLevel.L3);
        } else if (currentUtilization >= safeModeConfig.l2Threshold) {
            return (true, SafeModeLevel.L2);
        } else if (currentUtilization >= safeModeConfig.l1Threshold) {
            return (true, SafeModeLevel.L1);
        }
        
        return (false, SafeModeLevel.NONE);
    }
    
    function getFundContributions(uint256 startTime, uint256 endTime) 
        external 
        view 
        override 
        returns (FundContribution[] memory) 
    {
        uint256 count = 0;
        
        // Count matching contributions
        for (uint256 i = 0; i < contributions.length; i++) {
            if (contributions[i].timestamp >= startTime && contributions[i].timestamp <= endTime) {
                count++;
            }
        }
        
        // Build result array
        FundContribution[] memory result = new FundContribution[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < contributions.length; i++) {
            if (contributions[i].timestamp >= startTime && contributions[i].timestamp <= endTime) {
                result[index] = contributions[i];
                index++;
            }
        }
        
        return result;
    }
    
    function getRemainingCapacity(uint256 tvl) 
        external 
        view 
        override 
        returns (uint256 bEventCapacity, uint256 fifteenMinCapacity, uint256 dailyCapacity) 
    {
        uint256 bEventLimit = (tvl * DEFAULT_B_EVENT_LIMIT) / BASIS_POINTS;
        uint256 fifteenMinLimit = (tvl * DEFAULT_FIFTEEN_MIN_LIMIT) / BASIS_POINTS;
        uint256 dailyLimit = (tvl * DEFAULT_DAILY_LIMIT) / BASIS_POINTS;
        
        bEventCapacity = bEventLimit > protectionLimits.bEventUsed ? 
            bEventLimit - protectionLimits.bEventUsed : 0;
        fifteenMinCapacity = fifteenMinLimit > protectionLimits.fifteenMinUsed ? 
            fifteenMinLimit - protectionLimits.fifteenMinUsed : 0;
        dailyCapacity = dailyLimit > protectionLimits.dailyUsed ? 
            dailyLimit - protectionLimits.dailyUsed : 0;
    }
    
    // ============ Fund Management Functions ============
    
    function depositFunds(uint256 amount, string calldata source) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "InsuranceFund: Invalid amount");
        
        // Transfer funds
        baseAsset.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update fund info
        fundInfo.totalFund += amount;
        fundInfo.availableFund += (amount * 8000) / BASIS_POINTS; // 80% available, 20% reserved
        fundInfo.reservedFund += (amount * 2000) / BASIS_POINTS;
        fundInfo.lastDepositTime = block.timestamp;
        
        // Record contribution
        contributions.push(FundContribution({
            contributor: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            source: source
        }));
        
        contributorTotalAmount[msg.sender] += amount;
        
        emit FundsDeposited(msg.sender, amount, source);
    }
    
    function requestCompensation(
        address recipient,
        uint256 amount,
        TriggerType triggerType,
        string calldata reason
    ) external override nonReentrant notPaused validTriggerType(triggerType) returns (uint256 requestId) {
        require(hasRole(OPERATOR_ROLE, msg.sender), "InsuranceFund: Not authorized");
        require(recipient != address(0), "InsuranceFund: Invalid recipient");
        require(amount > 0, "InsuranceFund: Invalid amount");
        
        // Check limits
        _updateLimits();
        (bool allowed, string memory limitReason) = this.checkCompensationLimits(amount, triggerType, currentTVL);
        require(allowed, limitReason);
        
        requestId = nextRequestId++;
        
        compensationRequests[requestId] = CompensationRequest({
            recipient: recipient,
            amount: amount,
            triggerType: triggerType,
            reason: reason,
            requestTime: block.timestamp,
            approved: false,
            executed: false,
            approver: address(0)
        });
        
        pendingRequestIds.push(requestId);
        
        emit CompensationRequested(requestId, recipient, amount, triggerType, reason);
    }
    
    function approveCompensation(uint256 requestId) 
        external 
        override 
        onlyRole(COMPENSATION_APPROVER_ROLE) 
    {
        CompensationRequest storage request = compensationRequests[requestId];
        require(request.requestTime > 0, "InsuranceFund: Request not found");
        require(!request.approved, "InsuranceFund: Already approved");
        require(!request.executed, "InsuranceFund: Already executed");
        
        request.approved = true;
        request.approver = msg.sender;
        
        emit CompensationApproved(requestId, msg.sender);
    }
    
    function executeCompensation(uint256 requestId) 
        external 
        override 
        nonReentrant 
        onlyRole(OPERATOR_ROLE) 
        notPaused 
    {
        CompensationRequest storage request = compensationRequests[requestId];
        require(request.approved, "InsuranceFund: Not approved");
        require(!request.executed, "InsuranceFund: Already executed");
        
        // Double-check limits at execution time
        _updateLimits();
        (bool allowed,) = this.checkCompensationLimits(request.amount, request.triggerType, currentTVL);
        require(allowed, "InsuranceFund: Limits exceeded at execution");
        
        // Update protection limits usage
        if (request.triggerType == TriggerType.B_EVENT) {
            protectionLimits.bEventUsed += request.amount;
        } else if (request.triggerType == TriggerType.FIFTEEN_MIN) {
            protectionLimits.fifteenMinUsed += request.amount;
        } else if (request.triggerType == TriggerType.DAILY) {
            protectionLimits.dailyUsed += request.amount;
        }
        
        // Update fund state
        fundInfo.availableFund -= request.amount;
        fundInfo.totalClaimed += request.amount;
        fundInfo.fundUtilizationRate = (fundInfo.totalClaimed * BASIS_POINTS) / fundInfo.totalFund;
        
        // Execute transfer
        baseAsset.safeTransfer(request.recipient, request.amount);
        
        // Mark as executed
        request.executed = true;
        
        // Remove from pending requests
        _removePendingRequest(requestId);
        
        // Check for safe mode activation
        _checkAndActivateSafeMode();
        
        emit CompensationExecuted(requestId, request.recipient, request.amount);
        emit CompensationProcessed(requestId, request.recipient, request.amount);
    }
    
    function batchExecuteCompensation(uint256[] calldata requestIds) 
        external 
        override 
        nonReentrant 
        onlyRole(OPERATOR_ROLE) 
        notPaused 
    {
        for (uint256 i = 0; i < requestIds.length; i++) {
            uint256 requestId = requestIds[i];
            CompensationRequest storage request = compensationRequests[requestId];
            
            if (request.approved && !request.executed) {
                // Check limits for each request
                _updateLimits();
                (bool allowed,) = this.checkCompensationLimits(request.amount, request.triggerType, currentTVL);
                
                if (allowed && request.amount <= fundInfo.availableFund) {
                    // Update limits and fund state
                    if (request.triggerType == TriggerType.B_EVENT) {
                        protectionLimits.bEventUsed += request.amount;
                    } else if (request.triggerType == TriggerType.FIFTEEN_MIN) {
                        protectionLimits.fifteenMinUsed += request.amount;
                    } else if (request.triggerType == TriggerType.DAILY) {
                        protectionLimits.dailyUsed += request.amount;
                    }
                    
                    fundInfo.availableFund -= request.amount;
                    fundInfo.totalClaimed += request.amount;
                    
                    // Execute transfer
                    baseAsset.safeTransfer(request.recipient, request.amount);
                    request.executed = true;
                    
                    _removePendingRequest(requestId);
                    
                    emit CompensationExecuted(requestId, request.recipient, request.amount);
                }
            }
        }
        
        // Update utilization rate
        fundInfo.fundUtilizationRate = fundInfo.totalFund > 0 ? 
            (fundInfo.totalClaimed * BASIS_POINTS) / fundInfo.totalFund : 0;
        
        // Check for safe mode activation
        _checkAndActivateSafeMode();
    }
    
    // ============ Safe Mode Management ============
    
    function activateSafeMode(SafeModeLevel level, string calldata reason) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(level != SafeModeLevel.NONE, "InsuranceFund: Invalid level");
        
        SafeModeLevel oldLevel = safeModeConfig.currentLevel;
        safeModeConfig.currentLevel = level;
        safeModeConfig.activationTime = block.timestamp;
        
        emit SafeModeActivated(level, reason, block.timestamp);
        emit SafeModeConfigUpdated(oldLevel, level);
    }
    
    function deactivateSafeMode(string calldata reason) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        SafeModeLevel previousLevel = safeModeConfig.currentLevel;
        safeModeConfig.currentLevel = SafeModeLevel.NONE;
        safeModeConfig.activationTime = 0;
        
        emit SafeModeDeactivated(previousLevel, block.timestamp);
    }
    
    function updateSafeModeThresholds(
        uint256 l1Threshold,
        uint256 l2Threshold,
        uint256 l3Threshold,
        uint256 l4Threshold
    ) external override onlyRole(ADMIN_ROLE) {
        require(l1Threshold > l2Threshold, "InsuranceFund: Invalid L1 threshold");
        require(l2Threshold > l3Threshold, "InsuranceFund: Invalid L2 threshold");
        require(l3Threshold > l4Threshold, "InsuranceFund: Invalid L3 threshold");
        require(l4Threshold > 0, "InsuranceFund: Invalid L4 threshold");
        
        safeModeConfig.l1Threshold = l1Threshold;
        safeModeConfig.l2Threshold = l2Threshold;
        safeModeConfig.l3Threshold = l3Threshold;
        safeModeConfig.l4Threshold = l4Threshold;
    }
    
    function setAutoActivation(bool enabled) external override onlyRole(ADMIN_ROLE) {
        safeModeConfig.autoActivation = enabled;
    }
    
    // ============ Protection Limit Management ============
    
    function updateProtectionLimits(
        uint256 bEventBasisPoints,
        uint256 fifteenMinBasisPoints,
        uint256 dailyBasisPoints
    ) external override onlyRole(ADMIN_ROLE) {
        require(bEventBasisPoints <= 50, "InsuranceFund: B_EVENT limit too high"); // Max 0.5%
        require(fifteenMinBasisPoints <= 100, "InsuranceFund: 15min limit too high"); // Max 1%
        require(dailyBasisPoints <= 500, "InsuranceFund: Daily limit too high"); // Max 5%
        
        // Note: These are stored as basis points and applied to current TVL
        // The actual implementation would update the limit calculation logic
    }
    
    function resetProtectionLimits(TriggerType triggerType, string calldata reason) 
        external 
        override 
        onlyRole(EMERGENCY_ROLE) 
    {
        if (triggerType == TriggerType.B_EVENT) {
            protectionLimits.bEventUsed = 0;
        } else if (triggerType == TriggerType.FIFTEEN_MIN) {
            protectionLimits.fifteenMinUsed = 0;
            protectionLimits.fifteenMinWindow = block.timestamp;
        } else if (triggerType == TriggerType.DAILY) {
            protectionLimits.dailyUsed = 0;
            protectionLimits.dailyWindow = block.timestamp;
        }
        
        emit LimitsReset(triggerType, block.timestamp);
    }
    
    function updateFundAllocation(uint256 reservedPercentage) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(reservedPercentage <= 5000, "InsuranceFund: Reserved percentage too high"); // Max 50%
        
        uint256 newReserved = (fundInfo.totalFund * reservedPercentage) / BASIS_POINTS;
        uint256 newAvailable = fundInfo.totalFund - newReserved;
        
        fundInfo.reservedFund = newReserved;
        fundInfo.availableFund = newAvailable;
    }
    
    // ============ Emergency Functions ============
    
    function emergencyPause(string calldata reason) external override onlyRole(EMERGENCY_ROLE) {
        compensationPaused = true;
        emit EmergencyAction("PAUSE", msg.sender, block.timestamp);
    }
    
    function emergencyResume(string calldata reason) external override onlyRole(EMERGENCY_ROLE) {
        compensationPaused = false;
        emit EmergencyAction("RESUME", msg.sender, block.timestamp);
    }
    
    function emergencyWithdraw(address recipient, uint256 amount, string calldata reason) 
        external 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        baseAsset.safeTransfer(recipient, amount);
        
        // Update fund info
        if (amount <= fundInfo.availableFund) {
            fundInfo.availableFund -= amount;
        } else {
            fundInfo.availableFund = 0;
        }
        
        emit EmergencyWithdrawal(recipient, amount, reason);
        emit EmergencyAction("EMERGENCY_WITHDRAW", msg.sender, block.timestamp);
    }
    
    function forceCompensation(address recipient, uint256 amount, string calldata reason) 
        external 
        override 
        nonReentrant 
        onlyRole(EMERGENCY_ROLE) 
    {
        require(recipient != address(0), "InsuranceFund: Invalid recipient");
        require(amount > 0, "InsuranceFund: Invalid amount");
        require(amount <= baseAsset.balanceOf(address(this)), "InsuranceFund: Insufficient balance");
        
        baseAsset.safeTransfer(recipient, amount);
        
        // Update fund state without limit checks
        if (amount <= fundInfo.availableFund) {
            fundInfo.availableFund -= amount;
        } else {
            fundInfo.availableFund = 0;
        }
        fundInfo.totalClaimed += amount;
        
        emit EmergencyAction("FORCE_COMPENSATION", msg.sender, block.timestamp);
    }
    
    // ============ Configuration Functions ============
    
    function setTVLOracle(address newOracle) external onlyRole(ADMIN_ROLE) {
        require(newOracle != address(0), "InsuranceFund: Invalid oracle");
        tvlOracle = newOracle;
    }
    
    function updateTVL(uint256 newTVL) external onlyTVLOracle {
        uint256 oldTVL = currentTVL;
        currentTVL = newTVL;
        
        // Update dynamic limits based on new TVL
        protectionLimits.bEventLimit = (newTVL * DEFAULT_B_EVENT_LIMIT) / BASIS_POINTS;
        protectionLimits.fifteenMinLimit = (newTVL * DEFAULT_FIFTEEN_MIN_LIMIT) / BASIS_POINTS;
        protectionLimits.dailyLimit = (newTVL * DEFAULT_DAILY_LIMIT) / BASIS_POINTS;
        
        emit TVLUpdated(oldTVL, newTVL, msg.sender);
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ Internal Functions ============
    
    function _updateLimits() internal {
        uint256 currentTime = block.timestamp;
        
        // Reset 15-minute window if needed
        if (currentTime >= protectionLimits.fifteenMinWindow + FIFTEEN_MINUTES) {
            protectionLimits.fifteenMinUsed = 0;
            protectionLimits.fifteenMinWindow = currentTime;
        }
        
        // Reset daily window if needed
        if (currentTime >= protectionLimits.dailyWindow + TWENTY_FOUR_HOURS) {
            protectionLimits.dailyUsed = 0;
            protectionLimits.dailyWindow = currentTime;
        }
        
        // Reset B_EVENT limit daily (resets with daily window)
        if (currentTime >= protectionLimits.lastResetTime + TWENTY_FOUR_HOURS) {
            protectionLimits.bEventUsed = 0;
            protectionLimits.lastResetTime = currentTime;
        }
    }
    
    function _checkAndActivateSafeMode() internal {
        if (!safeModeConfig.autoActivation) return;
        
        (bool shouldActivate, SafeModeLevel suggestedLevel) = this.checkSafeModeActivation();
        
        if (shouldActivate && suggestedLevel != safeModeConfig.currentLevel) {
            SafeModeLevel oldLevel = safeModeConfig.currentLevel;
            safeModeConfig.currentLevel = suggestedLevel;
            safeModeConfig.activationTime = block.timestamp;
            
            emit SafeModeActivated(suggestedLevel, "Auto-activated due to fund depletion", block.timestamp);
            emit FundDepleted(fundInfo.availableFund, suggestedLevel);
            emit SafeModeConfigUpdated(oldLevel, suggestedLevel);
        }
    }
    
    function _removePendingRequest(uint256 requestId) internal {
        for (uint256 i = 0; i < pendingRequestIds.length; i++) {
            if (pendingRequestIds[i] == requestId) {
                pendingRequestIds[i] = pendingRequestIds[pendingRequestIds.length - 1];
                pendingRequestIds.pop();
                break;
            }
        }
    }
}