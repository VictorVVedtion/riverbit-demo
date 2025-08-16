// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../interfaces/IMarginManager.sol";
import "../libraries/SafeMath.sol";
import "../libraries/TradingMath.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MarginManager
 * @notice Manages margin accounts, cross/isolated margin modes, and margin requirements
 * @dev Supports USDC as the sole margin currency with upgrade proxy pattern
 */
contract MarginManager is 
    IMarginManager,
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Constants
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MIN_MARGIN = 1e6; // $1 minimum margin (6 decimals USDC)

    // State variables
    IERC20 public usdcToken;
    
    // Leverage limits by market type
    mapping(MarketType => uint256) public maxLeverage;
    
    // Maintenance margin rates by market type (basis points)
    mapping(MarketType => uint256) public maintenanceRates;
    
    // User margin accounts
    mapping(address => MarginAccount) public marginAccounts;
    
    // User positions: user => positionKey => Position
    mapping(address => mapping(bytes32 => Position)) public positions;
    
    // User position keys for enumeration
    mapping(address => bytes32[]) public userPositionKeys;
    
    // Position key to index mapping for efficient removal
    mapping(address => mapping(bytes32 => uint256)) public positionKeyIndex;
    
    // Authorized trading contracts
    mapping(address => bool) public authorizedContracts;
    
    // Emergency withdrawal enabled
    bool public emergencyWithdrawalEnabled;

    // Custom errors
    error InsufficientMargin();
    error InvalidMarginMode();
    error PositionNotFound();
    error UnauthorizedContract();
    error InvalidLeverage();
    error BelowMinimumMargin();
    error ExceedsMaxLeverage();
    error EmergencyWithdrawalDisabled();

    // Modifiers
    modifier onlyAuthorized() {
        if (!authorizedContracts[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedContract();
        }
        _;
    }

    modifier validPositionKey(address user, bytes32 positionKey) {
        if (positions[user][positionKey].size == 0) {
            revert PositionNotFound();
        }
        _;
    }

    /**
     * @dev Initialize the contract
     * @param _usdcToken USDC token contract address
     */
    function initialize(address _usdcToken) external initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init();

        require(_usdcToken != address(0), "MarginManager: invalid USDC address");
        usdcToken = IERC20(_usdcToken);

        // Set default leverage limits
        maxLeverage[MarketType.CRYPTO] = 100; // 100x for crypto
        maxLeverage[MarketType.XSTOCK] = 3;   // 3x for xStock

        // Set default maintenance margin rates (basis points)
        maintenanceRates[MarketType.CRYPTO] = 500;  // 5% for crypto
        maintenanceRates[MarketType.XSTOCK] = 1000; // 10% for xStock
    }

    /**
     * @notice Deposit USDC as margin
     * @param amount Amount of USDC to deposit
     */
    function depositMargin(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= MIN_MARGIN, "MarginManager: below minimum margin");
        
        MarginAccount storage account = marginAccounts[msg.sender];
        
        // Transfer USDC from user
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update account balance
        account.balance = account.balance.add(amount);
        
        emit MarginDeposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw USDC margin
     * @param amount Amount of USDC to withdraw
     */
    function withdrawMargin(uint256 amount) external nonReentrant whenNotPaused {
        MarginAccount storage account = marginAccounts[msg.sender];
        uint256 availableMargin = getAvailableMargin(msg.sender);
        
        require(amount <= availableMargin, "MarginManager: insufficient available margin");
        
        // Update account balance
        account.balance = account.balance.sub(amount);
        
        // Transfer USDC to user
        usdcToken.safeTransfer(msg.sender, amount);
        
        emit MarginWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Add margin to a specific position (isolated mode)
     * @param positionKey Position identifier
     * @param amount Amount of margin to add
     */
    function addMargin(bytes32 positionKey, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused
        validPositionKey(msg.sender, positionKey)
    {
        require(amount > 0, "MarginManager: invalid amount");
        
        Position storage position = positions[msg.sender][positionKey];
        MarginAccount storage account = marginAccounts[msg.sender];
        
        if (position.mode == MarginMode.ISOLATED) {
            // For isolated positions, transfer from available margin
            uint256 availableMargin = getAvailableMargin(msg.sender);
            require(amount <= availableMargin, "MarginManager: insufficient available margin");
            
            account.lockedMargin = account.lockedMargin.add(amount);
            position.margin = position.margin.add(amount);
        } else {
            // For cross margin, just verify sufficient balance
            require(amount <= account.balance, "MarginManager: insufficient balance");
        }
        
        emit MarginAdded(msg.sender, positionKey, amount);
    }

    /**
     * @notice Remove margin from a specific position (isolated mode)
     * @param positionKey Position identifier
     * @param amount Amount of margin to remove
     */
    function removeMargin(bytes32 positionKey, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        validPositionKey(msg.sender, positionKey)
    {
        require(amount > 0, "MarginManager: invalid amount");
        
        Position storage position = positions[msg.sender][positionKey];
        require(position.mode == MarginMode.ISOLATED, "MarginManager: only isolated positions");
        require(amount <= position.margin, "MarginManager: insufficient position margin");
        
        // Check if remaining margin meets requirements
        uint256 remainingMargin = position.margin.sub(amount);
        uint256 requiredMargin = getMaintenanceMargin(msg.sender, positionKey);
        require(remainingMargin >= requiredMargin, "MarginManager: below maintenance margin");
        
        MarginAccount storage account = marginAccounts[msg.sender];
        
        // Update position and account
        position.margin = remainingMargin;
        account.lockedMargin = account.lockedMargin.sub(amount);
        
        emit MarginRemoved(msg.sender, positionKey, amount);
    }

    /**
     * @notice Change margin mode for a position
     * @param positionKey Position identifier
     * @param newMode New margin mode
     */
    function changeMarginMode(bytes32 positionKey, MarginMode newMode)
        external
        nonReentrant
        whenNotPaused
        validPositionKey(msg.sender, positionKey)
    {
        Position storage position = positions[msg.sender][positionKey];
        require(position.mode != newMode, "MarginManager: same margin mode");
        
        MarginAccount storage account = marginAccounts[msg.sender];
        
        if (newMode == MarginMode.ISOLATED) {
            // Moving from cross to isolated - lock current margin
            uint256 requiredMargin = getRequiredMargin(
                msg.sender, 
                positionKey, 
                position.size, 
                position.entryPrice, 
                position.marketType
            );
            
            uint256 availableMargin = getAvailableMargin(msg.sender);
            require(requiredMargin <= availableMargin, "MarginManager: insufficient available margin");
            
            position.margin = requiredMargin;
            account.lockedMargin = account.lockedMargin.add(requiredMargin);
        } else {
            // Moving from isolated to cross - release locked margin
            account.lockedMargin = account.lockedMargin.sub(position.margin);
            position.margin = 0; // Cross margin positions don't track individual margin
        }
        
        position.mode = newMode;
        
        emit MarginModeChanged(msg.sender, positionKey, newMode);
    }

    /**
     * @notice Create a new position (called by trading contracts)
     * @param user Position owner
     * @param positionKey Position identifier
     * @param size Position size in USD
     * @param entryPrice Entry price
     * @param isLong Long or short position
     * @param mode Margin mode
     * @param marketType Market type
     * @param requiredMargin Required margin for the position
     */
    function createPosition(
        address user,
        bytes32 positionKey,
        uint256 size,
        uint256 entryPrice,
        bool isLong,
        MarginMode mode,
        MarketType marketType,
        uint256 requiredMargin
    ) external onlyAuthorized nonReentrant {
        require(positions[user][positionKey].size == 0, "MarginManager: position exists");
        require(size > 0, "MarginManager: invalid size");
        require(entryPrice > 0, "MarginManager: invalid price");
        require(requiredMargin >= MIN_MARGIN, "MarginManager: below minimum margin");

        MarginAccount storage account = marginAccounts[user];
        
        // Check margin requirements
        if (mode == MarginMode.ISOLATED) {
            uint256 availableMargin = getAvailableMargin(user);
            require(requiredMargin <= availableMargin, "MarginManager: insufficient available margin");
            account.lockedMargin = account.lockedMargin.add(requiredMargin);
        } else {
            require(requiredMargin <= account.balance, "MarginManager: insufficient balance");
        }

        // Create position
        Position storage position = positions[user][positionKey];
        position.size = size;
        position.margin = mode == MarginMode.ISOLATED ? requiredMargin : 0;
        position.entryPrice = entryPrice;
        position.isLong = isLong;
        position.mode = mode;
        position.marketType = marketType;
        position.lastFundingUpdate = block.timestamp;

        // Add to user's position list
        userPositionKeys[user].push(positionKey);
        positionKeyIndex[user][positionKey] = userPositionKeys[user].length - 1;
    }

    /**
     * @notice Update position size and entry price (called by trading contracts)
     * @param user Position owner
     * @param positionKey Position identifier
     * @param newSize New position size
     * @param newEntryPrice New average entry price
     * @param marginDelta Change in margin (can be negative)
     */
    function updatePosition(
        address user,
        bytes32 positionKey,
        uint256 newSize,
        uint256 newEntryPrice,
        int256 marginDelta
    ) external onlyAuthorized nonReentrant validPositionKey(user, positionKey) {
        Position storage position = positions[user][positionKey];
        MarginAccount storage account = marginAccounts[user];

        // Update position
        position.size = newSize;
        position.entryPrice = newEntryPrice;

        // Handle margin changes for isolated positions
        if (position.mode == MarginMode.ISOLATED && marginDelta != 0) {
            if (marginDelta > 0) {
                uint256 marginIncrease = SafeMath.toUint256(marginDelta);
                position.margin = position.margin.add(marginIncrease);
                account.lockedMargin = account.lockedMargin.add(marginIncrease);
            } else {
                uint256 marginDecrease = SafeMath.toUint256(-marginDelta);
                position.margin = position.margin.sub(marginDecrease);
                account.lockedMargin = account.lockedMargin.sub(marginDecrease);
            }
        }
    }

    /**
     * @notice Close position (called by trading contracts)
     * @param user Position owner
     * @param positionKey Position identifier
     */
    function closePosition(address user, bytes32 positionKey)
        external
        onlyAuthorized
        nonReentrant
        validPositionKey(user, positionKey)
    {
        Position storage position = positions[user][positionKey];
        MarginAccount storage account = marginAccounts[user];

        // Release locked margin for isolated positions
        if (position.mode == MarginMode.ISOLATED) {
            account.lockedMargin = account.lockedMargin.sub(position.margin);
        }

        // Remove from user's position list
        uint256 index = positionKeyIndex[user][positionKey];
        uint256 lastIndex = userPositionKeys[user].length - 1;
        
        if (index != lastIndex) {
            bytes32 lastKey = userPositionKeys[user][lastIndex];
            userPositionKeys[user][index] = lastKey;
            positionKeyIndex[user][lastKey] = index;
        }
        
        userPositionKeys[user].pop();
        delete positionKeyIndex[user][positionKey];
        delete positions[user][positionKey];
    }

    /**
     * @notice Update user's margin balance (called by trading contracts)
     * @param user User address
     * @param amount Amount to add/subtract from balance
     */
    function updateMarginBalance(address user, int256 amount) external onlyAuthorized nonReentrant {
        MarginAccount storage account = marginAccounts[user];
        
        if (amount >= 0) {
            account.balance = account.balance.add(SafeMath.toUint256(amount));
        } else {
            uint256 decrease = SafeMath.toUint256(-amount);
            require(account.balance >= decrease, "MarginManager: insufficient balance");
            account.balance = account.balance.sub(decrease);
        }
    }

    // View functions

    /**
     * @notice Get user's margin account
     * @param user User address
     * @return account Margin account information
     */
    function getMarginAccount(address user) external view returns (MarginAccount memory account) {
        return marginAccounts[user];
    }

    /**
     * @notice Get position information
     * @param user Position owner
     * @param positionKey Position identifier
     * @return position Position information
     */
    function getPosition(address user, bytes32 positionKey) 
        external 
        view 
        returns (Position memory position) 
    {
        return positions[user][positionKey];
    }

    /**
     * @notice Get available margin for new positions
     * @param user User address
     * @return available Available margin amount
     */
    function getAvailableMargin(address user) public view returns (uint256 available) {
        MarginAccount storage account = marginAccounts[user];
        available = account.balance > account.lockedMargin ? 
            account.balance.sub(account.lockedMargin) : 0;
    }

    /**
     * @notice Calculate required initial margin for a position
     * @param user Position owner
     * @param positionKey Position identifier (unused in calculation)
     * @param size Position size in USD
     * @param price Entry price
     * @param marketType Market type for leverage limits
     * @return required Required margin amount
     */
    function getRequiredMargin(
        address user,
        bytes32 positionKey,
        uint256 size,
        uint256 price,
        MarketType marketType
    ) public view returns (uint256 required) {
        // Use default leverage for the market type
        uint256 leverage = maxLeverage[marketType];
        required = TradingMath.calculateInitialMargin(size, leverage, 100); // 1% buffer
    }

    /**
     * @notice Calculate maintenance margin for a position
     * @param user Position owner
     * @param positionKey Position identifier
     * @return maintenance Maintenance margin amount
     */
    function getMaintenanceMargin(address user, bytes32 positionKey) 
        public 
        view 
        validPositionKey(user, positionKey)
        returns (uint256 maintenance) 
    {
        Position storage position = positions[user][positionKey];
        uint256 rate = maintenanceRates[position.marketType];
        maintenance = TradingMath.calculateMaintenanceMargin(position.size, rate);
    }

    /**
     * @notice Check if position should be liquidated
     * @param user Position owner
     * @param positionKey Position identifier
     * @param currentPrice Current market price
     * @return liquidatable Whether position should be liquidated
     */
    function isLiquidatable(address user, bytes32 positionKey, uint256 currentPrice)
        external
        view
        validPositionKey(user, positionKey)
        returns (bool liquidatable)
    {
        Position storage position = positions[user][positionKey];
        
        // Calculate unrealized PnL
        int256 unrealizedPnL = TradingMath.calculatePnL(
            position.entryPrice,
            currentPrice,
            position.size,
            position.isLong
        );

        // Get effective margin
        uint256 effectiveMargin;
        if (position.mode == MarginMode.ISOLATED) {
            effectiveMargin = position.margin;
        } else {
            effectiveMargin = marginAccounts[user].balance;
        }

        // Check liquidation condition
        liquidatable = TradingMath.shouldLiquidate(
            effectiveMargin,
            unrealizedPnL,
            position.size,
            maintenanceRates[position.marketType]
        );
    }

    /**
     * @notice Get maximum leverage for market type
     * @param marketType Market type
     * @return leverage Maximum leverage multiplier
     */
    function getMaxLeverage(MarketType marketType) external pure returns (uint256 leverage) {
        if (marketType == MarketType.CRYPTO) {
            return 100;
        } else if (marketType == MarketType.XSTOCK) {
            return 3;
        }
        return 1; // Default fallback
    }

    /**
     * @notice Get user's position keys
     * @param user User address
     * @return keys Array of position keys
     */
    function getUserPositionKeys(address user) external view returns (bytes32[] memory keys) {
        return userPositionKeys[user];
    }

    // Admin functions

    /**
     * @notice Authorize trading contract
     * @param contractAddress Contract to authorize
     * @param authorized Authorization status
     */
    function setAuthorizedContract(address contractAddress, bool authorized) external onlyOwner {
        authorizedContracts[contractAddress] = authorized;
    }

    /**
     * @notice Update leverage limits
     * @param marketType Market type
     * @param leverage New maximum leverage
     */
    function setMaxLeverage(MarketType marketType, uint256 leverage) external onlyOwner {
        require(leverage > 0, "MarginManager: invalid leverage");
        maxLeverage[marketType] = leverage;
    }

    /**
     * @notice Update maintenance margin rates
     * @param marketType Market type
     * @param rate New maintenance rate (basis points)
     */
    function setMaintenanceRate(MarketType marketType, uint256 rate) external onlyOwner {
        require(rate <= 5000, "MarginManager: rate too high"); // Max 50%
        maintenanceRates[marketType] = rate;
    }

    /**
     * @notice Emergency withdrawal toggle
     * @param enabled Whether emergency withdrawal is enabled
     */
    function setEmergencyWithdrawal(bool enabled) external onlyOwner {
        emergencyWithdrawalEnabled = enabled;
    }

    /**
     * @notice Emergency withdrawal function
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external nonReentrant {
        if (!emergencyWithdrawalEnabled) {
            revert EmergencyWithdrawalDisabled();
        }
        
        MarginAccount storage account = marginAccounts[msg.sender];
        require(amount <= account.balance, "MarginManager: insufficient balance");
        
        account.balance = account.balance.sub(amount);
        usdcToken.safeTransfer(msg.sender, amount);
        
        emit MarginWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}