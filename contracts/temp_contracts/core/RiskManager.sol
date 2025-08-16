// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/IRiskManager.sol";
import "../interfaces/IRiverBitCore.sol";
import "../libraries/RiskMath.sol";
import "../libraries/Events.sol";
import "../libraries/Errors.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title RiskManager
 * @notice Comprehensive risk management system for RiverBit protocol
 * @dev Implements multi-layer risk controls, real-time monitoring, and automated responses
 * 
 * Key Features:
 * - Real-time risk assessment and monitoring
 * - Multi-level circuit breakers with automated triggers
 * - Dynamic risk parameter adjustment
 * - Portfolio risk analysis and position limits
 * - Liquidity risk management
 * - Counterparty risk assessment
 * - System-wide stress testing capabilities
 * - Emergency response coordination
 */
contract RiskManager is 
    IRiskManager,
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using RiskMath for uint256;

    // ============ ROLES ============
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");
    bytes32 public constant RISK_OPERATOR_ROLE = keccak256("RISK_OPERATOR_ROLE");
    bytes32 public constant CIRCUIT_BREAKER_ROLE = keccak256("CIRCUIT_BREAKER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_PORTFOLIO_RISK = 5000; // 50%
    uint256 private constant CIRCUIT_BREAKER_THRESHOLD = 1000; // 10%
    uint256 private constant STRESS_TEST_SCENARIOS = 5;
    uint256 private constant RISK_UPDATE_INTERVAL = 300; // 5 minutes

    // ============ STATE VARIABLES ============
    
    IRiverBitCore public coreContract;
    
    // Risk parameters and limits
    RiskParameters public riskParams;
    mapping(bytes32 => MarketRiskConfig) public marketRiskConfigs;
    mapping(address => UserRiskProfile) public userRiskProfiles;
    
    // Circuit breakers
    mapping(CircuitBreakerType => CircuitBreaker) public circuitBreakers;
    mapping(bytes32 => bool) public triggeredBreakers;
    
    // Risk metrics and monitoring
    GlobalRiskMetrics public globalMetrics;
    mapping(bytes32 => MarketRiskMetrics) public marketMetrics;
    mapping(address => UserRiskMetrics) public userMetrics;
    
    // Liquidity risk
    LiquidityRiskState public liquidityRisk;
    mapping(address => uint256) public assetLiquidity;
    mapping(bytes32 => uint256) public marketLiquidity;
    
    // Stress testing
    mapping(uint256 => StressTestResult) public stressTestResults;
    uint256 public lastStressTestTime;
    uint256 public stressTestCounter;
    
    // Risk events and alerts
    mapping(bytes32 => RiskEvent) public riskEvents;
    mapping(RiskLevel => uint256) public riskEventCounts;
    bytes32[] public activeRiskEvents;
    
    // Emergency response
    EmergencyState public emergencyState;
    mapping(address => bool) public emergencyContacts;

    // ============ STRUCTS ============
    
    struct RiskParameters {
        uint256 maxPositionSize;           // Maximum position size per user
        uint256 maxPortfolioRisk;          // Maximum portfolio risk percentage
        uint256 maxLeverage;               // Maximum leverage allowed
        uint256 marginCallThreshold;       // Margin call threshold
        uint256 liquidationThreshold;      // Liquidation threshold
        uint256 concentrationLimit;        // Position concentration limit
        bool dynamicAdjustment;            // Enable dynamic parameter adjustment
    }
    
    struct MarketRiskConfig {
        uint256 volatilityThreshold;       // Volatility threshold for alerts
        uint256 liquidityThreshold;        // Minimum liquidity requirement
        uint256 maxOpenInterest;           // Maximum open interest allowed
        uint256 fundingRateLimit;          // Maximum funding rate
        uint256 priceDeviationLimit;       // Maximum price deviation
        bool isActive;                     // Market risk monitoring status
    }
    
    struct UserRiskProfile {
        RiskTolerance tolerance;           // User risk tolerance level
        uint256 riskScore;                 // Calculated risk score
        uint256 maxPositionValue;         // Maximum position value
        uint256 leverageLimit;             // User-specific leverage limit
        uint256 lastRiskAssessment;       // Last risk assessment timestamp
        bool isHighRisk;                   // High-risk user flag
    }
    
    struct CircuitBreaker {
        uint256 threshold;                 // Trigger threshold
        uint256 duration;                  // Breaker duration
        uint256 cooldown;                  // Cooldown period
        uint256 lastTriggered;             // Last trigger timestamp
        bool isActive;                     // Breaker status
        bool isTriggered;                  // Current trigger status
    }
    
    struct GlobalRiskMetrics {
        uint256 totalRisk;                 // Total system risk
        uint256 portfolioVaR;              // Value at Risk
        uint256 leverageRatio;             // System leverage ratio
        uint256 liquidityRatio;            // System liquidity ratio
        uint256 concentrationRisk;         // Concentration risk measure
        uint256 lastUpdate;                // Last update timestamp
    }
    
    struct MarketRiskMetrics {
        uint256 volatility;                // Market volatility
        uint256 liquidity;                 // Market liquidity
        uint256 openInterest;              // Total open interest
        uint256 fundingRate;               // Current funding rate
        uint256 priceImpact;               // Price impact measure
        uint256 riskContribution;          // Risk contribution to portfolio
    }
    
    struct UserRiskMetrics {
        uint256 portfolioValue;            // Total portfolio value
        uint256 exposureRisk;              // Exposure risk
        uint256 liquidationRisk;           // Liquidation risk probability
        uint256 concentrationRisk;         // Concentration risk
        uint256 leverageRisk;              // Leverage risk
        RiskLevel currentRiskLevel;        // Current risk level
    }
    
    struct LiquidityRiskState {
        uint256 systemLiquidity;           // Total system liquidity
        uint256 liquidityBuffer;           // Liquidity buffer
        uint256 withdrawalPressure;        // Current withdrawal pressure
        uint256 fundingStress;             // Funding stress indicator
        bool liquidityWarning;             // Liquidity warning status
    }
    
    struct StressTestResult {
        uint256 scenario;                  // Stress test scenario ID
        uint256 portfolioLoss;             // Portfolio loss in scenario
        uint256 liquidityNeed;             // Liquidity needed
        uint256 riskIncrease;              // Risk increase percentage
        bool systemStable;                 // System stability in scenario
        uint256 timestamp;                 // Test timestamp
    }
    
    struct RiskEvent {
        bytes32 eventId;                   // Event identifier
        RiskEventType eventType;           // Type of risk event
        RiskLevel severity;                // Event severity
        string description;                // Event description
        uint256 timestamp;                 // Event timestamp
        bool isResolved;                   // Resolution status
        address triggeredBy;               // Who/what triggered the event
    }
    
    struct EmergencyState {
        bool isActive;                     // Emergency status
        uint8 level;                       // Emergency level (1-5)
        uint256 activatedAt;               // Activation timestamp
        string reason;                     // Emergency reason
        address activatedBy;               // Who activated emergency
        uint256 expectedDuration;          // Expected duration
    }

    // ============ EVENTS ============
    
    event RiskParametersUpdated(address updater, uint256 timestamp);
    event CircuitBreakerTriggered(CircuitBreakerType breakerType, uint256 threshold, uint256 timestamp);
    event CircuitBreakerReset(CircuitBreakerType breakerType, uint256 timestamp);
    event RiskEventCreated(bytes32 indexed eventId, RiskEventType eventType, RiskLevel severity);
    event RiskEventResolved(bytes32 indexed eventId, uint256 timestamp);
    event UserRiskProfileUpdated(address indexed user, uint256 riskScore, RiskLevel riskLevel);
    event StressTestCompleted(uint256 indexed testId, bool systemStable, uint256 portfolioLoss);
    event EmergencyActivated(uint8 level, string reason, address activator);
    event EmergencyDeactivated(address deactivator, uint256 duration);
    event LiquidityWarning(uint256 systemLiquidity, uint256 threshold, uint256 timestamp);

    // ============ MODIFIERS ============
    
    modifier onlyActiveRiskMonitoring() {
        require(riskParams.maxPositionSize > 0, Errors.RISK_MONITORING_INACTIVE);
        _;
    }
    
    modifier notInEmergency() {
        require(!emergencyState.isActive, Errors.EMERGENCY_ACTIVE);
        _;
    }
    
    modifier validUser(address user) {
        require(user != address(0), Errors.ZERO_ADDRESS);
        _;
    }

    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize risk manager
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

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(RISK_ADMIN_ROLE, _admin);
        _grantRole(RISK_OPERATOR_ROLE, _admin);
        _grantRole(CIRCUIT_BREAKER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);

        // Initialize default risk parameters
        riskParams = RiskParameters({
            maxPositionSize: 1000000 * 1e18, // $1M
            maxPortfolioRisk: 3000, // 30%
            maxLeverage: 100,
            marginCallThreshold: 1500, // 15%
            liquidationThreshold: 1000, // 10%
            concentrationLimit: 2000, // 20%
            dynamicAdjustment: true
        });

        // Initialize circuit breakers
        _initializeCircuitBreakers();
        
        emergencyContacts[_admin] = true;
    }

    // ============ RISK ASSESSMENT ============
    
    /**
     * @notice Assess user risk profile
     * @param user User address
     * @return riskScore Calculated risk score
     * @return riskLevel Risk level classification
     */
    function assessUserRisk(address user) 
        external 
        view 
        validUser(user)
        returns (uint256 riskScore, RiskLevel riskLevel) 
    {
        UserRiskMetrics memory metrics = userMetrics[user];
        
        // Calculate composite risk score
        riskScore = RiskMath.calculateUserRiskScore(
            metrics.portfolioValue,
            metrics.exposureRisk,
            metrics.liquidationRisk,
            metrics.concentrationRisk,
            metrics.leverageRisk
        );
        
        // Determine risk level
        riskLevel = _getRiskLevel(riskScore);
        
        return (riskScore, riskLevel);
    }
    
    /**
     * @notice Calculate portfolio Value at Risk (VaR)
     * @param user User address
     * @param confidenceLevel Confidence level (e.g., 95, 99)
     * @param timeHorizon Time horizon in hours
     * @return var Value at Risk amount
     */
    function calculatePortfolioVaR(
        address user,
        uint256 confidenceLevel,
        uint256 timeHorizon
    ) external view validUser(user) returns (uint256 var) {
        UserRiskMetrics memory metrics = userMetrics[user];
        
        return RiskMath.calculateVaR(
            metrics.portfolioValue,
            metrics.exposureRisk,
            confidenceLevel,
            timeHorizon
        );
    }
    
    /**
     * @notice Check if position is within risk limits
     * @param user User address
     * @param positionSize New position size
     * @param market Market identifier
     * @return allowed Whether position is allowed
     * @return reason Reason if not allowed
     */
    function checkPositionRisk(
        address user,
        uint256 positionSize,
        bytes32 market
    ) external view returns (bool allowed, string memory reason) {
        // Check position size limit
        if (positionSize > riskParams.maxPositionSize) {
            return (false, "Position size exceeds limit");
        }
        
        // Check user-specific limits
        UserRiskProfile memory profile = userRiskProfiles[user];
        if (positionSize > profile.maxPositionValue) {
            return (false, "Exceeds user position limit");
        }
        
        // Check market-specific risks
        MarketRiskConfig memory marketConfig = marketRiskConfigs[market];
        if (!marketConfig.isActive) {
            return (false, "Market risk monitoring inactive");
        }
        
        // Check circuit breakers
        if (_isCircuitBreakerTriggered(CircuitBreakerType.POSITION_SIZE)) {
            return (false, "Position size circuit breaker active");
        }
        
        return (true, "");
    }

    // ============ CIRCUIT BREAKERS ============
    
    /**
     * @notice Trigger circuit breaker
     * @param breakerType Type of circuit breaker
     * @param reason Reason for triggering
     */
    function triggerCircuitBreaker(
        CircuitBreakerType breakerType,
        string calldata reason
    ) external onlyRole(CIRCUIT_BREAKER_ROLE) {
        CircuitBreaker storage breaker = circuitBreakers[breakerType];
        require(breaker.isActive, Errors.CIRCUIT_BREAKER_INACTIVE);
        require(!breaker.isTriggered, Errors.CIRCUIT_BREAKER_ALREADY_TRIGGERED);
        
        breaker.isTriggered = true;
        breaker.lastTriggered = block.timestamp;
        
        bytes32 breakerId = keccak256(abi.encodePacked(breakerType, block.timestamp));
        triggeredBreakers[breakerId] = true;
        
        // Create risk event
        _createRiskEvent(
            breakerId,
            RiskEventType.CIRCUIT_BREAKER,
            RiskLevel.HIGH,
            reason
        );
        
        emit CircuitBreakerTriggered(breakerType, breaker.threshold, block.timestamp);
    }
    
    /**
     * @notice Reset circuit breaker
     * @param breakerType Type of circuit breaker
     */
    function resetCircuitBreaker(
        CircuitBreakerType breakerType
    ) external onlyRole(CIRCUIT_BREAKER_ROLE) {
        CircuitBreaker storage breaker = circuitBreakers[breakerType];
        require(breaker.isTriggered, Errors.CIRCUIT_BREAKER_NOT_TRIGGERED);
        require(
            block.timestamp >= breaker.lastTriggered + breaker.duration,
            Errors.CIRCUIT_BREAKER_DURATION_NOT_MET
        );
        
        breaker.isTriggered = false;
        
        emit CircuitBreakerReset(breakerType, block.timestamp);
    }
    
    /**
     * @notice Check if circuit breaker is triggered
     * @param breakerType Type of circuit breaker
     * @return triggered Whether breaker is triggered
     */
    function isCircuitBreakerTriggered(
        CircuitBreakerType breakerType
    ) external view returns (bool) {
        return _isCircuitBreakerTriggered(breakerType);
    }

    // ============ LIQUIDITY RISK MANAGEMENT ============
    
    /**
     * @notice Update liquidity metrics
     * @param systemLiquidity Total system liquidity
     * @param withdrawalPressure Current withdrawal pressure
     */
    function updateLiquidityMetrics(
        uint256 systemLiquidity,
        uint256 withdrawalPressure
    ) external onlyRole(RISK_OPERATOR_ROLE) {
        liquidityRisk.systemLiquidity = systemLiquidity;
        liquidityRisk.withdrawalPressure = withdrawalPressure;
        liquidityRisk.fundingStress = RiskMath.calculateFundingStress(
            systemLiquidity,
            withdrawalPressure
        );
        
        // Check liquidity warning threshold
        uint256 liquidityThreshold = liquidityRisk.liquidityBuffer;
        if (systemLiquidity < liquidityThreshold) {
            liquidityRisk.liquidityWarning = true;
            
            _createRiskEvent(
                keccak256(abi.encodePacked("liquidity_warning", block.timestamp)),
                RiskEventType.LIQUIDITY_RISK,
                RiskLevel.MEDIUM,
                "System liquidity below threshold"
            );
            
            emit LiquidityWarning(systemLiquidity, liquidityThreshold, block.timestamp);
        } else {
            liquidityRisk.liquidityWarning = false;
        }
    }

    // ============ STRESS TESTING ============
    
    /**
     * @notice Run stress test
     * @param scenario Stress test scenario ID
     * @return result Stress test result
     */
    function runStressTest(uint256 scenario) 
        external 
        onlyRole(RISK_OPERATOR_ROLE) 
        returns (StressTestResult memory result) 
    {
        require(scenario < STRESS_TEST_SCENARIOS, Errors.INVALID_SCENARIO);
        
        // Calculate stress test metrics
        uint256 portfolioLoss = RiskMath.calculateStressTestLoss(
            globalMetrics.totalRisk,
            scenario
        );
        
        uint256 liquidityNeed = RiskMath.calculateLiquidityNeed(
            portfolioLoss,
            liquidityRisk.systemLiquidity
        );
        
        uint256 riskIncrease = (portfolioLoss * BASIS_POINTS) / globalMetrics.totalRisk;
        
        bool systemStable = portfolioLoss < (globalMetrics.totalRisk * 5000 / BASIS_POINTS); // 50%
        
        result = StressTestResult({
            scenario: scenario,
            portfolioLoss: portfolioLoss,
            liquidityNeed: liquidityNeed,
            riskIncrease: riskIncrease,
            systemStable: systemStable,
            timestamp: block.timestamp
        });
        
        stressTestResults[stressTestCounter] = result;
        stressTestCounter++;
        lastStressTestTime = block.timestamp;
        
        emit StressTestCompleted(stressTestCounter - 1, systemStable, portfolioLoss);
        
        return result;
    }

    // ============ EMERGENCY MANAGEMENT ============
    
    /**
     * @notice Activate emergency mode
     * @param level Emergency level (1-5)
     * @param reason Emergency reason
     * @param expectedDuration Expected duration in seconds
     */
    function activateEmergency(
        uint8 level,
        string calldata reason,
        uint256 expectedDuration
    ) external onlyRole(EMERGENCY_ROLE) {
        require(level > 0 && level <= 5, Errors.INVALID_EMERGENCY_LEVEL);
        require(!emergencyState.isActive, Errors.EMERGENCY_ALREADY_ACTIVE);
        
        emergencyState = EmergencyState({
            isActive: true,
            level: level,
            activatedAt: block.timestamp,
            reason: reason,
            activatedBy: msg.sender,
            expectedDuration: expectedDuration
        });
        
        // Trigger appropriate circuit breakers based on level
        if (level >= 3) {
            _triggerEmergencyCircuitBreakers();
        }
        
        emit EmergencyActivated(level, reason, msg.sender);
    }
    
    /**
     * @notice Deactivate emergency mode
     */
    function deactivateEmergency() external onlyRole(EMERGENCY_ROLE) {
        require(emergencyState.isActive, Errors.NO_ACTIVE_EMERGENCY);
        
        uint256 duration = block.timestamp - emergencyState.activatedAt;
        address deactivator = msg.sender;
        
        emergencyState.isActive = false;
        emergencyState.level = 0;
        
        emit EmergencyDeactivated(deactivator, duration);
    }

    // ============ RISK PARAMETER MANAGEMENT ============
    
    /**
     * @notice Update risk parameters
     * @param newParams New risk parameters
     */
    function updateRiskParameters(
        RiskParameters calldata newParams
    ) external onlyRole(RISK_ADMIN_ROLE) {
        require(newParams.maxPositionSize > 0, Errors.INVALID_RISK_PARAMS);
        require(newParams.maxPortfolioRisk <= MAX_PORTFOLIO_RISK, Errors.INVALID_RISK_PARAMS);
        
        riskParams = newParams;
        
        emit RiskParametersUpdated(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Configure market risk parameters
     * @param market Market identifier
     * @param config Market risk configuration
     */
    function configureMarketRisk(
        bytes32 market,
        MarketRiskConfig calldata config
    ) external onlyRole(RISK_ADMIN_ROLE) {
        marketRiskConfigs[market] = config;
    }
    
    /**
     * @notice Update user risk profile
     * @param user User address
     * @param tolerance Risk tolerance level
     * @param maxPositionValue Maximum position value
     * @param leverageLimit Leverage limit
     */
    function updateUserRiskProfile(
        address user,
        RiskTolerance tolerance,
        uint256 maxPositionValue,
        uint256 leverageLimit
    ) external validUser(user) {
        require(
            msg.sender == user || hasRole(RISK_ADMIN_ROLE, msg.sender),
            Errors.UNAUTHORIZED
        );
        
        UserRiskProfile storage profile = userRiskProfiles[user];
        profile.tolerance = tolerance;
        profile.maxPositionValue = maxPositionValue;
        profile.leverageLimit = leverageLimit;
        profile.lastRiskAssessment = block.timestamp;
        
        // Recalculate risk score
        (uint256 riskScore, RiskLevel riskLevel) = this.assessUserRisk(user);
        profile.riskScore = riskScore;
        profile.isHighRisk = riskLevel >= RiskLevel.HIGH;
        
        emit UserRiskProfileUpdated(user, riskScore, riskLevel);
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Initialize circuit breakers
     */
    function _initializeCircuitBreakers() internal {
        circuitBreakers[CircuitBreakerType.PRICE_VOLATILITY] = CircuitBreaker({
            threshold: 1000, // 10%
            duration: 1 hours,
            cooldown: 4 hours,
            lastTriggered: 0,
            isActive: true,
            isTriggered: false
        });
        
        circuitBreakers[CircuitBreakerType.LIQUIDITY_SHORTAGE] = CircuitBreaker({
            threshold: 2000, // 20%
            duration: 2 hours,
            cooldown: 8 hours,
            lastTriggered: 0,
            isActive: true,
            isTriggered: false
        });
        
        circuitBreakers[CircuitBreakerType.POSITION_SIZE] = CircuitBreaker({
            threshold: 500, // 5%
            duration: 30 minutes,
            cooldown: 2 hours,
            lastTriggered: 0,
            isActive: true,
            isTriggered: false
        });
    }
    
    /**
     * @notice Check if circuit breaker is triggered
     * @param breakerType Circuit breaker type
     * @return triggered Whether breaker is triggered
     */
    function _isCircuitBreakerTriggered(
        CircuitBreakerType breakerType
    ) internal view returns (bool triggered) {
        CircuitBreaker memory breaker = circuitBreakers[breakerType];
        return breaker.isTriggered && 
               block.timestamp < breaker.lastTriggered + breaker.duration;
    }
    
    /**
     * @notice Get risk level from score
     * @param riskScore Risk score
     * @return riskLevel Risk level classification
     */
    function _getRiskLevel(uint256 riskScore) internal pure returns (RiskLevel riskLevel) {
        if (riskScore < 2000) { // < 20%
            return RiskLevel.LOW;
        } else if (riskScore < 5000) { // 20-50%
            return RiskLevel.MEDIUM;
        } else if (riskScore < 8000) { // 50-80%
            return RiskLevel.HIGH;
        } else {
            return RiskLevel.CRITICAL;
        }
    }
    
    /**
     * @notice Create risk event
     * @param eventId Event identifier
     * @param eventType Event type
     * @param severity Event severity
     * @param description Event description
     */
    function _createRiskEvent(
        bytes32 eventId,
        RiskEventType eventType,
        RiskLevel severity,
        string memory description
    ) internal {
        RiskEvent memory riskEvent = RiskEvent({
            eventId: eventId,
            eventType: eventType,
            severity: severity,
            description: description,
            timestamp: block.timestamp,
            isResolved: false,
            triggeredBy: msg.sender
        });
        
        riskEvents[eventId] = riskEvent;
        activeRiskEvents.push(eventId);
        riskEventCounts[severity]++;
        
        emit RiskEventCreated(eventId, eventType, severity);
    }
    
    /**
     * @notice Trigger emergency circuit breakers
     */
    function _triggerEmergencyCircuitBreakers() internal {
        // Trigger all circuit breakers in emergency
        for (uint256 i = 0; i < 3; i++) {
            CircuitBreakerType breakerType = CircuitBreakerType(i);
            CircuitBreaker storage breaker = circuitBreakers[breakerType];
            
            if (breaker.isActive && !breaker.isTriggered) {
                breaker.isTriggered = true;
                breaker.lastTriggered = block.timestamp;
            }
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get global risk metrics
     * @return metrics Global risk metrics
     */
    function getGlobalRiskMetrics() external view returns (GlobalRiskMetrics memory) {
        return globalMetrics;
    }
    
    /**
     * @notice Get market risk metrics
     * @param market Market identifier
     * @return metrics Market risk metrics
     */
    function getMarketRiskMetrics(bytes32 market) external view returns (MarketRiskMetrics memory) {
        return marketMetrics[market];
    }
    
    /**
     * @notice Get user risk metrics
     * @param user User address
     * @return metrics User risk metrics
     */
    function getUserRiskMetrics(address user) external view returns (UserRiskMetrics memory) {
        return userMetrics[user];
    }
    
    /**
     * @notice Get emergency state
     * @return state Current emergency state
     */
    function getEmergencyState() external view returns (EmergencyState memory) {
        return emergencyState;
    }
    
    /**
     * @notice Get active risk events
     * @return events Array of active risk event IDs
     */
    function getActiveRiskEvents() external view returns (bytes32[] memory) {
        return activeRiskEvents;
    }
    
    /**
     * @notice Get risk event details
     * @param eventId Event identifier
     * @return event Risk event details
     */
    function getRiskEvent(bytes32 eventId) external view returns (RiskEvent memory) {
        return riskEvents[eventId];
    }
}