// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../interfaces/IRiverPool.sol";
import "../interfaces/ILPBucketManager.sol";
import "../interfaces/IRevenueDistribution.sol";
import "../interfaces/IInsuranceFund.sol";

/**
 * @title RiverPool
 * @dev Main RiverPool contract implementing LP share management, TVL/NAV calculation, and deposit/withdrawal operations
 * @notice Core contract for RiverBit's liquidity pool system with four-bucket LP architecture
 */
contract RiverPool is IRiverPool, ERC20, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant NAV_UPDATER_ROLE = keccak256("NAV_UPDATER_ROLE");
    
    uint256 public constant INITIAL_NAV = 1e18; // 1.0 with 18 decimals
    uint256 public constant MAX_REDEMPTION_FEE = 300; // 3% max redemption fee
    uint256 public constant DAILY_REDEMPTION_CAP = 500; // 5% daily redemption cap
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============ State Variables ============
    
    IERC20 public immutable baseAsset;
    ILPBucketManager public bucketManager;
    IRevenueDistribution public revenueDistribution;
    IInsuranceFund public insuranceFund;
    
    PoolState public poolState;
    WithdrawalLimits public withdrawalLimits;
    
    mapping(address => UserInfo) public userInfo;
    mapping(address => bool) public authorizedUpdaters;
    
    uint256 public totalLiquidity;
    uint256 public currentNAV;
    uint256 public lastNAVUpdate;
    uint256 public minDepositAmount;
    uint256 public minWithdrawAmount;
    
    // Safe mode variables
    bool public safeMode;
    uint8 public safeModeLevel; // 1-4 escalation levels
    
    // Redemption tracking
    uint256 public dailyRedemptionAmount;
    uint256 public lastRedemptionReset;
    
    // ============ Modifiers ============
    
    modifier onlyAuthorizedUpdater() {
        require(
            hasRole(NAV_UPDATER_ROLE, msg.sender) || authorizedUpdaters[msg.sender],
            "RiverPool: Not authorized updater"
        );
        _;
    }
    
    modifier notInSafeMode() {
        require(!safeMode, "RiverPool: Safe mode active");
        _;
    }
    
    modifier validAmount(uint256 amount) {
        require(amount > 0, "RiverPool: Amount must be greater than 0");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _baseAsset,
        string memory _name,
        string memory _symbol,
        address _admin
    ) ERC20(_name, _symbol) {
        require(_baseAsset != address(0), "RiverPool: Invalid base asset");
        require(_admin != address(0), "RiverPool: Invalid admin");
        
        baseAsset = IERC20(_baseAsset);
        currentNAV = INITIAL_NAV;
        lastNAVUpdate = block.timestamp;
        lastRedemptionReset = block.timestamp;
        
        // Initialize pool state
        poolState = PoolState({
            totalLiquidity: 0,
            totalShares: 0,
            nav: INITIAL_NAV,
            lastRebalanceTime: block.timestamp,
            isLimited: false,
            safeMode: false
        });
        
        // Initialize withdrawal limits
        withdrawalLimits = WithdrawalLimits({
            dailyRedemptionCap: 0, // Will be set based on TVL
            dailyRedeemed: 0,
            lastResetTime: block.timestamp,
            redemptionFeeRate: 0
        });
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(NAV_UPDATER_ROLE, _admin);
        
        // Set minimum amounts
        minDepositAmount = 100 * 10**18; // 100 base tokens
        minWithdrawAmount = 10 * 10**18;  // 10 base tokens
    }
    
    // ============ View Functions ============
    
    function getPoolState() external view override returns (PoolState memory) {
        return PoolState({
            totalLiquidity: totalLiquidity,
            totalShares: totalSupply(),
            nav: currentNAV,
            lastRebalanceTime: poolState.lastRebalanceTime,
            isLimited: poolState.isLimited,
            safeMode: safeMode
        });
    }
    
    function getUserInfo(address user) external view override returns (UserInfo memory) {
        return userInfo[user];
    }
    
    function getCurrentNAV() external view override returns (uint256) {
        return currentNAV;
    }
    
    function getTVL() external view override returns (uint256) {
        return totalLiquidity;
    }
    
    function calculateSharesForDeposit(uint256 amount) external view override returns (uint256 shares) {
        if (totalSupply() == 0) {
            return amount; // 1:1 initial ratio
        }
        return (amount * totalSupply()) / totalLiquidity;
    }
    
    function calculateAmountForShares(uint256 shares) external view override returns (uint256 amount, uint256 fee) {
        require(shares <= totalSupply(), "RiverPool: Insufficient shares");
        
        uint256 grossAmount = (shares * totalLiquidity) / totalSupply();
        uint256 feeRate = getCurrentRedemptionFee();
        fee = (grossAmount * feeRate) / BASIS_POINTS;
        amount = grossAmount - fee;
    }
    
    function getCurrentRedemptionFee() public view override returns (uint256) {
        if (dailyRedemptionAmount <= (totalLiquidity * DAILY_REDEMPTION_CAP) / BASIS_POINTS) {
            return 0; // No fee under 5% daily redemption
        }
        
        // Progressive fee: 1-3% based on excess redemption
        uint256 excessRedemption = dailyRedemptionAmount - (totalLiquidity * DAILY_REDEMPTION_CAP) / BASIS_POINTS;
        uint256 excessRate = (excessRedemption * BASIS_POINTS) / totalLiquidity;
        
        if (excessRate <= 100) { // 0-1% excess
            return 100; // 1% fee
        } else if (excessRate <= 200) { // 1-2% excess
            return 200; // 2% fee
        } else {
            return 300; // 3% fee for >2% excess
        }
    }
    
    function isOperationLimited() external view override returns (bool) {
        return poolState.isLimited || safeMode;
    }
    
    // ============ User Functions ============
    
    function deposit(uint256 amount, uint256 minShares) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        notInSafeMode 
        validAmount(amount) 
        returns (uint256 shares) 
    {
        require(amount >= minDepositAmount, "RiverPool: Amount below minimum");
        require(!poolState.isLimited, "RiverPool: Deposits limited");
        
        // Calculate shares to mint
        if (totalSupply() == 0) {
            shares = amount;
        } else {
            shares = (amount * totalSupply()) / totalLiquidity;
        }
        
        require(shares >= minShares, "RiverPool: Insufficient shares");
        
        // Update user info
        UserInfo storage user = userInfo[msg.sender];
        user.shares += shares;
        user.lastDepositTime = block.timestamp;
        user.totalDeposited += amount;
        
        // Update pool state
        totalLiquidity += amount;
        
        // Transfer tokens
        baseAsset.safeTransferFrom(msg.sender, address(this), amount);
        
        // Mint rLP tokens
        _mint(msg.sender, shares);
        
        // Distribute to buckets through bucket manager
        if (address(bucketManager) != address(0)) {
            baseAsset.approve(address(bucketManager), amount);
            // Note: Bucket manager should handle the distribution
        }
        
        emit Deposit(msg.sender, amount, shares, currentNAV);
    }
    
    function withdraw(uint256 shares, uint256 minAmount) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        validAmount(shares) 
        returns (uint256 amount) 
    {
        require(balanceOf(msg.sender) >= shares, "RiverPool: Insufficient shares");
        require(!poolState.isLimited, "RiverPool: Withdrawals limited");
        
        // Reset daily redemption if needed
        _resetDailyRedemptionIfNeeded();
        
        // Calculate withdrawal amount and fee
        uint256 grossAmount = (shares * totalLiquidity) / totalSupply();
        uint256 fee = (grossAmount * getCurrentRedemptionFee()) / BASIS_POINTS;
        amount = grossAmount - fee;
        
        require(amount >= minAmount, "RiverPool: Insufficient amount");
        require(amount >= minWithdrawAmount, "RiverPool: Amount below minimum");
        
        // Check daily redemption limit
        require(
            dailyRedemptionAmount + grossAmount <= (totalLiquidity * DAILY_REDEMPTION_CAP) / BASIS_POINTS,
            "RiverPool: Daily redemption limit exceeded"
        );
        
        // Update user info
        UserInfo storage user = userInfo[msg.sender];
        user.shares -= shares;
        user.totalWithdrawn += amount;
        
        // Update pool state
        totalLiquidity -= grossAmount;
        dailyRedemptionAmount += grossAmount;
        
        // Burn rLP tokens
        _burn(msg.sender, shares);
        
        // Transfer tokens
        baseAsset.safeTransfer(msg.sender, amount);
        
        // Transfer fee to revenue distribution if available
        if (fee > 0 && address(revenueDistribution) != address(0)) {
            baseAsset.safeTransfer(address(revenueDistribution), fee);
        }
        
        emit Withdraw(msg.sender, shares, amount, fee, currentNAV);
    }
    
    function emergencyWithdraw(uint256 shares) 
        external 
        override 
        nonReentrant 
        validAmount(shares) 
        returns (uint256 amount) 
    {
        require(balanceOf(msg.sender) >= shares, "RiverPool: Insufficient shares");
        require(safeMode, "RiverPool: Emergency withdraw only in safe mode");
        
        // Calculate amount with higher penalty in safe mode
        uint256 grossAmount = (shares * totalLiquidity) / totalSupply();
        uint256 penalty = (grossAmount * (500 + safeModeLevel * 100)) / BASIS_POINTS; // 5-8% penalty
        amount = grossAmount - penalty;
        
        // Update user info
        UserInfo storage user = userInfo[msg.sender];
        user.shares -= shares;
        user.totalWithdrawn += amount;
        
        // Update pool state
        totalLiquidity -= grossAmount;
        
        // Burn rLP tokens
        _burn(msg.sender, shares);
        
        // Transfer tokens
        baseAsset.safeTransfer(msg.sender, amount);
        
        // Send penalty to insurance fund
        if (penalty > 0 && address(insuranceFund) != address(0)) {
            baseAsset.safeTransfer(address(insuranceFund), penalty);
        }
        
        emit Withdraw(msg.sender, shares, amount, penalty, currentNAV);
    }
    
    // ============ Admin Functions ============
    
    function updateNAV(uint256 newNav) external override onlyAuthorizedUpdater {
        require(newNav > 0, "RiverPool: Invalid NAV");
        
        uint256 oldNav = currentNAV;
        currentNAV = newNav;
        lastNAVUpdate = block.timestamp;
        
        // Update pool state
        poolState.nav = newNav;
        
        emit NAVUpdated(oldNav, newNav, block.timestamp);
    }
    
    function executeRebalance() external override onlyRole(OPERATOR_ROLE) {
        require(address(bucketManager) != address(0), "RiverPool: Bucket manager not set");
        
        // Trigger rebalancing through bucket manager
        bucketManager.executeRebalance(totalLiquidity);
        
        poolState.lastRebalanceTime = block.timestamp;
        
        emit RebalanceExecuted(block.timestamp, currentNAV);
    }
    
    function setOperationLimited(bool limited, string calldata reason) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        poolState.isLimited = limited;
        emit LimitModeToggled(limited, reason);
    }
    
    function setSafeMode(bool enabled, uint8 level, string calldata reason) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(level <= 4, "RiverPool: Invalid safe mode level");
        
        safeMode = enabled;
        safeModeLevel = level;
        poolState.safeMode = enabled;
        
        if (enabled) {
            emit SafeModeToggled(true, level, reason);
        } else {
            emit SafeModeToggled(false, 0, reason);
        }
    }
    
    function distributeInsuranceCompensation(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external override onlyRole(ADMIN_ROLE) {
        require(recipients.length == amounts.length, "RiverPool: Array length mismatch");
        require(address(insuranceFund) != address(0), "RiverPool: Insurance fund not set");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] > 0) {
                baseAsset.safeTransferFrom(address(insuranceFund), recipients[i], amounts[i]);
                emit InsuranceCompensation(amounts[i], recipients[i]);
            }
        }
    }
    
    // ============ Configuration Functions ============
    
    function setBucketManager(address _bucketManager) external onlyRole(ADMIN_ROLE) {
        require(_bucketManager != address(0), "RiverPool: Invalid address");
        bucketManager = ILPBucketManager(_bucketManager);
    }
    
    function setRevenueDistribution(address _revenueDistribution) external onlyRole(ADMIN_ROLE) {
        require(_revenueDistribution != address(0), "RiverPool: Invalid address");
        revenueDistribution = IRevenueDistribution(_revenueDistribution);
    }
    
    function setInsuranceFund(address _insuranceFund) external onlyRole(ADMIN_ROLE) {
        require(_insuranceFund != address(0), "RiverPool: Invalid address");
        insuranceFund = IInsuranceFund(_insuranceFund);
    }
    
    function setMinimumAmounts(uint256 _minDeposit, uint256 _minWithdraw) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        minDepositAmount = _minDeposit;
        minWithdrawAmount = _minWithdraw;
    }
    
    function authorizeUpdater(address updater, bool authorized) external onlyRole(ADMIN_ROLE) {
        authorizedUpdaters[updater] = authorized;
    }
    
    // ============ Emergency Functions ============
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    function emergencyWithdrawFunds(address to, uint256 amount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(safeMode, "RiverPool: Only in safe mode");
        baseAsset.safeTransfer(to, amount);
    }
    
    // ============ Internal Functions ============
    
    function _resetDailyRedemptionIfNeeded() internal {
        if (block.timestamp >= lastRedemptionReset + 1 days) {
            dailyRedemptionAmount = 0;
            lastRedemptionReset = block.timestamp;
            withdrawalLimits.dailyRedeemed = 0;
            withdrawalLimits.lastResetTime = block.timestamp;
        }
    }
    
    // Override transfer functions to prevent transfers in safe mode
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(!safeMode || hasRole(ADMIN_ROLE, msg.sender), "RiverPool: Transfers disabled in safe mode");
        return super.transfer(to, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        require(!safeMode || hasRole(ADMIN_ROLE, msg.sender), "RiverPool: Transfers disabled in safe mode");
        return super.transferFrom(from, to, amount);
    }
}