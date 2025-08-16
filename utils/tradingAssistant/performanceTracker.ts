/**
 * RiverBit Trading Assistant - Performance Tracking & Signal Analytics System
 * Comprehensive system for tracking AI-generated trading plans and analyzing performance
 */

import { TradingPlan } from '../../components/trading-assistant/types';
import { TransactionRecord, transactionHistory } from '../transactionHistory';
import { getUnifiedPrice } from '../unifiedPriceAPI';

// ============================================================================
// CORE TYPES AND INTERFACES
// ============================================================================

export interface TradingPlanExecution {
  planId: string;
  symbol: string;
  strategy: string;
  direction: 'long' | 'short';
  
  // Entry Details
  entryTime: number;
  plannedEntryPrice: number;
  actualEntryPrice?: number;
  entrySlippage?: number;
  entryFees?: number;
  entryTransactionHash?: string;
  
  // Exit Details
  exitTime?: number;
  plannedExitPrice: number;
  actualExitPrice?: number;
  exitSlippage?: number;
  exitFees?: number;
  exitTransactionHash?: string;
  exitReason?: 'take_profit' | 'stop_loss' | 'manual' | 'expired' | 'partial';
  
  // Position Details
  positionSize: number;
  leverage: number;
  margin: number;
  
  // Performance Metrics
  plannedRiskReward: number;
  actualRiskReward?: number;
  pnl?: number;
  pnlPercentage?: number;
  maxDrawdown?: number;
  timeInTrade?: number; // milliseconds
  
  // Plan Quality
  confidence: number;
  signalStrength: number;
  marketConditions: string;
  
  // Status
  status: 'planning' | 'entered' | 'active' | 'closed' | 'cancelled' | 'expired';
  isWin?: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  notes?: string[];
}

export interface StrategyPerformance {
  strategyName: string;
  totalTrades: number;
  winRate: number;
  lossRate: number;
  averageWin: number;
  averageLoss: number;
  averageRiskReward: number;
  totalPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  averageTimeInTrade: number;
  winStreak: number;
  lossStreak: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | 'none';
  
  // Performance by market conditions
  performanceByMarket: {
    trending: StrategyMetrics;
    ranging: StrategyMetrics;
    volatile: StrategyMetrics;
  };
  
  // Performance by timeframe
  performanceByTimeframe: Record<string, StrategyMetrics>;
  
  // Recent performance
  last30Days: StrategyMetrics;
  last7Days: StrategyMetrics;
  lastUpdated: number;
}

export interface StrategyMetrics {
  trades: number;
  winRate: number;
  totalPnL: number;
  averageRiskReward: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface MarketConditionPerformance {
  condition: string;
  totalTrades: number;
  winRate: number;
  averagePnL: number;
  strategies: Record<string, StrategyMetrics>;
}

export interface TimeBasedAnalysis {
  hourOfDay: Record<string, StrategyMetrics>;
  dayOfWeek: Record<string, StrategyMetrics>;
  marketSession: {
    asian: StrategyMetrics;
    european: StrategyMetrics;
    american: StrategyMetrics;
    overlap: StrategyMetrics;
  };
}

export interface BacktestResult {
  id: string;
  strategyName: string;
  symbol: string;
  timeframe: string;
  startDate: number;
  endDate: number;
  
  // Results
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  
  // Trade Details
  trades: BacktestTrade[];
  
  // Metadata
  createdAt: number;
  notes?: string;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  direction: 'long' | 'short';
  pnl: number;
  pnlPercentage: number;
  reason: string;
}

export interface RealTimePosition {
  planId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  positionSize: number;
  leverage: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  timeInTrade: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  distanceToStopLoss: number;
  distanceToTakeProfit: number;
  riskAmount: number;
  lastUpdated: number;
}

export interface PerformanceDashboard {
  overview: {
    totalTrades: number;
    totalPnL: number;
    winRate: number;
    averageRiskReward: number;
    accountGrowth: number;
    sharpeRatio: number;
    maxDrawdown: number;
    currentDrawdown: number;
    profitFactor: number;
    bestTrade: TradingPlanExecution | null;
    worstTrade: TradingPlanExecution | null;
  };
  
