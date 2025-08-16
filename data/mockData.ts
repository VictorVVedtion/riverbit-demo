export const mockWalletAddress = '0x1234...5678';

export const mockAssets = [
  { symbol: 'USDT', balance: 10000, usdValue: 10000, change24h: 0, available: 8500, locked: 1500 },
  { symbol: 'BTC', balance: 0.5, usdValue: 21500, change24h: 2.5, available: 0.3, locked: 0.2 },
  { symbol: 'ETH', balance: 5, usdValue: 9000, change24h: -1.2, available: 3, locked: 2 },
  { symbol: 'SOL', balance: 100, usdValue: 9500, change24h: 3.8, available: 60, locked: 40 },
];

export const mockPositions = [
  {
    id: 1,
    pair: 'BTC/USDT',
    side: 'long',
    size: 0.1,
    entryPrice: 42000,
    currentPrice: 43000,
    pnl: 100,
    pnlPercent: 2.38,
    margin: 420,
    leverage: 10,
    marginMode: 'isolated',
    marginRatio: 75,
    liquidationPrice: 38500,
    fundingRate: 0.0001,
    nextFunding: '2h 15m'
  },
  {
    id: 2,
    pair: 'xAAPL/USDT',
    side: 'short',
    size: 100,
    entryPrice: 180,
    currentPrice: 175,
    pnl: 500,
    pnlPercent: 2.78,
    margin: 900,
    leverage: 20,
    marginMode: 'cross',
    marginRatio: 45,
    liquidationPrice: 195,
    fundingRate: -0.0003,
    nextFunding: '45m'
  },
  {
    id: 3,
    pair: 'ETH/USDT',
    side: 'long',
    size: 2.5,
    entryPrice: 1750,
    currentPrice: 1800,
    pnl: 125,
    pnlPercent: 2.86,
    margin: 875,
    leverage: 5,
    marginMode: 'isolated',
    marginRatio: 35,
    liquidationPrice: 1400,
    fundingRate: 0.0002,
    nextFunding: '1h 45m'
  },
  {
    id: 4,
    pair: 'SOL/USDT',
    side: 'long',
    size: 50,
    entryPrice: 90,
    currentPrice: 95,
    pnl: 250,
    pnlPercent: 5.56,
    margin: 450,
    leverage: 10,
    marginMode: 'isolated',
    marginRatio: 25,
    liquidationPrice: 81,
    fundingRate: 0.0003,
    nextFunding: '3h 10m'
  },
  {
    id: 5,
    pair: 'xTSLA/USDT',
    side: 'short',
    size: 25,
    entryPrice: 220,
    currentPrice: 210,
    pnl: 250,
    pnlPercent: 4.55,
    margin: 550,
    leverage: 10,
    marginMode: 'cross',
    marginRatio: 30,
    liquidationPrice: 242,
    fundingRate: -0.0001,
    nextFunding: '1h 30m'
  }
];

