// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IRiverPool
 * @dev Interface for the main RiverPool contract
 * @notice Manages LP shares (rLP), TVL/NAV calculations, and deposit/withdrawal operations
 */
interface IRiverPool {
    
    // ============ Structs ============
    
    struct PoolState {
        uint256 totalLiquidity;      // Total liquidity in the pool
        uint256 totalShares;         // Total rLP shares outstanding
        uint256 nav;                 // Net Asset Value per share
        uint256 lastRebalanceTime;   // Last rebalance timestamp
        bool isLimited;              // Whether deposit/withdrawal is limited
        bool safeMode;               // Safe mode status
    }
    
    struct UserInfo {
        uint256 shares;              // User's rLP shares
        uint256 lastDepositTime;     // Last deposit timestamp
        uint256 totalDeposited;      // Total amount deposited
        uint256 totalWithdrawn;      // Total amount withdrawn
        uint256 rewardDebt;          // Reward debt for calculation
    }
    
    struct WithdrawalLimits {
        uint256 dailyRedemptionCap;  // 5% TVL daily cap
        uint256 dailyRedeemed;       // Already redeemed today
        uint256 lastResetTime;       // Last daily reset time
        uint256 redemptionFeeRate;   // Current redemption fee rate (1-3%)
    }
    
    // ============ Events ============
    
    event Deposit(address indexed user, uint256 amount, uint256 shares, uint256 nav);
    event Withdraw(address indexed user, uint256 shares, uint256 amount, uint256 fee, uint256 nav);
    event NAVUpdated(uint256 oldNav, uint256 newNav, uint256 timestamp);
    event RebalanceExecuted(uint256 timestamp, uint256 newNav);
    event LimitModeToggled(bool isLimited, string reason);
    event SafeModeToggled(bool safeMode, uint8 level, string reason);
    event RedemptionFeeUpdated(uint256 oldRate, uint256 newRate);
    event InsuranceCompensation(uint256 amount, address indexed recipient);
    
    // ============ View Functions ============
    
    /**
     * @notice Get current pool state
     * @return PoolState struct with current pool information
     */
    function getPoolState() external view returns (PoolState memory);
    
    /**
     * @notice Get user information
     * @param user User address
     * @return UserInfo struct with user's information
     */
    function getUserInfo(address user) external view returns (UserInfo memory);
    
    /**
     * @notice Calculate current Net Asset Value per share
     * @return Current NAV in wei
     */
    function getCurrentNAV() external view returns (uint256);
    
    /**
     * @notice Get total value locked in the pool
     * @return TVL in base currency
     */
    function getTVL() external view returns (uint256);
    
    /**
     * @notice Calculate shares to be minted for deposit amount
     * @param amount Deposit amount
     * @return shares Number of shares to be minted
     */
    function calculateSharesForDeposit(uint256 amount) external view returns (uint256 shares);
    
    /**
     * @notice Calculate amount to be received for share redemption
     * @param shares Number of shares to redeem
     * @return amount Amount to be received after fees
     * @return fee Redemption fee amount
     */
    function calculateAmountForShares(uint256 shares) external view returns (uint256 amount, uint256 fee);
    
    /**
     * @notice Get current redemption fee rate
     * @return fee rate in basis points (10000 = 100%)
     */
    function getCurrentRedemptionFee() external view returns (uint256);
    
    /**
     * @notice Check if deposits/withdrawals are currently limited
     * @return true if operations are limited
     */
    function isOperationLimited() external view returns (bool);
    
    // ============ User Functions ============
    
    /**
     * @notice Deposit funds to receive rLP shares
     * @param amount Amount to deposit
     * @param minShares Minimum shares expected (slippage protection)
     * @return shares Number of shares minted
     */
    function deposit(uint256 amount, uint256 minShares) external returns (uint256 shares);
    
    /**
     * @notice Withdraw funds by redeeming rLP shares
     * @param shares Number of shares to redeem
     * @param minAmount Minimum amount expected (slippage protection)
     * @return amount Amount received after fees
     */
    function withdraw(uint256 shares, uint256 minAmount) external returns (uint256 amount);
    
    /**
     * @notice Emergency withdraw with potential penalties
     * @param shares Number of shares to redeem
     * @return amount Amount received after penalties
     */
    function emergencyWithdraw(uint256 shares) external returns (uint256 amount);
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update NAV based on portfolio valuation
     * @param newNav New NAV value
     */
    function updateNAV(uint256 newNav) external;
    
    /**
     * @notice Execute rebalancing across buckets
     */
    function executeRebalance() external;
    
    /**
     * @notice Toggle operation limits
     * @param limited Whether to enable limits
     * @param reason Reason for the change
     */
    function setOperationLimited(bool limited, string calldata reason) external;
    
    /**
     * @notice Set safe mode with specific level
     * @param enabled Whether to enable safe mode
     * @param level Safe mode level (1-4)
     * @param reason Reason for the change
     */
    function setSafeMode(bool enabled, uint8 level, string calldata reason) external;
    
    /**
     * @notice Distribute insurance compensation to affected users
     * @param recipients Array of recipient addresses
     * @param amounts Array of compensation amounts
     */
    function distributeInsuranceCompensation(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external;
}