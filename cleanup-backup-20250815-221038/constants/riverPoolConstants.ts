// RiverPool 相关常量定义
export const RISK_LEVELS = {
  SAFE: 'safe',
  WARNING: 'warning', 
  DANGER: 'danger'
} as const;

export const POSITION_SIDES = {
  NET_LONG: 'net_long',
  NET_SHORT: 'net_short'
} as const;

export const RISK_THRESHOLDS = {
  EXPOSURE_NORMAL: 15,
  EXPOSURE_WARNING: 20,
  EXPOSURE_MAX: 25,
  DRAWDOWN_YELLOW: 5,
  DRAWDOWN_RED: 8,
  MARGIN_WARNING: 50,
  MARGIN_DANGER: 80
} as const;

export const REVENUE_SPLIT = {
  LP_SHARE: 0.8,
  PLATFORM_SHARE: 0.2
} as const;

export const FUNDING_INTERVALS = [
  'UTC 00:00',
  'UTC 08:00', 
  'UTC 16:00'
] as const;

export const RISK_EVENT_TYPES = {
  EXPOSURE_WARNING: 'exposure_warning',
  DRAWDOWN_ALERT: 'drawdown_alert',
  FUNDING_SPIKE: 'funding_spike'
} as const;

export const POSITION_STATUS_COLORS = {
  low: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    progress: '[&>div]:bg-green-500'
  },
  medium: {
    bg: 'bg-yellow-50', 
    text: 'text-yellow-600',
    progress: '[&>div]:bg-yellow-500'
  },
  high: {
    bg: 'bg-red-50',
    text: 'text-red-600', 
    progress: '[&>div]:bg-red-500'
  }
} as const;

export const MARKET_STATUS_COLORS = {
  open: 'bg-green-100 text-green-700',
  closed: 'bg-orange-100 text-orange-700'
} as const;