  strategies: StrategyPerformance[];
  marketConditions: MarketConditionPerformance[];
  timeBasedAnalysis: TimeBasedAnalysis;
  
  activePositions: RealTimePosition[];
  recentTrades: TradingPlanExecution[];
  
  // Risk Metrics
  riskMetrics: {
    currentExposure: number;
    maxExposure: number;
    riskPerTrade: number;
    correlationRisk: number;
    leverageRatio: number;
  };
  
  lastUpdated: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  acknowledged: boolean;
  relatedPlanId?: string;
  data?: any;
}

// ============================================================================
// PERFORMANCE TRACKER CLASS
// ============================================================================

export class PerformanceTracker {
  private executions: Map<string, TradingPlanExecution> = new Map();
  private strategyPerformance: Map<string, StrategyPerformance> = new Map();
  private backtestResults: Map<string, BacktestResult> = new Map();
  private alerts: PerformanceAlert[] = [];
  private storageKey = 'riverbit_performance_data';
  private alertsKey = 'riverbit_performance_alerts';

  constructor() {
    this.loadData();
    this.startRealTimeMonitoring();
  }

  // ============================================================================
  // PLAN EXECUTION TRACKING
  // ============================================================================

  /**
   * Record a new trading plan for tracking
   */
  recordPlan(plan: TradingPlan): string {
    const execution: TradingPlanExecution = {
      planId: plan.id,
      symbol: plan.symbol,
      strategy: plan.createdBy === 'ai' ? 'ai_generated' : 'manual',
      direction: plan.direction,
      
      entryTime: Date.now(),
      plannedEntryPrice: plan.entry,
      plannedExitPrice: plan.takeProfit,
      
      positionSize: plan.potentialGain / plan.entry, // Approximate position size
      leverage: 1, // Default, will be updated
      margin: plan.maxLoss,
      
      plannedRiskReward: plan.riskRewardRatio,
      confidence: plan.confidence,
      signalStrength: plan.confidence,
      marketConditions: plan.marketConditions || 'unknown',
      
      status: 'planning',
      
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.executions.set(plan.id, execution);
    this.saveData();
    
    return plan.id;
  }

  /**
   * Update execution when position is entered
   */
  recordEntry(planId: string, entryDetails: {
    actualEntryPrice: number;
    positionSize: number;
    leverage: number;
    margin: number;
    slippage?: number;
    fees?: number;
    transactionHash?: string;
  }): boolean {
    const execution = this.executions.get(planId);
    if (!execution) return false;

    execution.actualEntryPrice = entryDetails.actualEntryPrice;
    execution.positionSize = entryDetails.positionSize;
    execution.leverage = entryDetails.leverage;
    execution.margin = entryDetails.margin;
    execution.entrySlippage = entryDetails.slippage;
    execution.entryFees = entryDetails.fees;
    execution.entryTransactionHash = entryDetails.transactionHash;
    execution.status = 'entered';
    execution.updatedAt = Date.now();

    this.executions.set(planId, execution);
    this.saveData();
    
    return true;
  }

  /**
   * Update execution when position is closed
   */
  recordExit(planId: string, exitDetails: {
    actualExitPrice: number;
    exitReason: 'take_profit' | 'stop_loss' | 'manual' | 'expired' | 'partial';
    slippage?: number;
    fees?: number;
    transactionHash?: string;
  }): boolean {
    const execution = this.executions.get(planId);
    if (!execution || !execution.actualEntryPrice) return false;

    execution.exitTime = Date.now();
    execution.actualExitPrice = exitDetails.actualExitPrice;
    execution.exitSlippage = exitDetails.slippage;
    execution.exitFees = exitDetails.fees;
    execution.exitTransactionHash = exitDetails.transactionHash;
    execution.exitReason = exitDetails.exitReason;
    execution.status = 'closed';

    // Calculate performance metrics
    this.calculateExecutionMetrics(execution);
    
    execution.updatedAt = Date.now();
    this.executions.set(planId, execution);
    
    // Update strategy performance
    this.updateStrategyPerformance(execution);
    
    this.saveData();
    return true;
  }

  /**
   * Calculate performance metrics for a completed execution
   */
  private calculateExecutionMetrics(execution: TradingPlanExecution): void {
    if (!execution.actualEntryPrice || !execution.actualExitPrice) return;

    const entryPrice = execution.actualEntryPrice;
    const exitPrice = execution.actualExitPrice;
    const positionSize = execution.positionSize;

    // Calculate P&L
    if (execution.direction === 'long') {
      execution.pnl = (exitPrice - entryPrice) * positionSize;
      execution.pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      execution.pnl = (entryPrice - exitPrice) * positionSize;
      execution.pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100;
    }

    // Account for fees
    const totalFees = (execution.entryFees || 0) + (execution.exitFees || 0);
    execution.pnl -= totalFees;

    // Calculate actual risk-reward
    const riskAmount = Math.abs(execution.pnl < 0 ? execution.pnl : execution.margin);
    const rewardAmount = execution.pnl > 0 ? execution.pnl : 0;
    execution.actualRiskReward = riskAmount > 0 ? rewardAmount / riskAmount : 0;

    // Determine if win/loss
    execution.isWin = execution.pnl > 0;

    // Calculate time in trade
    if (execution.exitTime && execution.entryTime) {
      execution.timeInTrade = execution.exitTime - execution.entryTime;
    }
  }

  // ============================================================================
  // STRATEGY PERFORMANCE ANALYTICS
  // ============================================================================

  /**
   * Update strategy performance metrics
   */
  private updateStrategyPerformance(execution: TradingPlanExecution): void {
    if (!execution.isWin !== undefined || !execution.pnl) return;

    const strategyName = execution.strategy;
    let performance = this.strategyPerformance.get(strategyName);

    if (!performance) {
      performance = this.initializeStrategyPerformance(strategyName);
    }

    // Update basic metrics
    performance.totalTrades++;
    performance.totalPnL += execution.pnl;

    if (execution.isWin) {
      const wins = Math.round(performance.winRate * (performance.totalTrades - 1) / 100) + 1;
      performance.winRate = (wins / performance.totalTrades) * 100;
      performance.averageWin = ((performance.averageWin * (wins - 1)) + execution.pnl) / wins;
    } else {
      const losses = performance.totalTrades - Math.round(performance.winRate * performance.totalTrades / 100);
      performance.averageLoss = ((performance.averageLoss * (losses - 1)) + Math.abs(execution.pnl)) / losses;
    }

    performance.lossRate = 100 - performance.winRate;

    // Update risk-reward
    if (execution.actualRiskReward) {
      const previousTotal = performance.averageRiskReward * (performance.totalTrades - 1);
      performance.averageRiskReward = (previousTotal + execution.actualRiskReward) / performance.totalTrades;
    }

    // Update profit factor
    const totalWins = performance.averageWin * (performance.totalTrades * performance.winRate / 100);
    const totalLosses = performance.averageLoss * (performance.totalTrades * performance.lossRate / 100);
    performance.profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;

    // Update streaks
    this.updateStreaks(performance, execution.isWin);

    // Update time-based metrics
    this.updateTimeBasedMetrics(performance, execution);

    performance.lastUpdated = Date.now();
    this.strategyPerformance.set(strategyName, performance);
  }

  /**
   * Initialize new strategy performance tracking
   */
  private initializeStrategyPerformance(strategyName: string): StrategyPerformance {
    return {
      strategyName,
      totalTrades: 0,
      winRate: 0,
      lossRate: 0,
      averageWin: 0,
      averageLoss: 0,
      averageRiskReward: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      profitFactor: 0,
      averageTimeInTrade: 0,
      winStreak: 0,
      lossStreak: 0,
      currentStreak: 0,
      currentStreakType: 'none',
      
      performanceByMarket: {
        trending: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 },
        ranging: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 },
        volatile: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 }
      },
      
