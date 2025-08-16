/**
 * Trading Types
 * 交易相关的类型定义
 */

// 基础交易类型
export type TradeSide = 'buy' | 'sell';
export type TradeType = 'market' | 'limit';
export type MarginMode = 'cross' | 'isolated';
export type OrderStatus = 'pending' | 'filled' | 'canceled' | 'rejected';
export type TransactionStatus = 'pending' | 'success' | 'failed';

// 账户信息类型
export interface AccountInfo {
  balance: number;
  poolShares: number;
  totalMargin: number;
  lastActivityTime: number;
  equity?: number;
  unrealizedPnl?: number;
  marginLevel?: number;
}

// 交易数据类型
export interface TradeData {
  txHash: string;
  symbol: string;
  side: TradeSide;
  type: TradeType;
  amount: number;
  price?: number;
  leverage: number;
  marginMode: MarginMode;
  timestamp: number;
  status: OrderStatus;
  fee?: number;
  slippage?: number;
  gasUsed?: string;
  gasPrice?: string;
}

// 交易执行结果
export interface TradeExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  data?: TradeData;
}

// 交易状态
export interface TradeState {
  isConnected: boolean;
  address: string;
  chainId: number | null;
  usdcBalance: number;
  usdcAllowance: number;
  accountInfo: AccountInfo | null;
  currentPosition: number;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  txStatus: TransactionStatus | null;
}

// 价格数据类型
export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

// 持仓信息
export interface Position {
  id: string;
  symbol: string;
  side: TradeSide;
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  marginMode: MarginMode;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  liquidationPrice: number;
  timestamp: number;
}

// 订单信息
export interface Order {
  id: string;
  symbol: string;
  side: TradeSide;
  type: TradeType;
  amount: number;
  price?: number;
  filledAmount: number;
  averagePrice?: number;
  status: OrderStatus;
  leverage: number;
  marginMode: MarginMode;
  timestamp: number;
  updateTime: number;
}

// 交易历史
export interface TradeHistory {
  id: string;
  orderId: string;
  symbol: string;
  side: TradeSide;
  amount: number;
  price: number;
  fee: number;
  timestamp: number;
  txHash?: string;
}

// 风险参数
export interface RiskParameters {
  maxLeverage: number;
  maintenanceMarginRate: number;
  liquidationThreshold: number;
  maxPositionSize: number;
  minOrderSize: number;
}

// Web3 错误类型
export interface Web3Error {
  code: number;
  message: string;
  data?: unknown;
}

// 合约调用参数
export interface ContractCallParams {
  methodName: string;
  params: unknown[];
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
}

// 事件日志类型
export interface ContractEventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
}

// 交易执行参数
export interface TradeExecutionParams {
  symbol: string;
  side: TradeSide;
  type: TradeType;
  amount: string;
  price?: string;
  leverage: number;
  marginMode: MarginMode;
  stopLoss?: number;
  takeProfit?: number;
  reduceOnly?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

// 回调函数类型
export type TradeCompleteCallback = (txHash: string, tradeData: TradeData) => void;
export type TradeErrorCallback = (error: string) => void;
export type BalanceUpdateCallback = (balance: number) => void;
export type PositionUpdateCallback = (positions: Position[]) => void;

// 交易确认对话框数据
export interface TradeConfirmationData {
  symbol: string;
  side: TradeSide;
  type: TradeType;
  amount: number;
  price?: number;
  leverage: number;
  marginMode: MarginMode;
  estimatedFee: number;
  requiredMargin: number;
  liquidationPrice?: number;
  priceImpact?: number;
}

// 市场数据类型
export interface MarketData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  quoteVolume24h: number;
  high24h: number;
  low24h: number;
  openInterest?: number;
  fundingRate?: number;
  nextFundingTime?: number;
}

// 深度数据
export interface OrderBookData {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: number;
}

// K线数据
export interface CandlestickData {
  symbol: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
}

export default {
  // 类型导出
  type TradeSide,
  type TradeType,
  type MarginMode,
  type OrderStatus,
  type TransactionStatus,
  
  // 接口导出
  type AccountInfo,
  type TradeData,
  type TradeExecutionResult,
  type TradeState,
  type PriceData,
  type Position,
  type Order,
  type TradeHistory,
  type RiskParameters,
  type Web3Error,
  type ContractCallParams,
  type ContractEventLog,
  type TradeExecutionParams,
  type TradeConfirmationData,
  type MarketData,
  type OrderBookData,
  type CandlestickData,
  
  // 回调函数类型
  type TradeCompleteCallback,
  type TradeErrorCallback,
  type BalanceUpdateCallback,
  type PositionUpdateCallback,
};