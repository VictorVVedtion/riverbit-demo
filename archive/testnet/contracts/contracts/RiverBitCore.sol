// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RiverBitCore
 * @dev 简化的RiverBit核心合约，整合交易和RiverPool功能
 */
contract RiverBitCore is ReentrancyGuard, Pausable, Ownable {
    
    // USDC代币合约
    IERC20 public immutable usdc;
    
    // 合约状态
    struct UserAccount {
        uint256 balance;           // USDC余额
        uint256 poolShares;        // RiverPool份额
        mapping(string => int256) positions; // 持仓 symbol => size
        uint256 totalMargin;       // 总保证金
        uint256 lastActivityTime;  // 最后活动时间
    }
    
    struct PoolState {
        uint256 totalValueLocked;  // TVL
        uint256 totalShares;       // 总份额
        uint256 netAssetValue;     // NAV (scaled by 1e18)
        int256 totalPnL;          // 总盈亏
        uint256 insuranceFund;     // 保险基金
    }
    
    // 存储
    mapping(address => UserAccount) public accounts;
    PoolState public pool;
    mapping(string => uint256) public assetPrices; // symbol => price (scaled by 1e8)
    
    // 事件
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event PoolDeposit(address indexed user, uint256 amount, uint256 shares);
    event PoolWithdraw(address indexed user, uint256 shares, uint256 amount);
    event PositionOpened(address indexed user, string symbol, int256 size, uint256 price);
    event PositionClosed(address indexed user, string symbol, int256 size, int256 pnl);
    event PriceUpdated(string symbol, uint256 price);
    
    // 错误
    error InsufficientBalance();
    error InvalidAmount();
    error InvalidSymbol();
    error InsufficientShares();
    error MarginNotSufficient();
    
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        
        // 初始化池状态
        pool.netAssetValue = 1e18; // 初始NAV = 1.0
        
        // 设置初始价格 (scaled by 1e8, $43000 for BTC)
        assetPrices["BTC"] = 4300000000000; // $43,000
        assetPrices["ETH"] = 250000000000;  // $2,500
        assetPrices["SOL"] = 10000000000;   // $100
        assetPrices["xAAPL"] = 22500000000; // $225
        assetPrices["xTSLA"] = 25000000000; // $250
    }
    
    /**
     * @dev 存入USDC到账户
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        // 转账USDC
        usdc.transferFrom(msg.sender, address(this), amount);
        
        // 更新账户余额
        accounts[msg.sender].balance += amount;
        accounts[msg.sender].lastActivityTime = block.timestamp;
        
        emit Deposit(msg.sender, amount);
    }
    
    /**
     * @dev 提取USDC
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (accounts[msg.sender].balance < amount) revert InsufficientBalance();
        
        // 更新余额
        accounts[msg.sender].balance -= amount;
        accounts[msg.sender].lastActivityTime = block.timestamp;
        
        // 转账USDC
        usdc.transfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, amount);
    }
    
    /**
     * @dev 存入RiverPool获得rLP份额
     */
    function depositToPool(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (accounts[msg.sender].balance < amount) revert InsufficientBalance();
        
        // 计算份额
        uint256 shares;
        if (pool.totalShares == 0) {
            shares = amount; // 初始1:1
        } else {
            shares = (amount * pool.totalShares) / pool.totalValueLocked;
        }
        
        // 更新状态
        accounts[msg.sender].balance -= amount;
        accounts[msg.sender].poolShares += shares;
        pool.totalValueLocked += amount;
        pool.totalShares += shares;
        accounts[msg.sender].lastActivityTime = block.timestamp;
        
        emit PoolDeposit(msg.sender, amount, shares);
    }
    
    /**
     * @dev 从RiverPool提取，销毁rLP份额
     */
    function withdrawFromPool(uint256 shares) external nonReentrant whenNotPaused {
        if (shares == 0) revert InvalidAmount();
        if (accounts[msg.sender].poolShares < shares) revert InsufficientShares();
        
        // 计算提取金额
        uint256 amount = (shares * pool.totalValueLocked) / pool.totalShares;
        
        // 更新状态
        accounts[msg.sender].poolShares -= shares;
        accounts[msg.sender].balance += amount;
        pool.totalShares -= shares;
        pool.totalValueLocked -= amount;
        accounts[msg.sender].lastActivityTime = block.timestamp;
        
        emit PoolWithdraw(msg.sender, shares, amount);
    }
    
    /**
     * @dev 开仓/加仓
     */
    function openPosition(
        string memory symbol,
        int256 size, // 正数多头，负数空头
        uint256 leverage
    ) external nonReentrant whenNotPaused {
        if (assetPrices[symbol] == 0) revert InvalidSymbol();
        if (size == 0) revert InvalidAmount();
        if (leverage == 0 || leverage > 100) revert InvalidAmount();
        
        uint256 price = assetPrices[symbol];
        uint256 notional = uint256(size > 0 ? size : -size) * price / 1e8;
        uint256 requiredMargin = notional / leverage;
        
        // 检查保证金
        if (accounts[msg.sender].balance < requiredMargin) revert MarginNotSufficient();
        
        // 更新持仓和保证金
        accounts[msg.sender].positions[symbol] += size;
        accounts[msg.sender].balance -= requiredMargin;
        accounts[msg.sender].totalMargin += requiredMargin;
        accounts[msg.sender].lastActivityTime = block.timestamp;
        
        emit PositionOpened(msg.sender, symbol, size, price);
    }
    
    /**
     * @dev 平仓
     */
    function closePosition(string memory symbol, int256 size) external nonReentrant whenNotPaused {
        if (assetPrices[symbol] == 0) revert InvalidSymbol();
        if (size == 0) revert InvalidAmount();
        
        int256 currentPosition = accounts[msg.sender].positions[symbol];
        if ((size > 0 && currentPosition < size) || (size < 0 && currentPosition > size)) {
            revert InvalidAmount();
        }
        
        uint256 price = assetPrices[symbol];
        
        // 简化PnL计算 (这里应该用开仓价格，简化处理)
        int256 pnl = size * int256(price) / 1e8; // 简化计算
        
        // 更新持仓
        accounts[msg.sender].positions[symbol] -= size;
        
        // 释放保证金并加上PnL
        uint256 marginToRelease = uint256(size > 0 ? size : -size) * price / 1e8 / 10; // 假设10倍杠杆
        accounts[msg.sender].totalMargin -= marginToRelease;
        accounts[msg.sender].balance += marginToRelease;
        
        if (pnl > 0) {
            accounts[msg.sender].balance += uint256(pnl);
        } else if (pnl < 0 && accounts[msg.sender].balance >= uint256(-pnl)) {
            accounts[msg.sender].balance -= uint256(-pnl);
        }
        
        accounts[msg.sender].lastActivityTime = block.timestamp;
        
        emit PositionClosed(msg.sender, symbol, size, pnl);
    }
    
    /**
     * @dev 更新价格 (仅owner)
     */
    function updatePrice(string memory symbol, uint256 price) external onlyOwner {
        if (price == 0) revert InvalidAmount();
        assetPrices[symbol] = price;
        emit PriceUpdated(symbol, price);
    }
    
    /**
     * @dev 批量更新价格
     */
    function updatePrices(string[] memory symbols, uint256[] memory prices) external onlyOwner {
        require(symbols.length == prices.length, "Length mismatch");
        
        for (uint256 i = 0; i < symbols.length; i++) {
            if (prices[i] > 0) {
                assetPrices[symbols[i]] = prices[i];
                emit PriceUpdated(symbols[i], prices[i]);
            }
        }
    }
    
    /**
     * @dev 获取用户账户信息
     */
    function getAccountInfo(address user) external view returns (
        uint256 balance,
        uint256 poolShares,
        uint256 totalMargin,
        uint256 lastActivityTime
    ) {
        UserAccount storage account = accounts[user];
        return (
            account.balance,
            account.poolShares,
            account.totalMargin,
            account.lastActivityTime
        );
    }
    
    /**
     * @dev 获取用户持仓
     */
    function getPosition(address user, string memory symbol) external view returns (int256) {
        return accounts[user].positions[symbol];
    }
    
    /**
     * @dev 获取池状态
     */
    function getPoolState() external view returns (
        uint256 totalValueLocked,
        uint256 totalShares,
        uint256 netAssetValue,
        int256 totalPnL,
        uint256 insuranceFund
    ) {
        return (
            pool.totalValueLocked,
            pool.totalShares,
            pool.netAssetValue,
            pool.totalPnL,
            pool.insuranceFund
        );
    }
    
    /**
     * @dev 获取用户在池中的价值
     */
    function getUserPoolValue(address user) external view returns (uint256) {
        if (pool.totalShares == 0) return 0;
        return (accounts[user].poolShares * pool.totalValueLocked) / pool.totalShares;
    }
    
    /**
     * @dev 紧急暂停 (仅owner)
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复运行 (仅owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 紧急提取 (仅owner，仅暂停状态下)
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        uint256 balance = usdc.balanceOf(address(this));
        usdc.transfer(owner(), balance);
    }
}