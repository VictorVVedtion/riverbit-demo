// RiverBit合约配置
export const CONTRACT_CONFIG = {
  // Arbitrum Sepolia 测试网配置
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    contracts: {
      // 测试网USDC地址 (如果没有可以部署一个mock)
      USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia USDC
      // RiverBit核心合约地址 (已部署 - RiverBitCoreV2)
      RIVERBIT_CORE: '0xA12BdBf28af28EC5C5A3d9DDA65F637d8B683a5a', 
    }
  },
  
  // 本地测试网配置
  LOCALHOST: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
    contracts: {
      USDC: '', // 本地部署的测试USDC
      RIVERBIT_CORE: '',
    }
  }
};

// 合约ABI
export const RIVERBIT_CORE_ABI = [
  // 存取款函数
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external", 
  "function depositToPool(uint256 amount) external",
  "function withdrawFromPool(uint256 shares) external",
  
  // 交易函数
  "function openPosition(string memory symbol, int256 size, uint256 leverage) external",
  "function closePosition(string memory symbol, int256 size) external",
  
  // 查询函数
  "function getAccountInfo(address user) external view returns (uint256, uint256, uint256, uint256)",
  "function getPosition(address user, string memory symbol) external view returns (int256)",
  "function getPoolState() external view returns (uint256, uint256, uint256, int256, uint256)",
  "function getUserPoolValue(address user) external view returns (uint256)",
  "function assetPrices(string memory symbol) external view returns (uint256)",
  
  // 事件
  "event Deposit(address indexed user, uint256 amount)",
  "event Withdraw(address indexed user, uint256 amount)",
  "event PoolDeposit(address indexed user, uint256 amount, uint256 shares)",
  "event PoolWithdraw(address indexed user, uint256 shares, uint256 amount)",
  "event PositionOpened(address indexed user, string symbol, int256 size, uint256 price)",
  "event PositionClosed(address indexed user, string symbol, int256 size, int256 pnl)"
];

export const USDC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

export const USDC_FAUCET_ABI = [
  "function faucetMint(uint256 amount) external",
  "function mintPreset(uint8 preset) external",
  "function adminMint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function getRemainingDailyLimit(address user) external view returns (uint256)",
  "function getRemainingCooldown(address user) external view returns (uint256)",
  "function canMint(address user, uint256 amount) external view returns (bool canMint, string memory reason)",
  "function getFaucetStats() external view returns (bool enabled, uint256 minted, uint256 maxMint, uint256 dailyLimit, uint256 cooldown)"
];

// 网络配置
export const NETWORK_CONFIG = {
  421614: CONTRACT_CONFIG.ARBITRUM_SEPOLIA, // Arbitrum Sepolia
  31337: CONTRACT_CONFIG.LOCALHOST, // Localhost
};

// 获取当前网络配置
export function getNetworkConfig(chainId: number) {
  return NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG];
}

// 默认交易参数
export const DEFAULT_PARAMS = {
  // Gas配置
  gasLimit: 500000,
  gasPrice: '1000000000', // 1 gwei
  
  // 滑点保护
  slippageTolerance: 0.01, // 1%
  
  // 最小金额
  minDepositAmount: 1, // 1 USDC
  minTradeAmount: 10, // 10 USDC
  
  // 最大杠杆
  maxLeverage: {
    crypto: 100,
    xStock: 3
  },
  
  // 支持的交易对
  supportedSymbols: [
    'BTC', 'ETH', 'SOL', // 加密货币
    'xAAPL', 'xTSLA', 'xMSFT', 'xGOOGL' // 股票
  ]
};

// 工具函数
export function formatPrice(price: bigint, decimals: number = 8): number {
  return Number(price) / Math.pow(10, decimals);
}

export function parsePrice(price: number, decimals: number = 8): bigint {
  return BigInt(Math.floor(price * Math.pow(10, decimals)));
}

export function formatUSDC(amount: bigint): number {
  return Number(amount) / 1e6; // USDC has 6 decimals
}

export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e6));
}