/**
 * formatUtils - 专业格式化工具函数
 * 用于处理数字、价格、百分比等格式化显示
 */

// 数字格式化
export function formatNumber(value: number | string, options?: {
  decimals?: number;
  compact?: boolean;
  currency?: boolean;
  prefix?: string;
  suffix?: string;
}): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  const {
    decimals = 2,
    compact = false,
    currency = false,
    prefix = '',
    suffix = ''
  } = options || {};

  let formatted: string;

  if (compact && Math.abs(num) >= 1000) {
    // 紧凑格式 (1.2K, 1.5M, 2.1B)
    const units = ['', 'K', 'M', 'B', 'T'];
    const unitIndex = Math.floor(Math.log10(Math.abs(num)) / 3);
    const scaledNum = num / Math.pow(1000, unitIndex);
    
    formatted = scaledNum.toFixed(unitIndex > 0 ? 1 : decimals) + units[unitIndex];
  } else {
    // 标准格式
    formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  if (currency) {
    formatted = '$' + formatted;
  }

  return prefix + formatted + suffix;
}

// 价格格式化
export function formatPrice(price: number | string, options?: {
  symbol?: string;
  decimals?: number;
  showSign?: boolean;
}): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '$0.00';

  const {
    symbol = '$',
    decimals = 2,
    showSign = false
  } = options || {};

  const sign = showSign && num > 0 ? '+' : '';
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return `${sign}${symbol}${formatted}`;
}

// 百分比格式化
export function formatPercentage(value: number | string, options?: {
  decimals?: number;
  showSign?: boolean;
  absolute?: boolean;
}): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00%';

  const {
    decimals = 2,
    showSign = false,
    absolute = false
  } = options || {};

  const processedNum = absolute ? Math.abs(num) : num;
  const sign = showSign && processedNum > 0 ? '+' : '';
  const formatted = processedNum.toFixed(decimals);

  return `${sign}${formatted}%`;
}

// 交易量格式化
export function formatVolume(volume: number | string): string {
  const num = typeof volume === 'string' ? parseFloat(volume) : volume;
  if (isNaN(num)) return '$0';

  if (num >= 1e12) {
    return '$' + (num / 1e12).toFixed(1) + 'T';
  } else if (num >= 1e9) {
    return '$' + (num / 1e9).toFixed(1) + 'B';
  } else if (num >= 1e6) {
    return '$' + (num / 1e6).toFixed(1) + 'M';
  } else if (num >= 1e3) {
    return '$' + (num / 1e3).toFixed(1) + 'K';
  } else {
    return '$' + num.toFixed(2);
  }
}

// 市值格式化
export function formatMarketCap(marketCap: string | number): string {
  if (typeof marketCap === 'string') {
    // 如果已经是格式化字符串，直接返回
    if (marketCap.includes('T') || marketCap.includes('B') || marketCap.includes('M')) {
      return marketCap;
    }
    const num = parseFloat(marketCap);
    return formatVolume(num);
  }
  return formatVolume(marketCap);
}

// 时间格式化
export function formatTime(timestamp: number | string, options?: {
  format?: 'short' | 'long' | 'relative';
  showSeconds?: boolean;
}): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const {
    format = 'short',
    showSeconds = false
  } = options || {};

  switch (format) {
    case 'relative':
      return formatRelativeTime(date);
    case 'long':
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined
      });
    case 'short':
    default:
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined
      });
  }
}

// 相对时间格式化
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}

// 精度格式化（根据价格自动调整小数位）
export function formatPrecision(value: number | string, baseAsset: string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  // 根据资产类型确定精度
  if (['BTC', 'ETH'].includes(baseAsset)) {
    if (num >= 1000) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else if (num >= 100) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } else {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  } else if (['SOL'].includes(baseAsset)) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  } else {
    // 股票等其他资产
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// 地址缩短
export function shortenAddress(address: string, options?: {
  startLength?: number;
  endLength?: number;
  separator?: string;
}): string {
  if (!address) return '';

  const {
    startLength = 6,
    endLength = 4,
    separator = '...'
  } = options || {};

  if (address.length <= startLength + endLength) {
    return address;
  }

  return `${address.slice(0, startLength)}${separator}${address.slice(-endLength)}`;
}

// 交易哈希缩短
export function shortenTxHash(hash: string): string {
  return shortenAddress(hash, { startLength: 8, endLength: 6 });
}

// 杠杆风险颜色
export function getLeverageRiskColor(leverage: number): string {
  if (leverage <= 5) return 'text-profit';
  if (leverage <= 20) return 'text-warning';
  if (leverage <= 50) return 'text-loss';
  return 'text-danger';
}

// PnL颜色
export function getPnLColor(pnl: number | string): string {
  const num = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
  if (isNaN(num)) return 'text-muted';
  
  if (num > 0) return 'text-profit';
  if (num < 0) return 'text-loss';
  return 'text-muted';
}

// 价格变化颜色
export function getPriceChangeColor(change: number | string): string {
  return getPnLColor(change);
}

// 保证金比例颜色
export function getMarginRatioColor(ratio: number): string {
  if (ratio >= 200) return 'text-profit';
  if (ratio >= 150) return 'text-warning';
  if (ratio >= 100) return 'text-loss';
  return 'text-danger';
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 倒计时格式化
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 数字动画值计算
export function calculateAnimatedValue(
  startValue: number,
  endValue: number,
  progress: number
): number {
  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOutCubic(Math.max(0, Math.min(1, progress)));
  
  return startValue + (endValue - startValue) * easedProgress;
}

// 范围格式化
export function formatRange(min: number, max: number, decimals: number = 2): string {
  return `${min.toFixed(decimals)} - ${max.toFixed(decimals)}`;
}

// 错误信息格式化
export function formatError(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message;
  return 'An unknown error occurred';
}

// 网络延迟格式化
export function formatLatency(ms: number): string {
  if (ms < 50) return `${ms}ms (Excellent)`;
  if (ms < 100) return `${ms}ms (Good)`;
  if (ms < 200) return `${ms}ms (Fair)`;
  return `${ms}ms (Poor)`;
}

export default {
  formatNumber,
  formatPrice,
  formatPercentage,
  formatVolume,
  formatMarketCap,
  formatTime,
  formatRelativeTime,
  formatPrecision,
  shortenAddress,
  shortenTxHash,
  getLeverageRiskColor,
  getPnLColor,
  getPriceChangeColor,
  getMarginRatioColor,
  formatFileSize,
  formatCountdown,
  calculateAnimatedValue,
  formatRange,
  formatError,
  formatLatency
};