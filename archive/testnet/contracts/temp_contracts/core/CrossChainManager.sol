// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/ICrossChainManager.sol";
import "../interfaces/IRiverBitCore.sol";
import "../libraries/Events.sol";
import "../libraries/Errors.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title CrossChainManager
 * @notice Manages cross-chain operations and asset bridging for RiverBit protocol
 * @dev Implements secure cross-chain messaging and asset transfer mechanisms
 * 
 * Key Features:
 * - Support for multiple bridge protocols (LayerZero, Wormhole, etc.)
 * - Asset bridging with validation and reconciliation
 * - Cross-chain position synchronization
 * - Emergency cross-chain circuit breakers
 * - Message verification and replay protection
 */
contract CrossChainManager is 
    ICrossChainManager,
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    // ============ ROLES ============
    bytes32 public constant BRIDGE_OPERATOR_ROLE = keccak256("BRIDGE_OPERATOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant MAX_SUPPORTED_CHAINS = 50;
    uint256 private constant MESSAGE_VALIDITY_PERIOD = 7 days;
    uint256 private constant MIN_VALIDATOR_THRESHOLD = 3;
    uint16 private constant LAYERZERO_VERSION = 1;

    // ============ STATE VARIABLES ============
    
    IRiverBitCore public coreContract;
    
    // Supported chains and their configurations
    mapping(uint256 => ChainConfig) public supportedChains;
    mapping(uint256 => bool) public chainEnabled;
    uint256[] public enabledChainIds;
    
    // Bridge configurations
    mapping(BridgeType => BridgeConfig) public bridgeConfigs;
    mapping(BridgeType => bool) public bridgeEnabled;
    
    // Cross-chain message handling
    mapping(bytes32 => CrossChainMessage) public messages;
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => uint256) public userNonces;
    
    // Validator system
    mapping(address => bool) public validators;
    mapping(bytes32 => mapping(address => bool)) public messageValidations;
    mapping(bytes32 => uint256) public validationCounts;
    address[] public validatorList;
    uint256 public validatorThreshold;
    
    // Asset bridging
    mapping(address => TokenConfig) public supportedTokens;
    mapping(uint256 => mapping(address => uint256)) public chainTokenBalances;
    mapping(bytes32 => BridgeTransaction) public bridgeTransactions;
    
    // Emergency controls
    bool public emergencyPaused;
    mapping(uint256 => bool) public chainEmergencyPaused;
    mapping(BridgeType => bool) public bridgeEmergencyPaused;

    // ============ STRUCTS ============
    
    struct ChainConfig {
        string name;                    // Chain name
        uint256 blockTime;              // Average block time
        uint256 confirmations;          // Required confirmations
        uint256 maxGasPrice;            // Maximum gas price
        address endpoint;               // Bridge endpoint address
        bool isActive;                  // Chain status
    }
    
    struct BridgeConfig {
        address bridgeContract;         // Bridge contract address
        uint256 minAmount;              // Minimum bridge amount
        uint256 maxAmount;              // Maximum bridge amount
        uint256 fee;                    // Bridge fee
        uint256 delay;                  // Bridge delay
        bool isActive;                  // Bridge status
    }
    
    struct CrossChainMessage {
        uint256 sourceChain;            // Source chain ID
        uint256 targetChain;            // Target chain ID
        address sender;                 // Message sender
        bytes payload;                  // Message payload
        uint256 timestamp;              // Message timestamp
        uint256 nonce;                  // Message nonce
        MessageType messageType;        // Type of message
        MessageStatus status;           // Message status
    }
    
    struct BridgeTransaction {
        address user;                   // User initiating bridge
        address token;                  // Token being bridged
        uint256 amount;                 // Amount to bridge
        uint256 sourceChain;            // Source chain
        uint256 targetChain;            // Target chain
        BridgeType bridgeType;          // Bridge type used
        uint256 timestamp;              // Transaction timestamp
        BridgeStatus status;            // Transaction status
        bytes32 txHash;                 // Transaction hash
    }
    
    struct TokenConfig {
        string symbol;                  // Token symbol
        uint8 decimals;                 // Token decimals
        mapping(uint256 => address) chainAddresses; // Token address per chain
        mapping(uint256 => bool) chainSupported;    // Chain support status
        uint256 dailyLimit;             // Daily bridge limit
        uint256 totalBridged;           // Total amount bridged
        bool isActive;                  // Token status
    }

    // ============ EVENTS ============
    
    event ChainAdded(uint256 indexed chainId, string name, address endpoint);
    event ChainStatusChanged(uint256 indexed chainId, bool enabled);
    event BridgeConfigured(BridgeType indexed bridgeType, address bridgeContract);
    event MessageSent(bytes32 indexed messageId, uint256 targetChain, address sender);
    event MessageReceived(bytes32 indexed messageId, uint256 sourceChain, address sender);
    event MessageValidated(bytes32 indexed messageId, address validator);
    event BridgeInitiated(bytes32 indexed txId, address user, address token, uint256 amount);
    event BridgeCompleted(bytes32 indexed txId, uint256 sourceChain, uint256 targetChain);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event EmergencyActivated(string reason, uint256 timestamp);

    // ============ MODIFIERS ============
    
    modifier onlyEnabledChain(uint256 chainId) {
        require(chainEnabled[chainId], Errors.CHAIN_NOT_ENABLED);
        require(!chainEmergencyPaused[chainId], Errors.CHAIN_EMERGENCY_PAUSED);
        _;
    }
    
    modifier onlyValidator() {
        require(validators[msg.sender], Errors.NOT_VALIDATOR);
        _;
    }
    
    modifier whenNotEmergencyPaused() {
        require(!emergencyPaused, Errors.EMERGENCY_PAUSED);
        _;
    }
    
    modifier validBridge(BridgeType bridgeType) {
        require(bridgeEnabled[bridgeType], Errors.BRIDGE_NOT_ENABLED);
        require(!bridgeEmergencyPaused[bridgeType], Errors.BRIDGE_EMERGENCY_PAUSED);
        _;
    }

    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize cross-chain manager
     * @param _coreContract Core contract address
     * @param _admin Admin address
     */
    function initialize(
        address _coreContract,
        address _admin
    ) external initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();

        require(_coreContract != address(0), Errors.ZERO_ADDRESS);
        require(_admin != address(0), Errors.ZERO_ADDRESS);

        coreContract = IRiverBitCore(_coreContract);
        validatorThreshold = MIN_VALIDATOR_THRESHOLD;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(BRIDGE_OPERATOR_ROLE, _admin);
        _grantRole(VALIDATOR_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
    }

    // ============ CHAIN MANAGEMENT ============
    
    /**
     * @notice Add supported chain
     * @param chainId Chain identifier
     * @param config Chain configuration
     */
    function addSupportedChain(
        uint256 chainId,
        ChainConfig memory config
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(chainId != 0, Errors.INVALID_CHAIN_ID);
        require(!supportedChains[chainId].isActive, Errors.CHAIN_ALREADY_EXISTS);
        require(enabledChainIds.length < MAX_SUPPORTED_CHAINS, Errors.MAX_CHAINS_EXCEEDED);
        
        supportedChains[chainId] = config;
        supportedChains[chainId].isActive = true;
        chainEnabled[chainId] = true;
        enabledChainIds.push(chainId);
        
        emit ChainAdded(chainId, config.name, config.endpoint);
    }
    
    /**
     * @notice Enable/disable chain
     * @param chainId Chain identifier
     * @param enabled Whether to enable the chain
     */
    function setChainEnabled(
        uint256 chainId,
        bool enabled
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(supportedChains[chainId].isActive, Errors.CHAIN_NOT_FOUND);
        
        chainEnabled[chainId] = enabled;
        emit ChainStatusChanged(chainId, enabled);
    }

    // ============ BRIDGE MANAGEMENT ============
    
    /**
     * @notice Configure bridge
     * @param bridgeType Type of bridge
     * @param config Bridge configuration
     */
    function configureBridge(
        BridgeType bridgeType,
        BridgeConfig memory config
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(config.bridgeContract != address(0), Errors.ZERO_ADDRESS);
        
        bridgeConfigs[bridgeType] = config;
        bridgeEnabled[bridgeType] = true;
        
        emit BridgeConfigured(bridgeType, config.bridgeContract);
    }

    // ============ MESSAGE HANDLING ============
    
    /**
     * @notice Send cross-chain message
     * @param targetChain Target chain ID
     * @param payload Message payload
     * @param messageType Type of message
     * @return messageId Generated message ID
     */
    function sendMessage(
        uint256 targetChain,
        bytes calldata payload,
        MessageType messageType
    ) 
        external 
        nonReentrant 
        whenNotEmergencyPaused 
        onlyEnabledChain(targetChain)
        returns (bytes32 messageId) 
    {
        uint256 nonce = userNonces[msg.sender]++;
        
        messageId = keccak256(abi.encodePacked(
            block.chainid,
            targetChain,
            msg.sender,
            nonce,
            block.timestamp
        ));
        
        CrossChainMessage memory message = CrossChainMessage({
            sourceChain: block.chainid,
            targetChain: targetChain,
            sender: msg.sender,
            payload: payload,
            timestamp: block.timestamp,
            nonce: nonce,
            messageType: messageType,
            status: MessageStatus.SENT
        });
        
        messages[messageId] = message;
        
        // Route to appropriate bridge
        _routeMessage(messageId, targetChain, payload);
        
        emit MessageSent(messageId, targetChain, msg.sender);
        return messageId;
    }
    
    /**
     * @notice Receive cross-chain message
     * @param messageId Message identifier
     * @param sourceChain Source chain ID
     * @param sender Original sender
     * @param payload Message payload
     */
    function receiveMessage(
        bytes32 messageId,
        uint256 sourceChain,
        address sender,
        bytes calldata payload
    ) 
        external 
        onlyRole(BRIDGE_OPERATOR_ROLE)
        whenNotEmergencyPaused 
    {
        require(!processedMessages[messageId], Errors.MESSAGE_ALREADY_PROCESSED);
        require(chainEnabled[sourceChain], Errors.CHAIN_NOT_ENABLED);
        
        // Validate message hasn't expired
        require(
            block.timestamp <= messages[messageId].timestamp + MESSAGE_VALIDITY_PERIOD,
            Errors.MESSAGE_EXPIRED
        );
        
        processedMessages[messageId] = true;
        
        // Process message based on type
        _processMessage(messageId, sourceChain, sender, payload);
        
        emit MessageReceived(messageId, sourceChain, sender);
    }
    
    /**
     * @notice Validate cross-chain message
     * @param messageId Message to validate
     */
    function validateMessage(bytes32 messageId) external onlyValidator {
        require(messages[messageId].timestamp > 0, Errors.MESSAGE_NOT_FOUND);
        require(!messageValidations[messageId][msg.sender], Errors.ALREADY_VALIDATED);
        
        messageValidations[messageId][msg.sender] = true;
        validationCounts[messageId]++;
        
        emit MessageValidated(messageId, msg.sender);
        
        // If enough validations, mark as validated
        if (validationCounts[messageId] >= validatorThreshold) {
            messages[messageId].status = MessageStatus.VALIDATED;
        }
    }

    // ============ ASSET BRIDGING ============
    
    /**
     * @notice Bridge assets to another chain
     * @param token Token to bridge
     * @param amount Amount to bridge
     * @param targetChain Target chain ID
     * @param bridgeType Bridge type to use
     * @return txId Bridge transaction ID
     */
    function bridgeAssets(
        address token,
        uint256 amount,
        uint256 targetChain,
        BridgeType bridgeType
    ) 
        external 
        nonReentrant 
        whenNotEmergencyPaused 
        onlyEnabledChain(targetChain)
        validBridge(bridgeType)
        returns (bytes32 txId) 
    {
        TokenConfig storage tokenConfig = supportedTokens[token];
        require(tokenConfig.isActive, Errors.TOKEN_NOT_SUPPORTED);
        require(tokenConfig.chainSupported[targetChain], Errors.CHAIN_NOT_SUPPORTED_FOR_TOKEN);
        
        BridgeConfig memory bridgeConfig = bridgeConfigs[bridgeType];
        require(amount >= bridgeConfig.minAmount, Errors.AMOUNT_TOO_LOW);
        require(amount <= bridgeConfig.maxAmount, Errors.AMOUNT_TOO_HIGH);
        
        // Check daily limits
        require(
            tokenConfig.totalBridged + amount <= tokenConfig.dailyLimit,
            Errors.DAILY_LIMIT_EXCEEDED
        );
        
        txId = keccak256(abi.encodePacked(
            msg.sender,
            token,
            amount,
            targetChain,
            block.timestamp
        ));
        
        BridgeTransaction memory bridgeTx = BridgeTransaction({
            user: msg.sender,
            token: token,
            amount: amount,
            sourceChain: block.chainid,
            targetChain: targetChain,
            bridgeType: bridgeType,
            timestamp: block.timestamp,
            status: BridgeStatus.INITIATED,
            txHash: bytes32(0)
        });
        
        bridgeTransactions[txId] = bridgeTx;
        tokenConfig.totalBridged += amount;
        chainTokenBalances[block.chainid][token] -= amount;
        
        // Execute bridge transaction
        _executeBridge(txId, bridgeType);
        
        emit BridgeInitiated(txId, msg.sender, token, amount);
        return txId;
    }
    
    /**
     * @notice Complete bridge transaction
     * @param txId Transaction ID
     * @param txHash Transaction hash on target chain
     */
    function completeBridge(
        bytes32 txId,
        bytes32 txHash
    ) external onlyRole(BRIDGE_OPERATOR_ROLE) {
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        require(bridgeTx.status == BridgeStatus.IN_PROGRESS, Errors.INVALID_BRIDGE_STATUS);
        
        bridgeTx.status = BridgeStatus.COMPLETED;
        bridgeTx.txHash = txHash;
        
        // Update target chain balance
        chainTokenBalances[bridgeTx.targetChain][bridgeTx.token] += bridgeTx.amount;
        
        emit BridgeCompleted(txId, bridgeTx.sourceChain, bridgeTx.targetChain);
    }

    // ============ VALIDATOR MANAGEMENT ============
    
    /**
     * @notice Add validator
     * @param validator Validator address
     */
    function addValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(validator != address(0), Errors.ZERO_ADDRESS);
        require(!validators[validator], Errors.VALIDATOR_ALREADY_EXISTS);
        
        validators[validator] = true;
        validatorList.push(validator);
        _grantRole(VALIDATOR_ROLE, validator);
        
        emit ValidatorAdded(validator);
    }
    
    /**
     * @notice Remove validator
     * @param validator Validator address
     */
    function removeValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(validators[validator], Errors.VALIDATOR_NOT_FOUND);
        require(validatorList.length > validatorThreshold, Errors.INSUFFICIENT_VALIDATORS);
        
        validators[validator] = false;
        _revokeRole(VALIDATOR_ROLE, validator);
        
        // Remove from array
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == validator) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }
        
        emit ValidatorRemoved(validator);
    }
    
    /**
     * @notice Set validator threshold
     * @param threshold New threshold
     */
    function setValidatorThreshold(uint256 threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(threshold >= MIN_VALIDATOR_THRESHOLD, Errors.THRESHOLD_TOO_LOW);
        require(threshold <= validatorList.length, Errors.THRESHOLD_TOO_HIGH);
        
        validatorThreshold = threshold;
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @notice Activate emergency pause
     * @param reason Reason for emergency
     */
    function activateEmergency(string calldata reason) external onlyRole(EMERGENCY_ROLE) {
        emergencyPaused = true;
        emit EmergencyActivated(reason, block.timestamp);
    }
    
    /**
     * @notice Deactivate emergency pause
     */
    function deactivateEmergency() external onlyRole(DEFAULT_ADMIN_ROLE) {
        emergencyPaused = false;
    }
    
    /**
     * @notice Emergency pause specific chain
     * @param chainId Chain to pause
     */
    function emergencyPauseChain(uint256 chainId) external onlyRole(EMERGENCY_ROLE) {
        chainEmergencyPaused[chainId] = true;
    }
    
    /**
     * @notice Emergency pause specific bridge
     * @param bridgeType Bridge to pause
     */
    function emergencyPauseBridge(BridgeType bridgeType) external onlyRole(EMERGENCY_ROLE) {
        bridgeEmergencyPaused[bridgeType] = true;
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Route message to appropriate bridge
     * @param messageId Message identifier
     * @param targetChain Target chain
     * @param payload Message payload
     */
    function _routeMessage(
        bytes32 messageId,
        uint256 targetChain,
        bytes memory payload
    ) internal {
        // Default to LayerZero for now
        // In production, this would route based on optimal bridge for target chain
        BridgeConfig memory config = bridgeConfigs[BridgeType.LAYERZERO];
        
        // Call bridge contract to send message
        (bool success,) = config.bridgeContract.call(
            abi.encodeWithSignature(
                "send(uint16,bytes,bytes)",
                targetChain,
                abi.encodePacked(messageId),
                payload
            )
        );
        
        require(success, Errors.BRIDGE_CALL_FAILED);
    }
    
    /**
     * @notice Process received message
     * @param messageId Message identifier
     * @param sourceChain Source chain
     * @param sender Original sender
     * @param payload Message payload
     */
    function _processMessage(
        bytes32 messageId,
        uint256 sourceChain,
        address sender,
        bytes memory payload
    ) internal {
        // Decode and process message based on type
        // This would contain specific logic for different message types
        
        // For now, just store the message
        messages[messageId] = CrossChainMessage({
            sourceChain: sourceChain,
            targetChain: block.chainid,
            sender: sender,
            payload: payload,
            timestamp: block.timestamp,
            nonce: 0,
            messageType: MessageType.GENERAL,
            status: MessageStatus.PROCESSED
        });
    }
    
    /**
     * @notice Execute bridge transaction
     * @param txId Transaction ID
     * @param bridgeType Bridge type
     */
    function _executeBridge(bytes32 txId, BridgeType bridgeType) internal {
        BridgeTransaction storage bridgeTx = bridgeTransactions[txId];
        BridgeConfig memory config = bridgeConfigs[bridgeType];
        
        // Update status
        bridgeTx.status = BridgeStatus.IN_PROGRESS;
        
        // Call bridge contract
        (bool success,) = config.bridgeContract.call(
            abi.encodeWithSignature(
                "bridge(address,uint256,uint256)",
                bridgeTx.token,
                bridgeTx.amount,
                bridgeTx.targetChain
            )
        );
        
        require(success, Errors.BRIDGE_EXECUTION_FAILED);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get supported chains
     * @return chainIds Array of enabled chain IDs
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return enabledChainIds;
    }
    
    /**
     * @notice Get message details
     * @param messageId Message identifier
     * @return message Message details
     */
    function getMessage(bytes32 messageId) external view returns (CrossChainMessage memory) {
        return messages[messageId];
    }
    
    /**
     * @notice Get bridge transaction details
     * @param txId Transaction identifier
     * @return bridgeTx Bridge transaction details
     */
    function getBridgeTransaction(bytes32 txId) external view returns (BridgeTransaction memory) {
        return bridgeTransactions[txId];
    }
    
    /**
     * @notice Get validator list
     * @return validators Array of validator addresses
     */
    function getValidators() external view returns (address[] memory) {
        return validatorList;
    }
    
    /**
     * @notice Check if message is validated
     * @param messageId Message identifier
     * @return validated Whether message has enough validations
     */
    function isMessageValidated(bytes32 messageId) external view returns (bool) {
        return validationCounts[messageId] >= validatorThreshold;
    }
}