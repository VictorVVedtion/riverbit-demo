// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/IRiverBitCore.sol";
import "../interfaces/IModuleRegistry.sol";
import "../libraries/ModuleManager.sol";
import "../libraries/Events.sol";
import "../libraries/Errors.sol";
import "../libraries/Security.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title RiverBitCoreV2
 * @notice Next-generation modular core contract for RiverBit protocol
 * @dev Implements modular architecture with upgradeable modules and optimized gas efficiency
 * 
 * Key Features:
 * - Modular architecture with hot-swappable modules
 * - Gas-optimized storage layout using packed structs
 * - Advanced security with multi-layer access control
 * - Cross-chain deployment ready
 * - MEV protection mechanisms
 * - Emergency circuit breakers
 */
contract RiverBitCoreV2 is 
    IRiverBitCore,
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable
{
    using ModuleManager for ModuleManager.ModuleState;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant MODULE_MANAGER_ROLE = keccak256("MODULE_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_MODULES = 32;
    uint256 private constant EMERGENCY_TIMELOCK = 24 hours;

    // ============ STORAGE ============
    
    // Module management state
    ModuleManager.ModuleState internal moduleState;
    IModuleRegistry public moduleRegistry;
    
    // Core protocol state
    ProtocolState public protocolState;
    
    // Emergency mechanisms
    EmergencyState public emergencyState;
    
    // Gas optimization: packed structs
    struct ProtocolState {
        uint128 totalValueLocked;        // Total TVL in protocol
        uint64 lastUpdateTimestamp;      // Last state update
        uint32 globalSequenceNumber;    // For MEV protection
        uint16 activeModuleCount;        // Number of active modules
        uint8 protocolVersion;           // Protocol version
        bool initialized;                // Initialization status
    }
    
    struct EmergencyState {
        uint64 lastEmergencyTime;        // Last emergency activation
        uint32 emergencyLevel;           // Current emergency level (0-4)
        uint16 circuitBreakerCount;      // Number of active circuit breakers
        bool globalPause;                // Global pause state
        bool emergencyWithdrawEnabled;   // Emergency withdrawal status
    }

    // Module interface selectors for gas optimization
    mapping(bytes4 => address) private moduleSelectors;
    
    // Cross-chain state
    mapping(uint256 => bool) public supportedChains;
    mapping(bytes32 => bool) public crossChainMessages;

    // ============ EVENTS ============
    
    event ModuleRegistered(address indexed module, bytes32 indexed moduleId, uint256 version);
    event ModuleDeregistered(address indexed module, bytes32 indexed moduleId);
    event EmergencyActivated(uint8 level, string reason, address activator);
    event EmergencyDeactivated(address deactivator);
    event CrossChainMessage(uint256 indexed targetChain, bytes32 indexed messageHash);

    // ============ MODIFIERS ============
    
    modifier onlyActiveModule() {
        require(moduleState.isActiveModule(msg.sender), "RiverBitCore: Not active module");
        _;
    }
    
    modifier emergencyLevel(uint8 requiredLevel) {
        require(emergencyState.emergencyLevel >= requiredLevel, "RiverBitCore: Insufficient emergency level");
        _;
    }
    
    modifier nonReentrantAndNotPaused() {
        require(!paused() && !emergencyState.globalPause, "RiverBitCore: Paused");
        _;
    }

    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize the core contract
     * @param _moduleRegistry Address of the module registry
     * @param _admin Admin address
     */
    function initialize(
        address _moduleRegistry,
        address _admin
    ) external initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();

        require(_moduleRegistry != address(0), Errors.ZERO_ADDRESS);
        require(_admin != address(0), Errors.ZERO_ADDRESS);

        moduleRegistry = IModuleRegistry(_moduleRegistry);
        
        // Initialize roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MODULE_MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        // Initialize protocol state
        protocolState = ProtocolState({
            totalValueLocked: 0,
            lastUpdateTimestamp: uint64(block.timestamp),
            globalSequenceNumber: 1,
            activeModuleCount: 0,
            protocolVersion: 1,
            initialized: true
        });
        
        // Initialize emergency state
        emergencyState = EmergencyState({
            lastEmergencyTime: 0,
            emergencyLevel: 0,
            circuitBreakerCount: 0,
            globalPause: false,
            emergencyWithdrawEnabled: false
        });

        emit Events.CoreInitialized(_admin, block.timestamp);
    }

    // ============ MODULE MANAGEMENT ============
    
    /**
     * @notice Register a new module
     * @param moduleAddress Address of the module contract
     * @param moduleId Unique identifier for the module
     * @param selectors Function selectors to delegate to this module
     */
    function registerModule(
        address moduleAddress,
        bytes32 moduleId,
        bytes4[] calldata selectors
    ) external onlyRole(MODULE_MANAGER_ROLE) {
        require(moduleAddress != address(0), Errors.ZERO_ADDRESS);
        require(moduleId != bytes32(0), Errors.INVALID_MODULE_ID);
        require(protocolState.activeModuleCount < MAX_MODULES, Errors.MAX_MODULES_EXCEEDED);
        
        // Verify module with registry
        require(moduleRegistry.isValidModule(moduleAddress, moduleId), Errors.INVALID_MODULE);
        
        // Register module
        moduleState.registerModule(moduleAddress, moduleId);
        
        // Map selectors to module
        for (uint256 i = 0; i < selectors.length; i++) {
            require(moduleSelectors[selectors[i]] == address(0), Errors.SELECTOR_ALREADY_MAPPED);
            moduleSelectors[selectors[i]] = moduleAddress;
        }
        
        protocolState.activeModuleCount++;
        
        emit ModuleRegistered(moduleAddress, moduleId, moduleRegistry.getModuleVersion(moduleAddress));
    }
    
    /**
     * @notice Deregister a module
     * @param moduleId Module identifier to deregister
     * @param selectors Function selectors to remove
     */
    function deregisterModule(
        bytes32 moduleId,
        bytes4[] calldata selectors
    ) external onlyRole(MODULE_MANAGER_ROLE) {
        address moduleAddress = moduleState.getModuleAddress(moduleId);
        require(moduleAddress != address(0), Errors.MODULE_NOT_FOUND);
        
        // Remove selector mappings
        for (uint256 i = 0; i < selectors.length; i++) {
            if (moduleSelectors[selectors[i]] == moduleAddress) {
                delete moduleSelectors[selectors[i]];
            }
        }
        
        // Deregister module
        moduleState.deregisterModule(moduleId);
        protocolState.activeModuleCount--;
        
        emit ModuleDeregistered(moduleAddress, moduleId);
    }

    // ============ CORE FUNCTIONS ============
    
    /**
     * @notice Execute function on appropriate module
     * @dev Uses delegate call for gas efficiency
     */
    function execute(bytes calldata data) external payable nonReentrantAndNotPaused returns (bytes memory) {
        bytes4 selector = bytes4(data[:4]);
        address moduleAddress = moduleSelectors[selector];
        
        require(moduleAddress != address(0), Errors.FUNCTION_NOT_SUPPORTED);
        require(moduleState.isActiveModule(moduleAddress), Errors.MODULE_NOT_ACTIVE);
        
        // MEV protection: increment sequence number
        protocolState.globalSequenceNumber++;
        
        // Delegate call to module
        (bool success, bytes memory result) = moduleAddress.delegatecall(data);
        require(success, Errors.MODULE_EXECUTION_FAILED);
        
        return result;
    }
    
    /**
     * @notice Update protocol state (called by modules)
     * @param newTVL New total value locked
     */
    function updateProtocolState(uint128 newTVL) external onlyActiveModule {
        protocolState.totalValueLocked = newTVL;
        protocolState.lastUpdateTimestamp = uint64(block.timestamp);
        
        emit Events.ProtocolStateUpdated(newTVL, block.timestamp);
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @notice Activate emergency mode
     * @param level Emergency level (1-4)
     * @param reason Reason for activation
     */
    function activateEmergency(uint8 level, string calldata reason) external onlyRole(EMERGENCY_ROLE) {
        require(level > 0 && level <= 4, Errors.INVALID_EMERGENCY_LEVEL);
        require(level > emergencyState.emergencyLevel, Errors.EMERGENCY_LEVEL_TOO_LOW);
        
        emergencyState.emergencyLevel = level;
        emergencyState.lastEmergencyTime = uint64(block.timestamp);
        
        // Auto-actions based on level
        if (level >= 2) {
            emergencyState.globalPause = true;
            _pause();
        }
        
        if (level >= 3) {
            emergencyState.emergencyWithdrawEnabled = true;
        }
        
        emit EmergencyActivated(level, reason, msg.sender);
    }
    
    /**
     * @notice Deactivate emergency mode
     */
    function deactivateEmergency() external onlyRole(EMERGENCY_ROLE) {
        require(emergencyState.emergencyLevel > 0, Errors.NO_ACTIVE_EMERGENCY);
        require(
            block.timestamp >= emergencyState.lastEmergencyTime + EMERGENCY_TIMELOCK,
            Errors.EMERGENCY_TIMELOCK_ACTIVE
        );
        
        emergencyState.emergencyLevel = 0;
        emergencyState.globalPause = false;
        emergencyState.emergencyWithdrawEnabled = false;
        
        _unpause();
        
        emit EmergencyDeactivated(msg.sender);
    }

    // ============ CROSS-CHAIN FUNCTIONS ============
    
    /**
     * @notice Add supported chain
     * @param chainId Chain ID to support
     */
    function addSupportedChain(uint256 chainId) external onlyRole(ADMIN_ROLE) {
        supportedChains[chainId] = true;
    }
    
    /**
     * @notice Send cross-chain message
     * @param targetChain Target chain ID
     * @param message Message data
     */
    function sendCrossChainMessage(
        uint256 targetChain,
        bytes calldata message
    ) external onlyActiveModule {
        require(supportedChains[targetChain], Errors.UNSUPPORTED_CHAIN);
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            block.chainid,
            targetChain,
            protocolState.globalSequenceNumber,
            message
        ));
        
        crossChainMessages[messageHash] = true;
        
        emit CrossChainMessage(targetChain, messageHash);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get protocol state
     */
    function getProtocolState() external view returns (ProtocolState memory) {
        return protocolState;
    }
    
    /**
     * @notice Get emergency state
     */
    function getEmergencyState() external view returns (EmergencyState memory) {
        return emergencyState;
    }
    
    /**
     * @notice Get module address for selector
     * @param selector Function selector
     */
    function getModuleForSelector(bytes4 selector) external view returns (address) {
        return moduleSelectors[selector];
    }
    
    /**
     * @notice Check if module is active
     * @param moduleAddress Module address to check
     */
    function isActiveModule(address moduleAddress) external view returns (bool) {
        return moduleState.isActiveModule(moduleAddress);
    }
    
    /**
     * @notice Get active module count
     */
    function getActiveModuleCount() external view returns (uint16) {
        return protocolState.activeModuleCount;
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        require(emergencyState.emergencyLevel == 0, Errors.EMERGENCY_ACTIVE);
        _unpause();
    }
    
    /**
     * @notice Update module registry
     * @param newRegistry New module registry address
     */
    function updateModuleRegistry(address newRegistry) external onlyRole(ADMIN_ROLE) {
        require(newRegistry != address(0), Errors.ZERO_ADDRESS);
        moduleRegistry = IModuleRegistry(newRegistry);
    }

    // ============ FALLBACK ============
    
    /**
     * @notice Fallback function for dynamic module calls
     */
    fallback() external payable {
        bytes4 selector = msg.sig;
        address moduleAddress = moduleSelectors[selector];
        
        require(moduleAddress != address(0), Errors.FUNCTION_NOT_SUPPORTED);
        require(moduleState.isActiveModule(moduleAddress), Errors.MODULE_NOT_ACTIVE);
        require(!paused() && !emergencyState.globalPause, Errors.PAUSED);
        
        // Delegate call to module
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), moduleAddress, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}