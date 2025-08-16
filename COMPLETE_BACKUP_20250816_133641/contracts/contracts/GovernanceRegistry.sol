// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title GovernanceRegistry
 * @notice Parameter registry with timelock controls for protocol governance
 * @dev Manages protocol parameters with time-delayed execution and multi-sig validation
 * 
 * Key Features:
 * - Parameter registry with type safety and validation
 * - Timelock mechanism for critical parameter changes
 * - Multi-signature requirement for sensitive operations
 * - Emergency override capabilities
 * - Parameter change history and audit trail
 * - Staged rollout for parameter updates
 */
contract GovernanceRegistry is 
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using Math for uint256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MIN_TIMELOCK_DELAY = 2 days;
    uint256 private constant MAX_TIMELOCK_DELAY = 30 days;
    uint256 private constant EMERGENCY_TIMELOCK = 6 hours;
    uint256 private constant MIN_VALIDATORS = 3;

    // ============ ENUMS ============

    enum ParameterType {
        UINT256,
        INT256,
        BOOL,
        ADDRESS,
        BYTES32
    }

    enum ProposalStatus {
        PENDING,
        APPROVED,
        EXECUTED,
        CANCELLED,
        EXPIRED
    }

    enum ParameterCategory {
        TRADING,      // Trading-related parameters
        RISK,         // Risk management parameters
        FUNDING,      // Funding and AFB parameters
        LP,           // LP bucket parameters
        GOVERNANCE,   // Governance parameters
        EMERGENCY     // Emergency parameters
    }

    enum ValidationLevel {
        LOW,          // Basic validation
        MEDIUM,       // Standard validation + single approval
        HIGH,         // Enhanced validation + multi-sig
        CRITICAL      // Maximum validation + emergency procedures
    }

    // ============ STRUCTS ============

    // Parameter definition
    struct Parameter {
        bytes32 key;                    // Parameter key
        ParameterType paramType;        // Parameter data type
        ParameterCategory category;     // Parameter category
        ValidationLevel validationLevel; // Required validation level
        bytes32 value;                  // Current value (encoded)
        bytes32 pendingValue;           // Pending value for timelock
        uint256 lastUpdate;             // Last update timestamp
        uint256 updateCount;            // Number of updates
        bool exists;                    // Whether parameter exists
        bool locked;                    // Whether parameter is locked
        string description;             // Parameter description
    }

    // Parameter proposal
    struct Proposal {
        bytes32 proposalId;             // Unique proposal ID
        bytes32 parameterKey;           // Parameter to update
        bytes32 newValue;               // Proposed new value
        address proposer;               // Who proposed the change
        uint256 proposedAt;             // Proposal timestamp
        uint256 executeAfter;           // Earliest execution time
        uint256 expiresAt;              // Proposal expiration time
        ProposalStatus status;          // Current proposal status
        uint256 approvalCount;          // Number of approvals
        uint256 requiredApprovals;      // Required approvals
        string reason;                  // Reason for change
        bool emergencyProposal;         // Emergency proposal flag
    }

    // Validator approval
    struct Approval {
        address validator;              // Validator address
        uint256 timestamp;              // Approval timestamp
        bool approved;                  // Approval status
        string comments;                // Validator comments
    }

    // Governance configuration
    struct GovernanceConfig {
        uint256 proposalDelay;          // Delay before proposal can be executed
        uint256 votingDuration;         // Duration of voting period
        uint256 executionDelay;         // Additional delay before execution
        uint256 quorum;                 // Required quorum for proposals
        uint256 emergencyDelay;         // Emergency proposal delay
        bool timelockEnabled;           // Whether timelock is enabled
        bool emergencyMode;             // Emergency mode status
    }

    // Parameter change event data
    struct ParameterChange {
        bytes32 parameterKey;           // Parameter that changed
        bytes32 oldValue;               // Previous value
        bytes32 newValue;               // New value
        address changedBy;              // Who made the change
        uint256 timestamp;              // Change timestamp
        string reason;                  // Reason for change
        bool emergency;                 // Emergency change flag
    }

    // ============ STATE VARIABLES ============

    // Parameter storage
    mapping(bytes32 => Parameter) public parameters;
    bytes32[] public parameterKeys;
    mapping(ParameterCategory => bytes32[]) public parametersByCategory;
    
    // Proposals and approvals
    mapping(bytes32 => Proposal) public proposals;
    mapping(bytes32 => mapping(address => Approval)) public approvals;
    mapping(bytes32 => address[]) public proposalValidators;
    bytes32[] public allProposals;
    
    // Governance configuration
    GovernanceConfig public governanceConfig;
    mapping(address => bool) public validators;
    address[] public validatorList;
    uint256 public validatorCount;
    
    // Parameter change history
    mapping(bytes32 => ParameterChange[]) public parameterHistory;
    mapping(address => bytes32[]) public userProposals;
    
    // Emergency controls
    bool public globalEmergencyMode;
    mapping(bytes32 => bool) public parameterEmergencyLocked;
    uint256 public lastEmergencyTime;
    
    // Statistics
    uint256 public totalProposals;
    uint256 public executedProposals;
    uint256 public rejectedProposals;
    mapping(ParameterCategory => uint256) public proposalsByCategory;

    // ============ EVENTS ============

    event ParameterRegistered(
        bytes32 indexed key,
        ParameterType paramType,
        ParameterCategory category,
        ValidationLevel validationLevel,
        string description
    );

    event ProposalCreated(
        bytes32 indexed proposalId,
        bytes32 indexed parameterKey,
        address indexed proposer,
        bytes32 newValue,
        uint256 executeAfter,
        bool emergency
    );

    event ProposalApproved(
        bytes32 indexed proposalId,
        address indexed validator,
        uint256 approvalCount,
        uint256 requiredApprovals
    );

    event ProposalExecuted(
        bytes32 indexed proposalId,
        bytes32 indexed parameterKey,
        bytes32 oldValue,
        bytes32 newValue,
        address executor
    );

    event ParameterUpdated(
        bytes32 indexed key,
        bytes32 oldValue,
        bytes32 newValue,
        address indexed updatedBy,
        string reason,
        bool emergency
    );

    event ValidatorAdded(
        address indexed validator,
        address indexed addedBy
    );

    event ValidatorRemoved(
        address indexed validator,
        address indexed removedBy
    );

    event EmergencyModeToggled(
        bool enabled,
        address indexed admin,
        string reason
    );

    // ============ MODIFIERS ============

    modifier onlyValidator() {
        require(validators[msg.sender], "Not a validator");
        _;
    }

    modifier parameterExists(bytes32 key) {
        require(parameters[key].exists, "Parameter does not exist");
        _;
    }

    modifier proposalExists(bytes32 proposalId) {
        require(proposals[proposalId].proposedAt > 0, "Proposal does not exist");
        _;
    }

    modifier notEmergencyMode() {
        require(!globalEmergencyMode, "Global emergency mode active");
        _;
    }

    modifier notParameterLocked(bytes32 key) {
        require(!parameters[key].locked, "Parameter locked");
        require(!parameterEmergencyLocked[key], "Parameter emergency locked");
        _;
    }

    // ============ INITIALIZATION ============

    /**
     * @notice Initialize the governance registry
     * @param _admin Admin address
     * @param _initialValidators Initial validator addresses
     */
    function initialize(
        address _admin,
        address[] calldata _initialValidators
    ) external initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();

        require(_admin != address(0), "Invalid admin");
        require(_initialValidators.length >= MIN_VALIDATORS, "Insufficient validators");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(GOVERNOR_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(VALIDATOR_ROLE, _admin);

        // Initialize governance configuration
        governanceConfig = GovernanceConfig({
            proposalDelay: 1 days,
            votingDuration: 3 days,
            executionDelay: 1 days,
            quorum: 6000, // 60%
            emergencyDelay: EMERGENCY_TIMELOCK,
            timelockEnabled: true,
            emergencyMode: false
        });

        // Add initial validators
        for (uint256 i = 0; i < _initialValidators.length; i++) {
            _addValidator(_initialValidators[i]);
        }

        // Register core governance parameters
        _registerCoreParameters();
    }

    // ============ PARAMETER MANAGEMENT ============

    /**
     * @notice Register a new parameter
     */
    function registerParameter(
        bytes32 key,
        ParameterType paramType,
        ParameterCategory category,
        ValidationLevel validationLevel,
        bytes32 initialValue,
        string calldata description
    ) external onlyRole(ADMIN_ROLE) {
        require(key != bytes32(0), "Invalid parameter key");
        require(!parameters[key].exists, "Parameter already exists");
        require(bytes(description).length > 0, "Description required");

        parameters[key] = Parameter({
            key: key,
            paramType: paramType,
            category: category,
            validationLevel: validationLevel,
            value: initialValue,
            pendingValue: bytes32(0),
            lastUpdate: block.timestamp,
            updateCount: 0,
            exists: true,
            locked: false,
            description: description
        });

        parameterKeys.push(key);
        parametersByCategory[category].push(key);

        emit ParameterRegistered(key, paramType, category, validationLevel, description);
    }

    /**
     * @notice Create a parameter change proposal
     */
    function createProposal(
        bytes32 parameterKey,
        bytes32 newValue,
        string calldata reason,
        bool emergency
    ) external 
        onlyRole(GOVERNOR_ROLE) 
        parameterExists(parameterKey) 
        notParameterLocked(parameterKey)
        returns (bytes32 proposalId) 
    {
        Parameter storage param = parameters[parameterKey];
        
        if (emergency) {
            require(hasRole(EMERGENCY_ROLE, msg.sender), "Emergency role required");
        }

        require(newValue != param.value, "Value unchanged");

        proposalId = keccak256(abi.encodePacked(
            parameterKey,
            newValue,
            msg.sender,
            block.timestamp,
            totalProposals
        ));

        uint256 executeAfter;
        if (emergency) {
            executeAfter = block.timestamp + governanceConfig.emergencyDelay;
        } else {
            uint256 baseDelay = governanceConfig.proposalDelay + governanceConfig.votingDuration;
            executeAfter = block.timestamp + baseDelay;
        }

        uint256 expiresAt = executeAfter + governanceConfig.executionDelay + 7 days;
        uint256 requiredApprovals = _getRequiredApprovals(param.validationLevel, emergency);

        proposals[proposalId] = Proposal({
            proposalId: proposalId,
            parameterKey: parameterKey,
            newValue: newValue,
            proposer: msg.sender,
            proposedAt: block.timestamp,
            executeAfter: executeAfter,
            expiresAt: expiresAt,
            status: ProposalStatus.PENDING,
            approvalCount: 0,
            requiredApprovals: requiredApprovals,
            reason: reason,
            emergencyProposal: emergency
        });

        allProposals.push(proposalId);
        userProposals[msg.sender].push(proposalId);
        totalProposals++;
        proposalsByCategory[param.category]++;

        emit ProposalCreated(
            proposalId,
            parameterKey,
            msg.sender,
            newValue,
            executeAfter,
            emergency
        );

        return proposalId;
    }

    /**
     * @notice Approve a parameter change proposal
     */
    function approveProposal(
        bytes32 proposalId,
        string calldata comments
    ) external 
        onlyValidator 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.PENDING, "Proposal not pending");
        require(block.timestamp < proposal.expiresAt, "Proposal expired");
        require(!approvals[proposalId][msg.sender].approved, "Already approved");

        approvals[proposalId][msg.sender] = Approval({
            validator: msg.sender,
            timestamp: block.timestamp,
            approved: true,
            comments: comments
        });

        proposalValidators[proposalId].push(msg.sender);
        proposal.approvalCount++;

        if (proposal.approvalCount >= proposal.requiredApprovals) {
            proposal.status = ProposalStatus.APPROVED;
        }

        emit ProposalApproved(
            proposalId,
            msg.sender,
            proposal.approvalCount,
            proposal.requiredApprovals
        );
    }

    /**
     * @notice Execute an approved proposal
     */
    function executeProposal(bytes32 proposalId) 
        external 
        onlyRole(EXECUTOR_ROLE) 
        proposalExists(proposalId) 
        nonReentrant 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.APPROVED, "Proposal not approved");
        require(block.timestamp >= proposal.executeAfter, "Timelock not expired");
        require(block.timestamp < proposal.expiresAt, "Proposal expired");

        Parameter storage param = parameters[proposal.parameterKey];
        require(!param.locked, "Parameter locked");

        bytes32 oldValue = param.value;
        param.value = proposal.newValue;
        param.lastUpdate = block.timestamp;
        param.updateCount++;

        proposal.status = ProposalStatus.EXECUTED;
        executedProposals++;

        parameterHistory[proposal.parameterKey].push(ParameterChange({
            parameterKey: proposal.parameterKey,
            oldValue: oldValue,
            newValue: proposal.newValue,
            changedBy: msg.sender,
            timestamp: block.timestamp,
            reason: proposal.reason,
            emergency: proposal.emergencyProposal
        }));

        emit ProposalExecuted(
            proposalId,
            proposal.parameterKey,
            oldValue,
            proposal.newValue,
            msg.sender
        );

        emit ParameterUpdated(
            proposal.parameterKey,
            oldValue,
            proposal.newValue,
            msg.sender,
            proposal.reason,
            proposal.emergencyProposal
        );
    }

    // ============ VALIDATION ============

    /**
     * @notice Get required approvals based on validation level
     */
    function _getRequiredApprovals(ValidationLevel level, bool emergency) 
        internal 
        view 
        returns (uint256 required) 
    {
        if (emergency) {
            return validatorCount / 2 + 1;
        }

        if (level == ValidationLevel.LOW) {
            return 1;
        } else if (level == ValidationLevel.MEDIUM) {
            return Math.min(3, validatorCount / 3 + 1);
        } else if (level == ValidationLevel.HIGH) {
            return Math.min(5, validatorCount / 2 + 1);
        } else {
            return Math.min(7, (validatorCount * 2) / 3 + 1);
        }
    }

    // ============ VALIDATOR MANAGEMENT ============

    /**
     * @notice Add a new validator
     */
    function addValidator(address validator) external onlyRole(ADMIN_ROLE) {
        _addValidator(validator);
    }

    /**
     * @notice Remove a validator
     */
    function removeValidator(address validator) external onlyRole(ADMIN_ROLE) {
        require(validators[validator], "Not a validator");
        require(validatorCount > MIN_VALIDATORS, "Cannot remove validator below minimum");

        validators[validator] = false;
        validatorCount--;

        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == validator) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }

        _revokeRole(VALIDATOR_ROLE, validator);
        emit ValidatorRemoved(validator, msg.sender);
    }

    /**
     * @notice Internal function to add validator
     */
    function _addValidator(address validator) internal {
        require(validator != address(0), "Invalid validator address");
        require(!validators[validator], "Already a validator");

        validators[validator] = true;
        validatorList.push(validator);
        validatorCount++;

        _grantRole(VALIDATOR_ROLE, validator);
        emit ValidatorAdded(validator, msg.sender);
    }

    // ============ EMERGENCY FUNCTIONS ============

    /**
     * @notice Toggle global emergency mode
     */
    function setGlobalEmergencyMode(bool enabled, string calldata reason) 
        external 
        onlyRole(EMERGENCY_ROLE) 
    {
        globalEmergencyMode = enabled;
        lastEmergencyTime = block.timestamp;

        emit EmergencyModeToggled(enabled, msg.sender, reason);
    }

    /**
     * @notice Emergency parameter update (bypasses normal timelock)
     */
    function emergencyParameterUpdate(
        bytes32 parameterKey,
        bytes32 newValue,
        string calldata reason
    ) external 
        onlyRole(EMERGENCY_ROLE) 
        parameterExists(parameterKey) 
    {
        Parameter storage param = parameters[parameterKey];
        require(!param.locked, "Parameter locked");

        bytes32 oldValue = param.value;
        param.value = newValue;
        param.lastUpdate = block.timestamp;
        param.updateCount++;

        parameterHistory[parameterKey].push(ParameterChange({
            parameterKey: parameterKey,
            oldValue: oldValue,
            newValue: newValue,
            changedBy: msg.sender,
            timestamp: block.timestamp,
            reason: reason,
            emergency: true
        }));

        emit ParameterUpdated(
            parameterKey,
            oldValue,
            newValue,
            msg.sender,
            reason,
            true
        );
    }

    /**
     * @notice Lock/unlock parameter from changes
     */
    function setParameterLocked(bytes32 parameterKey, bool locked) 
        external 
        onlyRole(ADMIN_ROLE) 
        parameterExists(parameterKey) 
    {
        parameters[parameterKey].locked = locked;
    }

    // ============ CORE PARAMETER REGISTRATION ============

    /**
     * @notice Register core governance parameters
     */
    function _registerCoreParameters() internal {
        _registerParameter(
            "gov.proposal_delay",
            ParameterType.UINT256,
            ParameterCategory.GOVERNANCE,
            ValidationLevel.HIGH,
            bytes32(governanceConfig.proposalDelay),
            "Proposal delay before execution"
        );

        _registerParameter(
            "trading.max_leverage",
            ParameterType.UINT256,
            ParameterCategory.TRADING,
            ValidationLevel.HIGH,
            bytes32(uint256(100)),
            "Maximum leverage allowed"
        );

        _registerParameter(
            "risk.liquidation_threshold",
            ParameterType.UINT256,
            ParameterCategory.RISK,
            ValidationLevel.HIGH,
            bytes32(uint256(1000)),
            "Liquidation threshold in basis points"
        );
    }

    /**
     * @notice Internal parameter registration
     */
    function _registerParameter(
        string memory keyStr,
        ParameterType paramType,
        ParameterCategory category,
        ValidationLevel validationLevel,
        bytes32 initialValue,
        string memory description
    ) internal {
        bytes32 key = keccak256(bytes(keyStr));
        
        parameters[key] = Parameter({
            key: key,
            paramType: paramType,
            category: category,
            validationLevel: validationLevel,
            value: initialValue,
            pendingValue: bytes32(0),
            lastUpdate: block.timestamp,
            updateCount: 0,
            exists: true,
            locked: false,
            description: description
        });

        parameterKeys.push(key);
        parametersByCategory[category].push(key);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get parameter value as uint256
     */
    function getParameterUint256(bytes32 key) 
        external 
        view 
        parameterExists(key) 
        returns (uint256 value) 
    {
        require(parameters[key].paramType == ParameterType.UINT256, "Not uint256 parameter");
        return uint256(parameters[key].value);
    }

    /**
     * @notice Get parameter details
     */
    function getParameterDetails(bytes32 key) 
        external 
        view 
        parameterExists(key) 
        returns (Parameter memory param) 
    {
        return parameters[key];
    }

    /**
     * @notice Get proposal details
     */
    function getProposal(bytes32 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (Proposal memory proposal) 
    {
        return proposals[proposalId];
    }

    /**
     * @notice Get all parameter keys
     */
    function getAllParameterKeys() external view returns (bytes32[] memory keys) {
        return parameterKeys;
    }

    /**
     * @notice Get all validators
     */
    function getAllValidators() external view returns (address[] memory validatorAddresses) {
        return validatorList;
    }

    /**
     * @notice Get governance statistics
     */
    function getGovernanceStats() 
        external 
        view 
        returns (
            uint256 totalProps,
            uint256 executedProps,
            uint256 rejectedProps,
            uint256 totalParams,
            uint256 validatorCnt
        ) 
    {
        totalProps = totalProposals;
        executedProps = executedProposals;
        rejectedProps = rejectedProposals;
        totalParams = parameterKeys.length;
        validatorCnt = validatorCount;
    }
}