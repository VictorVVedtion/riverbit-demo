// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ThreeGatesRiskManager
 * @notice Advanced risk management with three time-based gates
 * @dev Implements single window, 15-minute, and 24-hour risk limits with dynamic adjustment
 * 
 * Key Features:
 * - Single Window Gate: Immediate transaction limit
 * - 15-Minute Gate: Rolling 15-minute exposure limit
 * - 24-Hour Gate: Daily exposure and volume limits
 * - Dynamic risk adjustment based on market conditions
 * - User-specific and market-specific limits
 * - Emergency circuit breakers
 */
contract ThreeGatesRiskManager is 
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using Math for uint256;

    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_OPERATOR_ROLE = keccak256("RISK_OPERATOR_ROLE");
    bytes32 public constant CIRCUIT_BREAKER_ROLE = keccak256("CIRCUIT_BREAKER_ROLE");

    // ============ CONSTANTS ============
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant FIFTEEN_MINUTES = 15 minutes;
    uint256 private constant TWENTY_FOUR_HOURS = 24 hours;
    uint256 private constant MAX_RISK_SCORE = 10000; // 100%

    // ============ ENUMS ============

    enum GateType {
        SINGLE_WINDOW,
        FIFTEEN_MINUTE,
        TWENTY_FOUR_HOUR
    }

    enum RiskLevel {
        LOW,      // 0-25%
        MEDIUM,   // 25-50%
        HIGH,     // 50-75%
        CRITICAL  // 75-100%
    }

    // ============ STRUCTS ============

    // Risk gate configuration
    struct RiskGate {
        uint256 limit;              // Maximum allowed value
        uint256 currentUsage;       // Current usage in window
        uint256 lastResetTime;      // Last reset timestamp
        uint256 resetInterval;      // Reset interval in seconds
        bool isActive;              // Whether gate is active
        uint256 utilizationRate;    // Current utilization percentage
    }

    // User risk profile
    struct UserRiskProfile {
        // Gate limits
        RiskGate singleWindow;
        RiskGate fifteenMinute;
        RiskGate twentyFourHour;
        
        // Risk metrics
        uint256 riskScore;          // Current risk score (0-10000)
        RiskLevel riskLevel;        // Risk level classification
        uint256 totalExposure;      // Total exposure across all positions
        uint256 leverageRatio;      // Average leverage ratio
        
        // Historical data
        uint256 violationCount;     // Number of limit violations
        uint256 lastViolationTime;  // Last violation timestamp
        uint256 averageTradeSize;   // Average trade size
        uint256 tradingFrequency;   // Trades per day
        
        // Dynamic adjustments
        bool dynamicLimitsEnabled;  // Whether limits adjust dynamically
        uint256 adjustmentFactor;   // Current adjustment factor (basis points)
        uint256 lastAdjustmentTime; // Last adjustment timestamp
    }

    // Market risk configuration
    struct MarketRiskConfig {
        // Gate limits
        RiskGate singleWindow;
        RiskGate fifteenMinute;
        RiskGate twentyFourHour;
        
        // Market metrics
        uint256 volatilityScore;    // Market volatility score
        uint256 liquidityScore;     // Market liquidity score
        uint256 openInterest;       // Total open interest
        uint256 dailyVolume;        // 24h trading volume
        
        // Risk parameters
        uint256 maxLeverage;        // Maximum allowed leverage
        uint256 marginRequirement;  // Minimum margin requirement
        uint256 liquidationBuffer;  // Liquidation buffer
        
        bool isActive;              // Whether market is active
        bool emergencyMode;         // Emergency mode status
    }

    // Risk event structure
    struct RiskEvent {
        bytes32 eventId;
        address user;
        bytes32 market;
        GateType gateType;
        uint256 attemptedAmount;
        uint256 currentLimit;
        uint256 timestamp;
        bool isViolation;
        string description;
    }

    // Circuit breaker configuration
    struct CircuitBreaker {
        uint256 threshold;          // Trigger threshold
        uint256 duration;           // Breaker duration
        uint256 cooldownPeriod;     // Cooldown after reset
        uint256 lastTriggered;      // Last trigger time
        bool isTriggered;           // Current status
        bool isActive;              // Whether breaker is enabled
        uint256 triggerCount;       // Number of times triggered
    }

    // ============ STATE VARIABLES ============

    // User risk profiles
    mapping(address => UserRiskProfile) public userProfiles;
    mapping(address => bool) public userExists;
    address[] public allUsers;
    
    // Market risk configurations
    mapping(bytes32 => MarketRiskConfig) public marketConfigs;
    mapping(bytes32 => bool) public marketExists;
    bytes32[] public allMarkets;
    
    // Risk events
    mapping(bytes32 => RiskEvent) public riskEvents;
    bytes32[] public allRiskEvents;
    uint256 public totalRiskEvents;
    
    // Circuit breakers
    mapping(GateType => CircuitBreaker) public circuitBreakers;
    mapping(address => mapping(GateType => CircuitBreaker)) public userCircuitBreakers;
    mapping(bytes32 => mapping(GateType => CircuitBreaker)) public marketCircuitBreakers;
    
    // Global risk state
    uint256 public globalRiskScore;
    uint256 public systemLeverageRatio;
    uint256 public totalSystemExposure;
    bool public systemEmergencyMode;
    
    // Dynamic adjustment parameters
    uint256 public volatilityAdjustmentFactor;
    uint256 public liquidityAdjustmentFactor;
    uint256 public lastGlobalAdjustment;
    
    // Statistics
    uint256 public totalGateChecks;
    uint256 public totalViolations;
    mapping(GateType => uint256) public gateViolations;
    mapping(address => uint256) public userViolations;
    mapping(bytes32 => uint256) public marketViolations;

    // ============ EVENTS ============

    event RiskGateTriggered(
        address indexed user,
        bytes32 indexed market,
        GateType gateType,
        uint256 attemptedAmount,
        uint256 currentLimit,
        uint256 timestamp
    );

    event CircuitBreakerTriggered(
        GateType indexed gateType,
        address indexed user,
        bytes32 indexed market,
        uint256 threshold,
        uint256 timestamp
    );

    event RiskLimitsUpdated(
        address indexed user,
        GateType gateType,
        uint256 oldLimit,
        uint256 newLimit,
        uint256 timestamp
    );

    event DynamicAdjustmentApplied(
        address indexed user,
        uint256 oldFactor,
        uint256 newFactor,
        string reason,
        uint256 timestamp
    );

    event RiskViolation(
        bytes32 indexed eventId,
        address indexed user,
        bytes32 indexed market,
        GateType gateType,
        uint256 severity
    );

    event EmergencyModeToggled(
        bool enabled,
        address indexed admin,
        string reason,
        uint256 timestamp
    );

    // ============ MODIFIERS ============

    modifier onlyExistingUser(address user) {
        require(userProfiles[user].singleWindow.isActive || msg.sender == user, "User not initialized");
        _;
    }

    modifier onlyExistingMarket(bytes32 market) {
        require(marketConfigs[market].isActive, "Market not configured");
        _;
    }

    modifier notSystemEmergency() {
        require(!systemEmergencyMode, "System in emergency mode");
        _;
    }

    // ============ INITIALIZATION ============

    /**
     * @notice Initialize the contract
     * @param _admin Admin address
     */
    function initialize(address _admin) external initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();

        require(_admin != address(0), "Invalid admin");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(RISK_OPERATOR_ROLE, _admin);
        _grantRole(CIRCUIT_BREAKER_ROLE, _admin);

        // Initialize global circuit breakers
        _initializeCircuitBreakers();
        
        // Initialize global risk parameters
        volatilityAdjustmentFactor = 1000; // 10%
        liquidityAdjustmentFactor = 500;   // 5%
        lastGlobalAdjustment = block.timestamp;
    }

    // ============ CORE RISK CHECKING ============

    /**
     * @notice Check all three gates for a user trade
     * @param user User address
     * @param market Market identifier
     * @param tradeSize Trade size in USD
     * @param leverage Leverage ratio
     * @return allowed Whether trade is allowed
     * @return blockedGate Which gate blocked (if any)
     */
    function checkThreeGates(
        address user,
        bytes32 market,
        uint256 tradeSize,
        uint256 leverage
    ) external 
        nonReentrant 
        notSystemEmergency 
        returns (bool allowed, GateType blockedGate) 
    {
        totalGateChecks++;
        
        // Initialize user if needed
        if (!userExists[user]) {
            _initializeUser(user);
        }
        
        // Update gate windows
        _updateUserGateWindows(user);
        _updateMarketGateWindows(market);
        
        // Apply dynamic adjustments
        _applyDynamicAdjustments(user, market);
        
        UserRiskProfile storage userProfile = userProfiles[user];
        MarketRiskConfig storage marketConfig = marketConfigs[market];
        
        // Check single window gate
        if (!_checkSingleWindowGate(user, market, tradeSize)) {
            _recordViolation(user, market, GateType.SINGLE_WINDOW, tradeSize, userProfile.singleWindow.limit);
            return (false, GateType.SINGLE_WINDOW);
        }
        
        // Check 15-minute gate
        if (!_checkFifteenMinuteGate(user, market, tradeSize)) {
            _recordViolation(user, market, GateType.FIFTEEN_MINUTE, tradeSize, userProfile.fifteenMinute.limit);
            return (false, GateType.FIFTEEN_MINUTE);
        }
        
        // Check 24-hour gate
        if (!_check24HourGate(user, market, tradeSize)) {
            _recordViolation(user, market, GateType.TWENTY_FOUR_HOUR, tradeSize, userProfile.twentyFourHour.limit);
            return (false, GateType.TWENTY_FOUR_HOUR);
        }
        
        // All gates passed - update usage
        _updateGateUsage(user, market, tradeSize);
        
        // Update risk scores
        _updateRiskScores(user, market, tradeSize, leverage);
        
        return (true, GateType.SINGLE_WINDOW); // Placeholder for success
    }

    // ============ INDIVIDUAL GATE CHECKS ============

    /**
     * @notice Check single window gate
     * @param user User address
     * @param market Market identifier
     * @param tradeSize Trade size
     * @return allowed Whether trade is allowed
     */
    function _checkSingleWindowGate(
        address user,
        bytes32 market,
        uint256 tradeSize
    ) internal view returns (bool allowed) {
        UserRiskProfile storage userProfile = userProfiles[user];
        MarketRiskConfig storage marketConfig = marketConfigs[market];
        
        // Check user limit
        if (userProfile.singleWindow.currentUsage + tradeSize > userProfile.singleWindow.limit) {
            return false;
        }
        
        // Check market limit
        if (marketConfig.singleWindow.currentUsage + tradeSize > marketConfig.singleWindow.limit) {
            return false;
        }
        
        // Check circuit breakers
        if (_isCircuitBreakerTriggered(GateType.SINGLE_WINDOW, user, market)) {
            return false;
        }
        
        return true;
    }

    /**
     * @notice Check 15-minute gate
     * @param user User address
     * @param market Market identifier
     * @param tradeSize Trade size
     * @return allowed Whether trade is allowed
     */
    function _checkFifteenMinuteGate(
        address user,
        bytes32 market,
        uint256 tradeSize
    ) internal view returns (bool allowed) {
        UserRiskProfile storage userProfile = userProfiles[user];
        MarketRiskConfig storage marketConfig = marketConfigs[market];
        
        // Check user limit
        if (userProfile.fifteenMinute.currentUsage + tradeSize > userProfile.fifteenMinute.limit) {
            return false;
        }
        
        // Check market limit
        if (marketConfig.fifteenMinute.currentUsage + tradeSize > marketConfig.fifteenMinute.limit) {
            return false;
        }
        
        // Check circuit breakers
        if (_isCircuitBreakerTriggered(GateType.FIFTEEN_MINUTE, user, market)) {
            return false;
        }
        
        return true;
    }

    /**
     * @notice Check 24-hour gate
     * @param user User address
     * @param market Market identifier
     * @param tradeSize Trade size
     * @return allowed Whether trade is allowed
     */
    function _check24HourGate(
        address user,
        bytes32 market,
        uint256 tradeSize
    ) internal view returns (bool allowed) {
        UserRiskProfile storage userProfile = userProfiles[user];
        MarketRiskConfig storage marketConfig = marketConfigs[market];
        
        // Check user limit
        if (userProfile.twentyFourHour.currentUsage + tradeSize > userProfile.twentyFourHour.limit) {
            return false;
        }
        
        // Check market limit
        if (marketConfig.twentyFourHour.currentUsage + tradeSize > marketConfig.twentyFourHour.limit) {
            return false;
        }
        
        // Check circuit breakers
        if (_isCircuitBreakerTriggered(GateType.TWENTY_FOUR_HOUR, user, market)) {
            return false;
        }
        
        return true;
    }

    // ============ GATE WINDOW MANAGEMENT ============

    /**
     * @notice Update user gate windows
     * @param user User address
     */
    function _updateUserGateWindows(address user) internal {
        UserRiskProfile storage profile = userProfiles[user];
        
        // Single window always resets
        profile.singleWindow.currentUsage = 0;
        profile.singleWindow.lastResetTime = block.timestamp;
        
        // 15-minute window
        if (block.timestamp >= profile.fifteenMinute.lastResetTime + FIFTEEN_MINUTES) {
            profile.fifteenMinute.currentUsage = 0;
            profile.fifteenMinute.lastResetTime = block.timestamp;
        }
        
        // 24-hour window
        if (block.timestamp >= profile.twentyFourHour.lastResetTime + TWENTY_FOUR_HOURS) {
            profile.twentyFourHour.currentUsage = 0;
            profile.twentyFourHour.lastResetTime = block.timestamp;
        }
        
        // Update utilization rates
        _updateUtilizationRates(user);
    }

    /**
     * @notice Update market gate windows
     * @param market Market identifier
     */
    function _updateMarketGateWindows(bytes32 market) internal {
        MarketRiskConfig storage config = marketConfigs[market];
        
        // Single window always resets
        config.singleWindow.currentUsage = 0;
        config.singleWindow.lastResetTime = block.timestamp;
        
        // 15-minute window
        if (block.timestamp >= config.fifteenMinute.lastResetTime + FIFTEEN_MINUTES) {
            config.fifteenMinute.currentUsage = 0;
            config.fifteenMinute.lastResetTime = block.timestamp;
        }
        
        // 24-hour window
        if (block.timestamp >= config.twentyFourHour.lastResetTime + TWENTY_FOUR_HOURS) {
            config.twentyFourHour.currentUsage = 0;
            config.twentyFourHour.lastResetTime = block.timestamp;
        }
    }

    /**
     * @notice Update gate usage after successful trade
     * @param user User address
     * @param market Market identifier
     * @param tradeSize Trade size
     */
    function _updateGateUsage(address user, bytes32 market, uint256 tradeSize) internal {
        UserRiskProfile storage userProfile = userProfiles[user];
        MarketRiskConfig storage marketConfig = marketConfigs[market];
        
        // Update user usage
        userProfile.singleWindow.currentUsage += tradeSize;
        userProfile.fifteenMinute.currentUsage += tradeSize;
        userProfile.twentyFourHour.currentUsage += tradeSize;
        
        // Update market usage
        marketConfig.singleWindow.currentUsage += tradeSize;
        marketConfig.fifteenMinute.currentUsage += tradeSize;
        marketConfig.twentyFourHour.currentUsage += tradeSize;
        
        // Update utilization rates
        _updateUtilizationRates(user);
    }

    // ============ DYNAMIC ADJUSTMENTS ============

    /**
     * @notice Apply dynamic adjustments based on market conditions
     * @param user User address
     * @param market Market identifier
     */
    function _applyDynamicAdjustments(address user, bytes32 market) internal {
        UserRiskProfile storage userProfile = userProfiles[user];
        MarketRiskConfig storage marketConfig = marketConfigs[market];
        
        if (!userProfile.dynamicLimitsEnabled) return;
        
        // Calculate adjustment factors
        uint256 volatilityFactor = _calculateVolatilityAdjustment(market);
        uint256 liquidityFactor = _calculateLiquidityAdjustment(market);
        uint256 userRiskFactor = _calculateUserRiskAdjustment(user);
        
        // Combined adjustment factor
        uint256 combinedFactor = (volatilityFactor + liquidityFactor + userRiskFactor) / 3;
        
        // Apply adjustments if significant change
        uint256 oldFactor = userProfile.adjustmentFactor;
        if (_shouldApplyAdjustment(oldFactor, combinedFactor)) {
            userProfile.adjustmentFactor = combinedFactor;
            userProfile.lastAdjustmentTime = block.timestamp;
            
            _adjustUserLimits(user, combinedFactor);
            
            emit DynamicAdjustmentApplied(
                user,
                oldFactor,
                combinedFactor,
                "Market conditions changed",
                block.timestamp
            );
        }
    }

    /**
     * @notice Calculate volatility-based adjustment
     * @param market Market identifier
     * @return adjustment Adjustment factor (basis points)
     */
    function _calculateVolatilityAdjustment(bytes32 market) internal view returns (uint256 adjustment) {
        MarketRiskConfig storage config = marketConfigs[market];
        
        // Higher volatility = lower limits
        if (config.volatilityScore > 8000) { // Very high volatility
            adjustment = 7000; // Reduce limits by 30%
        } else if (config.volatilityScore > 6000) { // High volatility
            adjustment = 8500; // Reduce limits by 15%
        } else if (config.volatilityScore > 4000) { // Medium volatility
            adjustment = 9500; // Reduce limits by 5%
        } else { // Low volatility
            adjustment = 10000; // No adjustment
        }
        
        return adjustment;
    }

    /**
     * @notice Calculate liquidity-based adjustment
     * @param market Market identifier
     * @return adjustment Adjustment factor (basis points)
     */
    function _calculateLiquidityAdjustment(bytes32 market) internal view returns (uint256 adjustment) {
        MarketRiskConfig storage config = marketConfigs[market];
        
        // Lower liquidity = lower limits
        if (config.liquidityScore < 2000) { // Very low liquidity
            adjustment = 7000; // Reduce limits by 30%
        } else if (config.liquidityScore < 4000) { // Low liquidity
            adjustment = 8500; // Reduce limits by 15%
        } else if (config.liquidityScore < 6000) { // Medium liquidity
            adjustment = 9500; // Reduce limits by 5%
        } else { // High liquidity
            adjustment = 10000; // No adjustment
        }
        
        return adjustment;
    }

    /**
     * @notice Calculate user risk-based adjustment
     * @param user User address
     * @return adjustment Adjustment factor (basis points)
     */
    function _calculateUserRiskAdjustment(address user) internal view returns (uint256 adjustment) {
        UserRiskProfile storage profile = userProfiles[user];
        
        // Higher user risk = lower limits
        if (profile.riskLevel == RiskLevel.CRITICAL) {
            adjustment = 6000; // Reduce limits by 40%
        } else if (profile.riskLevel == RiskLevel.HIGH) {
            adjustment = 8000; // Reduce limits by 20%
        } else if (profile.riskLevel == RiskLevel.MEDIUM) {
            adjustment = 9000; // Reduce limits by 10%
        } else { // Low risk
            adjustment = 10000; // No adjustment
        }
        
        return adjustment;
    }

    // ============ RISK SCORING ============

    /**
     * @notice Update risk scores for user and system
     * @param user User address
     * @param market Market identifier
     * @param tradeSize Trade size
     * @param leverage Leverage ratio
     */
    function _updateRiskScores(address user, bytes32 market, uint256 tradeSize, uint256 leverage) internal {
        UserRiskProfile storage userProfile = userProfiles[user];
        
        // Calculate new user risk score
        uint256 newRiskScore = _calculateUserRiskScore(user, tradeSize, leverage);
        userProfile.riskScore = newRiskScore;
        userProfile.riskLevel = _getRiskLevel(newRiskScore);
        
        // Update user statistics
        userProfile.totalExposure += tradeSize;
        userProfile.leverageRatio = (userProfile.leverageRatio + leverage) / 2; // Simple average
        
        // Update global risk metrics
        _updateGlobalRiskMetrics();
    }

    /**
     * @notice Calculate user risk score
     * @param user User address
     * @param tradeSize Current trade size
     * @param leverage Current leverage
     * @return riskScore Calculated risk score (0-10000)
     */
    function _calculateUserRiskScore(address user, uint256 tradeSize, uint256 leverage) internal view returns (uint256 riskScore) {
        UserRiskProfile storage profile = userProfiles[user];
        
        // Base score components
        uint256 exposureScore = (profile.totalExposure * 1000) / profile.twentyFourHour.limit; // Exposure vs limit
        uint256 leverageScore = (leverage * 100); // Leverage multiplier
        uint256 utilizationScore = _getAverageUtilization(user) * 10; // Gate utilization
        uint256 violationScore = profile.violationCount * 500; // Violation penalty
        
        // Combine scores with weights
        riskScore = (exposureScore * 30 + leverageScore * 25 + utilizationScore * 25 + violationScore * 20) / 100;
        
        // Cap at maximum
        if (riskScore > MAX_RISK_SCORE) {
            riskScore = MAX_RISK_SCORE;
        }
        
        return riskScore;
    }

    /**
     * @notice Get risk level from score
     * @param riskScore Risk score (0-10000)
     * @return level Risk level
     */
    function _getRiskLevel(uint256 riskScore) internal pure returns (RiskLevel level) {
        if (riskScore < 2500) {
            return RiskLevel.LOW;
        } else if (riskScore < 5000) {
            return RiskLevel.MEDIUM;
        } else if (riskScore < 7500) {
            return RiskLevel.HIGH;
        } else {
            return RiskLevel.CRITICAL;
        }
    }

    // ============ CIRCUIT BREAKERS ============

    /**
     * @notice Check if circuit breaker is triggered
     * @param gateType Gate type
     * @param user User address
     * @param market Market identifier
     * @return triggered Whether breaker is triggered
     */
    function _isCircuitBreakerTriggered(GateType gateType, address user, bytes32 market) internal view returns (bool triggered) {
        CircuitBreaker storage globalBreaker = circuitBreakers[gateType];
        CircuitBreaker storage userBreaker = userCircuitBreakers[user][gateType];
        CircuitBreaker storage marketBreaker = marketCircuitBreakers[market][gateType];
        
        // Check if any breaker is triggered and still active
        return (
            (globalBreaker.isTriggered && block.timestamp < globalBreaker.lastTriggered + globalBreaker.duration) ||
            (userBreaker.isTriggered && block.timestamp < userBreaker.lastTriggered + userBreaker.duration) ||
            (marketBreaker.isTriggered && block.timestamp < marketBreaker.lastTriggered + marketBreaker.duration)
        );
    }

    /**
     * @notice Initialize circuit breakers
     */
    function _initializeCircuitBreakers() internal {
        // Global circuit breakers
        circuitBreakers[GateType.SINGLE_WINDOW] = CircuitBreaker({
            threshold: 10, // 10 violations
            duration: 5 minutes,
            cooldownPeriod: 15 minutes,
            lastTriggered: 0,
            isTriggered: false,
            isActive: true,
            triggerCount: 0
        });
        
        circuitBreakers[GateType.FIFTEEN_MINUTE] = CircuitBreaker({
            threshold: 5, // 5 violations
            duration: 15 minutes,
            cooldownPeriod: 1 hours,
            lastTriggered: 0,
            isTriggered: false,
            isActive: true,
            triggerCount: 0
        });
        
        circuitBreakers[GateType.TWENTY_FOUR_HOUR] = CircuitBreaker({
            threshold: 3, // 3 violations
            duration: 1 hours,
            cooldownPeriod: 6 hours,
            lastTriggered: 0,
            isTriggered: false,
            isActive: true,
            triggerCount: 0
        });
    }

    // ============ VIOLATION HANDLING ============

    /**
     * @notice Record a risk violation
     * @param user User address
     * @param market Market identifier
     * @param gateType Gate that was violated
     * @param attemptedAmount Attempted trade amount
     * @param currentLimit Current limit
     */
    function _recordViolation(
        address user,
        bytes32 market,
        GateType gateType,
        uint256 attemptedAmount,
        uint256 currentLimit
    ) internal {
        bytes32 eventId = keccak256(abi.encodePacked(
            user, market, gateType, attemptedAmount, block.timestamp
        ));
        
        // Create risk event
        riskEvents[eventId] = RiskEvent({
            eventId: eventId,
            user: user,
            market: market,
            gateType: gateType,
            attemptedAmount: attemptedAmount,
            currentLimit: currentLimit,
            timestamp: block.timestamp,
            isViolation: true,
            description: "Risk gate limit exceeded"
        });
        
        allRiskEvents.push(eventId);
        totalRiskEvents++;
        
        // Update statistics
        totalViolations++;
        gateViolations[gateType]++;
        userViolations[user]++;
        marketViolations[market]++;
        
        // Update user profile
        UserRiskProfile storage userProfile = userProfiles[user];
        userProfile.violationCount++;
        userProfile.lastViolationTime = block.timestamp;
        
        // Check circuit breaker triggers
        _checkCircuitBreakerTriggers(user, market, gateType);
        
        emit RiskGateTriggered(user, market, gateType, attemptedAmount, currentLimit, block.timestamp);
        emit RiskViolation(eventId, user, market, gateType, attemptedAmount);
    }

    /**
     * @notice Check if circuit breakers should be triggered
     * @param user User address
     * @param market Market identifier
     * @param gateType Gate type
     */
    function _checkCircuitBreakerTriggers(address user, bytes32 market, GateType gateType) internal {
        // Check user-specific circuit breaker
        if (userViolations[user] >= userCircuitBreakers[user][gateType].threshold) {
            _triggerCircuitBreaker(gateType, user, bytes32(0));
        }
        
        // Check market-specific circuit breaker
        if (marketViolations[market] >= marketCircuitBreakers[market][gateType].threshold) {
            _triggerCircuitBreaker(gateType, address(0), market);
        }
        
        // Check global circuit breaker
        if (gateViolations[gateType] >= circuitBreakers[gateType].threshold) {
            _triggerCircuitBreaker(gateType, address(0), bytes32(0));
        }
    }

    /**
     * @notice Trigger circuit breaker
     * @param gateType Gate type
     * @param user User address (0 for global/market)
     * @param market Market identifier (0 for global/user)
     */
    function _triggerCircuitBreaker(GateType gateType, address user, bytes32 market) internal {
        if (user != address(0)) {
            // User-specific breaker
            CircuitBreaker storage breaker = userCircuitBreakers[user][gateType];
            breaker.isTriggered = true;
            breaker.lastTriggered = block.timestamp;
            breaker.triggerCount++;
        } else if (market != bytes32(0)) {
            // Market-specific breaker
            CircuitBreaker storage breaker = marketCircuitBreakers[market][gateType];
            breaker.isTriggered = true;
            breaker.lastTriggered = block.timestamp;
            breaker.triggerCount++;
        } else {
            // Global breaker
            CircuitBreaker storage breaker = circuitBreakers[gateType];
            breaker.isTriggered = true;
            breaker.lastTriggered = block.timestamp;
            breaker.triggerCount++;
        }
        
        emit CircuitBreakerTriggered(gateType, user, market, block.timestamp, block.timestamp);
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Initialize user with default risk limits
     * @param user User address
     */
    function _initializeUser(address user) internal {
        if (userExists[user]) return;
        
        UserRiskProfile storage profile = userProfiles[user];
        
        // Initialize with default limits
        profile.singleWindow = RiskGate({
            limit: 50000 * PRECISION, // $50k per transaction
            currentUsage: 0,
            lastResetTime: block.timestamp,
            resetInterval: 0, // Always resets
            isActive: true,
            utilizationRate: 0
        });
        
        profile.fifteenMinute = RiskGate({
            limit: 200000 * PRECISION, // $200k per 15 minutes
            currentUsage: 0,
            lastResetTime: block.timestamp,
            resetInterval: FIFTEEN_MINUTES,
            isActive: true,
            utilizationRate: 0
        });
        
        profile.twentyFourHour = RiskGate({
            limit: 1000000 * PRECISION, // $1M per day
            currentUsage: 0,
            lastResetTime: block.timestamp,
            resetInterval: TWENTY_FOUR_HOURS,
            isActive: true,
            utilizationRate: 0
        });
        
        // Initialize risk metrics
        profile.riskScore = 0;
        profile.riskLevel = RiskLevel.LOW;
        profile.totalExposure = 0;
        profile.leverageRatio = 0;
        profile.violationCount = 0;
        profile.lastViolationTime = 0;
        profile.averageTradeSize = 0;
        profile.tradingFrequency = 0;
        profile.dynamicLimitsEnabled = true;
        profile.adjustmentFactor = BASIS_POINTS;
        profile.lastAdjustmentTime = block.timestamp;
        
        userExists[user] = true;
        allUsers.push(user);
    }

    /**
     * @notice Update utilization rates for user gates
     * @param user User address
     */
    function _updateUtilizationRates(address user) internal {
        UserRiskProfile storage profile = userProfiles[user];
        
        profile.singleWindow.utilizationRate = (profile.singleWindow.currentUsage * BASIS_POINTS) / profile.singleWindow.limit;
        profile.fifteenMinute.utilizationRate = (profile.fifteenMinute.currentUsage * BASIS_POINTS) / profile.fifteenMinute.limit;
        profile.twentyFourHour.utilizationRate = (profile.twentyFourHour.currentUsage * BASIS_POINTS) / profile.twentyFourHour.limit;
    }

    /**
     * @notice Get average utilization across all gates
     * @param user User address
     * @return utilization Average utilization rate
     */
    function _getAverageUtilization(address user) internal view returns (uint256 utilization) {
        UserRiskProfile storage profile = userProfiles[user];
        utilization = (profile.singleWindow.utilizationRate + 
                      profile.fifteenMinute.utilizationRate + 
                      profile.twentyFourHour.utilizationRate) / 3;
    }

    /**
     * @notice Check if adjustment should be applied
     * @param oldFactor Old adjustment factor
     * @param newFactor New adjustment factor
     * @return shouldApply Whether to apply adjustment
     */
    function _shouldApplyAdjustment(uint256 oldFactor, uint256 newFactor) internal pure returns (bool shouldApply) {
        uint256 change = oldFactor > newFactor ? oldFactor - newFactor : newFactor - oldFactor;
        return change >= 200; // Apply if change is >= 2%
    }

    /**
     * @notice Adjust user limits based on factor
     * @param user User address
     * @param adjustmentFactor Adjustment factor (basis points)
     */
    function _adjustUserLimits(address user, uint256 adjustmentFactor) internal {
        UserRiskProfile storage profile = userProfiles[user];
        
        // Store original limits for events
        uint256 oldSingleLimit = profile.singleWindow.limit;
        uint256 oldFifteenLimit = profile.fifteenMinute.limit;
        uint256 oldTwentyFourLimit = profile.twentyFourHour.limit;
        
        // Apply adjustments
        profile.singleWindow.limit = (oldSingleLimit * adjustmentFactor) / BASIS_POINTS;
        profile.fifteenMinute.limit = (oldFifteenLimit * adjustmentFactor) / BASIS_POINTS;
        profile.twentyFourHour.limit = (oldTwentyFourLimit * adjustmentFactor) / BASIS_POINTS;
        
        // Emit events
        emit RiskLimitsUpdated(user, GateType.SINGLE_WINDOW, oldSingleLimit, profile.singleWindow.limit, block.timestamp);
        emit RiskLimitsUpdated(user, GateType.FIFTEEN_MINUTE, oldFifteenLimit, profile.fifteenMinute.limit, block.timestamp);
        emit RiskLimitsUpdated(user, GateType.TWENTY_FOUR_HOUR, oldTwentyFourLimit, profile.twentyFourHour.limit, block.timestamp);
    }

    /**
     * @notice Update global risk metrics
     */
    function _updateGlobalRiskMetrics() internal {
        uint256 totalUsers = allUsers.length;
        if (totalUsers == 0) return;
        
        uint256 totalRisk = 0;
        uint256 totalLeverage = 0;
        uint256 totalExposure = 0;
        
        for (uint256 i = 0; i < totalUsers; i++) {
            UserRiskProfile storage profile = userProfiles[allUsers[i]];
            totalRisk += profile.riskScore;
            totalLeverage += profile.leverageRatio;
            totalExposure += profile.totalExposure;
        }
        
        globalRiskScore = totalRisk / totalUsers;
        systemLeverageRatio = totalLeverage / totalUsers;
        totalSystemExposure = totalExposure;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Configure market risk parameters
     * @param market Market identifier
     * @param singleWindowLimit Single window limit
     * @param fifteenMinuteLimit 15-minute limit
     * @param twentyFourHourLimit 24-hour limit
     * @param maxLeverage Maximum leverage
     */
    function configureMarketRisk(
        bytes32 market,
        uint256 singleWindowLimit,
        uint256 fifteenMinuteLimit,
        uint256 twentyFourHourLimit,
        uint256 maxLeverage
    ) external onlyRole(ADMIN_ROLE) {
        MarketRiskConfig storage config = marketConfigs[market];
        
        config.singleWindow = RiskGate({
            limit: singleWindowLimit,
            currentUsage: 0,
            lastResetTime: block.timestamp,
            resetInterval: 0,
            isActive: true,
            utilizationRate: 0
        });
        
        config.fifteenMinute = RiskGate({
            limit: fifteenMinuteLimit,
            currentUsage: 0,
            lastResetTime: block.timestamp,
            resetInterval: FIFTEEN_MINUTES,
            isActive: true,
            utilizationRate: 0
        });
        
        config.twentyFourHour = RiskGate({
            limit: twentyFourHourLimit,
            currentUsage: 0,
            lastResetTime: block.timestamp,
            resetInterval: TWENTY_FOUR_HOURS,
            isActive: true,
            utilizationRate: 0
        });
        
        config.maxLeverage = maxLeverage;
        config.isActive = true;
        
        if (!marketExists[market]) {
            marketExists[market] = true;
            allMarkets.push(market);
        }
    }

    /**
     * @notice Update user risk limits
     * @param user User address
     * @param gateType Gate type to update
     * @param newLimit New limit value
     */
    function updateUserRiskLimit(
        address user,
        GateType gateType,
        uint256 newLimit
    ) external onlyRole(ADMIN_ROLE) {
        require(newLimit > 0, "Invalid limit");
        
        if (!userExists[user]) {
            _initializeUser(user);
        }
        
        UserRiskProfile storage profile = userProfiles[user];
        uint256 oldLimit;
        
        if (gateType == GateType.SINGLE_WINDOW) {
            oldLimit = profile.singleWindow.limit;
            profile.singleWindow.limit = newLimit;
        } else if (gateType == GateType.FIFTEEN_MINUTE) {
            oldLimit = profile.fifteenMinute.limit;
            profile.fifteenMinute.limit = newLimit;
        } else if (gateType == GateType.TWENTY_FOUR_HOUR) {
            oldLimit = profile.twentyFourHour.limit;
            profile.twentyFourHour.limit = newLimit;
        }
        
        emit RiskLimitsUpdated(user, gateType, oldLimit, newLimit, block.timestamp);
    }

    /**
     * @notice Reset circuit breaker
     * @param gateType Gate type
     * @param user User address (0 for global)
     * @param market Market identifier (0 for global/user)
     */
    function resetCircuitBreaker(
        GateType gateType,
        address user,
        bytes32 market
    ) external onlyRole(CIRCUIT_BREAKER_ROLE) {
        if (user != address(0)) {
            userCircuitBreakers[user][gateType].isTriggered = false;
        } else if (market != bytes32(0)) {
            marketCircuitBreakers[market][gateType].isTriggered = false;
        } else {
            circuitBreakers[gateType].isTriggered = false;
        }
    }

    /**
     * @notice Toggle system emergency mode
     * @param enabled Whether to enable emergency mode
     * @param reason Reason for toggle
     */
    function setSystemEmergencyMode(bool enabled, string calldata reason) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        systemEmergencyMode = enabled;
        emit EmergencyModeToggled(enabled, msg.sender, reason, block.timestamp);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get user risk profile
     * @param user User address
     * @return profile User risk profile
     */
    function getUserRiskProfile(address user) 
        external 
        view 
        returns (UserRiskProfile memory profile) 
    {
        return userProfiles[user];
    }

    /**
     * @notice Get market risk configuration
     * @param market Market identifier
     * @return config Market risk configuration
     */
    function getMarketRiskConfig(bytes32 market) 
        external 
        view 
        returns (MarketRiskConfig memory config) 
    {
        return marketConfigs[market];
    }

    /**
     * @notice Get risk event details
     * @param eventId Event identifier
     * @return riskEvent Risk event details
     */
    function getRiskEvent(bytes32 eventId) 
        external 
        view 
        returns (RiskEvent memory riskEvent) 
    {
        return riskEvents[eventId];
    }

    /**
     * @notice Get current utilization for user
     * @param user User address
     * @return singleWindow Single window utilization
     * @return fifteenMinute 15-minute utilization
     * @return twentyFourHour 24-hour utilization
     */
    function getUserUtilization(address user) 
        external 
        view 
        returns (uint256 singleWindow, uint256 fifteenMinute, uint256 twentyFourHour) 
    {
        UserRiskProfile storage profile = userProfiles[user];
        singleWindow = profile.singleWindow.utilizationRate;
        fifteenMinute = profile.fifteenMinute.utilizationRate;
        twentyFourHour = profile.twentyFourHour.utilizationRate;
    }

    /**
     * @notice Get global risk metrics
     * @return riskScore Global risk score
     * @return leverageRatio System leverage ratio
     * @return totalExposure Total system exposure
     * @return emergencyMode Emergency mode status
     */
    function getGlobalRiskMetrics() 
        external 
        view 
        returns (uint256 riskScore, uint256 leverageRatio, uint256 totalExposure, bool emergencyMode) 
    {
        riskScore = globalRiskScore;
        leverageRatio = systemLeverageRatio;
        totalExposure = totalSystemExposure;
        emergencyMode = systemEmergencyMode;
    }

    /**
     * @notice Get all risk events
     * @return eventIds Array of risk event IDs
     */
    function getAllRiskEvents() external view returns (bytes32[] memory eventIds) {
        return allRiskEvents;
    }

    /**
     * @notice Get violation statistics
     * @return total Total violations
     * @return singleWindow Single window violations
     * @return fifteenMinute 15-minute violations
     * @return twentyFourHour 24-hour violations
     */
    function getViolationStats() 
        external 
        view 
        returns (uint256 total, uint256 singleWindow, uint256 fifteenMinute, uint256 twentyFourHour) 
    {
        total = totalViolations;
        singleWindow = gateViolations[GateType.SINGLE_WINDOW];
        fifteenMinute = gateViolations[GateType.FIFTEEN_MINUTE];
        twentyFourHour = gateViolations[GateType.TWENTY_FOUR_HOUR];
    }
}