      performanceByTimeframe: {},
      
      last30Days: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 },
      last7Days: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 },
      
      lastUpdated: Date.now()
    };
  }

  /**
   * Update win/loss streaks
   */
  private updateStreaks(performance: StrategyPerformance, isWin: boolean): void {
    if (isWin) {
      if (performance.currentStreakType === 'win') {
        performance.currentStreak++;
      } else {
        performance.currentStreak = 1;
        performance.currentStreakType = 'win';
      }
      performance.winStreak = Math.max(performance.winStreak, performance.currentStreak);
    } else {
      if (performance.currentStreakType === 'loss') {
        performance.currentStreak++;
      } else {
        performance.currentStreak = 1;
        performance.currentStreakType = 'loss';
      }
      performance.lossStreak = Math.max(performance.lossStreak, performance.currentStreak);
    }
  }

  /**
   * Update time-based performance metrics
   */
  private updateTimeBasedMetrics(performance: StrategyPerformance, execution: TradingPlanExecution): void {
    // Update average time in trade
    if (execution.timeInTrade) {
      const previousTotal = performance.averageTimeInTrade * (performance.totalTrades - 1);
      performance.averageTimeInTrade = (previousTotal + execution.timeInTrade) / performance.totalTrades;
    }

    // Update recent performance
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    if (execution.createdAt >= thirtyDaysAgo) {
      this.updateMetrics(performance.last30Days, execution);
    }

    if (execution.createdAt >= sevenDaysAgo) {
      this.updateMetrics(performance.last7Days, execution);
    }
  }

  /**
   * Update metrics object
   */
  private updateMetrics(metrics: StrategyMetrics, execution: TradingPlanExecution): void {
    if (!execution.isWin !== undefined || !execution.pnl) return;

    metrics.trades++;
    metrics.totalPnL += execution.pnl;

    if (execution.isWin) {
      const wins = Math.round(metrics.winRate * (metrics.trades - 1) / 100) + 1;
      metrics.winRate = (wins / metrics.trades) * 100;
    }

    if (execution.actualRiskReward) {
      const previousTotal = metrics.averageRiskReward * (metrics.trades - 1);
      metrics.averageRiskReward = (previousTotal + execution.actualRiskReward) / metrics.trades;
    }
  }

  // ============================================================================
  // REAL-TIME MONITORING
  // ============================================================================

  /**
   * Start real-time position monitoring
   */
  private startRealTimeMonitoring(): void {
    // Update active positions every 30 seconds
    setInterval(() => {
      this.updateActivePositions();
    }, 30000);

    // Check for alerts every minute
    setInterval(() => {
      this.checkForAlerts();
    }, 60000);
  }

  /**
   * Update real-time P&L for active positions
   */
  private async updateActivePositions(): Promise<void> {
    const activeExecutions = Array.from(this.executions.values())
      .filter(exec => exec.status === 'entered' || exec.status === 'active');

    for (const execution of activeExecutions) {
      try {
        const currentPrice = await getUnifiedPrice(execution.symbol);
        if (currentPrice && execution.actualEntryPrice) {
          this.updatePositionPnL(execution, currentPrice.price);
        }
      } catch (error) {
        console.error(`Error updating position for ${execution.symbol}:`, error);
      }
    }
  }

  /**
   * Update position P&L with current price
   */
  private updatePositionPnL(execution: TradingPlanExecution, currentPrice: number): void {
    if (!execution.actualEntryPrice) return;

    const entryPrice = execution.actualEntryPrice;
    const positionSize = execution.positionSize;

    // Calculate unrealized P&L
    let unrealizedPnL: number;
    if (execution.direction === 'long') {
      unrealizedPnL = (currentPrice - entryPrice) * positionSize;
    } else {
      unrealizedPnL = (entryPrice - currentPrice) * positionSize;
    }

    // Account for entry fees (exit fees will be deducted when closing)
    unrealizedPnL -= execution.entryFees || 0;

    // Update execution with current data
    execution.pnl = unrealizedPnL;
    execution.pnlPercentage = ((unrealizedPnL / execution.margin) * 100);
    execution.updatedAt = Date.now();

    // Calculate time in trade
    execution.timeInTrade = Date.now() - execution.entryTime;

    this.executions.set(execution.planId, execution);
  }

  /**
   * Get current active positions
   */
  getActivePositions(): RealTimePosition[] {
    const activeExecutions = Array.from(this.executions.values())
      .filter(exec => exec.status === 'entered' || exec.status === 'active');

    return activeExecutions.map(execution => {
      return {
        planId: execution.planId,
        symbol: execution.symbol,
        direction: execution.direction,
        entryPrice: execution.actualEntryPrice || execution.plannedEntryPrice,
        currentPrice: 0, // Will be updated by real-time monitoring
        positionSize: execution.positionSize,
        leverage: execution.leverage,
        unrealizedPnL: execution.pnl || 0,
        unrealizedPnLPercentage: execution.pnlPercentage || 0,
        timeInTrade: execution.timeInTrade || 0,
        stopLossPrice: 0, // TODO: Get from original plan
        takeProfitPrice: execution.plannedExitPrice,
        distanceToStopLoss: 0,
        distanceToTakeProfit: 0,
        riskAmount: execution.margin,
        lastUpdated: execution.updatedAt
      };
    });
  }

  // ============================================================================
  // BACKTESTING FUNCTIONALITY
  // ============================================================================

  /**
   * Run backtest for a strategy
   */
  async runBacktest(config: {
    strategyName: string;
    symbol: string;
    timeframe: string;
    startDate: number;
    endDate: number;
    initialBalance: number;
  }): Promise<BacktestResult> {
    // This is a simplified backtest implementation
    // In a real system, you would fetch historical data and simulate trades
    
    const backtestId = `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate some backtest results for demonstration
    const trades: BacktestTrade[] = [];
    const numTrades = Math.floor(Math.random() * 50) + 10; // 10-60 trades
    
    let currentTime = config.startDate;
    const timeIncrement = (config.endDate - config.startDate) / numTrades;
    
    for (let i = 0; i < numTrades; i++) {
      const entryTime = currentTime;
      const exitTime = currentTime + (timeIncrement * 0.8); // Exit before next entry
      
      // Simulate random price movements
      const entryPrice = 100 + (Math.random() * 50);
      const priceChange = (Math.random() - 0.5) * 0.1; // ±5% change
      const exitPrice = entryPrice * (1 + priceChange);
      
      const direction: 'long' | 'short' = Math.random() > 0.5 ? 'long' : 'short';
      
      let pnl: number;
      if (direction === 'long') {
        pnl = exitPrice - entryPrice;
      } else {
        pnl = entryPrice - exitPrice;
      }
      
      trades.push({
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        direction,
        pnl,
        pnlPercentage: (pnl / entryPrice) * 100,
        reason: 'Strategy signal'
      });
      
      currentTime += timeIncrement;
    }
    
    // Calculate backtest metrics
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    
    const totalReturn = trades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = (wins.length / trades.length) * 100;
    const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0)) / losses.length : 0;
    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : averageWin;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = config.initialBalance;
    let currentBalance = config.initialBalance;
    
    for (const trade of trades) {
      currentBalance += trade.pnl;
      if (currentBalance > peak) {
        peak = currentBalance;
      }
      const drawdown = (peak - currentBalance) / peak * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    const result: BacktestResult = {
      id: backtestId,
      strategyName: config.strategyName,
      symbol: config.symbol,
      timeframe: config.timeframe,
      startDate: config.startDate,
      endDate: config.endDate,
      totalTrades: trades.length,
      winRate,
      totalReturn,
      maxDrawdown,
      sharpeRatio: 0, // TODO: Calculate properly
      profitFactor,
      averageWin,
      averageLoss,
      trades,
      createdAt: Date.now()
    };
    
    this.backtestResults.set(backtestId, result);
    this.saveData();
    
    return result;
  }

  /**
   * Get all backtest results
   */
  getBacktestResults(): BacktestResult[] {
    return Array.from(this.backtestResults.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get backtest result by ID
   */
  getBacktestResult(id: string): BacktestResult | null {
    return this.backtestResults.get(id) || null;
  }

  // ============================================================================
  // ALERTS AND MONITORING
  // ============================================================================

  /**
   * Check for performance alerts
   */
  private checkForAlerts(): void {
    // Check for consecutive losses
    this.checkConsecutiveLosses();
    
    // Check for high drawdown
    this.checkDrawdown();
    
    // Check for unusual market conditions
    this.checkMarketConditions();
    
    // Check for position size violations
    this.checkPositionSizes();
  }

  /**
   * Check for consecutive losses
   */
  private checkConsecutiveLosses(): void {
    const recentTrades = this.getRecentTrades(10);
    let consecutiveLosses = 0;
    
    for (let i = recentTrades.length - 1; i >= 0; i--) {
      if (recentTrades[i].isWin === false) {
        consecutiveLosses++;
      } else {
        break;
      }
    }
    
    if (consecutiveLosses >= 5) {
      this.addAlert({
        type: 'warning',
        message: `${consecutiveLosses} consecutive losses detected. Consider reviewing strategy or reducing position sizes.`,
        severity: consecutiveLosses >= 7 ? 'high' : 'medium',
        data: { consecutiveLosses, recentTrades: recentTrades.slice(-consecutiveLosses) }
      });
    }
  }

  /**
   * Check for high drawdown
   */
  private checkDrawdown(): void {
    const currentDrawdown = this.calculateCurrentDrawdown();
    
    if (currentDrawdown > 10) {
      this.addAlert({
        type: 'error',
        message: `High drawdown detected: ${currentDrawdown.toFixed(2)}%. Consider reducing risk or stopping trading.`,
        severity: currentDrawdown > 20 ? 'critical' : 'high',
        data: { currentDrawdown }
      });
    }
  }

  /**
   * Check market conditions
   */
  private checkMarketConditions(): void {
    // This would integrate with market data to detect unusual conditions
    // For now, this is a placeholder
  }

  /**
   * Check position sizes
   */
  private checkPositionSizes(): void {
    const activePositions = this.getActivePositions();
    const totalExposure = activePositions.reduce((sum, pos) => sum + (pos.positionSize * pos.currentPrice), 0);
    
    // This would check against account balance
    // For now, this is a placeholder
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const newAlert: PerformanceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false
    };
    
    this.alerts.unshift(newAlert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }
    
    this.saveAlerts();
  }

  /**
   * Get active alerts
   */
  getAlerts(includeAcknowledged: boolean = false): PerformanceAlert[] {
    return this.alerts
      .filter(alert => includeAcknowledged || !alert.acknowledged)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveAlerts();
      return true;
    }
    return false;
  }

  // ============================================================================
  // PERFORMANCE DASHBOARD
  // ============================================================================

  /**
   * Generate comprehensive performance dashboard
   */
  generateDashboard(): PerformanceDashboard {
    const allExecutions = Array.from(this.executions.values());
    const completedTrades = allExecutions.filter(exec => exec.status === 'closed' && exec.pnl !== undefined);
    
    // Calculate overview metrics
    const totalTrades = completedTrades.length;
    const totalPnL = completedTrades.reduce((sum, exec) => sum + (exec.pnl || 0), 0);
    const wins = completedTrades.filter(exec => exec.isWin === true);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    
    const averageRiskReward = totalTrades > 0 
      ? completedTrades.reduce((sum, exec) => sum + (exec.actualRiskReward || 0), 0) / totalTrades
      : 0;
    
    const maxDrawdown = this.calculateMaxDrawdown();
    const currentDrawdown = this.calculateCurrentDrawdown();
    
    // Find best and worst trades
    const bestTrade = completedTrades.reduce((best, exec) => 
      (exec.pnl || 0) > (best?.pnl || -Infinity) ? exec : best, null as TradingPlanExecution | null);
    
    const worstTrade = completedTrades.reduce((worst, exec) => 
      (exec.pnl || 0) < (worst?.pnl || Infinity) ? exec : worst, null as TradingPlanExecution | null);
    
    // Calculate profit factor
    const totalWins = wins.reduce((sum, exec) => sum + (exec.pnl || 0), 0);
    const totalLosses = Math.abs(completedTrades.filter(exec => exec.isWin === false)
      .reduce((sum, exec) => sum + (exec.pnl || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;
    
    const dashboard: PerformanceDashboard = {
      overview: {
        totalTrades,
        totalPnL,
        winRate,
        averageRiskReward,
        accountGrowth: 0, // TODO: Calculate based on initial balance
        sharpeRatio: 0, // TODO: Calculate properly
        maxDrawdown,
        currentDrawdown,
        profitFactor,
        bestTrade,
        worstTrade
      },
      
      strategies: Array.from(this.strategyPerformance.values()),
      marketConditions: this.calculateMarketConditionPerformance(),
      timeBasedAnalysis: this.calculateTimeBasedAnalysis(),
      
      activePositions: this.getActivePositions(),
      recentTrades: completedTrades
        .sort((a, b) => (b.exitTime || 0) - (a.exitTime || 0))
        .slice(0, 10),
      
      riskMetrics: {
        currentExposure: 0, // TODO: Calculate
        maxExposure: 0, // TODO: Calculate
        riskPerTrade: 0, // TODO: Calculate
        correlationRisk: 0, // TODO: Calculate
        leverageRatio: 0 // TODO: Calculate
      },
      
      lastUpdated: Date.now()
    };
    
    return dashboard;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get recent trades
   */
  private getRecentTrades(count: number): TradingPlanExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.status === 'closed')
      .sort((a, b) => (b.exitTime || 0) - (a.exitTime || 0))
      .slice(0, count);
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(): number {
    const completedTrades = Array.from(this.executions.values())
      .filter(exec => exec.status === 'closed' && exec.exitTime)
      .sort((a, b) => (a.exitTime || 0) - (b.exitTime || 0));
    
    let maxDrawdown = 0;
    let peak = 0;
    let currentBalance = 0;
    
    for (const trade of completedTrades) {
      currentBalance += trade.pnl || 0;
      if (currentBalance > peak) {
        peak = currentBalance;
      }
      const drawdown = peak > 0 ? ((peak - currentBalance) / peak) * 100 : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  /**
   * Calculate current drawdown
   */
  private calculateCurrentDrawdown(): number {
    const completedTrades = Array.from(this.executions.values())
      .filter(exec => exec.status === 'closed' && exec.exitTime)
      .sort((a, b) => (a.exitTime || 0) - (b.exitTime || 0));
    
    let peak = 0;
    let currentBalance = 0;
    
    for (const trade of completedTrades) {
      currentBalance += trade.pnl || 0;
      if (currentBalance > peak) {
        peak = currentBalance;
      }
    }
    
    return peak > 0 ? ((peak - currentBalance) / peak) * 100 : 0;
  }

  /**
   * Calculate market condition performance
   */
  private calculateMarketConditionPerformance(): MarketConditionPerformance[] {
    // Group trades by market conditions
    const conditionGroups = new Map<string, TradingPlanExecution[]>();
    
    for (const execution of this.executions.values()) {
      if (execution.status === 'closed') {
        const condition = execution.marketConditions || 'unknown';
        if (!conditionGroups.has(condition)) {
          conditionGroups.set(condition, []);
        }
        conditionGroups.get(condition)!.push(execution);
      }
    }
    
    // Calculate performance for each condition
    const results: MarketConditionPerformance[] = [];
    
    for (const [condition, trades] of conditionGroups.entries()) {
      const wins = trades.filter(t => t.isWin === true);
      const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
      const averagePnL = trades.length > 0 
        ? trades.reduce((sum, t) => sum + (t.pnl || 0), 0) / trades.length 
        : 0;
      
      results.push({
        condition,
        totalTrades: trades.length,
        winRate,
        averagePnL,
        strategies: {} // TODO: Break down by strategy
      });
    }
    
    return results.sort((a, b) => b.totalTrades - a.totalTrades);
  }

  /**
   * Calculate time-based analysis
   */
  private calculateTimeBasedAnalysis(): TimeBasedAnalysis {
    // This is a simplified implementation
    // In a real system, you would analyze performance by time periods
    
    return {
      hourOfDay: {},
      dayOfWeek: {},
      marketSession: {
        asian: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 },
        european: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 },
        american: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 },
        overlap: { trades: 0, winRate: 0, totalPnL: 0, averageRiskReward: 0, maxDrawdown: 0, profitFactor: 0 }
      }
    };
  }

  // ============================================================================
  // DATA PERSISTENCE
  // ============================================================================

  /**
   * Save performance data to localStorage
   */
  private saveData(): void {
    try {
      const data = {
        executions: Array.from(this.executions.entries()),
        strategyPerformance: Array.from(this.strategyPerformance.entries()),
        backtestResults: Array.from(this.backtestResults.entries()),
        lastSaved: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save performance data:', error);
    }
  }

  /**
   * Load performance data from localStorage
   */
  private loadData(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        
        this.executions = new Map(data.executions || []);
        this.strategyPerformance = new Map(data.strategyPerformance || []);
        this.backtestResults = new Map(data.backtestResults || []);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  }

  /**
   * Save alerts to localStorage
   */
  private saveAlerts(): void {
    try {
      localStorage.setItem(this.alertsKey, JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }

  /**
   * Load alerts from localStorage
   */
  private loadAlerts(): void {
    try {
      const stored = localStorage.getItem(this.alertsKey);
      if (stored) {
        this.alerts = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  /**
   * Clear all performance data
   */
  clearData(): void {
    this.executions.clear();
    this.strategyPerformance.clear();
    this.backtestResults.clear();
    this.alerts = [];
    
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.alertsKey);
  }

  /**
   * Export performance data
   */
  exportData(): string {
    const data = {
      executions: Array.from(this.executions.entries()),
      strategyPerformance: Array.from(this.strategyPerformance.entries()),
      backtestResults: Array.from(this.backtestResults.entries()),
      alerts: this.alerts,
      exportedAt: Date.now()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import performance data
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      this.executions = new Map(data.executions || []);
      this.strategyPerformance = new Map(data.strategyPerformance || []);
      this.backtestResults = new Map(data.backtestResults || []);
      this.alerts = data.alerts || [];
      
      this.saveData();
      this.saveAlerts();
      
      return true;
    } catch (error) {
      console.error('Failed to import performance data:', error);
      return false;
    }
  }
}

// ============================================================================
// GLOBAL INSTANCE AND UTILITIES
// ============================================================================

export const performanceTracker = new PerformanceTracker();

/**
 * Utility functions for performance analysis
 */
export const PerformanceUtils = {
  
  /**
   * Format P&L for display
   */
  formatPnL(pnl: number): string {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}$${pnl.toFixed(2)}`;
  },
  
  /**
   * Format percentage for display
   */
  formatPercentage(percentage: number): string {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  },
  
  /**
   * Get performance color based on value
   */
  getPerformanceColor(value: number): string {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  },
  
  /**
   * Calculate win rate color
   */
  getWinRateColor(winRate: number): string {
    if (winRate >= 70) return 'text-green-600';
    if (winRate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  },
  
  /**
   * Format time duration
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },
  
  /**
   * Calculate confidence level color
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }
};

// Export the main class and utilities
export default performanceTracker;