export const mockTradingPairs = [
  { 
    symbol: 'BTC/USDT', 
    price: 43000, 
    change24h: 2.5, 
    volume: '1.2B', 
    type: 'crypto',
    fundingRate: 0.0001,
    openInterest: '850M',
    high24h: 44200,
    low24h: 41800,
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    icon: { symbol: '₿', color: 'bg-orange-500' }
  },
  { 
    symbol: 'ETH/USDT', 
    price: 1800, 
    change24h: -1.2, 
    volume: '800M', 
    type: 'crypto',
    fundingRate: 0.0002,
    openInterest: '420M',
    high24h: 1850,
    low24h: 1750,
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    icon: { symbol: 'Ξ', color: 'bg-blue-500' }
  },
  { 
    symbol: 'SOL/USDT', 
    price: 95, 
    change24h: 3.8, 
    volume: '150M', 
    type: 'crypto',
    fundingRate: 0.0003,
    openInterest: '75M',
    high24h: 98,
    low24h: 90,
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    icon: { symbol: 'S', color: 'bg-purple-500' }
  },
  { 
    symbol: 'AVAX/USDT', 
    price: 28.5, 
    change24h: 5.2, 
    volume: '95M', 
    type: 'crypto',
    fundingRate: 0.0001,
    openInterest: '45M',
    high24h: 29.8,
    low24h: 26.2,
    baseAsset: 'AVAX',
    quoteAsset: 'USDT',
    icon: { symbol: 'A', color: 'bg-red-500' }
  },
  { 
    symbol: 'LINK/USDT', 
    price: 15.8, 
    change24h: -0.8, 
    volume: '65M', 
    type: 'crypto',
    fundingRate: -0.0001,
    openInterest: '32M',
    high24h: 16.5,
    low24h: 15.2,
    baseAsset: 'LINK',
    quoteAsset: 'USDT',
    icon: { symbol: 'L', color: 'bg-blue-600' }
  },
  { 
    symbol: 'xAAPL/USDT', 
    price: 175, 
    change24h: 1.2, 
    volume: '50M', 
    type: 'xstock',
    fundingRate: -0.0001,
    openInterest: '25M',
    high24h: 178,
    low24h: 172,
    marketStatus: 'open',
    baseAsset: 'xAAPL',
    quoteAsset: 'USDT',
    icon: { symbol: 'A', color: 'bg-gray-800' }
  },
  { 
    symbol: 'xTSLA/USDT', 
    price: 210, 
    change24h: -2.1, 
    volume: '80M', 
    type: 'xstock',
    fundingRate: 0.0002,
    openInterest: '40M',
    high24h: 218,
    low24h: 208,
    marketStatus: 'closed',
    baseAsset: 'xTSLA',
    quoteAsset: 'USDT',
    icon: { symbol: 'T', color: 'bg-red-600' }
  },
  { 
    symbol: 'xMSFT/USDT', 
    price: 380, 
    change24h: 0.8, 
    volume: '40M', 
    type: 'xstock',
    fundingRate: -0.0002,
    openInterest: '20M',
    high24h: 385,
    low24h: 375,
    marketStatus: 'open',
    baseAsset: 'xMSFT',
    quoteAsset: 'USDT',
    icon: { symbol: 'M', color: 'bg-blue-700' }
  },
  { 
    symbol: 'xGOOGL/USDT', 
    price: 145, 
    change24h: 1.8, 
    volume: '35M', 
    type: 'xstock',
    fundingRate: 0.0001,
    openInterest: '18M',
    high24h: 148,
    low24h: 142,
    marketStatus: 'open',
    baseAsset: 'xGOOGL',
    quoteAsset: 'USDT',
    icon: { symbol: 'G', color: 'bg-green-600' }
  },
];

export const mockOrderBook = {
  bids: [
    { price: 42990, amount: 0.5, total: 0.5, depth: 15 },
    { price: 42980, amount: 1.2, total: 1.7, depth: 25 },
    { price: 42970, amount: 0.8, total: 2.5, depth: 35 },
    { price: 42960, amount: 2.1, total: 4.6, depth: 55 },
    { price: 42950, amount: 1.5, total: 6.1, depth: 70 },
    { price: 42940, amount: 0.9, total: 7.0, depth: 80 },
    { price: 42930, amount: 1.8, total: 8.8, depth: 90 },
    { price: 42920, amount: 0.6, total: 9.4, depth: 100 },
  ],
  asks: [
    { price: 43010, amount: 0.3, total: 0.3, depth: 12 },
    { price: 43020, amount: 0.9, total: 1.2, depth: 20 },
    { price: 43030, amount: 1.4, total: 2.6, depth: 32 },
    { price: 43040, amount: 0.7, total: 3.3, depth: 40 },
    { price: 43050, amount: 2.2, total: 5.5, depth: 65 },
    { price: 43060, amount: 1.1, total: 6.6, depth: 75 },
    { price: 43070, amount: 0.8, total: 7.4, depth: 85 },
    { price: 43080, amount: 1.5, total: 8.9, depth: 100 },
  ]
};

export const mockRecentTrades = [
  { id: 1, price: 43000, amount: 0.15, time: '14:25:32', side: 'buy', value: 6450 },
  { id: 2, price: 42995, amount: 0.08, time: '14:25:28', side: 'sell', value: 3439 },
  { id: 3, price: 43005, amount: 0.22, time: '14:25:25', side: 'buy', value: 9461 },
  { id: 4, price: 43000, amount: 0.11, time: '14:25:20', side: 'buy', value: 4730 },
  { id: 5, price: 42998, amount: 0.19, time: '14:25:15', side: 'sell', value: 8170 },
  { id: 6, price: 43010, amount: 0.33, time: '14:25:10', side: 'buy', value: 14193 },
  { id: 7, price: 42990, amount: 0.12, time: '14:25:05', side: 'sell', value: 5159 },
  { id: 8, price: 43008, amount: 0.28, time: '14:25:00', side: 'buy', value: 12042 },
];

