// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/IModuleRegistry.sol";
import "../libraries/Events.sol";
import "../libraries/Errors.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/**
 * @title ModuleRegistry
 * @notice Central registry for protocol modules with versioning and upgrade management
 * @dev Manages module registration, validation, and upgrade paths for the RiverBit protocol
 * 
 * Key Features:
 * - Secure module registration with validation
 * - Version management and upgrade paths
 * - Module dependency tracking
 * - Automated compatibility checking
 * - Emergency module blacklisting
 * - Governance integration for module approval
 */
contract ModuleRegistry is 
    IModuleRegistry,
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    // ============ ROLES ============
    bytes32 public constant MODULE_ADMIN_ROLE = keccak256("MODULE_ADMIN_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant MAX_MODULES_PER_TYPE = 50;
    uint256 private constant MAX_DEPENDENCIES = 10;
    uint256 private constant UPGRADE_TIMELOCK = 48 hours;
    uint256 private constant VALIDATION_PERIOD = 24 hours;

    // ============ STATE VARIABLES ============
    
    // Module storage
    mapping(bytes32 => ModuleInfo) public modules;
    mapping(address => bytes32) public addressToModuleId;
    mapping(ModuleType => bytes32[]) public modulesByType;
    
    // Version management
    mapping(bytes32 => Version[]) public moduleVersions;
    mapping(bytes32 => bytes32) public latestVersion;
    mapping(bytes32 => mapping(bytes32 => bool)) public versionExists;
    
    // Upgrade management
    mapping(bytes32 => UpgradeProposal) public upgradeProposals;
    mapping(bytes32 => mapping(address => bool)) public upgradeVotes;
    mapping(bytes32 => uint256) public upgradeVoteCounts;
    
    // Dependencies and compatibility
    mapping(bytes32 => bytes32[]) public moduleDependencies;
    mapping(bytes32 => bytes32[]) public dependentModules;
    mapping(bytes32 => mapping(bytes32 => bool)) public compatibilityMatrix;
    
    // Security and validation
    mapping(bytes32 => bool) public blacklistedModules;
    mapping(address => bool) public trustedValidators;
    mapping(bytes32 => ValidationResult) public validationResults;
    
    // Governance
    address public governanceContract;
    uint256 public validatorThreshold;
    uint256 public upgradeThreshold;
    
    // Statistics
    uint256 public totalModules;
    uint256 public totalVersions;
    mapping(ModuleType => uint256) public moduleCountsByType;

    // ============ STRUCTS ============
    
    struct ModuleInfo {
        bytes32 moduleId;                   // Unique module identifier
        address moduleAddress;              // Current module address
        ModuleType moduleType;              // Type of module
        string name;                        // Human-readable name
        string description;                 // Module description
        bytes32 currentVersion;             // Current version hash
        address developer;                  // Module developer
        uint256 registrationTime;          // Registration timestamp
        bool isActive;                      // Active status
        bool isDeprecated;                  // Deprecation status
    }
    
    struct Version {
        bytes32 versionHash;                // Version identifier
        uint256 majorVersion;               // Major version number
        uint256 minorVersion;               // Minor version number
        uint256 patchVersion;               // Patch version number
        address implementation;             // Implementation address
        bytes32 codeHash;                   // Code hash for verification
        string releaseNotes;                // Release notes
        uint256 releaseTime;                // Release timestamp
        bool isStable;                      // Stability flag
    }
    
    struct UpgradeProposal {
        bytes32 moduleId;                   // Module to upgrade
        bytes32 newVersion;                 // Target version
        address proposer;                   // Upgrade proposer
        uint256 proposalTime;               // Proposal timestamp
        uint256 executionTime;              // Earliest execution time
        string justification;               // Upgrade justification
        UpgradeStatus status;               // Proposal status
        bool requiresGovernance;            // Governance requirement
    }
    
    struct ValidationResult {
        bool isValid;                       // Validation status
        uint256 validatorCount;             // Number of validators
        mapping(address => bool) validatedBy; // Validator tracking
        string[] issues;                    // Identified issues
        uint256 timestamp;                  // Validation timestamp
    }

    // ============ EVENTS ============
    
    event ModuleRegistered(
        bytes32 indexed moduleId,
        address indexed moduleAddress,
        ModuleType moduleType,
        string name
    );
    
    event VersionAdded(
        bytes32 indexed moduleId,
        bytes32 indexed versionHash,
        uint256 majorVersion,
        uint256 minorVersion,
        uint256 patchVersion
    );
    
    event UpgradeProposed(
        bytes32 indexed moduleId,
        bytes32 indexed newVersion,
        address proposer,
        uint256 executionTime
    );
    
    event UpgradeExecuted(
        bytes32 indexed moduleId,
        bytes32 indexed oldVersion,
        bytes32 indexed newVersion
    );
    
    event ModuleValidated(
        bytes32 indexed moduleId,
        address indexed validator,
        bool isValid
    );
    
    event ModuleBlacklisted(
        bytes32 indexed moduleId,
        string reason,
        address admin
    );
    
    event DependencyAdded(
        bytes32 indexed moduleId,
        bytes32 indexed dependencyId
    );

    // ============ MODIFIERS ============
    
    modifier validModuleId(bytes32 moduleId) {
        require(moduleId != bytes32(0), Errors.INVALID_MODULE_ID);
        require(modules[moduleId].moduleAddress != address(0), Errors.MODULE_NOT_FOUND);
        _;
    }
    
    modifier notBlacklisted(bytes32 moduleId) {
        require(!blacklistedModules[moduleId], Errors.MODULE_BLACKLISTED);
        _;
    }
    
    modifier onlyTrustedValidator() {
        require(trustedValidators[msg.sender], Errors.NOT_TRUSTED_VALIDATOR);
        _;
    }

    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize module registry
     * @param _admin Admin address
     * @param _governanceContract Governance contract address
     */
    function initialize(
        address _admin,
        address _governanceContract
    ) external initializer {
        __AccessControl_init();
        __Pausable_init();

        require(_admin != address(0), Errors.ZERO_ADDRESS);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MODULE_ADMIN_ROLE, _admin);
        _grantRole(VALIDATOR_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);

        governanceContract = _governanceContract;
        validatorThreshold = 3;
        upgradeThreshold = 5;
        trustedValidators[_admin] = true;
    }

    // ============ MODULE REGISTRATION ============
    
    /**
     * @notice Register a new module
     * @param moduleId Unique module identifier
     * @param moduleAddress Module contract address
     * @param moduleType Type of module
     * @param name Human-readable name
     * @param description Module description
     * @param initialVersion Initial version information
     */
    function registerModule(
        bytes32 moduleId,
        address moduleAddress,
        ModuleType moduleType,
        string calldata name,
        string calldata description,
        Version calldata initialVersion
    ) external onlyRole(MODULE_ADMIN_ROLE) whenNotPaused {
        require(moduleId != bytes32(0), Errors.INVALID_MODULE_ID);
        require(moduleAddress != address(0), Errors.ZERO_ADDRESS);
        require(modules[moduleId].moduleAddress == address(0), Errors.MODULE_ALREADY_EXISTS);
        require(
            moduleCountsByType[moduleType] < MAX_MODULES_PER_TYPE,
            Errors.MAX_MODULES_EXCEEDED
        );
        
        // Validate module contract
        require(_isContract(moduleAddress), Errors.NOT_CONTRACT);
        require(_validateModuleInterface(moduleAddress, moduleType), Errors.INVALID_INTERFACE);
        
        // Create module info
        ModuleInfo memory moduleInfo = ModuleInfo({
            moduleId: moduleId,
            moduleAddress: moduleAddress,
            moduleType: moduleType,
            name: name,
            description: description,
            currentVersion: initialVersion.versionHash,
            developer: msg.sender,
            registrationTime: block.timestamp,
            isActive: true,
            isDeprecated: false
        });
        
        // Store module
        modules[moduleId] = moduleInfo;
        addressToModuleId[moduleAddress] = moduleId;
        modulesByType[moduleType].push(moduleId);
        
        // Add initial version
        _addVersion(moduleId, initialVersion);
        
        // Update counters
        totalModules++;
        moduleCountsByType[moduleType]++;
        
        emit ModuleRegistered(moduleId, moduleAddress, moduleType, name);
    }
    
    /**
     * @notice Add new version for existing module
     * @param moduleId Module identifier
     * @param version Version information
     */
    function addVersion(
        bytes32 moduleId,
        Version calldata version
    ) external validModuleId(moduleId) notBlacklisted(moduleId) {
        ModuleInfo storage moduleInfo = modules[moduleId];
        require(
            msg.sender == moduleInfo.developer || hasRole(MODULE_ADMIN_ROLE, msg.sender),
            Errors.UNAUTHORIZED
        );
        require(!versionExists[moduleId][version.versionHash], Errors.VERSION_ALREADY_EXISTS);
        
        _addVersion(moduleId, version);
        
        emit VersionAdded(
            moduleId,
            version.versionHash,
            version.majorVersion,
            version.minorVersion,
            version.patchVersion
        );
    }

    // ============ UPGRADE MANAGEMENT ============
    
    /**
     * @notice Propose module upgrade
     * @param moduleId Module to upgrade
     * @param newVersion Target version
     * @param justification Upgrade justification
     * @param requiresGovernance Whether governance approval is needed
     */
    function proposeUpgrade(
        bytes32 moduleId,
        bytes32 newVersion,
        string calldata justification,
        bool requiresGovernance
    ) external validModuleId(moduleId) notBlacklisted(moduleId) {
        require(versionExists[moduleId][newVersion], Errors.VERSION_NOT_FOUND);
        require(
            hasRole(MODULE_ADMIN_ROLE, msg.sender) || 
            modules[moduleId].developer == msg.sender,
            Errors.UNAUTHORIZED
        );
        
        bytes32 proposalId = keccak256(abi.encodePacked(moduleId, newVersion, block.timestamp));
        
        upgradeProposals[proposalId] = UpgradeProposal({
            moduleId: moduleId,
            newVersion: newVersion,
            proposer: msg.sender,
            proposalTime: block.timestamp,
            executionTime: block.timestamp + UPGRADE_TIMELOCK,
            justification: justification,
            status: UpgradeStatus.PROPOSED,
            requiresGovernance: requiresGovernance
        });
        
        emit UpgradeProposed(moduleId, newVersion, msg.sender, block.timestamp + UPGRADE_TIMELOCK);
    }
    
    /**
     * @notice Vote on upgrade proposal
     * @param proposalId Proposal identifier
     * @param support Whether to support the upgrade
     */
    function voteOnUpgrade(
        bytes32 proposalId,
        bool support
    ) external onlyRole(VALIDATOR_ROLE) {
        UpgradeProposal storage proposal = upgradeProposals[proposalId];
        require(proposal.proposalTime > 0, Errors.PROPOSAL_NOT_FOUND);
        require(proposal.status == UpgradeStatus.PROPOSED, Errors.INVALID_PROPOSAL_STATUS);
        require(!upgradeVotes[proposalId][msg.sender], Errors.ALREADY_VOTED);
        
        upgradeVotes[proposalId][msg.sender] = true;
        if (support) {
            upgradeVoteCounts[proposalId]++;
        }
        
        // Check if threshold reached
        if (upgradeVoteCounts[proposalId] >= upgradeThreshold) {
            proposal.status = UpgradeStatus.APPROVED;
        }
    }
    
    /**
     * @notice Execute approved upgrade
     * @param proposalId Proposal identifier
     */
    function executeUpgrade(bytes32 proposalId) external {
        UpgradeProposal storage proposal = upgradeProposals[proposalId];
        require(proposal.status == UpgradeStatus.APPROVED, Errors.PROPOSAL_NOT_APPROVED);
        require(block.timestamp >= proposal.executionTime, Errors.TIMELOCK_NOT_EXPIRED);
        
        // Check governance approval if required
        if (proposal.requiresGovernance && governanceContract != address(0)) {
            require(_checkGovernanceApproval(proposalId), Errors.GOVERNANCE_NOT_APPROVED);
        }
        
        // Execute upgrade
        ModuleInfo storage moduleInfo = modules[proposal.moduleId];
        bytes32 oldVersion = moduleInfo.currentVersion;
        moduleInfo.currentVersion = proposal.newVersion;
        
        // Update implementation address
        Version[] storage versions = moduleVersions[proposal.moduleId];
        for (uint256 i = 0; i < versions.length; i++) {
            if (versions[i].versionHash == proposal.newVersion) {
                moduleInfo.moduleAddress = versions[i].implementation;
                addressToModuleId[versions[i].implementation] = proposal.moduleId;
                break;
            }
        }
        
        proposal.status = UpgradeStatus.EXECUTED;
        latestVersion[proposal.moduleId] = proposal.newVersion;
        
        emit UpgradeExecuted(proposal.moduleId, oldVersion, proposal.newVersion);
    }

    // ============ VALIDATION SYSTEM ============
    
    /**
     * @notice Validate module
     * @param moduleId Module to validate
     * @param isValid Validation result
     * @param issues Array of identified issues
     */
    function validateModule(
        bytes32 moduleId,
        bool isValid,
        string[] calldata issues
    ) external validModuleId(moduleId) onlyTrustedValidator {
        ValidationResult storage result = validationResults[moduleId];
        
        require(!result.validatedBy[msg.sender], Errors.ALREADY_VALIDATED);
        
        result.validatedBy[msg.sender] = true;
        result.validatorCount++;
        result.timestamp = block.timestamp;
        
        if (!isValid) {
            for (uint256 i = 0; i < issues.length; i++) {
                result.issues.push(issues[i]);
            }
        }
        
        // Update overall validation status
        if (result.validatorCount >= validatorThreshold) {
            result.isValid = isValid;
        }
        
        emit ModuleValidated(moduleId, msg.sender, isValid);
    }
    
    /**
     * @notice Add trusted validator
     * @param validator Validator address
     */
    function addTrustedValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(validator != address(0), Errors.ZERO_ADDRESS);
        trustedValidators[validator] = true;
        _grantRole(VALIDATOR_ROLE, validator);
    }
    
    /**
     * @notice Remove trusted validator
     * @param validator Validator address
     */
    function removeTrustedValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trustedValidators[validator] = false;
        _revokeRole(VALIDATOR_ROLE, validator);
    }

    // ============ DEPENDENCY MANAGEMENT ============
    
    /**
     * @notice Add module dependency
     * @param moduleId Module identifier
     * @param dependencyId Dependency module identifier
     */
    function addDependency(
        bytes32 moduleId,
        bytes32 dependencyId
    ) external validModuleId(moduleId) validModuleId(dependencyId) onlyRole(MODULE_ADMIN_ROLE) {
        require(
            moduleDependencies[moduleId].length < MAX_DEPENDENCIES,
            Errors.MAX_DEPENDENCIES_EXCEEDED
        );
        require(!_hasDependency(moduleId, dependencyId), Errors.DEPENDENCY_ALREADY_EXISTS);
        require(!_wouldCreateCycle(moduleId, dependencyId), Errors.CIRCULAR_DEPENDENCY);
        
        moduleDependencies[moduleId].push(dependencyId);
        dependentModules[dependencyId].push(moduleId);
        
        emit DependencyAdded(moduleId, dependencyId);
    }
    
    /**
     * @notice Check module compatibility
     * @param moduleId1 First module
     * @param moduleId2 Second module
     * @return compatible Whether modules are compatible
     */
    function checkCompatibility(
        bytes32 moduleId1,
        bytes32 moduleId2
    ) external view returns (bool compatible) {
        return compatibilityMatrix[moduleId1][moduleId2] || 
               compatibilityMatrix[moduleId2][moduleId1];
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @notice Blacklist module
     * @param moduleId Module to blacklist
     * @param reason Blacklist reason
     */
    function blacklistModule(
        bytes32 moduleId,
        string calldata reason
    ) external validModuleId(moduleId) onlyRole(EMERGENCY_ROLE) {
        blacklistedModules[moduleId] = true;
        modules[moduleId].isActive = false;
        
        emit ModuleBlacklisted(moduleId, reason, msg.sender);
    }
    
    /**
     * @notice Remove module from blacklist
     * @param moduleId Module to unblacklist
     */
    function unblacklistModule(bytes32 moduleId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blacklistedModules[moduleId] = false;
        modules[moduleId].isActive = true;
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Check if module is valid
     * @param moduleAddress Module address
     * @param moduleId Module identifier
     * @return valid Whether module is valid
     */
    function isValidModule(
        address moduleAddress,
        bytes32 moduleId
    ) external view override returns (bool valid) {
        ModuleInfo storage moduleInfo = modules[moduleId];
        return moduleInfo.moduleAddress == moduleAddress && 
               moduleInfo.isActive && 
               !blacklistedModules[moduleId];
    }
    
    /**
     * @notice Get module version
     * @param moduleAddress Module address
     * @return version Module version hash
     */
    function getModuleVersion(address moduleAddress) external view override returns (uint256 version) {
        bytes32 moduleId = addressToModuleId[moduleAddress];
        if (moduleId != bytes32(0)) {
            // Return version as uint256 (simplified)
            return uint256(modules[moduleId].currentVersion);
        }
        return 0;
    }
    
    /**
     * @notice Get modules by type
     * @param moduleType Module type
     * @return moduleIds Array of module IDs
     */
    function getModulesByType(ModuleType moduleType) external view returns (bytes32[] memory) {
        return modulesByType[moduleType];
    }
    
    /**
     * @notice Get module dependencies
     * @param moduleId Module identifier
     * @return dependencies Array of dependency IDs
     */
    function getModuleDependencies(bytes32 moduleId) external view returns (bytes32[] memory) {
        return moduleDependencies[moduleId];
    }
    
    /**
     * @notice Get module info
     * @param moduleId Module identifier
     * @return moduleInfo Module information
     */
    function getModuleInfo(bytes32 moduleId) external view returns (ModuleInfo memory) {
        return modules[moduleId];
    }
    
    /**
     * @notice Get module versions
     * @param moduleId Module identifier
     * @return versions Array of version information
     */
    function getModuleVersions(bytes32 moduleId) external view returns (Version[] memory) {
        return moduleVersions[moduleId];
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Add version to module
     * @param moduleId Module identifier
     * @param version Version information
     */
    function _addVersion(bytes32 moduleId, Version calldata version) internal {
        require(version.implementation != address(0), Errors.ZERO_ADDRESS);
        require(_isContract(version.implementation), Errors.NOT_CONTRACT);
        
        moduleVersions[moduleId].push(version);
        versionExists[moduleId][version.versionHash] = true;
        latestVersion[moduleId] = version.versionHash;
        totalVersions++;
    }
    
    /**
     * @notice Check if address is contract
     * @param addr Address to check
     * @return isContract Whether address is contract
     */
    function _isContract(address addr) internal view returns (bool isContract) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }
    
    /**
     * @notice Validate module interface
     * @param moduleAddress Module address
     * @param moduleType Module type
     * @return valid Whether interface is valid
     */
    function _validateModuleInterface(
        address moduleAddress,
        ModuleType moduleType
    ) internal view returns (bool valid) {
        // Simplified interface validation
        // In production, this would check for specific interface support
        return _isContract(moduleAddress);
    }
    
    /**
     * @notice Check if module has dependency
     * @param moduleId Module identifier
     * @param dependencyId Dependency identifier
     * @return hasDep Whether dependency exists
     */
    function _hasDependency(
        bytes32 moduleId,
        bytes32 dependencyId
    ) internal view returns (bool hasDep) {
        bytes32[] storage deps = moduleDependencies[moduleId];
        for (uint256 i = 0; i < deps.length; i++) {
            if (deps[i] == dependencyId) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Check if adding dependency would create cycle
     * @param moduleId Module identifier
     * @param dependencyId Dependency identifier
     * @return wouldCycle Whether cycle would be created
     */
    function _wouldCreateCycle(
        bytes32 moduleId,
        bytes32 dependencyId
    ) internal view returns (bool wouldCycle) {
        // Simple cycle detection (depth-first search)
        return _hasTransitiveDependency(dependencyId, moduleId);
    }
    
    /**
     * @notice Check transitive dependency
     * @param moduleId Module identifier
     * @param targetId Target dependency
     * @return hasTransitive Whether transitive dependency exists
     */
    function _hasTransitiveDependency(
        bytes32 moduleId,
        bytes32 targetId
    ) internal view returns (bool hasTransitive) {
        bytes32[] storage deps = moduleDependencies[moduleId];
        for (uint256 i = 0; i < deps.length; i++) {
            if (deps[i] == targetId) {
                return true;
            }
            if (_hasTransitiveDependency(deps[i], targetId)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Check governance approval
     * @param proposalId Proposal identifier
     * @return approved Whether governance approved
     */
    function _checkGovernanceApproval(bytes32 proposalId) internal view returns (bool approved) {
        // Simplified governance check
        // In production, this would integrate with governance contract
        return true;
    }
}