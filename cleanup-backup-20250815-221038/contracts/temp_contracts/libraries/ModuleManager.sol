// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title ModuleManager
 * @notice Library for managing protocol modules with hot-swapping capability
 * @dev Provides secure module registration, deregistration, and state management
 */
library ModuleManager {
    
    // ============ STRUCTS ============
    
    struct ModuleInfo {
        address moduleAddress;       // Module contract address
        bytes32 moduleId;           // Unique module identifier
        uint256 version;            // Module version
        uint64 registeredAt;        // Registration timestamp
        uint64 lastActiveAt;        // Last activity timestamp
        bool isActive;              // Active status
        uint8 moduleType;           // Module type (0=Core, 1=Trading, 2=RiverPool, etc.)
    }
    
    struct ModuleState {
        mapping(bytes32 => ModuleInfo) modules;           // moduleId => ModuleInfo
        mapping(address => bytes32) moduleAddressToId;    // address => moduleId
        mapping(uint8 => bytes32[]) modulesByType;        // moduleType => moduleIds[]
        bytes32[] activeModules;                          // List of active module IDs
        uint256 totalModules;                             // Total registered modules
        uint8 maxModulesPerType;                         // Maximum modules per type
    }
    
    // ============ ERRORS ============
    
    error ModuleAlreadyRegistered();
    error ModuleNotFound();
    error ModuleNotActive();
    error MaxModulesPerTypeExceeded();
    error InvalidModuleType();
    error InvalidModuleAddress();
    
    // ============ EVENTS ============
    
    event ModuleRegistered(bytes32 indexed moduleId, address indexed moduleAddress, uint8 moduleType);
    event ModuleDeregistered(bytes32 indexed moduleId, address indexed moduleAddress);
    event ModuleActivated(bytes32 indexed moduleId);
    event ModuleDeactivated(bytes32 indexed moduleId);
    
    // ============ CONSTANTS ============
    
    uint8 internal constant MODULE_TYPE_CORE = 0;
    uint8 internal constant MODULE_TYPE_TRADING = 1;
    uint8 internal constant MODULE_TYPE_RIVERPOOL = 2;
    uint8 internal constant MODULE_TYPE_MARGIN = 3;
    uint8 internal constant MODULE_TYPE_ORDER = 4;
    uint8 internal constant MODULE_TYPE_LIQUIDATION = 5;
    uint8 internal constant MODULE_TYPE_ORACLE = 6;
    uint8 internal constant MODULE_TYPE_GOVERNANCE = 7;
    uint8 internal constant MAX_MODULE_TYPES = 8;
    
    // ============ FUNCTIONS ============
    
    /**
     * @notice Initialize module state
     * @param self Module state storage
     */
    function initialize(ModuleState storage self) internal {
        self.maxModulesPerType = 10; // Default limit
    }
    
    /**
     * @notice Register a new module
     * @param self Module state storage
     * @param moduleAddress Address of the module contract
     * @param moduleId Unique identifier for the module
     * @param moduleType Type of the module
     * @param version Module version
     */
    function registerModule(
        ModuleState storage self,
        address moduleAddress,
        bytes32 moduleId,
        uint8 moduleType,
        uint256 version
    ) internal {
        if (moduleAddress == address(0)) revert InvalidModuleAddress();
        if (moduleType >= MAX_MODULE_TYPES) revert InvalidModuleType();
        if (self.modules[moduleId].moduleAddress != address(0)) revert ModuleAlreadyRegistered();
        if (self.modulesByType[moduleType].length >= self.maxModulesPerType) {
            revert MaxModulesPerTypeExceeded();
        }
        
        // Create module info
        ModuleInfo memory moduleInfo = ModuleInfo({
            moduleAddress: moduleAddress,
            moduleId: moduleId,
            version: version,
            registeredAt: uint64(block.timestamp),
            lastActiveAt: uint64(block.timestamp),
            isActive: true,
            moduleType: moduleType
        });
        
        // Store module
        self.modules[moduleId] = moduleInfo;
        self.moduleAddressToId[moduleAddress] = moduleId;
        self.modulesByType[moduleType].push(moduleId);
        self.activeModules.push(moduleId);
        self.totalModules++;
        
        emit ModuleRegistered(moduleId, moduleAddress, moduleType);
    }
    
    /**
     * @notice Deregister a module
     * @param self Module state storage
     * @param moduleId Module identifier to deregister
     */
    function deregisterModule(ModuleState storage self, bytes32 moduleId) internal {
        ModuleInfo storage moduleInfo = self.modules[moduleId];
        if (moduleInfo.moduleAddress == address(0)) revert ModuleNotFound();
        
        address moduleAddress = moduleInfo.moduleAddress;
        uint8 moduleType = moduleInfo.moduleType;
        
        // Remove from active modules
        _removeFromActiveModules(self, moduleId);
        
        // Remove from modules by type
        _removeFromModulesByType(self, moduleType, moduleId);
        
        // Clean up mappings
        delete self.moduleAddressToId[moduleAddress];
        delete self.modules[moduleId];
        self.totalModules--;
        
        emit ModuleDeregistered(moduleId, moduleAddress);
    }
    
    /**
     * @notice Activate a module
     * @param self Module state storage
     * @param moduleId Module identifier to activate
     */
    function activateModule(ModuleState storage self, bytes32 moduleId) internal {
        ModuleInfo storage moduleInfo = self.modules[moduleId];
        if (moduleInfo.moduleAddress == address(0)) revert ModuleNotFound();
        
        if (!moduleInfo.isActive) {
            moduleInfo.isActive = true;
            moduleInfo.lastActiveAt = uint64(block.timestamp);
            self.activeModules.push(moduleId);
            
            emit ModuleActivated(moduleId);
        }
    }
    
    /**
     * @notice Deactivate a module
     * @param self Module state storage
     * @param moduleId Module identifier to deactivate
     */
    function deactivateModule(ModuleState storage self, bytes32 moduleId) internal {
        ModuleInfo storage moduleInfo = self.modules[moduleId];
        if (moduleInfo.moduleAddress == address(0)) revert ModuleNotFound();
        
        if (moduleInfo.isActive) {
            moduleInfo.isActive = false;
            _removeFromActiveModules(self, moduleId);
            
            emit ModuleDeactivated(moduleId);
        }
    }
    
    /**
     * @notice Update module last active timestamp
     * @param self Module state storage
     * @param moduleAddress Module address
     */
    function updateModuleActivity(ModuleState storage self, address moduleAddress) internal {
        bytes32 moduleId = self.moduleAddressToId[moduleAddress];
        if (moduleId != bytes32(0)) {
            self.modules[moduleId].lastActiveAt = uint64(block.timestamp);
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Check if a module is active
     * @param self Module state storage
     * @param moduleAddress Module address to check
     * @return bool Whether the module is active
     */
    function isActiveModule(ModuleState storage self, address moduleAddress) internal view returns (bool) {
        bytes32 moduleId = self.moduleAddressToId[moduleAddress];
        return moduleId != bytes32(0) && self.modules[moduleId].isActive;
    }
    
    /**
     * @notice Get module information
     * @param self Module state storage
     * @param moduleId Module identifier
     * @return ModuleInfo Module information
     */
    function getModuleInfo(ModuleState storage self, bytes32 moduleId) internal view returns (ModuleInfo memory) {
        return self.modules[moduleId];
    }
    
    /**
     * @notice Get module address
     * @param self Module state storage
     * @param moduleId Module identifier
     * @return address Module address
     */
    function getModuleAddress(ModuleState storage self, bytes32 moduleId) internal view returns (address) {
        return self.modules[moduleId].moduleAddress;
    }
    
    /**
     * @notice Get module ID from address
     * @param self Module state storage
     * @param moduleAddress Module address
     * @return bytes32 Module ID
     */
    function getModuleId(ModuleState storage self, address moduleAddress) internal view returns (bytes32) {
        return self.moduleAddressToId[moduleAddress];
    }
    
    /**
     * @notice Get all active modules
     * @param self Module state storage
     * @return bytes32[] Array of active module IDs
     */
    function getActiveModules(ModuleState storage self) internal view returns (bytes32[] memory) {
        return self.activeModules;
    }
    
    /**
     * @notice Get modules by type
     * @param self Module state storage
     * @param moduleType Module type
     * @return bytes32[] Array of module IDs for the given type
     */
    function getModulesByType(ModuleState storage self, uint8 moduleType) internal view returns (bytes32[] memory) {
        return self.modulesByType[moduleType];
    }
    
    /**
     * @notice Get total module count
     * @param self Module state storage
     * @return uint256 Total number of registered modules
     */
    function getTotalModules(ModuleState storage self) internal view returns (uint256) {
        return self.totalModules;
    }
    
    /**
     * @notice Get active module count
     * @param self Module state storage
     * @return uint256 Number of active modules
     */
    function getActiveModuleCount(ModuleState storage self) internal view returns (uint256) {
        return self.activeModules.length;
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Remove module from active modules array
     * @param self Module state storage
     * @param moduleId Module ID to remove
     */
    function _removeFromActiveModules(ModuleState storage self, bytes32 moduleId) internal {
        bytes32[] storage activeModules = self.activeModules;
        uint256 length = activeModules.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (activeModules[i] == moduleId) {
                // Move last element to current position
                activeModules[i] = activeModules[length - 1];
                // Remove last element
                activeModules.pop();
                break;
            }
        }
    }
    
    /**
     * @notice Remove module from modules by type array
     * @param self Module state storage
     * @param moduleType Module type
     * @param moduleId Module ID to remove
     */
    function _removeFromModulesByType(
        ModuleState storage self,
        uint8 moduleType,
        bytes32 moduleId
    ) internal {
        bytes32[] storage modulesByType = self.modulesByType[moduleType];
        uint256 length = modulesByType.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (modulesByType[i] == moduleId) {
                // Move last element to current position
                modulesByType[i] = modulesByType[length - 1];
                // Remove last element
                modulesByType.pop();
                break;
            }
        }
    }
}