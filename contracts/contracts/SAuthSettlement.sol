// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SAuthSettlement
 * @notice Signature-based atomic settlement system for gasless trading
 * @dev Implements EIP-712 signatures for secure off-chain order authorization
 * 
 * Key Features:
 * - Atomic settlement without pre-deposits
 * - EIP-712 typed signatures for security
 * - MEV protection through commit-reveal
 * - Batch settlement for gas efficiency
 * - Emergency circuit breakers
 */
contract SAuthSettlement is 
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable
{
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_BATCH_SIZE = 50;
    uint256 private constant SIGNATURE_VALIDITY = 30 minutes;

    // ============ STRUCTS ============

    // S-Auth order structure
    struct SAuthOrder {
        address trader;
        bytes32 market;
        bool isLong;
        uint256 size;
        uint256 price;
        uint256 margin;
        uint256 leverage;
        uint256 nonce;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    // Settlement result
    struct SettlementResult {
        bytes32 orderId;
        bool success;
        uint256 executedSize;
        uint256 executedPrice;
        uint256 fee;
        string errorReason;
    }

    // Batch settlement parameters
    struct BatchSettlement {
        SAuthOrder[] orders;
        uint256 timestamp;
        bytes32 batchHash;
        address settler;
    }

    // MEV protection
    struct MEVProtection {
        uint256 commitRevealDelay;
        uint256 maxPriceDeviation;
        bool enabled;
        mapping(bytes32 => uint256) commitments;
        mapping(bytes32 => bool) revealed;
    }

    // ============ STATE VARIABLES ============

    IERC20 public baseAsset;
    address public coreContract;
    
    // Nonce management
    mapping(address => uint256) public nonces;
    
    // Settlement tracking
    mapping(bytes32 => bool) public settledOrders;
    mapping(bytes32 => SettlementResult) public settlementResults;
    mapping(address => bytes32[]) public userSettlements;
    
    // MEV protection
    MEVProtection public mevProtection;
    
    // Settlement statistics
    uint256 public totalSettlements;
    uint256 public totalVolume;
    uint256 public totalFees;
    mapping(address => uint256) public userVolume;
    mapping(address => uint256) public userFees;
    
    // Emergency controls
    bool public emergencyPaused;
    mapping(address => bool) public blacklistedTraders;
    mapping(bytes32 => bool) public blacklistedMarkets;

    // ============ EVENTS ============

    event SAuthOrderSettled(
        bytes32 indexed orderId,
        address indexed trader,
        bytes32 indexed market,
        bool isLong,
        uint256 size,
        uint256 price,
        uint256 fee
    );

    event BatchSettlementExecuted(
        bytes32 indexed batchHash,
        address indexed settler,
        uint256 successCount,
        uint256 totalCount,
        uint256 totalVolume
    );

    event MEVProtectionUpdated(
        uint256 commitRevealDelay,
        uint256 maxPriceDeviation,
        bool enabled
    );

    event EmergencyAction(
        string action,
        address indexed admin,
        string reason
    );

    // ============ MODIFIERS ============

    modifier onlyCore() {
        require(msg.sender == coreContract, "Only core contract");
        _;
    }

    modifier notEmergencyPaused() {
        require(!emergencyPaused, "Emergency paused");
        _;
    }

    modifier validTrader(address trader) {
        require(!blacklistedTraders[trader], "Trader blacklisted");
        _;
    }

    modifier validMarket(bytes32 market) {
        require(!blacklistedMarkets[market], "Market blacklisted");
        _;
    }

    // ============ INITIALIZATION ============

    /**
     * @notice Initialize the contract
     * @param _baseAsset Base asset token (USDC)
     * @param _coreContract Core contract address
     * @param _admin Admin address
     */
    function initialize(
        address _baseAsset,
        address _coreContract,
        address _admin
    ) external initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();
        __EIP712_init("SAuthSettlement", "1.0");

        require(_baseAsset != address(0), "Invalid base asset");
        require(_coreContract != address(0), "Invalid core contract");
        require(_admin != address(0), "Invalid admin");

        baseAsset = IERC20(_baseAsset);
        coreContract = _coreContract;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(SETTLEMENT_ROLE, _admin);

        // Initialize MEV protection
        mevProtection.commitRevealDelay = 1 minutes;
        mevProtection.maxPriceDeviation = 200; // 2%
        mevProtection.enabled = true;
    }

    // ============ SETTLEMENT FUNCTIONS ============

    /**
     * @notice Settle a single S-Auth order
     * @param order The S-Auth order to settle
     * @return result Settlement result
     */
    function settleSAuthOrder(SAuthOrder calldata order)
        external
        nonReentrant
        onlyRole(SETTLEMENT_ROLE)
        notEmergencyPaused
        validTrader(order.trader)
        validMarket(order.market)
        returns (SettlementResult memory result)
    {
        // Generate order ID
        bytes32 orderId = _generateOrderId(order);
        
        // Check if already settled
        require(!settledOrders[orderId], "Order already settled");
        
        // Validate signature
        require(_validateSignature(order), "Invalid signature");
        
        // Validate order parameters
        require(_validateOrder(order), "Invalid order");
        
        // Execute settlement
        result = _executeSettlement(order, orderId);
        
        // Update state
        settledOrders[orderId] = true;
        settlementResults[orderId] = result;
        userSettlements[order.trader].push(orderId);
        
        // Update statistics
        if (result.success) {
            totalSettlements++;
            totalVolume += result.executedSize;
            totalFees += result.fee;
            userVolume[order.trader] += result.executedSize;
            userFees[order.trader] += result.fee;
        }
        
        emit SAuthOrderSettled(
            orderId,
            order.trader,
            order.market,
            order.isLong,
            result.executedSize,
            result.executedPrice,
            result.fee
        );
    }

    /**
     * @notice Settle multiple orders in batch
     * @param orders Array of S-Auth orders
     * @return batchHash Hash of the batch
     * @return results Array of settlement results
     */
    function batchSettleOrders(SAuthOrder[] calldata orders)
        external
        nonReentrant
        onlyRole(SETTLEMENT_ROLE)
        notEmergencyPaused
        returns (bytes32 batchHash, SettlementResult[] memory results)
    {
        require(orders.length > 0, "No orders provided");
        require(orders.length <= MAX_BATCH_SIZE, "Batch too large");
        
        // Generate batch hash
        batchHash = keccak256(abi.encode(
            orders,
            block.timestamp,
            msg.sender
        ));
        
        results = new SettlementResult[](orders.length);
        uint256 successCount = 0;
        uint256 batchVolume = 0;
        
        // Process each order
        for (uint256 i = 0; i < orders.length; i++) {
            SAuthOrder calldata order = orders[i];
            bytes32 orderId = _generateOrderId(order);
            
            // Skip if already settled
            if (settledOrders[orderId]) {
                results[i] = SettlementResult({
                    orderId: orderId,
                    success: false,
                    executedSize: 0,
                    executedPrice: 0,
                    fee: 0,
                    errorReason: "Already settled"
                });
                continue;
            }
            
            // Validate and execute
            if (_validateSignature(order) && _validateOrder(order)) {
                results[i] = _executeSettlement(order, orderId);
                
                if (results[i].success) {
                    successCount++;
                    batchVolume += results[i].executedSize;
                    
                    // Update state
                    settledOrders[orderId] = true;
                    settlementResults[orderId] = results[i];
                    userSettlements[order.trader].push(orderId);
                    
                    // Update user statistics
                    userVolume[order.trader] += results[i].executedSize;
                    userFees[order.trader] += results[i].fee;
                }
            } else {
                results[i] = SettlementResult({
                    orderId: orderId,
                    success: false,
                    executedSize: 0,
                    executedPrice: 0,
                    fee: 0,
                    errorReason: "Validation failed"
                });
            }
        }
        
        // Update global statistics
        totalSettlements += successCount;
        totalVolume += batchVolume;
        
        emit BatchSettlementExecuted(
            batchHash,
            msg.sender,
            successCount,
            orders.length,
            batchVolume
        );
    }

    /**
     * @notice Commit order hash for MEV protection
     * @param orderHash Hash of the order
     */
    function commitOrder(bytes32 orderHash) external {
        require(mevProtection.enabled, "MEV protection disabled");
        require(mevProtection.commitments[orderHash] == 0, "Already committed");
        
        mevProtection.commitments[orderHash] = block.timestamp;
    }

    /**
     * @notice Reveal and settle order with MEV protection
     * @param order The order to reveal and settle
     */
    function revealAndSettle(SAuthOrder calldata order)
        external
        nonReentrant
        onlyRole(SETTLEMENT_ROLE)
        notEmergencyPaused
    {
        require(mevProtection.enabled, "MEV protection disabled");
        
        bytes32 orderHash = keccak256(abi.encode(order));
        uint256 commitTime = mevProtection.commitments[orderHash];
        
        require(commitTime > 0, "Order not committed");
        require(!mevProtection.revealed[orderHash], "Already revealed");
        require(
            block.timestamp >= commitTime + mevProtection.commitRevealDelay,
            "Reveal too early"
        );
        require(
            block.timestamp <= commitTime + mevProtection.commitRevealDelay + SIGNATURE_VALIDITY,
            "Reveal too late"
        );
        
        mevProtection.revealed[orderHash] = true;
        
        // Settle the order
        this.settleSAuthOrder(order);
    }

    // ============ VALIDATION FUNCTIONS ============

    /**
     * @notice Validate S-Auth signature
     * @param order The order with signature
     * @return valid Whether signature is valid
     */
    function _validateSignature(SAuthOrder calldata order) internal returns (bool valid) {
        // Check deadline
        if (block.timestamp > order.deadline) {
            return false;
        }
        
        // Check nonce
        if (nonces[order.trader] != order.nonce) {
            return false;
        }
        
        // Increment nonce
        nonces[order.trader]++;
        
        // Create typed data hash
        bytes32 structHash = keccak256(abi.encode(
            keccak256("SAuthOrder(address trader,bytes32 market,bool isLong,uint256 size,uint256 price,uint256 margin,uint256 leverage,uint256 nonce,uint256 deadline)"),
            order.trader,
            order.market,
            order.isLong,
            order.size,
            order.price,
            order.margin,
            order.leverage,
            order.nonce,
            order.deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address recoveredSigner = hash.recover(order.v, order.r, order.s);
        
        return recoveredSigner == order.trader;
    }

    /**
     * @notice Validate order parameters
     * @param order The order to validate
     * @return valid Whether order is valid
     */
    function _validateOrder(SAuthOrder calldata order) internal view returns (bool valid) {
        // Check basic parameters
        if (order.size == 0 || order.price == 0 || order.margin == 0) {
            return false;
        }
        
        // Check leverage
        if (order.leverage == 0 || order.leverage > 100) {
            return false;
        }
        
        // Check margin requirement
        uint256 notional = (order.size * order.price) / PRECISION;
        uint256 requiredMargin = notional / order.leverage;
        if (order.margin < requiredMargin) {
            return false;
        }
        
        // Check trader balance (would integrate with core contract)
        // This is simplified - in production would check actual balances
        
        return true;
    }

    /**
     * @notice Execute the actual settlement
     * @param order The order to settle
     * @param orderId The order ID
     * @return result Settlement result
     */
    function _executeSettlement(
        SAuthOrder calldata order,
        bytes32 orderId
    ) internal returns (SettlementResult memory result) {
        result.orderId = orderId;
        
        try this._attemptSettlement(order) returns (
            uint256 executedSize,
            uint256 executedPrice,
            uint256 fee
        ) {
            result.success = true;
            result.executedSize = executedSize;
            result.executedPrice = executedPrice;
            result.fee = fee;
            result.errorReason = "";
        } catch Error(string memory reason) {
            result.success = false;
            result.executedSize = 0;
            result.executedPrice = 0;
            result.fee = 0;
            result.errorReason = reason;
        } catch {
            result.success = false;
            result.executedSize = 0;
            result.executedPrice = 0;
            result.fee = 0;
            result.errorReason = "Unknown error";
        }
    }

    /**
     * @notice Attempt settlement (external for try-catch)
     * @param order The order to settle
     * @return executedSize Size executed
     * @return executedPrice Price executed
     * @return fee Fee charged
     */
    function _attemptSettlement(SAuthOrder calldata order)
        external
        view
        onlyCore
        returns (uint256 executedSize, uint256 executedPrice, uint256 fee)
    {
        // This would integrate with the core contract to execute the trade
        // For now, we'll return the order parameters
        executedSize = order.size;
        executedPrice = order.price;
        fee = (order.size * order.price * 30) / (PRECISION * BASIS_POINTS); // 0.3% fee
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Generate order ID
     * @param order The order
     * @return orderId Unique order identifier
     */
    function _generateOrderId(SAuthOrder calldata order) internal pure returns (bytes32 orderId) {
        orderId = keccak256(abi.encode(
            order.trader,
            order.market,
            order.isLong,
            order.size,
            order.price,
            order.nonce,
            order.deadline
        ));
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update MEV protection parameters
     * @param commitRevealDelay New commit-reveal delay
     * @param maxPriceDeviation New max price deviation
     * @param enabled Whether MEV protection is enabled
     */
    function updateMEVProtection(
        uint256 commitRevealDelay,
        uint256 maxPriceDeviation,
        bool enabled
    ) external onlyRole(ADMIN_ROLE) {
        require(commitRevealDelay >= 30 seconds, "Delay too short");
        require(commitRevealDelay <= 10 minutes, "Delay too long");
        require(maxPriceDeviation <= 1000, "Deviation too high"); // Max 10%
        
        mevProtection.commitRevealDelay = commitRevealDelay;
        mevProtection.maxPriceDeviation = maxPriceDeviation;
        mevProtection.enabled = enabled;
        
        emit MEVProtectionUpdated(commitRevealDelay, maxPriceDeviation, enabled);
    }

    /**
     * @notice Blacklist/unblacklist trader
     * @param trader Trader address
     * @param blacklisted Whether to blacklist
     */
    function setTraderBlacklist(address trader, bool blacklisted) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        blacklistedTraders[trader] = blacklisted;
        
        emit EmergencyAction(
            blacklisted ? "TRADER_BLACKLISTED" : "TRADER_UNBLACKLISTED",
            msg.sender,
            "Admin action"
        );
    }

    /**
     * @notice Blacklist/unblacklist market
     * @param market Market identifier
     * @param blacklisted Whether to blacklist
     */
    function setMarketBlacklist(bytes32 market, bool blacklisted) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        blacklistedMarkets[market] = blacklisted;
        
        emit EmergencyAction(
            blacklisted ? "MARKET_BLACKLISTED" : "MARKET_UNBLACKLISTED",
            msg.sender,
            "Admin action"
        );
    }

    /**
     * @notice Emergency pause all settlements
     * @param paused Whether to pause
     */
    function setEmergencyPause(bool paused) external onlyRole(ADMIN_ROLE) {
        emergencyPaused = paused;
        
        emit EmergencyAction(
            paused ? "EMERGENCY_PAUSED" : "EMERGENCY_UNPAUSED",
            msg.sender,
            "Emergency control"
        );
    }

    /**
     * @notice Update core contract address
     * @param newCoreContract New core contract address
     */
    function updateCoreContract(address newCoreContract) external onlyRole(ADMIN_ROLE) {
        require(newCoreContract != address(0), "Invalid address");
        coreContract = newCoreContract;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get settlement result
     * @param orderId Order identifier
     * @return result Settlement result
     */
    function getSettlementResult(bytes32 orderId) 
        external 
        view 
        returns (SettlementResult memory result) 
    {
        return settlementResults[orderId];
    }

    /**
     * @notice Get user settlements
     * @param user User address
     * @return orderIds Array of order IDs
     */
    function getUserSettlements(address user) 
        external 
        view 
        returns (bytes32[] memory orderIds) 
    {
        return userSettlements[user];
    }

    /**
     * @notice Get user statistics
     * @param user User address
     * @return volume Total volume traded
     * @return fees Total fees paid
     * @return settlements Number of settlements
     */
    function getUserStats(address user) 
        external 
        view 
        returns (uint256 volume, uint256 fees, uint256 settlements) 
    {
        volume = userVolume[user];
        fees = userFees[user];
        settlements = userSettlements[user].length;
    }

    /**
     * @notice Get current nonce for user
     * @param user User address
     * @return nonce Current nonce
     */
    function getNonce(address user) external view returns (uint256 nonce) {
        return nonces[user];
    }

    /**
     * @notice Get domain separator for EIP-712
     * @return domainSeparator Domain separator hash
     */
    function getDomainSeparator() external view returns (bytes32 domainSeparator) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Check if order is committed (MEV protection)
     * @param orderHash Order hash
     * @return committed Whether order is committed
     * @return commitTime Commit timestamp
     */
    function isOrderCommitted(bytes32 orderHash) 
        external 
        view 
        returns (bool committed, uint256 commitTime) 
    {
        commitTime = mevProtection.commitments[orderHash];
        committed = commitTime > 0;
    }
}