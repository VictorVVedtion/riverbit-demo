export const poolData = {
  tvl: 12450000,
  rLPPrice: 1.0847,
  apr30d: 24.8,
  apr7d: 31.2,
  dailyYield: 0.068,
  totalSupply: 11480000,
  insuranceFund: 248500,
  netExposure: 18.5,
  drawdown24h: 2.3,
  status: 'normal' as const
};

export const userData = {
  balance: 5420.75,
  rLPHolding: 4995.82,
  todayEarnings: 34.56,
  totalEarnings: 847.23,
  sharePercent: 0.043,
  // 新增交易相关数据
  totalMargin: 8500.00,
  usedMargin: 3200.00,
  freeMargin: 5300.00,
  totalPnL: 425.82,
  todayPnL: 34.56
};

// xStock 主池支持的交易对
export const xStockPairs = [
  { 
    symbol: 'xAAPL-PERP', 
    name: 'Apple Inc.', 
    price: 185.60, 
    change: -0.75, 
    volume: 2450000, 
    exposure: 15.2,
    fundingRate: 0.0025,
    openInterest: 1250000
  },
  { 
    symbol: 'xMSFT-PERP', 
    name: 'Microsoft Corp.', 
    price: 378.90, 
    change: 1.25, 
    volume: 1890000, 
    exposure: 12.8,
    fundingRate: 0.0018,
    openInterest: 980000
  },
  { 
    symbol: 'xNVDA-PERP', 
    name: 'NVIDIA Corp.', 
    price: 456.80, 
    change: 3.45, 
    volume: 3200000, 
    exposure: 22.4,
    fundingRate: 0.0032,
    openInterest: 1750000
  },
  { 
    symbol: 'xAMZN-PERP', 
    name: 'Amazon.com Inc.', 
    price: 142.30, 
    change: -1.15, 
    volume: 1650000, 
    exposure: 8.9,
    fundingRate: 0.0015,
    openInterest: 680000
  },
  { 
    symbol: 'xGOOGL-PERP', 
    name: 'Alphabet Inc.', 
    price: 134.75, 
    change: 0.85, 
    volume: 1230000, 
    exposure: 11.3,
    fundingRate: 0.0021,
    openInterest: 720000
  },
  { 
    symbol: 'xMETA-PERP', 
    name: 'Meta Platforms', 
    price: 295.40, 
    change: 2.10, 
    volume: 1780000, 
    exposure: 14.6,
    fundingRate: 0.0027,
    openInterest: 890000
  },
  { 
    symbol: 'xTSLA-PERP', 
    name: 'Tesla Inc.', 
    price: 245.80, 
    change: -2.30, 
    volume: 2890000, 
    exposure: 16.8,
    fundingRate: 0.0035,
    openInterest: 1340000
  }
];

// RiverPool 系统持仓（用户只能查看，不能操作）
export const systemPositions = [
  {
    id: 'sys_pos_001',
    symbol: 'xNVDA-PERP',
    side: 'net_long' as const,
    netSize: 1250.0,  // 系统净持仓
    avgPrice: 445.20,
    currentPrice: 456.80,
    totalMargin: 55650.00,
    unrealizedPnL: 14500.00,
    exposurePercent: 22.4,  // 占TVL的百分比
    lastUpdated: '2024-01-15 16:45:00',
    fundingAccrued: -625.00,
    riskLevel: 'medium' as const
  },
  {
    id: 'sys_pos_002', 
    symbol: 'xAAPL-PERP',
    side: 'net_short' as const,
    netSize: -890.0,  // 负数表示净空头
    avgPrice: 189.40,
    currentPrice: 185.60,
    totalMargin: 33516.00,
    unrealizedPnL: 3382.00,
    exposurePercent: 15.2,
    lastUpdated: '2024-01-15 16:45:00', 
    fundingAccrued: 145.80,
    riskLevel: 'low' as const
  },
  {
    id: 'sys_pos_003',
    symbol: 'xTSLA-PERP', 
    side: 'net_long' as const,
    netSize: 680.0,
    avgPrice: 248.90,
    currentPrice: 245.80,
    totalMargin: 21175.50,
    unrealizedPnL: -2108.00,
    exposurePercent: 16.8,
    lastUpdated: '2024-01-15 16:45:00',
    fundingAccrued: -238.40,
    riskLevel: 'medium' as const
  },
  {
    id: 'sys_pos_004',
    symbol: 'xMSFT-PERP',
    side: 'net_long' as const, 
    netSize: 420.0,
    avgPrice: 376.50,
    currentPrice: 378.90,
    totalMargin: 15813.00,
    unrealizedPnL: 1008.00,
    exposurePercent: 12.8,
    lastUpdated: '2024-01-15 16:45:00',
    fundingAccrued: 75.60,
    riskLevel: 'low' as const
  }
];

