// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IRiverBitCoreV3.sol";

/**
 * @title ThreeIronLaws
 * @notice Enforces RiverBit's Three Iron Laws for non-custodial operation
 * @dev Core principles: No touching user money, No market manipulation, No negative balances
 * 
 * The Three Iron Laws (三条铁律):
 * 1. 不碰用户资金 - Never touch user funds except during authorized settlement
 * 2. 不操纵市场 - Never manipulate market prices or positions
 * 3. 不出现负余额 - Never allow negative account balances
 * 
 * This contract serves as the guardian and enforcement mechanism for these principles,
 * providing automated monitoring, violation detection, and emergency response capabilities.
 */
contract ThreeIronLaws is 
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MONITOR_ROLE = keccak256("MONITOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MAX_SETTLEMENT_DELAY = 15 minutes;
    uint256 private constant MAX_PRICE_DEVIATION = 500; // 5% max deviation
    uint256 private constant NEGATIVE_BALANCE_THRESHOLD = 1e6; // $1 USDC

    // ============ ENUMS ============
    enum LawType {
        USER_FUNDS_PROTECTION,      // Law 1: 不碰用户资金
        MARKET_MANIPULATION,        // Law 2: 不操纵市场
        NEGATIVE_BALANCE_PREVENTION // Law 3: 不出现负余额
    }

    enum ViolationSeverity {
        WARNING,    // Minor deviation, monitoring required
        CRITICAL,   // Serious violation, immediate action needed
        EMERGENCY   // System-threatening violation, shutdown required
    }

    enum EnforcementAction {
        LOG_ONLY,
        REVERT_TRANSACTION,
        PAUSE_OPERATIONS,
        EMERGENCY_SHUTDOWN
    }

    // ============ STRUCTS ============

    struct LawViolation {
        LawType lawType;
        ViolationSeverity severity;
        address violator;
        uint256 amount;
        bytes32 transactionHash;
        uint256 timestamp;
        string description;
        bool resolved;
        EnforcementAction actionTaken;
    }

    struct UserFundsProtection {
        mapping(address => uint256) authorizedSettlements; // User => authorized amount
        mapping(address => uint256) settlementDeadlines;   // User => deadline
        mapping(bytes32 => bool) settlementTickets;        // S-Auth ticket hash => authorized
        uint256 totalAuthorizedFunds;
        uint256 totalUserFunds;
        uint256 maxSettlementAmount;
        bool emergencyFreezeActive;
    }

    struct MarketIntegrityMonitor {
        mapping(bytes32 => uint256) lastValidPrices;       // Market => price
        mapping(bytes32 => uint256) priceUpdateCounts;     // Market => update count
        mapping(bytes32 => uint256) suspiciousActivityCount; // Market => activity count
        uint256 maxPriceDeviation;
        uint256 maxDailyUpdates;
        uint256 suspiciousThreshold;
        bool marketManipulationDetected;
    }

    struct BalanceProtection {
        mapping(address => int256) accountBalances;        // User => balance (can be negative temporarily)
        mapping(address => uint256) negativeBalanceTime;   // User => timestamp when negative
        mapping(address => uint256) maxNegativeBalance;    // User => max negative allowed
        uint256 globalNegativeBalanceLimit;
        uint256 negativeBalanceTimeout;
        uint256 totalNegativeBalances;
        bool negativeBalanceEmergency;
    }

    struct ComplianceMetrics {
        uint256 totalViolations;
        uint256 resolvedViolations;
        uint256 activeViolations;
        uint256 criticalViolations;
        uint256 lastAuditTimestamp;
        uint256 complianceScore; // 0-100
        bool isCompliant;
    }

    // ============ STATE VARIABLES ============

    IERC20 public baseAsset;
    address public coreContract;
    
    UserFundsProtection private fundsProtection;
    MarketIntegrityMonitor private marketMonitor;
    BalanceProtection private balanceProtection;
    ComplianceMetrics public complianceMetrics;

    mapping(uint256 => LawViolation) public violations;
    uint256 public violationCounter;

    mapping(LawType => bool) public lawEnforcementActive;
    mapping(LawType => EnforcementAction) public defaultActions;
    mapping(address => bool) public trustedContracts;

    bool public emergencyMode;
    uint256 public lastComplianceCheck;

    // ============ EVENTS ============

    event LawViolationDetected(
        uint256 indexed violationId,
        LawType indexed lawType,
        ViolationSeverity severity,
        address indexed violator,
        string description
    );

    event ViolationResolved(
        uint256 indexed violationId,
        address indexed resolver,
        string resolution
    );

    event EmergencyActionTaken(
        EnforcementAction action,
        string reason,
        address indexed admin
    );

    event SettlementAuthorized(
        address indexed user,
        uint256 amount,
        uint256 deadline,
        bytes32 ticketHash
    );

    event SettlementExecuted(
        address indexed user,
        uint256 amount,
        bytes32 ticketHash,
        bool successful
    );

    event SuspiciousActivityDetected(
        bytes32 indexed market,
        string activityType,
        uint256 severity,
        address indexed reporter
    );

    event NegativeBalanceDetected(
        address indexed user,
        int256 balance,
        uint256 timestamp
    );

    event ComplianceScoreUpdated(
        uint256 oldScore,
        uint256 newScore,
        bool isCompliant
    );

    // ============ MODIFIERS ============

    modifier onlyTrustedContract() {
        require(trustedContracts[msg.sender] || hasRole(ADMIN_ROLE, msg.sender), "Not trusted contract");
        _;
    }

    modifier onlyWhenCompliant() {
        require(complianceMetrics.isCompliant || emergencyMode, "System not compliant");
        _;
    }

    modifier lawEnforced(LawType lawType) {
        require(lawEnforcementActive[lawType], "Law enforcement disabled");
        _;
    }

    // ============ INITIALIZATION ============

    function initialize(
        address _baseAsset,
        address _coreContract,
        address _admin
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();

        require(_baseAsset != address(0), "Invalid base asset");
        require(_coreContract != address(0), "Invalid core contract");
        require(_admin != address(0), "Invalid admin");

        baseAsset = IERC20(_baseAsset);
        coreContract = _coreContract;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MONITOR_ROLE, _admin);
        _grantRole(AUDITOR_ROLE, _admin);

        // Initialize law enforcement
        lawEnforcementActive[LawType.USER_FUNDS_PROTECTION] = true;
        lawEnforcementActive[LawType.MARKET_MANIPULATION] = true;
        lawEnforcementActive[LawType.NEGATIVE_BALANCE_PREVENTION] = true;

        // Set default enforcement actions
        defaultActions[LawType.USER_FUNDS_PROTECTION] = EnforcementAction.REVERT_TRANSACTION;
        defaultActions[LawType.MARKET_MANIPULATION] = EnforcementAction.PAUSE_OPERATIONS;
        defaultActions[LawType.NEGATIVE_BALANCE_PREVENTION] = EnforcementAction.REVERT_TRANSACTION;

        // Initialize protection parameters
        fundsProtection.maxSettlementAmount = 10000000 * 1e6; // $10M USDC max
        marketMonitor.maxPriceDeviation = MAX_PRICE_DEVIATION;
        marketMonitor.maxDailyUpdates = 1000;
        marketMonitor.suspiciousThreshold = 10;
        balanceProtection.globalNegativeBalanceLimit = 1000000 * 1e6; // $1M total
        balanceProtection.negativeBalanceTimeout = 1 hours;

        complianceMetrics.isCompliant = true;
        complianceMetrics.complianceScore = 100;
        lastComplianceCheck = block.timestamp;

        trustedContracts[_coreContract] = true;
    }

    // ============ LAW 1: USER FUNDS PROTECTION ============

    /**
     * @notice Authorize settlement for specific user and amount
     * @param user User address
     * @param amount Amount to authorize
     * @param deadline Settlement deadline
     * @param ticketHash S-Auth ticket hash
     */
    function authorizeSettlement(
        address user,
        uint256 amount,
        uint256 deadline,
        bytes32 ticketHash
    ) external onlyTrustedContract lawEnforced(LawType.USER_FUNDS_PROTECTION) {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        require(deadline > block.timestamp, "Invalid deadline");
        require(deadline <= block.timestamp + MAX_SETTLEMENT_DELAY, "Deadline too far");
        require(!fundsProtection.settlementTickets[ticketHash], "Ticket already used");

        // Check if amount exceeds maximum
        if (amount > fundsProtection.maxSettlementAmount) {
            _reportViolation(
                LawType.USER_FUNDS_PROTECTION,
                ViolationSeverity.WARNING,
                user,
                amount,
                "Settlement amount exceeds maximum"
            );
        }

        fundsProtection.authorizedSettlements[user] += amount;
        fundsProtection.settlementDeadlines[user] = deadline;
        fundsProtection.settlementTickets[ticketHash] = true;
        fundsProtection.totalAuthorizedFunds += amount;

        emit SettlementAuthorized(user, amount, deadline, ticketHash);
    }

    /**
     * @notice Execute authorized settlement
     * @param user User address
     * @param amount Amount to settle
     * @param ticketHash S-Auth ticket hash
     */
    function executeSettlement(
        address user,
        uint256 amount,
        bytes32 ticketHash
    ) external onlyTrustedContract lawEnforced(LawType.USER_FUNDS_PROTECTION) {
        require(fundsProtection.settlementTickets[ticketHash], "Ticket not authorized");
        require(fundsProtection.authorizedSettlements[user] >= amount, "Amount not authorized");
        require(block.timestamp <= fundsProtection.settlementDeadlines[user], "Settlement expired");

        // Check for emergency freeze
        if (fundsProtection.emergencyFreezeActive) {
            _reportViolation(
                LawType.USER_FUNDS_PROTECTION,
                ViolationSeverity.CRITICAL,
                user,
                amount,
                "Settlement attempted during emergency freeze"
            );
            revert("Emergency freeze active");
        }

        fundsProtection.authorizedSettlements[user] -= amount;
        fundsProtection.totalAuthorizedFunds -= amount;

        emit SettlementExecuted(user, amount, ticketHash, true);
    }

    /**
     * @notice Check if funds access is authorized
     * @param user User address
     * @param amount Amount to check
     * @return authorized Whether access is authorized
     */
    function checkFundsAuthorization(
        address user,
        uint256 amount
    ) external view returns (bool authorized) {
        return fundsProtection.authorizedSettlements[user] >= amount &&
               block.timestamp <= fundsProtection.settlementDeadlines[user] &&
               !fundsProtection.emergencyFreezeActive;
    }

    // ============ LAW 2: MARKET MANIPULATION PREVENTION ============

    /**
     * @notice Monitor price update for manipulation
     * @param market Market symbol
     * @param newPrice New price
     * @param oldPrice Previous price
     */
    function monitorPriceUpdate(
        bytes32 market,
        uint256 newPrice,
        uint256 oldPrice
    ) external onlyTrustedContract lawEnforced(LawType.MARKET_MANIPULATION) {
        require(newPrice > 0, "Invalid price");

        uint256 priceDeviation = oldPrice > 0 ? 
            _calculateDeviation(newPrice, oldPrice) : 0;

        // Check for suspicious price movement
        if (priceDeviation > marketMonitor.maxPriceDeviation) {
            _reportViolation(
                LawType.MARKET_MANIPULATION,
                ViolationSeverity.WARNING,
                msg.sender,
                priceDeviation,
                "Suspicious price deviation detected"
            );

            emit SuspiciousActivityDetected(
                market,
                "PRICE_DEVIATION",
                priceDeviation,
                msg.sender
            );
        }

        // Update monitoring data
        marketMonitor.lastValidPrices[market] = newPrice;
        marketMonitor.priceUpdateCounts[market]++;

        // Check for excessive updates
        if (marketMonitor.priceUpdateCounts[market] > marketMonitor.maxDailyUpdates) {
            marketMonitor.suspiciousActivityCount[market]++;
            
            if (marketMonitor.suspiciousActivityCount[market] > marketMonitor.suspiciousThreshold) {
                _reportViolation(
                    LawType.MARKET_MANIPULATION,
                    ViolationSeverity.CRITICAL,
                    msg.sender,
                    marketMonitor.priceUpdateCounts[market],
                    "Excessive price updates detected"
                );
            }
        }
    }

    /**
     * @notice Report suspicious market activity
     * @param market Market symbol
     * @param activityType Type of suspicious activity
     * @param severity Severity level
     */
    function reportSuspiciousActivity(
        bytes32 market,
        string calldata activityType,
        uint256 severity
    ) external onlyRole(MONITOR_ROLE) {
        marketMonitor.suspiciousActivityCount[market]++;

        emit SuspiciousActivityDetected(market, activityType, severity, msg.sender);

        if (severity >= 80) { // High severity
            _reportViolation(
                LawType.MARKET_MANIPULATION,
                ViolationSeverity.CRITICAL,
                address(0),
                severity,
                string(abi.encodePacked("Suspicious activity: ", activityType))
            );
        }
    }

    // ============ LAW 3: NEGATIVE BALANCE PREVENTION ============

    /**
     * @notice Check and update user balance
     * @param user User address
     * @param newBalance New balance (can be negative)
     */
    function checkBalance(
        address user,
        int256 newBalance
    ) external onlyTrustedContract lawEnforced(LawType.NEGATIVE_BALANCE_PREVENTION) {
        int256 oldBalance = balanceProtection.accountBalances[user];
        balanceProtection.accountBalances[user] = newBalance;

        // Check for negative balance
        if (newBalance < 0) {
            uint256 negativeAmount = uint256(-newBalance);
            
            // Record when balance became negative
            if (oldBalance >= 0) {
                balanceProtection.negativeBalanceTime[user] = block.timestamp;
                balanceProtection.totalNegativeBalances += negativeAmount;
                
                emit NegativeBalanceDetected(user, newBalance, block.timestamp);
            }

            // Check if negative balance exceeds allowed amount
            if (negativeAmount > balanceProtection.maxNegativeBalance[user] &&
                balanceProtection.maxNegativeBalance[user] > 0) {
                
                _reportViolation(
                    LawType.NEGATIVE_BALANCE_PREVENTION,
                    ViolationSeverity.CRITICAL,
                    user,
                    negativeAmount,
                    "Negative balance exceeds allowed limit"
                );
            }

            // Check if negative balance has been outstanding too long
            if (block.timestamp > balanceProtection.negativeBalanceTime[user] + 
                balanceProtection.negativeBalanceTimeout) {
                
                _reportViolation(
                    LawType.NEGATIVE_BALANCE_PREVENTION,
                    ViolationSeverity.EMERGENCY,
                    user,
                    negativeAmount,
                    "Negative balance timeout exceeded"
                );
            }

            // Check global negative balance limit
            if (balanceProtection.totalNegativeBalances > 
                balanceProtection.globalNegativeBalanceLimit) {
                
                balanceProtection.negativeBalanceEmergency = true;
                
                _reportViolation(
                    LawType.NEGATIVE_BALANCE_PREVENTION,
                    ViolationSeverity.EMERGENCY,
                    user,
                    balanceProtection.totalNegativeBalances,
                    "Global negative balance limit exceeded"
                );
            }
        } else if (oldBalance < 0) {
            // Balance became positive, update totals
            uint256 recoveredAmount = uint256(-oldBalance);
            balanceProtection.totalNegativeBalances -= recoveredAmount;
            balanceProtection.negativeBalanceTime[user] = 0;
        }
    }

    /**
     * @notice Set maximum allowed negative balance for user
     * @param user User address
     * @param maxNegative Maximum negative balance allowed
     */
    function setMaxNegativeBalance(
        address user,
        uint256 maxNegative
    ) external onlyRole(ADMIN_ROLE) {
        balanceProtection.maxNegativeBalance[user] = maxNegative;
    }

    // ============ VIOLATION HANDLING ============

    /**
     * @notice Report a law violation
     * @param lawType Type of law violated
     * @param severity Severity of violation
     * @param violator Address of violator
     * @param amount Amount involved in violation
     * @param description Description of violation
     */
    function _reportViolation(
        LawType lawType,
        ViolationSeverity severity,
        address violator,
        uint256 amount,
        string memory description
    ) internal {
        uint256 violationId = ++violationCounter;
        
        violations[violationId] = LawViolation({
            lawType: lawType,
            severity: severity,
            violator: violator,
            amount: amount,
            transactionHash: keccak256(abi.encode(block.number, tx.origin, msg.data)),
            timestamp: block.timestamp,
            description: description,
            resolved: false,
            actionTaken: EnforcementAction.LOG_ONLY
        });

        complianceMetrics.totalViolations++;
        complianceMetrics.activeViolations++;
        
        if (severity == ViolationSeverity.CRITICAL || severity == ViolationSeverity.EMERGENCY) {
            complianceMetrics.criticalViolations++;
        }

        emit LawViolationDetected(violationId, lawType, severity, violator, description);

        // Take enforcement action
        EnforcementAction action = _determineEnforcementAction(lawType, severity);
        _executeEnforcementAction(action, description);
        
        violations[violationId].actionTaken = action;
        
        // Update compliance score
        _updateComplianceScore();
    }

    /**
     * @notice Determine appropriate enforcement action
     * @param lawType Type of law violated
     * @param severity Severity of violation
     * @return action Enforcement action to take
     */
    function _determineEnforcementAction(
        LawType lawType,
        ViolationSeverity severity
    ) internal view returns (EnforcementAction action) {
        if (severity == ViolationSeverity.EMERGENCY) {
            return EnforcementAction.EMERGENCY_SHUTDOWN;
        } else if (severity == ViolationSeverity.CRITICAL) {
            return EnforcementAction.PAUSE_OPERATIONS;
        } else if (severity == ViolationSeverity.WARNING) {
            return defaultActions[lawType];
        }
        
        return EnforcementAction.LOG_ONLY;
    }

    /**
     * @notice Execute enforcement action
     * @param action Action to execute
     * @param reason Reason for action
     */
    function _executeEnforcementAction(
        EnforcementAction action,
        string memory reason
    ) internal {
        if (action == EnforcementAction.REVERT_TRANSACTION) {
            revert(string(abi.encodePacked("Law violation: ", reason)));
        } else if (action == EnforcementAction.PAUSE_OPERATIONS) {
            // Trigger pause in core contract
            // This would integrate with the pausable functionality
            emergencyMode = true;
        } else if (action == EnforcementAction.EMERGENCY_SHUTDOWN) {
            emergencyMode = true;
            fundsProtection.emergencyFreezeActive = true;
            balanceProtection.negativeBalanceEmergency = true;
        }

        if (action != EnforcementAction.LOG_ONLY) {
            emit EmergencyActionTaken(action, reason, msg.sender);
        }
    }

    /**
     * @notice Resolve a violation
     * @param violationId Violation ID
     * @param resolution Description of resolution
     */
    function resolveViolation(
        uint256 violationId,
        string calldata resolution
    ) external onlyRole(AUDITOR_ROLE) {
        require(violationId <= violationCounter, "Invalid violation ID");
        require(!violations[violationId].resolved, "Already resolved");

        violations[violationId].resolved = true;
        complianceMetrics.resolvedViolations++;
        complianceMetrics.activeViolations--;

        if (violations[violationId].severity == ViolationSeverity.CRITICAL ||
            violations[violationId].severity == ViolationSeverity.EMERGENCY) {
            complianceMetrics.criticalViolations--;
        }

        emit ViolationResolved(violationId, msg.sender, resolution);
        
        _updateComplianceScore();
    }

    // ============ COMPLIANCE MONITORING ============

    /**
     * @notice Update compliance score based on current state
     */
    function _updateComplianceScore() internal {
        uint256 oldScore = complianceMetrics.complianceScore;
        uint256 newScore = 100;

        // Deduct points for active violations
        if (complianceMetrics.activeViolations > 0) {
            uint256 deduction = complianceMetrics.activeViolations * 10;
            if (deduction > newScore) {
                newScore = 0;
            } else {
                newScore -= deduction;
            }
        }

        // Additional deduction for critical violations
        if (complianceMetrics.criticalViolations > 0) {
            uint256 criticalDeduction = complianceMetrics.criticalViolations * 25;
            if (criticalDeduction > newScore) {
                newScore = 0;
            } else {
                newScore -= criticalDeduction;
            }
        }

        // Deduct points for emergency conditions
        if (emergencyMode) newScore = newScore / 2;
        if (fundsProtection.emergencyFreezeActive) newScore = newScore / 2;
        if (balanceProtection.negativeBalanceEmergency) newScore = newScore / 2;

        complianceMetrics.complianceScore = newScore;
        complianceMetrics.isCompliant = newScore >= 80; // 80% threshold for compliance

        if (oldScore != newScore) {
            emit ComplianceScoreUpdated(oldScore, newScore, complianceMetrics.isCompliant);
        }
    }

    /**
     * @notice Perform comprehensive compliance check
     */
    function performComplianceCheck() external onlyRole(AUDITOR_ROLE) {
        lastComplianceCheck = block.timestamp;
        complianceMetrics.lastAuditTimestamp = block.timestamp;
        
        // Reset daily counters if needed
        // This would be more sophisticated in practice with proper time tracking
        
        _updateComplianceScore();
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Calculate percentage deviation between two values
     * @param newValue New value
     * @param oldValue Old value
     * @return deviation Percentage deviation in basis points
     */
    function _calculateDeviation(
        uint256 newValue,
        uint256 oldValue
    ) internal pure returns (uint256 deviation) {
        if (oldValue == 0) return 0;
        
        uint256 diff = newValue > oldValue ? newValue - oldValue : oldValue - newValue;
        return (diff * 10000) / oldValue; // Return in basis points
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Set trusted contract status
     * @param contractAddress Contract address
     * @param trusted Whether contract is trusted
     */
    function setTrustedContract(
        address contractAddress,
        bool trusted
    ) external onlyRole(ADMIN_ROLE) {
        trustedContracts[contractAddress] = trusted;
    }

    /**
     * @notice Toggle law enforcement
     * @param lawType Law type
     * @param active Whether enforcement is active
     */
    function setLawEnforcement(
        LawType lawType,
        bool active
    ) external onlyRole(ADMIN_ROLE) {
        lawEnforcementActive[lawType] = active;
    }

    /**
     * @notice Set default enforcement action for law type
     * @param lawType Law type
     * @param action Default action
     */
    function setDefaultAction(
        LawType lawType,
        EnforcementAction action
    ) external onlyRole(ADMIN_ROLE) {
        defaultActions[lawType] = action;
    }

    /**
     * @notice Emergency override to disable all enforcement
     * @param reason Reason for override
     */
    function emergencyDisableEnforcement(
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lawEnforcementActive[LawType.USER_FUNDS_PROTECTION] = false;
        lawEnforcementActive[LawType.MARKET_MANIPULATION] = false;
        lawEnforcementActive[LawType.NEGATIVE_BALANCE_PREVENTION] = false;
        
        emit EmergencyActionTaken(
            EnforcementAction.LOG_ONLY,
            string(abi.encodePacked("Emergency enforcement disabled: ", reason)),
            msg.sender
        );
    }

    /**
     * @notice Clear emergency mode
     */
    function clearEmergencyMode() external onlyRole(ADMIN_ROLE) {
        require(complianceMetrics.activeViolations == 0, "Active violations remain");
        
        emergencyMode = false;
        fundsProtection.emergencyFreezeActive = false;
        balanceProtection.negativeBalanceEmergency = false;
        
        _updateComplianceScore();
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get compliance status
     * @return isCompliant Whether system is compliant
     * @return violations Array of violation descriptions
     */
    function getComplianceStatus()
        external
        view
        returns (bool isCompliant, string[] memory violations)
    {
        isCompliant = complianceMetrics.isCompliant;
        
        // Collect active violation descriptions
        string[] memory activeViolations = new string[](complianceMetrics.activeViolations);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= violationCounter; i++) {
            if (!violations[i].resolved && count < activeViolations.length) {
                activeViolations[count] = violations[i].description;
                count++;
            }
        }
        
        return (isCompliant, activeViolations);
    }

    /**
     * @notice Get user funds protection status
     * @param user User address
     * @return authorized Authorized settlement amount
     * @return deadline Settlement deadline
     */
    function getUserFundsStatus(address user)
        external
        view
        returns (uint256 authorized, uint256 deadline)
    {
        return (
            fundsProtection.authorizedSettlements[user],
            fundsProtection.settlementDeadlines[user]
        );
    }

    /**
     * @notice Get user balance status
     * @param user User address
     * @return balance Current balance
     * @return negativeTime When balance became negative
     * @return maxNegative Maximum allowed negative balance
     */
    function getUserBalanceStatus(address user)
        external
        view
        returns (int256 balance, uint256 negativeTime, uint256 maxNegative)
    {
        return (
            balanceProtection.accountBalances[user],
            balanceProtection.negativeBalanceTime[user],
            balanceProtection.maxNegativeBalance[user]
        );
    }

    /**
     * @notice Get violation details
     * @param violationId Violation ID
     * @return violation Violation data
     */
    function getViolation(uint256 violationId)
        external
        view
        returns (LawViolation memory violation)
    {
        require(violationId <= violationCounter, "Invalid violation ID");
        return violations[violationId];
    }
}