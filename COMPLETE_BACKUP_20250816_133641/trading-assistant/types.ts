/**
 * Trading Plan Data Types for RiverBit Trading Assistant
 * Comprehensive TypeScript interfaces for trading plan management
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type PlanDirection = 'long' | 'short';
export type PlanStatus = 'active' | 'executed' | 'expired' | 'cancelled' | 'pending';
export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

/**
 * Core trading plan interface
 */
export interface TradingPlan {
  id: string;
  symbol: string;
  direction: PlanDirection;
  status: PlanStatus;
  
  // Price levels
  entry: number;
  stopLoss: number;
  takeProfit: number;
  
  // Risk management
  confidence: number; // 0-100
  riskLevel: RiskLevel;
  riskRewardRatio: number;
  maxLoss: number; // in USDT
  potentialGain: number; // in USDT
  
  // Plan details
  reasoning: string;
  timeFrame: TimeFrame;
  validUntil: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: 'ai' | 'user' | 'system';
  
  // Optional fields
  tags?: string[];
  notes?: string;
  marketConditions?: string;
  technicalIndicators?: TechnicalIndicator[];
}

/**
 * Technical indicator data
 */
export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
}

/**
 * Plan execution details
 */
export interface PlanExecution {
  planId: string;
  executedAt: Date;
  executionPrice: number;
  slippage: number;
  fees: number;
  transactionHash?: string;
  actualRiskReward?: number;
}

/**
 * Risk metrics for plan evaluation
 */
export interface RiskMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
}

/**
 * Market context for plan generation
 */
export interface MarketContext {
  symbol: string;
  currentPrice: number;
  volume24h: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  support: number[];
  resistance: number[];
  keyLevels: number[];
}

/**
 * Trading plan preferences
 */
export interface TradingPreferences {
  maxRiskPerTrade: number; // percentage of portfolio
  preferredTimeFrames: TimeFrame[];
  riskTolerance: RiskLevel;
  tradingStyle: 'scalping' | 'day-trading' | 'swing' | 'position';
  autoExecute: boolean;
  notificationsEnabled: boolean;
}

/**
 * Plan card component props
 */
export interface TradingPlanCardProps {
  plan: TradingPlan;
  isBookmarked?: boolean;
  onExecute?: (plan: TradingPlan) => void;
  onBookmark?: (planId: string) => void;
  onShare?: (plan: TradingPlan) => void;
  onModify?: (plan: TradingPlan) => void;
  onDelete?: (planId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Plan generation request
 */
export interface PlanGenerationRequest {
  symbol: string;
  direction?: PlanDirection;
  riskLevel?: RiskLevel;
  timeFrame?: TimeFrame;
  customPrompt?: string;
  marketContext?: Partial<MarketContext>;
  preferences?: Partial<TradingPreferences>;
}

/**
 * Plan validation result
 */
export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
  suggestions: string[];
}

/**
 * Trading plan statistics
 */
export interface PlanStatistics {
  totalPlans: number;
  activePlans: number;
  executedPlans: number;
  successfulPlans: number;
  winRate: number;
  averageRR: number;
  totalPnL: number;
  bestPlan: TradingPlan | null;
  worstPlan: TradingPlan | null;
}

/**
 * Plan filter options
 */
export interface PlanFilters {
  status?: PlanStatus[];
  symbols?: string[];
  riskLevels?: RiskLevel[];
  directions?: PlanDirection[];
  timeFrames?: TimeFrame[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  confidenceRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

/**
 * Plan sorting options
 */
export interface PlanSortOptions {
  field: 'createdAt' | 'confidence' | 'riskRewardRatio' | 'validUntil' | 'symbol';
  direction: 'asc' | 'desc';
}

/**
 * Web3 execution context
 */
export interface Web3ExecutionContext {
  userAddress: string;
  availableBalance: number;
  gasPrice: number;
  slippageTolerance: number;
  maxPriorityFeePerGas?: number;
  deadline?: number;
}

/**
 * Plan update payload
 */
export interface PlanUpdatePayload {
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
  tags?: string[];
  validUntil?: Date;
}