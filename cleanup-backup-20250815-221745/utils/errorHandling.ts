/**
 * Error Handling Utilities
 * 错误处理工具函数
 */

// 错误类型定义
export interface AppError extends Error {
  code?: string | number;
  details?: unknown;
}

export interface Web3ErrorData {
  code: number;
  message: string;
  data?: unknown;
}

// 标准化错误处理
export const handleError = (error: unknown): AppError => {
  if (error instanceof Error) {
    return error as AppError;
  }
  
  if (typeof error === 'string') {
    return new Error(error) as AppError;
  }
  
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    const message = errorObj.message || errorObj.reason || 'Unknown error occurred';
    const appError = new Error(String(message)) as AppError;
    appError.code = errorObj.code as string | number;
    appError.details = errorObj;
    return appError;
  }
  
  return new Error('Unknown error occurred') as AppError;
};

// 获取错误消息
export const getErrorMessage = (error: unknown): string => {
  const appError = handleError(error);
  return appError.message;
};

// Web3特定错误处理
export const handleWeb3Error = (error: unknown): string => {
  const appError = handleError(error);
  
  // 处理常见的Web3错误
  if (appError.code === 4001) {
    return 'Transaction was rejected by user';
  }
  
  if (appError.code === -32603) {
    return 'Internal JSON-RPC error';
  }
  
  if (appError.code === -32000) {
    return 'Insufficient funds for transaction';
  }
  
  if (appError.message.includes('revert')) {
    return 'Transaction reverted: ' + appError.message.split('revert ')[1];
  }
  
  if (appError.message.includes('gas')) {
    return 'Transaction failed due to gas issues';
  }
  
  if (appError.message.includes('nonce')) {
    return 'Transaction nonce error';
  }
  
  return appError.message || 'Transaction failed';
};

// 交易特定错误处理
export const handleTradingError = (error: unknown): string => {
  const appError = handleError(error);
  
  if (appError.message.includes('slippage')) {
    return 'Trade failed due to price slippage';
  }
  
  if (appError.message.includes('liquidity')) {
    return 'Insufficient liquidity for this trade';
  }
  
  if (appError.message.includes('allowance')) {
    return 'Insufficient token allowance';
  }
  
  if (appError.message.includes('balance')) {
    return 'Insufficient balance';
  }
  
  if (appError.message.includes('leverage')) {
    return 'Invalid leverage amount';
  }
  
  return handleWeb3Error(error);
};

// 网络错误处理
export const handleNetworkError = (error: unknown): string => {
  const appError = handleError(error);
  
  if (appError.message.includes('network')) {
    return 'Network connection error';
  }
  
  if (appError.message.includes('timeout')) {
    return 'Request timeout';
  }
  
  if (appError.message.includes('fetch')) {
    return 'Failed to fetch data';
  }
  
  return appError.message || 'Network error occurred';
};

// 错误重试工具
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        throw handleError(error);
      }
      
      // 等待指定延迟后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw handleError(lastError);
};

// 错误日志记录
export const logError = (
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void => {
  const appError = handleError(error);
  
  console.error(`[${context}] Error:`, {
    message: appError.message,
    code: appError.code,
    details: appError.details,
    stack: appError.stack,
    ...additionalData
  });
};

// 安全的JSON解析
export const safeJsonParse = <T>(json: string, defaultValue: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logError('JSON Parse', error, { json });
    return defaultValue;
  }
};

// 错误边界工具
export class ErrorBoundary {
  static wrap<T extends unknown[], R>(
    fn: (...args: T) => R,
    fallback: R
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        logError('Function Execution', error, { args });
        return fallback;
      }
    };
  }
  
  static wrapAsync<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    fallback: R
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        logError('Async Function Execution', error, { args });
        return fallback;
      }
    };
  }
}

// 验证工具
export const validateRequired = (value: unknown, fieldName: string): void => {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
};

export const validateNumber = (value: unknown, fieldName: string): number => {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return num;
};

export const validatePositiveNumber = (value: unknown, fieldName: string): number => {
  const num = validateNumber(value, fieldName);
  if (num <= 0) {
    throw new Error(`${fieldName} must be positive`);
  }
  return num;
};

export default {
  handleError,
  getErrorMessage,
  handleWeb3Error,
  handleTradingError,
  handleNetworkError,
  withRetry,
  logError,
  safeJsonParse,
  ErrorBoundary,
  validateRequired,
  validateNumber,
  validatePositiveNumber,
};