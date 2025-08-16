import { RISK_THRESHOLDS, POSITION_SIDES } from '../constants/riverPoolConstants';

// 格式化数字显示
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

// 格式化百分比
export const formatPercentage = (num: number, decimals: number = 2): string => {
  return `${num >= 0 ? '+' : ''}${num.toFixed(decimals)}%`;
};

// 格式化金额
export const formatCurrency = (amount: number, prefix: string = '$'): string => {
  return `${prefix}${formatNumber(amount)}`;
};

// 判断风险等级
export const getRiskLevel = (value: number, type: 'exposure' | 'drawdown' | 'margin'): 'safe' | 'warning' | 'danger' => {
  switch (type) {
    case 'exposure':
      if (value <= RISK_THRESHOLDS.EXPOSURE_NORMAL) return 'safe';
      if (value <= RISK_THRESHOLDS.EXPOSURE_WARNING) return 'warning';
      return 'danger';
    case 'drawdown':
      if (value <= RISK_THRESHOLDS.DRAWDOWN_YELLOW) return 'safe';
      if (value <= RISK_THRESHOLDS.DRAWDOWN_RED) return 'warning';
      return 'danger';
    case 'margin':
      if (value <= RISK_THRESHOLDS.MARGIN_WARNING) return 'safe';
      if (value <= RISK_THRESHOLDS.MARGIN_DANGER) return 'warning';
      return 'danger';
    default:
      return 'safe';
  }
};

// 获取风险颜色类
export const getRiskColorClass = (level: 'safe' | 'warning' | 'danger'): string => {
  switch (level) {
    case 'safe': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'danger': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

// 计算强平距离
export const getLiquidationDistance = (
  currentPrice: number, 
  liquidationPrice: number, 
  isLong: boolean
): number => {
  if (isLong) {
    return ((currentPrice - liquidationPrice) / currentPrice) * 100;
  } else {
    return ((liquidationPrice - currentPrice) / currentPrice) * 100;
  }
};

// 计算PnL百分比
export const calculatePnLPercentage = (pnl: number, margin: number): number => {
  return (pnl / margin) * 100;
};

// 判断是否为做多
export const isLongPosition = (side: string): boolean => {
  return side === POSITION_SIDES.NET_LONG || side === 'long';
};

// 获取持仓方向显示文本
export const getPositionSideText = (side: string): string => {
  if (side === POSITION_SIDES.NET_LONG || side === 'long') return '淨多頭';
  if (side === POSITION_SIDES.NET_SHORT || side === 'short') return '淨空頭';
  return side;
};

// 获取风险事件类型显示文本
export const getRiskEventTypeText = (type: string): string => {
  switch (type) {
    case 'exposure_warning': return '敞口警告';
    case 'drawdown_alert': return '回撤警告';
    case 'funding_spike': return '資金費異常';
    default: return type;
  }
};

// 计算距离下次资金费结算的时间
export const getNextFundingTime = (): string => {
  const now = new Date();
  const currentHour = now.getUTCHours();
  
  let nextHour: number;
  if (currentHour < 8) nextHour = 8;
  else if (currentHour < 16) nextHour = 16;
  else nextHour = 24; // 次日00:00
  
  const hoursUntil = nextHour === 24 ? 24 - currentHour : nextHour - currentHour;
  return `${hoursUntil} 小時後`;
};