export const mockRiverPoolData = {
  totalTVL: 2500000,
  currentAPY: 18.5,
  userDeposit: 1320,
  userShares: 0.0528,
  pendingRewards: 45.60,
  totalRewards: 125.48,
  dailyEarnings: 1.52,
  monthlyEarnings: 42.86,
  totalUsers: 1250,
  vaultCapacity: 10000000,
  capacityUsed: 25,
  performanceFee: 10,
  managementFee: 0.5,
  minDeposit: 10,
  status: 'Active'
};

export const mockAllocationData = [
  { asset: 'xAAPL', allocation: 34, performance: 2.1, status: 'Active' },
  { asset: 'xTSLA', allocation: 26, performance: -0.8, status: 'Active' },
  { asset: 'xMSFT', allocation: 17, performance: 1.5, status: 'Active' },
  { asset: 'xGOOGL', allocation: 15, performance: 0.9, status: 'Active' },
  { asset: 'xNVDA', allocation: 8, performance: 3.2, status: 'Active' }
];

export const mockHistoricalData = [
  { date: '2024-01', apy: 16.2, tvl: 1800000 },
  { date: '2024-02', apy: 17.1, tvl: 2100000 },
  { date: '2024-03', apy: 18.5, tvl: 2500000 },
];

export const mockHistoricalPositions = [
  {
    id: 'RP-001',
    asset: 'xAAPL',
    side: 'long',
    size: 450.25,
    entryPrice: 172.50,
    exitPrice: 178.20,
    entryTime: '2024-01-29 09:30:00',
    exitTime: '2024-01-29 15:45:00',
    pnl: 2563.43,
    pnlPercent: 3.31,
    duration: '6h 15m',
    strategy: 'Market Making',
    fees: 45.20,
    fundingReceived: 12.50,
    reason: 'Profit Target Hit'
  },
  {
    id: 'RP-002',
    asset: 'xTSLA',
    side: 'short',
    size: 125.50,
    entryPrice: 215.80,
    exitPrice: 210.30,
    entryTime: '2024-01-28 14:20:00',
    exitTime: '2024-01-29 10:15:00',
    pnl: 690.25,
    pnlPercent: 2.55,
    duration: '19h 55m',
    strategy: 'Delta Neutral',
    fees: 28.15,
    fundingReceived: -8.20,
    reason: 'Risk Management'
  },
  {
    id: 'RP-003',
    asset: 'xMSFT',
    side: 'long',
    size: 200.75,
    entryPrice: 375.90,
    exitPrice: 382.45,
    entryTime: '2024-01-27 11:00:00',
    exitTime: '2024-01-28 16:30:00',
    pnl: 1315.93,
    pnlPercent: 1.74,
    duration: '1d 5h 30m',
    strategy: 'Grid Trading',
    fees: 35.80,
    fundingReceived: 15.30,
    reason: 'Strategy Rotation'
  },
  {
    id: 'RP-004',
    asset: 'xGOOGL',
    side: 'short',
    size: 300.00,
    entryPrice: 148.60,
    exitPrice: 145.20,
    entryTime: '2024-01-26 10:45:00',
    exitTime: '2024-01-27 09:20:00',
    pnl: 1020.00,
    pnlPercent: 2.29,
    duration: '22h 35m',
    strategy: 'Market Making',
    fees: 22.40,
    fundingReceived: 5.80,
    reason: 'Normal Exit'
  },
  {
    id: 'RP-005',
    asset: 'xNVDA',
    side: 'long',
    size: 85.30,
    entryPrice: 720.50,
    exitPrice: 745.80,
    entryTime: '2024-01-25 13:15:00',
    exitTime: '2024-01-26 11:40:00',
    pnl: 2159.09,
    pnlPercent: 3.51,
    duration: '22h 25m',
    strategy: 'Momentum',
    fees: 38.60,
    fundingReceived: 18.90,
    reason: 'Profit Target Hit'
  }
];

