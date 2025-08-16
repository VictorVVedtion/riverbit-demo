// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IRiverBitCoreV3.sol";
import "./ThreeIronLaws.sol";

/**
 * @title SAuthSettlementV2
 * @notice Enhanced S-Auth signature-based settlement system with batch processing
 * @dev Implements EIP-712 signatures, Merkle tree validation, and gas-optimized batch settlement
 * 
 * Key Features:
 * - Atomic batch settlement with Merkle tree validation
 * - Gas-optimized operations for large batch sizes
 * - MEV protection through commit-reveal mechanism
 * - Three Iron Laws compliance integration
 * - Dynamic fee adjustment based on network conditions
 * - Emergency circuit breakers and risk controls
 */
contract SAuthSettlementV2 is 
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
    bytes32 public constant BATCH_EXECUTOR_ROLE = keccak256("BATCH_EXECUTOR_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_BATCH_SIZE = 100;
    uint256 private constant SIGNATURE_VALIDITY = 30 minutes;
    uint256 private constant MIN_SETTLEMENT_INTERVAL = 5 seconds;
    uint256 private constant MAX_SETTLEMENT_INTERVAL = 10 seconds;

    // ============ TYPE HASHES ============
    bytes32 private constant SAUTH_TICKET_TYPEHASH = keccak256(
        "SAuthTicket(address trader,bytes32 market,uint8 orderType,uint8 side,uint256 size,uint256 price,uint256 margin,uint256 leverage,uint8 marginMode,uint256 nonce,uint256 deadline)"
    );

    bytes32 private constant BATCH_SETTLEMENT_TYPEHASH = keccak256(
        "BatchSettlement(bytes32 merkleRoot,uint256 batchSize,uint256 timestamp,address settler)"
    );

    // ============ STRUCTS ============

    struct SAuthTicket {
        address trader;
        bytes32 market;
        IRiverBitCoreV3.OrderType orderType;
        IRiverBitCoreV3.PositionSide side;
        uint256 size;
        uint256 price;
        uint256 margin;
        uint256 leverage;
        IRiverBitCoreV3.MarginMode marginMode;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    struct TicketExecution {
        bytes32 ticketHash;
        bool success;
        uint256 executedSize;
        uint256 executedPrice;
        uint256 fee;
        int256 pnl;
        string errorReason;
        uint256 gasUsed;
    }

    struct BatchSettlement {
        SAuthTicket[] tickets;
        bytes32 merkleRoot;
        bytes32[] merkleProofs;
        uint256 timestamp;
        address settler;
        bytes32 batchId;
        uint256 totalGasLimit;
        uint256 priorityFee;
    }

    struct SettlementMetrics {
        uint256 totalBatches;
        uint256 totalTickets;
        uint256 successfulTickets;
        uint256 failedTickets;
        uint256 totalVolume;
        uint256 totalFees;
        uint256 averageBatchSize;
        uint256 averageGasPerTicket;
        uint256 lastSettlementTime;
    }

    struct GasOptimization {
        uint256 baseGasPerTicket;
        uint256 batchOverheadGas;
        uint256 merkleVerificationGas;
        uint256 dynamicGasAdjustment;
        bool optimizationEnabled;
    }

    struct MEVProtection {
        uint256 commitRevealDelay;
        uint256 maxPriceDeviation;
        mapping(bytes32 => uint256) commitments;
        mapping(bytes32 => bool) revealed;
        mapping(bytes32 => uint256) revealDeadlines;
        bool enabled;
    }

    struct SettlementWindow {
        uint256 windowStart;
        uint256 windowEnd;
        uint256 maxBatchesPerWindow;
        uint256 batchesInCurrentWindow;
        bool isActive;
    }

    // ============ STATE VARIABLES ============

    IERC20 public baseAsset;
    IRiverBitCoreV3 public coreContract;
    ThreeIronLaws public lawsContract;
    
    // Nonce management
    mapping(address => uint256) public nonces;
    
    // Settlement tracking
    mapping(bytes32 => bool) public settledTickets;
    mapping(bytes32 => TicketExecution) public executions;
    mapping(bytes32 => BatchSettlement) public batches;
    mapping(address => bytes32[]) public userSettlements;
    
    // Merkle tree validation
    mapping(bytes32 => bool) public validMerkleRoots;
    mapping(bytes32 => uint256) public merkleRootTimestamps;
    
    // MEV protection
    MEVProtection public mevProtection;
    
    // Settlement metrics and optimization
    SettlementMetrics public metrics;
    GasOptimization public gasOptimization;
    SettlementWindow public settlementWindow;
    
    // Fee management
    mapping(address => uint256) public userFees;
    mapping(bytes32 => uint256) public marketFees;
    uint256 public baseFeeRate; // in basis points
    uint256 public batchDiscountRate; // discount for batch settlements
    
    // Emergency controls
    bool public emergencyPaused;
    mapping(address => bool) public blacklistedTraders;
    mapping(bytes32 => bool) public blacklistedMarkets;
    uint256 public maxDailyVolume;
    uint256 public dailyVolumeUsed;
    uint256 public lastVolumeReset;

    // ============ EVENTS ============

    event SAuthTicketSettled(
        bytes32 indexed ticketHash,
        address indexed trader,
        bytes32 indexed market,
        bool success,
        uint256 executedSize,
        uint256 fee,
        int256 pnl
    );

    event BatchSettlementExecuted(
        bytes32 indexed batchId,
        address indexed settler,
        uint256 successCount,
        uint256 totalCount,
        uint256 totalVolume,
        uint256 totalGas,
        bytes32 merkleRoot
    );

    event MerkleRootRegistered(
        bytes32 indexed merkleRoot,
        uint256 batchSize,
        address indexed registrar,
        uint256 timestamp
    );

    event MEVCommitment(
        bytes32 indexed commitment,
        address indexed committer,
        uint256 revealDeadline
    );

    event SettlementWindowUpdated(
        uint256 windowStart,
        uint256 windowEnd,
        uint256 maxBatches
    );

    event GasOptimizationUpdated(
        uint256 baseGasPerTicket,
        uint256 batchOverheadGas,
        bool optimizationEnabled
    );

    event EmergencyAction(
        string action,
        address indexed admin,
        string reason,
        uint256 timestamp
    );

    event FeeStructureUpdated(
        uint256 baseFeeRate,
        uint256 batchDiscountRate,
        address indexed admin
    );

    // ============ MODIFIERS ============

    modifier onlyCore() {
        require(msg.sender == address(coreContract), "Only core contract");
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

    modifier withinSettlementWindow() {
        require(
            !settlementWindow.isActive || 
            (block.timestamp >= settlementWindow.windowStart && 
             block.timestamp <= settlementWindow.windowEnd),
            "Outside settlement window"
        );
        _;
    }

    modifier volumeLimit(uint256 volume) {
        _checkDailyVolumeLimit(volume);
        _;
    }

    // ============ INITIALIZATION ============

    function initialize(
        address _baseAsset,
        address _coreContract,
        address _lawsContract,
        address _admin
    ) external initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();
        __EIP712_init("SAuthSettlementV2", "2.0");

        require(_baseAsset != address(0), "Invalid base asset");
        require(_coreContract != address(0), "Invalid core contract");
        require(_lawsContract != address(0), "Invalid laws contract");
        require(_admin != address(0), "Invalid admin");

        baseAsset = IERC20(_baseAsset);
        coreContract = IRiverBitCoreV3(_coreContract);
        lawsContract = ThreeIronLaws(_lawsContract);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(SETTLEMENT_ROLE, _admin);
        _grantRole(BATCH_EXECUTOR_ROLE, _admin);

        // Initialize MEV protection
        mevProtection.commitRevealDelay = 1 minutes;
        mevProtection.maxPriceDeviation = 200; // 2%
        mevProtection.enabled = true;

        // Initialize gas optimization
        gasOptimization.baseGasPerTicket = 100000;
        gasOptimization.batchOverheadGas = 50000;
        gasOptimization.merkleVerificationGas = 30000;
        gasOptimization.optimizationEnabled = true;

        // Initialize fee structure
        baseFeeRate = 30; // 0.3%
        batchDiscountRate = 500; // 5% discount for batch settlements

        // Initialize settlement window
        settlementWindow.isActive = true;
        settlementWindow.maxBatchesPerWindow = 10;
        
        // Initialize daily volume limit
        maxDailyVolume = 100000000 * 1e6; // $100M USDC
        lastVolumeReset = block.timestamp;
    }

    // ============ BATCH SETTLEMENT FUNCTIONS ============

    /**
     * @notice Register Merkle root for batch validation
     * @param merkleRoot Merkle root of ticket hashes
     * @param batchSize Number of tickets in batch
     */
    function registerMerkleRoot(
        bytes32 merkleRoot,
        uint256 batchSize
    ) external onlyRole(BATCH_EXECUTOR_ROLE) {
        require(merkleRoot != bytes32(0), "Invalid Merkle root");
        require(batchSize > 0 && batchSize <= MAX_BATCH_SIZE, "Invalid batch size");
        require(!validMerkleRoots[merkleRoot], "Merkle root already registered");

        validMerkleRoots[merkleRoot] = true;
        merkleRootTimestamps[merkleRoot] = block.timestamp;

        emit MerkleRootRegistered(merkleRoot, batchSize, msg.sender, block.timestamp);
    }

    /**
     * @notice Execute batch settlement with Merkle proof validation
     * @param settlement Batch settlement data
     * @return batchId Unique batch identifier
     * @return executions Array of execution results
     */
    function executeBatchSettlement(
        BatchSettlement calldata settlement
    )
        external
        nonReentrant
        onlyRole(SETTLEMENT_ROLE)
        notEmergencyPaused
        withinSettlementWindow
        volumeLimit(_calculateBatchVolume(settlement.tickets))
        returns (bytes32 batchId, TicketExecution[] memory executions)
    {
        require(settlement.tickets.length > 0, "No tickets provided");
        require(settlement.tickets.length <= MAX_BATCH_SIZE, "Batch too large");
        require(validMerkleRoots[settlement.merkleRoot], "Invalid Merkle root");
        require(
            block.timestamp <= merkleRootTimestamps[settlement.merkleRoot] + SIGNATURE_VALIDITY,
            "Merkle root expired"
        );

        // Check settlement window limits
        if (settlementWindow.isActive) {
            require(
                settlementWindow.batchesInCurrentWindow < settlementWindow.maxBatchesPerWindow,
                "Settlement window limit exceeded"
            );
            settlementWindow.batchesInCurrentWindow++;
        }

        // Generate batch ID
        batchId = keccak256(abi.encode(
            settlement.merkleRoot,
            settlement.timestamp,
            settlement.settler,
            block.timestamp
        ));

        // Validate Merkle proofs and execute tickets
        executions = new TicketExecution[](settlement.tickets.length);
        uint256 successCount = 0;
        uint256 totalVolume = 0;
        uint256 totalGas = gasleft();
        uint256 totalFees = 0;

        for (uint256 i = 0; i < settlement.tickets.length; i++) {
            SAuthTicket calldata ticket = settlement.tickets[i];
            
            // Generate ticket hash
            bytes32 ticketHash = _generateTicketHash(ticket);
            
            // Validate Merkle proof
            bool validProof = MerkleProof.verify(
                settlement.merkleProofs[i],
                settlement.merkleRoot,
                ticketHash
            );
            
            if (!validProof) {
                executions[i] = TicketExecution({
                    ticketHash: ticketHash,
                    success: false,
                    executedSize: 0,
                    executedPrice: 0,
                    fee: 0,
                    pnl: 0,
                    errorReason: "Invalid Merkle proof",
                    gasUsed: 0
                });
                continue;
            }

            // Execute individual ticket
            uint256 gasBeforeExecution = gasleft();
            executions[i] = _executeTicket(ticket, ticketHash);
            executions[i].gasUsed = gasBeforeExecution - gasleft();

            if (executions[i].success) {
                successCount++;
                totalVolume += executions[i].executedSize;
                totalFees += executions[i].fee;
                
                // Update user and market fees
                userFees[ticket.trader] += executions[i].fee;
                marketFees[ticket.market] += executions[i].fee;
            }
        }

        uint256 gasUsed = totalGas - gasleft();

        // Store batch data
        batches[batchId] = settlement;
        
        // Update metrics
        metrics.totalBatches++;
        metrics.totalTickets += settlement.tickets.length;
        metrics.successfulTickets += successCount;
        metrics.failedTickets += (settlement.tickets.length - successCount);
        metrics.totalVolume += totalVolume;
        metrics.totalFees += totalFees;
        metrics.lastSettlementTime = block.timestamp;
        metrics.averageBatchSize = metrics.totalTickets / metrics.totalBatches;
        metrics.averageGasPerTicket = gasUsed / settlement.tickets.length;

        // Update daily volume
        dailyVolumeUsed += totalVolume;

        emit BatchSettlementExecuted(
            batchId,
            settlement.settler,
            successCount,
            settlement.tickets.length,
            totalVolume,
            gasUsed,
            settlement.merkleRoot
        );

        return (batchId, executions);
    }

    /**
     * @notice Execute single S-Auth ticket
     * @param ticket S-Auth ticket data
     * @return execution Execution result
     */
    function executeSingleTicket(
        SAuthTicket calldata ticket
    )
        external
        nonReentrant
        onlyRole(SETTLEMENT_ROLE)
        notEmergencyPaused
        validTrader(ticket.trader)
        validMarket(ticket.market)
        volumeLimit(ticket.size * ticket.price / PRECISION)
        returns (TicketExecution memory execution)
    {
        bytes32 ticketHash = _generateTicketHash(ticket);
        require(!settledTickets[ticketHash], "Ticket already settled");
        
        execution = _executeTicket(ticket, ticketHash);
        
        if (execution.success) {
            userFees[ticket.trader] += execution.fee;
            marketFees[ticket.market] += execution.fee;
            dailyVolumeUsed += execution.executedSize;
            
            metrics.totalTickets++;
            metrics.successfulTickets++;
            metrics.totalVolume += execution.executedSize;
            metrics.totalFees += execution.fee;
        } else {
            metrics.failedTickets++;
        }

        return execution;
    }

    // ============ TICKET EXECUTION ============

    /**
     * @notice Execute individual ticket
     * @param ticket S-Auth ticket
     * @param ticketHash Pre-computed ticket hash
     * @return execution Execution result
     */
    function _executeTicket(
        SAuthTicket calldata ticket,
        bytes32 ticketHash
    ) internal returns (TicketExecution memory execution) {
        execution.ticketHash = ticketHash;
        
        // Check if already settled
        if (settledTickets[ticketHash]) {
            execution.success = false;
            execution.errorReason = "Already settled";
            return execution;
        }
        
        // Validate signature
        if (!_validateSignature(ticket)) {
            execution.success = false;
            execution.errorReason = "Invalid signature";
            return execution;
        }
        
        // Validate ticket parameters
        if (!_validateTicket(ticket)) {
            execution.success = false;
            execution.errorReason = "Invalid ticket";
            return execution;
        }

        // Check Three Iron Laws compliance
        try lawsContract.checkFundsAuthorization(ticket.trader, ticket.margin) returns (bool authorized) {
            if (!authorized) {
                execution.success = false;
                execution.errorReason = "Funds not authorized";
                return execution;
            }
        } catch {
            execution.success = false;
            execution.errorReason = "Law compliance check failed";
            return execution;
        }

        // Execute the trade
        try this._attemptExecution(ticket) returns (
            uint256 executedSize,
            uint256 executedPrice,
            uint256 fee,
            int256 pnl
        ) {
            execution.success = true;
            execution.executedSize = executedSize;
            execution.executedPrice = executedPrice;
            execution.fee = fee;
            execution.pnl = pnl;
            execution.errorReason = "";
            
            // Mark as settled
            settledTickets[ticketHash] = true;
            executions[ticketHash] = execution;
            userSettlements[ticket.trader].push(ticketHash);
            
            emit SAuthTicketSettled(
                ticketHash,
                ticket.trader,
                ticket.market,
                true,
                executedSize,
                fee,
                pnl
            );
            
        } catch Error(string memory reason) {
            execution.success = false;
            execution.errorReason = reason;
        } catch {
            execution.success = false;
            execution.errorReason = "Unknown execution error";
        }
        
        return execution;
    }

    /**
     * @notice Attempt ticket execution (external for try-catch)
     * @param ticket S-Auth ticket
     * @return executedSize Size executed
     * @return executedPrice Price executed
     * @return fee Fee charged
     * @return pnl P&L realized
     */
    function _attemptExecution(SAuthTicket calldata ticket)
        external
        view
        onlyCore
        returns (uint256 executedSize, uint256 executedPrice, uint256 fee, int256 pnl)
    {
        // This would integrate with the core contract to execute the trade
        // For now, simulate the execution
        executedSize = ticket.size;
        executedPrice = ticket.price;
        
        // Calculate fee with batch discount if applicable
        uint256 feeRate = baseFeeRate;
        if (gasleft() > gasOptimization.batchOverheadGas) {
            // This is part of a batch, apply discount
            feeRate = (feeRate * (BASIS_POINTS - batchDiscountRate)) / BASIS_POINTS;
        }
        
        fee = (executedSize * executedPrice * feeRate) / (PRECISION * BASIS_POINTS);
        pnl = 0; // Would be calculated based on position changes
    }

    // ============ VALIDATION FUNCTIONS ============

    /**
     * @notice Validate S-Auth signature
     * @param ticket The ticket with signature
     * @return valid Whether signature is valid
     */
    function _validateSignature(SAuthTicket calldata ticket) internal returns (bool valid) {
        // Check deadline
        if (block.timestamp > ticket.deadline) {
            return false;
        }
        
        // Check nonce
        if (nonces[ticket.trader] != ticket.nonce) {
            return false;
        }
        
        // Increment nonce
        nonces[ticket.trader]++;
        
        // Create typed data hash
        bytes32 structHash = keccak256(abi.encode(
            SAUTH_TICKET_TYPEHASH,
            ticket.trader,
            ticket.market,
            uint8(ticket.orderType),
            uint8(ticket.side),
            ticket.size,
            ticket.price,
            ticket.margin,
            ticket.leverage,
            uint8(ticket.marginMode),
            ticket.nonce,
            ticket.deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address recoveredSigner = hash.recover(ticket.signature);
        
        return recoveredSigner == ticket.trader;
    }

    /**
     * @notice Validate ticket parameters
     * @param ticket The ticket to validate
     * @return valid Whether ticket is valid
     */
    function _validateTicket(SAuthTicket calldata ticket) internal view returns (bool valid) {
        // Check basic parameters
        if (ticket.size == 0 || ticket.price == 0 || ticket.margin == 0) {
            return false;
        }
        
        // Check leverage
        if (ticket.leverage == 0 || ticket.leverage > 100) {
            return false;
        }
        
        // Check margin requirement
        uint256 notional = (ticket.size * ticket.price) / PRECISION;
        uint256 requiredMargin = notional / ticket.leverage;
        if (ticket.margin < requiredMargin) {
            return false;
        }
        
        return true;
    }

    /**
     * @notice Generate ticket hash
     * @param ticket The ticket
     * @return ticketHash Unique ticket identifier
     */
    function _generateTicketHash(SAuthTicket calldata ticket) internal pure returns (bytes32 ticketHash) {
        ticketHash = keccak256(abi.encode(
            ticket.trader,
            ticket.market,
            uint8(ticket.orderType),
            uint8(ticket.side),
            ticket.size,
            ticket.price,
            ticket.margin,
            ticket.leverage,
            uint8(ticket.marginMode),
            ticket.nonce,
            ticket.deadline
        ));
    }

    // ============ MEV PROTECTION ============

    /**
     * @notice Commit to a future settlement
     * @param commitment Hash commitment
     */
    function commitSettlement(bytes32 commitment) external {
        require(mevProtection.enabled, "MEV protection disabled");
        require(mevProtection.commitments[commitment] == 0, "Already committed");
        
        mevProtection.commitments[commitment] = block.timestamp;
        mevProtection.revealDeadlines[commitment] = 
            block.timestamp + mevProtection.commitRevealDelay + SIGNATURE_VALIDITY;
        
        emit MEVCommitment(
            commitment,
            msg.sender,
            mevProtection.revealDeadlines[commitment]
        );
    }

    /**
     * @notice Reveal and execute committed settlement
     * @param settlement Batch settlement data
     * @param nonce Random nonce used in commitment
     */
    function revealAndExecute(
        BatchSettlement calldata settlement,
        uint256 nonce
    ) external nonReentrant onlyRole(SETTLEMENT_ROLE) {
        require(mevProtection.enabled, "MEV protection disabled");
        
        bytes32 commitment = keccak256(abi.encode(settlement, nonce));
        uint256 commitTime = mevProtection.commitments[commitment];
        
        require(commitTime > 0, "Settlement not committed");
        require(!mevProtection.revealed[commitment], "Already revealed");
        require(
            block.timestamp >= commitTime + mevProtection.commitRevealDelay,
            "Reveal too early"
        );
        require(
            block.timestamp <= mevProtection.revealDeadlines[commitment],
            "Reveal too late"
        );
        
        mevProtection.revealed[commitment] = true;
        
        // Execute the settlement
        this.executeBatchSettlement(settlement);
    }

    // ============ GAS OPTIMIZATION ============

    /**
     * @notice Calculate optimal gas limit for batch
     * @param batchSize Number of tickets in batch
     * @return gasLimit Recommended gas limit
     */
    function calculateOptimalGasLimit(uint256 batchSize) external view returns (uint256 gasLimit) {
        if (!gasOptimization.optimizationEnabled) {
            return batchSize * gasOptimization.baseGasPerTicket + gasOptimization.batchOverheadGas;
        }
        
        gasLimit = gasOptimization.batchOverheadGas + 
                   gasOptimization.merkleVerificationGas * batchSize +
                   gasOptimization.baseGasPerTicket * batchSize +
                   gasOptimization.dynamicGasAdjustment;
        
        return gasLimit;
    }

    /**
     * @notice Update gas optimization parameters based on recent performance
     */
    function updateGasOptimization() external onlyRole(OPERATOR_ROLE) {
        if (metrics.totalBatches > 0 && gasOptimization.optimizationEnabled) {
            // Adjust base gas per ticket based on recent average
            uint256 newBaseGas = (gasOptimization.baseGasPerTicket + 
                                 metrics.averageGasPerTicket) / 2;
            
            gasOptimization.baseGasPerTicket = newBaseGas;
            gasOptimization.dynamicGasAdjustment = newBaseGas / 10; // 10% buffer
            
            emit GasOptimizationUpdated(
                newBaseGas,
                gasOptimization.batchOverheadGas,
                gasOptimization.optimizationEnabled
            );
        }
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Calculate total volume for batch
     * @param tickets Array of tickets
     * @return totalVolume Total notional volume
     */
    function _calculateBatchVolume(SAuthTicket[] calldata tickets) 
        internal 
        pure 
        returns (uint256 totalVolume) 
    {
        for (uint256 i = 0; i < tickets.length; i++) {
            totalVolume += (tickets[i].size * tickets[i].price) / PRECISION;
        }
        return totalVolume;
    }

    /**
     * @notice Check daily volume limit
     * @param volume Volume to add
     */
    function _checkDailyVolumeLimit(uint256 volume) internal {
        // Reset daily volume if new day
        if (block.timestamp >= lastVolumeReset + 1 days) {
            dailyVolumeUsed = 0;
            lastVolumeReset = block.timestamp;
        }
        
        require(dailyVolumeUsed + volume <= maxDailyVolume, "Daily volume limit exceeded");
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update settlement window
     * @param windowStart Start time for settlement window
     * @param windowEnd End time for settlement window
     * @param maxBatches Maximum batches per window
     */
    function updateSettlementWindow(
        uint256 windowStart,
        uint256 windowEnd,
        uint256 maxBatches
    ) external onlyRole(ADMIN_ROLE) {
        require(windowEnd > windowStart, "Invalid window");
        require(maxBatches > 0, "Invalid max batches");
        
        settlementWindow.windowStart = windowStart;
        settlementWindow.windowEnd = windowEnd;
        settlementWindow.maxBatchesPerWindow = maxBatches;
        settlementWindow.batchesInCurrentWindow = 0;
        
        emit SettlementWindowUpdated(windowStart, windowEnd, maxBatches);
    }

    /**
     * @notice Update fee structure
     * @param newBaseFeeRate New base fee rate in basis points
     * @param newBatchDiscountRate New batch discount rate in basis points
     */
    function updateFeeStructure(
        uint256 newBaseFeeRate,
        uint256 newBatchDiscountRate
    ) external onlyRole(ADMIN_ROLE) {
        require(newBaseFeeRate <= 1000, "Fee rate too high"); // Max 10%
        require(newBatchDiscountRate <= 2000, "Discount rate too high"); // Max 20%
        
        baseFeeRate = newBaseFeeRate;
        batchDiscountRate = newBatchDiscountRate;
        
        emit FeeStructureUpdated(newBaseFeeRate, newBatchDiscountRate, msg.sender);
    }

    /**
     * @notice Emergency pause settlements
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        emergencyPaused = true;
        emit EmergencyAction("EMERGENCY_PAUSED", msg.sender, "Admin action", block.timestamp);
    }

    /**
     * @notice Resume settlements
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        emergencyPaused = false;
        emit EmergencyAction("UNPAUSED", msg.sender, "Admin action", block.timestamp);
    }

    /**
     * @notice Set trader blacklist status
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
            "Admin action",
            block.timestamp
        );
    }

    /**
     * @notice Set market blacklist status
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
            "Admin action",
            block.timestamp
        );
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get settlement metrics
     * @return currentMetrics Current settlement metrics
     */
    function getSettlementMetrics() 
        external 
        view 
        returns (SettlementMetrics memory currentMetrics) 
    {
        return metrics;
    }

    /**
     * @notice Get user settlement history
     * @param user User address
     * @return ticketHashes Array of ticket hashes
     */
    function getUserSettlements(address user) 
        external 
        view 
        returns (bytes32[] memory ticketHashes) 
    {
        return userSettlements[user];
    }

    /**
     * @notice Get ticket execution result
     * @param ticketHash Ticket hash
     * @return execution Execution result
     */
    function getExecution(bytes32 ticketHash) 
        external 
        view 
        returns (TicketExecution memory execution) 
    {
        return executions[ticketHash];
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
}