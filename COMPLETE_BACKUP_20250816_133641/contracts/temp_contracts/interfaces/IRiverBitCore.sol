// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title IRiverBitCore
 * @notice Interface for the RiverBit core contract
 */
interface IRiverBitCore {
    
    // ============ ENUMS ============
    
    enum ProtocolStatus {
        NORMAL,
        MAINTENANCE,
        EMERGENCY,
        DEPRECATED
    }

    // ============ STRUCTS ============
    
    struct ProtocolState {
        uint128 totalValueLocked;
        uint64 lastUpdateTimestamp;
        uint32 globalSequenceNumber;
        uint16 activeModuleCount;
        uint8 protocolVersion;
        bool initialized;
    }

    // ============ EVENTS ============
    
    event CoreInitialized(address admin, uint256 timestamp);
    event ProtocolStateUpdated(uint256 newTVL, uint256 timestamp);
    event ModuleExecuted(address module, bytes4 selector, uint256 gas);

    // ============ FUNCTIONS ============
    
    function execute(bytes calldata data) external payable returns (bytes memory);
    function updateProtocolState(uint128 newTVL) external;
    function getProtocolState() external view returns (ProtocolState memory);
    function isActiveModule(address moduleAddress) external view returns (bool);
    function sendCrossChainMessage(uint256 targetChain, bytes calldata message) external;
}