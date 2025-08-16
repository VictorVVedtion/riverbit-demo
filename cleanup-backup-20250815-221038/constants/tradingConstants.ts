/**
 * RiverBit Trading Constants
 * 统一管理交易相关的常量配置
 */

// 网络配置
export const NETWORK_CONFIG = {
  ARBITRUM_SEPOLIA_CHAIN_ID: 421614,
  ARBITRUM_MAINNET_CHAIN_ID: 42161,
  ETHEREUM_MAINNET_CHAIN_ID: 1,
} as const;

// 交易配置
export const TRADING_CONFIG = {
  // 杠杆相关
  MIN_LEVERAGE: 1,
  MAX_LEVERAGE: 100,
  DEFAULT_LEVERAGE: 10,
  LEVERAGE_STEPS: [10, 25, 50, 100],
  
  // 保证金模式
  MARGIN_MODES: {
    CROSS: 'cross',
    ISOLATED: 'isolated',
  } as const,
  
  // 订单类型
  ORDER_TYPES: {
    MARKET: 'market',
    LIMIT: 'limit',
  } as const,
  
  // 订单方向
  ORDER_SIDES: {
    BUY: 'buy',
    SELL: 'sell',
  } as const,
  
  // 风险参数
  LIQUIDATION_THRESHOLD: 0.9, // 90%
  TRADING_FEE_RATE: 0.0006, // 0.06%
  
  // 快捷百分比选项
  PERCENTAGE_OPTIONS: [25, 50, 75, 100],
} as const;

// 模拟账户数据
export const MOCK_ACCOUNT_DATA = {
  AVAILABLE_BALANCE: 12540.85,
  USED_MARGIN: 2340.50,
  EQUITY: 14881.35,
  MARGIN_LEVEL: 635.4,
  USDC_BALANCE: 0,
} as const;

// UI 配置
export const UI_CONFIG = {
  // 页面布局
  TRADING_PANEL_WIDTH: 340, // xl屏幕下的交易面板宽度
  CHART_HEIGHT: {
    MOBILE: '50vh',
    TABLET: '55vh',
    DESKTOP: 'auto',
  },
  POSITIONS_PANEL_HEIGHT: {
    MOBILE: 176, // 44 * 4
    TABLET: 192, // 48 * 4  
    DESKTOP: 208, // 52 * 4
  },
  
  // 动画配置
  TRANSITION_DURATION: 200,
  ANIMATION_DELAY: 150,
  
  // 颜色配置
  RISK_COLORS: {
    LOW: 'text-profit', // 杠杆 <= 10x
    MEDIUM: 'text-loss', // 杠杆 <= 50x
    HIGH: 'text-danger', // 杠杆 > 50x
  },
  
  // 图表间隔选项
  CHART_INTERVALS: ['1m', '5m', '15m', '1h', '4h', '1d'],
  DEFAULT_CHART_INTERVAL: '15m',
} as const;

// 性能配置
export const PERFORMANCE_CONFIG = {
  // 数据更新频率
  PRICE_UPDATE_INTERVAL: 1000, // 1秒
  ACCOUNT_REFRESH_INTERVAL: 5000, // 5秒
  
  // 缓存配置
  MAX_TRADE_HISTORY_ITEMS: 100,
  MAX_TRANSACTION_RECORDS: 100,
  
  // 防抖配置
  SEARCH_DEBOUNCE_DELAY: 300,
  RESIZE_DEBOUNCE_DELAY: 250,
} as const;

// 安全配置
export const SECURITY_CONFIG = {
  // 最大连接尝试次数
  MAX_WALLET_CONNECTION_ATTEMPTS: 3,
  
  // 交易确认要求
  REQUIRE_TRADE_CONFIRMATION: true,
  
  // 会话超时 (毫秒)
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30分钟
} as const;

// 限制和阈值
export const LIMITS = {
  // 交易限制
  MIN_TRADE_AMOUNT: 0.01,
  MAX_TRADE_AMOUNT: 1000000,
  
  // 价格精度
  PRICE_DECIMALS: 2,
  AMOUNT_DECIMALS: 2,
  
  // 显示限制
  MAX_FAVORITE_ASSETS: 20,
  MAX_RECENT_TRADES: 50,
  
  // 字符串长度限制
  MAX_ADDRESS_DISPLAY_LENGTH: 10, // 显示为 0x1234...5678
} as const;

// API 端点和配置
export const API_CONFIG = {
  // 外部 API 配置
  COINGECKO_BASE_URL: 'https://api.coingecko.com/api/v3',
  FMP_BASE_URL: 'https://financialmodelingprep.com/api/v3',
  
  // 请求超时
  DEFAULT_TIMEOUT: 10000,
  TRADING_API_TIMEOUT: 5000,
  
  // 重试配置
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// 实用工具函数
export const TRADING_UTILS = {
  // 计算清算价格
  calculateLiquidationPrice: (
    entryPrice: number, 
    leverage: number, 
    isLong: boolean
  ): number => {
    const threshold = TRADING_CONFIG.LIQUIDATION_THRESHOLD;
    return isLong 
      ? entryPrice * (1 - threshold / leverage)
      : entryPrice * (1 + threshold / leverage);
  },
  
  // 计算所需保证金
  calculateRequiredMargin: (amount: number, leverage: number): number => {
    return amount / leverage;
  },
  
  // 计算交易费用
  calculateTradingFee: (amount: number): number => {
    return amount * TRADING_CONFIG.TRADING_FEE_RATE;
  },
  
  // 格式化地址显示
  formatAddress: (address: string): string => {
    if (address.length <= LIMITS.MAX_ADDRESS_DISPLAY_LENGTH) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },
  
  // 检查网络是否支持
  isNetworkSupported: (chainId: number): boolean => {
    return Object.values(NETWORK_CONFIG).includes(chainId);
  },
  
  // 获取风险等级颜色
  getRiskColor: (leverage: number): string => {
    if (leverage <= 10) return UI_CONFIG.RISK_COLORS.LOW;
    if (leverage <= 50) return UI_CONFIG.RISK_COLORS.MEDIUM;
    return UI_CONFIG.RISK_COLORS.HIGH;
  },
} as const;

// 类型定义
export type MarginMode = typeof TRADING_CONFIG.MARGIN_MODES[keyof typeof TRADING_CONFIG.MARGIN_MODES];
export type OrderType = typeof TRADING_CONFIG.ORDER_TYPES[keyof typeof TRADING_CONFIG.ORDER_TYPES];
export type OrderSide = typeof TRADING_CONFIG.ORDER_SIDES[keyof typeof TRADING_CONFIG.ORDER_SIDES];
export type ChartInterval = typeof UI_CONFIG.CHART_INTERVALS[number];

// 默认导出所有配置
export default {
  NETWORK_CONFIG,
  TRADING_CONFIG,
  MOCK_ACCOUNT_DATA,
  UI_CONFIG,
  PERFORMANCE_CONFIG,
  SECURITY_CONFIG,
  LIMITS,
  API_CONFIG,
  TRADING_UTILS,
} as const;