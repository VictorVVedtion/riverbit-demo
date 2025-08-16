/**
 * RiverBit Trading Assistant Components and Types
 * Central export file for all trading assistant functionality
 */

// Components
export { default as TradingPlanCard } from './TradingPlanCard';
export { default as TradingPlanDemo } from './TradingPlanDemo';
export { default as TradingAssistantChat } from './TradingAssistantChat';
export { default as OpportunityRadarPanel } from './OpportunityRadarPanel';
export { default as PerformanceDashboard } from './PerformanceDashboard';

// Types and Interfaces
export type {
  TradingPlan,
  TradingPlanCardProps,
  RiskLevel,
  PlanDirection,
  PlanStatus,
  TimeFrame,
  TechnicalIndicator,
  PlanExecution,
  RiskMetrics,
  MarketContext,
  TradingPreferences,
  PlanGenerationRequest,
  PlanValidationResult,
  PlanStatistics,
  PlanFilters,
  PlanSortOptions,
  Web3ExecutionContext,
  PlanUpdatePayload
} from './types';

// Utility functions for trading plans
export const TradingPlanUtils = {
  /**
   * Calculate risk-reward ratio
   */
  calculateRiskReward: (entry: number, stopLoss: number, takeProfit: number, direction: PlanDirection): number => {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    return risk > 0 ? reward / risk : 0;
  },

  /**
   * Calculate potential P&L
   */
  calculatePnL: (entry: number, exit: number, size: number, direction: PlanDirection): number => {
    const multiplier = direction === 'long' ? 1 : -1;
    return (exit - entry) * multiplier * size;
  },

  /**
   * Validate trading plan
   */
  validatePlan: (plan: Partial<TradingPlan>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!plan.symbol) errors.push('Symbol is required');
    if (!plan.entry || plan.entry <= 0) errors.push('Valid entry price is required');
    if (!plan.stopLoss || plan.stopLoss <= 0) errors.push('Valid stop loss is required');
    if (!plan.takeProfit || plan.takeProfit <= 0) errors.push('Valid take profit is required');
    
    if (plan.direction === 'long') {
      if (plan.stopLoss && plan.entry && plan.stopLoss >= plan.entry) {
        errors.push('Stop loss must be below entry for long positions');
      }
      if (plan.takeProfit && plan.entry && plan.takeProfit <= plan.entry) {
        errors.push('Take profit must be above entry for long positions');
      }
    } else if (plan.direction === 'short') {
      if (plan.stopLoss && plan.entry && plan.stopLoss <= plan.entry) {
        errors.push('Stop loss must be above entry for short positions');
      }
      if (plan.takeProfit && plan.entry && plan.takeProfit >= plan.entry) {
        errors.push('Take profit must be below entry for short positions');
      }
    }

    if (plan.confidence && (plan.confidence < 0 || plan.confidence > 100)) {
      errors.push('Confidence must be between 0 and 100');
    }

    if (plan.validUntil && plan.validUntil <= new Date()) {
      errors.push('Valid until date must be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Format plan for display
   */
  formatPlan: (plan: TradingPlan): string => {
    const direction = plan.direction.toUpperCase();
    const rr = plan.riskRewardRatio.toFixed(1);
    const confidence = plan.confidence.toFixed(0);
    
    return `${direction} ${plan.symbol} @ $${plan.entry} | SL: $${plan.stopLoss} | TP: $${plan.takeProfit} | R:R 1:${rr} | Confidence: ${confidence}%`;
  },

  /**
   * Check if plan is expired
   */
  isPlanExpired: (plan: TradingPlan): boolean => {
    return plan.validUntil <= new Date();
  },

  /**
   * Check if plan is expiring soon (within 24 hours)
   */
  isPlanExpiringSoon: (plan: TradingPlan): boolean => {
    const timeUntilExpiry = plan.validUntil.getTime() - Date.now();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  },

  /**
   * Get plan urgency level
   */
  getPlanUrgency: (plan: TradingPlan): 'low' | 'medium' | 'high' | 'critical' => {
    if (TradingPlanUtils.isPlanExpired(plan)) return 'critical';
    if (TradingPlanUtils.isPlanExpiringSoon(plan)) return 'high';
    
    const timeUntilExpiry = plan.validUntil.getTime() - Date.now();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
    
    if (hoursUntilExpiry <= 72) return 'medium';
    return 'low';
  },

  /**
   * Sort plans by priority
   */
  sortByPriority: (plans: TradingPlan[]): TradingPlan[] => {
    return plans.sort((a, b) => {
      // First by status (active first)
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      
      // Then by urgency
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aUrgency = urgencyOrder[TradingPlanUtils.getPlanUrgency(a)];
      const bUrgency = urgencyOrder[TradingPlanUtils.getPlanUrgency(b)];
      if (aUrgency !== bUrgency) return aUrgency - bUrgency;
      
      // Then by confidence (higher first)
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      
      // Finally by creation date (newer first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
};

// Constants
export const TRADING_PLAN_CONSTANTS = {
  MIN_CONFIDENCE: 0,
  MAX_CONFIDENCE: 100,
  MIN_RISK_REWARD: 0.1,
  MAX_RISK_REWARD: 100,
  DEFAULT_EXPIRY_HOURS: 72,
  SUPPORTED_SYMBOLS: ['BTC', 'ETH', 'SOL', 'xAAPL', 'xTSLA', 'xMSFT', 'xGOOGL'],
  RISK_LEVELS: ['low', 'medium', 'high', 'extreme'] as const,
  TIME_FRAMES: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as const,
  PLAN_STATUSES: ['active', 'executed', 'expired', 'cancelled', 'pending'] as const
} as const;