export const mockHistoricalTrades = [
  {
    id: 'TR-001',
    timestamp: '2024-01-29 15:45:12',
    asset: 'xAAPL',
    type: 'CLOSE_LONG',
    size: 450.25,
    price: 178.20,
    value: 80246.55,
    fees: 24.07,
    slippage: 0.02,
    executor: 'AI_STRATEGY_01',
    orderId: 'RP-001'
  },
  {
    id: 'TR-002',
    timestamp: '2024-01-29 10:15:33',
    asset: 'xTSLA',
    type: 'CLOSE_SHORT',
    size: 125.50,
    price: 210.30,
    value: 26392.65,
    fees: 15.84,
    slippage: 0.01,
    executor: 'AI_STRATEGY_02',
    orderId: 'RP-002'
  },
  {
    id: 'TR-003',
    timestamp: '2024-01-29 09:30:45',
    asset: 'xAAPL',
    type: 'OPEN_LONG',
    size: 450.25,
    price: 172.50,
    value: 77693.13,
    fees: 21.13,
    slippage: 0.01,
    executor: 'AI_STRATEGY_01',
    orderId: 'RP-001'
  },
  {
    id: 'TR-004',
    timestamp: '2024-01-28 16:30:21',
    asset: 'xMSFT',
    type: 'CLOSE_LONG',
    size: 200.75,
    price: 382.45,
    value: 76782.09,
    fees: 23.03,
    slippage: 0.02,
    executor: 'AI_STRATEGY_03',
    orderId: 'RP-003'
  },
  {
    id: 'TR-005',
    timestamp: '2024-01-28 14:20:18',
    asset: 'xTSLA',
    type: 'OPEN_SHORT',
    size: 125.50,
    price: 215.80,
    value: 27082.90,
    fees: 12.31,
    slippage: 0.01,
    executor: 'AI_STRATEGY_02',
    orderId: 'RP-002'
  }
];

export const mockPerformanceHistory = [
  {
    date: '2024-01-29',
    dailyPnl: 2563.43,
    cumulativePnl: 15847.92,
    apy: 18.7,
    tvl: 2485000,
    sharpeRatio: 2.14,
    maxDrawdown: 1.2,
    winRate: 78.5,
    totalTrades: 24,
    feesEarned: 156.80,
    fundingEarned: 45.20
  },
  {
    date: '2024-01-28',
    dailyPnl: 1890.25,
    cumulativePnl: 13284.49,
    apy: 18.4,
    tvl: 2470000,
    sharpeRatio: 2.08,
    maxDrawdown: 1.5,
    winRate: 76.2,
    totalTrades: 18,
    feesEarned: 134.50,
    fundingEarned: 38.90
  },
  {
    date: '2024-01-27',
    dailyPnl: 3205.18,
    cumulativePnl: 11394.24,
    apy: 18.9,
    tvl: 2455000,
    sharpeRatio: 2.21,
    maxDrawdown: 0.9,
    winRate: 81.3,
    totalTrades: 32,
    feesEarned: 198.30,
    fundingEarned: 62.40
  },
  {
    date: '2024-01-26',
    dailyPnl: 1756.83,
    cumulativePnl: 8189.06,
    apy: 17.8,
    tvl: 2440000,
    sharpeRatio: 1.95,
    maxDrawdown: 1.8,
    winRate: 74.1,
    totalTrades: 27,
    feesEarned: 142.70,
    fundingEarned: 41.80
  },
  {
    date: '2024-01-25',
    dailyPnl: 2892.67,
    cumulativePnl: 6432.23,
    apy: 18.1,
    tvl: 2425000,
    sharpeRatio: 2.03,
    maxDrawdown: 1.1,
    winRate: 79.6,
    totalTrades: 29,
    feesEarned: 175.90,
    fundingEarned: 54.70
  }
];

export const mockTransparencyMetrics = {
  totalTradesExecuted: 1547,
  totalVolumeTraded: 125600000,
  averageSlippage: 0.015,
  averageExecutionTime: 0.23,
  uptime: 99.87,
  totalFeesEarned: 45280,
  totalFundingEarned: 12450,
  riskMetrics: {
    currentVaR: 2.3,
    maxDrawdown: 3.8,
    sharpeRatio: 2.14,
    sortinoratio: 3.02,
    volatility: 8.5
  },
  strategyDistribution: {
    marketMaking: 45,
    deltaNeutral: 25,
    gridTrading: 18,
    momentum: 12
  }
};

export const mockReferralStats = {
  totalReferrals: 24,
  activeReferrals: 18,
  totalCommission: 1250,
  thisMonthCommission: 185,
  pendingRewards: 45.60,
  tier: 'Gold',
  nextTierProgress: 65
};