// 系统收益分配历史
export const revenueHistory = [
  {
    id: 'revenue_001',
    date: '2024-01-15',
    tradingFees: 1250.40,
    fundingFees: 890.30,
    ammSpread: 340.60,
    totalRevenue: 2481.30,
    lpShare: 1985.04, // 80%
    platformShare: 496.26, // 20%
    rLPPriceChange: 0.0068
  },
  {
    id: 'revenue_002', 
    date: '2024-01-14',
    tradingFees: 1180.20,
    fundingFees: 750.80,
    ammSpread: 290.45,
    totalRevenue: 2221.45,
    lpShare: 1777.16,
    platformShare: 444.29,
    rLPPriceChange: 0.0061
  },
  {
    id: 'revenue_003',
    date: '2024-01-13', 
    tradingFees: 1320.60,
    fundingFees: 680.90,
    ammSpread: 380.20,
    totalRevenue: 2381.70,
    lpShare: 1905.36,
    platformShare: 476.34,
    rLPPriceChange: 0.0066
  }
];

// 系统风险事件历史
export const riskEventHistory = [
  {
    id: 'risk_001',
    timestamp: '2024-01-14 15:30:00',
    type: 'exposure_warning' as const,
    symbol: 'xNVDA-PERP',
    description: 'xNVDA 敞口達到 20% TVL，系統自動調整',
    action: '減少新開倉規模',
    resolved: true
  },
  {
    id: 'risk_002',
    timestamp: '2024-01-12 09:15:00', 
    type: 'drawdown_alert' as const,
    symbol: 'ALL',
    description: '24h 總回撤達到 4.5%，接近黃燈警告',
    action: '加強風險監控',
    resolved: true
  },
  {
    id: 'risk_003',
    timestamp: '2024-01-10 18:45:00',
    type: 'funding_spike' as const,
    symbol: 'xTSLA-PERP',
    description: 'xTSLA 資金費率異常波動',
    action: '調整持倉規模',
    resolved: true
  }
];

export const marketStatus = {
  isMarketOpen: true,
  nextSession: '美東時間 09:30 開市',
  weekend: false,
  spreadMultiplier: 1,
  weekendMaintenanceEnd: ''
};

export const getRiskStatus = (poolData: typeof poolData) => ({
  netExposure: poolData.netExposure <= 25 ? 'safe' as const : 'warning' as const,
  drawdown: poolData.drawdown24h <= 5 ? 'safe' as const : poolData.drawdown24h <= 8 ? 'warning' as const : 'danger' as const,
  insurance: (poolData.insuranceFund / poolData.tvl * 100) >= 0.8 ? 'safe' as const : 'warning' as const
});

export const mockTransactionHistory = [
  { 
    date: '2024-01-15 14:23:45', 
    type: 'deposit' as const, 
    amount: '5000.00', 
    rLP: '4608.56', 
    price: '1.0847', 
    fee: '50.00',
    hash: '0x1a2b3c4d...',
    status: 'confirmed' as const
  },
  { 
    date: '2024-01-10 09:15:22', 
    type: 'deposit' as const, 
    amount: '2000.00', 
    rLP: '1920.15', 
    price: '1.0416', 
    fee: '20.00',
    hash: '0x4d5e6f7g...',
    status: 'confirmed' as const
  },
  { 
    date: '2024-01-08 16:45:12', 
    type: 'reward' as const, 
    amount: '45.33', 
    rLP: '41.85', 
    price: '1.0398', 
    fee: '0.00',
    hash: '0x7g8h9i0j...',
    status: 'confirmed' as const
  }
];

// 计算系统总体状态
export const getSystemStats = () => {
  const totalMargin = systemPositions.reduce((total, pos) => total + pos.totalMargin, 0);
  const totalPnL = systemPositions.reduce((total, pos) => total + pos.unrealizedPnL, 0);
  const totalFunding = systemPositions.reduce((total, pos) => total + pos.fundingAccrued, 0);
  
  return {
    totalMargin,
    totalPnL,
    totalFunding,
    netExposure: systemPositions.reduce((total, pos) => total + pos.exposurePercent, 0),
    positionCount: systemPositions.length,
    profitablePositions: systemPositions.filter(pos => pos.unrealizedPnL > 0).length
  };
};

// 用户在池子中的份额收益贡献
export const getUserPoolContribution = () => {
  const systemStats = getSystemStats();
  const userSharePercent = userData.sharePercent / 100;
  
  return {
    contributedMargin: systemStats.totalMargin * userSharePercent,
    shareOfPnL: systemStats.totalPnL * userSharePercent,
    shareOfFunding: systemStats.totalFunding * userSharePercent,
    estimatedDailyEarnings: userData.todayEarnings
  };
};