/**
 * Performance Integration Helper
 * Connects trading plans with performance tracking system
 */

import { TradingPlan } from '../../components/trading-assistant/types';
import { performanceTracker } from './performanceTracker';
import { transactionHistory, TransactionRecord } from '../transactionHistory';

/**
 * Integration helper class for connecting trading plans with performance tracking
 */
export class PerformanceIntegration {
  
  /**
   * Initialize a trading plan for performance tracking
   */
  static initializePlanTracking(plan: TradingPlan): string {
    try {
      const planId = performanceTracker.recordPlan(plan);
      console.log(`Performance tracking initialized for plan: ${planId}`);
      return planId;
    } catch (error) {
      console.error('Failed to initialize plan tracking:', error);
      throw error;
    }
  }

  /**
   * Record trade execution from transaction history
   */
  static recordTradeExecution(
    planId: string,
    transaction: TransactionRecord,
    executionDetails: {
      actualPrice: number;
      positionSize: number;
      leverage: number;
      margin: number;
    }
  ): boolean {
    try {
      const success = performanceTracker.recordEntry(planId, {
        actualEntryPrice: executionDetails.actualPrice,
        positionSize: executionDetails.positionSize,
        leverage: executionDetails.leverage,
        margin: executionDetails.margin,
        slippage: 0, // Calculate from actual vs expected price
        fees: 0, // Extract from transaction
        transactionHash: transaction.hash
      });

      if (success) {
        console.log(`Trade execution recorded for plan: ${planId}`);
      }

      return success;
    } catch (error) {
      console.error('Failed to record trade execution:', error);
      return false;
    }
  }

  /**
   * Record trade closure
   */
  static recordTradeClosure(
    planId: string,
    transaction: TransactionRecord,
    closureDetails: {
      actualPrice: number;
      exitReason: 'take_profit' | 'stop_loss' | 'manual' | 'expired' | 'partial';
    }
  ): boolean {
    try {
      const success = performanceTracker.recordExit(planId, {
        actualExitPrice: closureDetails.actualPrice,
        exitReason: closureDetails.exitReason,
        slippage: 0, // Calculate from actual vs expected price
        fees: 0, // Extract from transaction
        transactionHash: transaction.hash
      });

      if (success) {
        console.log(`Trade closure recorded for plan: ${planId}`);
      }

      return success;
    } catch (error) {
      console.error('Failed to record trade closure:', error);
      return false;
    }
  }

  /**
   * Auto-sync transaction history with performance tracker
   */
  static syncTransactionHistory(userAddress: string): void {
    try {
      const transactions = transactionHistory.getUserTransactions(userAddress);
      console.log(`Syncing ${transactions.length} transactions for performance tracking`);
      
      // In a real implementation, you would match transactions to trading plans
      // and update the performance tracker accordingly
      
      // This is a placeholder for the sync logic
      transactions.forEach(transaction => {
        if (transaction.type === 'pool_deposit' || transaction.type === 'pool_withdraw') {
          // Match transaction to a trading plan and update performance tracker
          // This would require additional metadata to link transactions to plans
        }
      });
    } catch (error) {
      console.error('Failed to sync transaction history:', error);
    }
  }

  /**
   * Get performance summary for a user
   */
  static getUserPerformanceSummary(userAddress?: string) {
    try {
      const dashboard = performanceTracker.generateDashboard();
      
      return {
        totalTrades: dashboard.overview.totalTrades,
        winRate: dashboard.overview.winRate,
        totalPnL: dashboard.overview.totalPnL,
        averageRiskReward: dashboard.overview.averageRiskReward,
        maxDrawdown: dashboard.overview.maxDrawdown,
        currentDrawdown: dashboard.overview.currentDrawdown,
        activePositions: dashboard.activePositions.length,
        recentAlerts: dashboard.activePositions.length,
        lastUpdated: dashboard.lastUpdated
      };
    } catch (error) {
      console.error('Failed to get user performance summary:', error);
      return null;
    }
  }

  /**
   * Generate performance report
   */
  static generatePerformanceReport(options: {
    format: 'json' | 'csv' | 'pdf';
    period: 'week' | 'month' | 'quarter' | 'year' | 'all';
    includeCharts: boolean;
  }): string | null {
    try {
      const dashboard = performanceTracker.generateDashboard();
      
      if (options.format === 'json') {
        return JSON.stringify(dashboard, null, 2);
      }
      
      if (options.format === 'csv') {
        // Convert performance data to CSV format
        const csvData = this.convertToCSV(dashboard);
        return csvData;
      }
      
      // PDF generation would require additional libraries
      if (options.format === 'pdf') {
        console.log('PDF generation not implemented yet');
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      return null;
    }
  }

  /**
   * Convert dashboard data to CSV format
   */
  private static convertToCSV(dashboard: any): string {
    const headers = [
      'Date',
      'Symbol',
      'Direction',
      'Entry Price',
      'Exit Price',
      'P&L',
      'P&L %',
      'Risk Reward',
      'Strategy',
      'Market Conditions'
    ];

    let csv = headers.join(',') + '\n';

    // Add recent trades data
    dashboard.recentTrades.forEach((trade: any) => {
      const row = [
        new Date(trade.exitTime || trade.entryTime).toISOString().split('T')[0],
        trade.symbol,
        trade.direction,
        trade.actualEntryPrice || trade.plannedEntryPrice,
        trade.actualExitPrice || '',
        trade.pnl || '',
        trade.pnlPercentage || '',
        trade.actualRiskReward || trade.plannedRiskReward,
        trade.strategy,
        trade.marketConditions || ''
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Set up automatic performance tracking for new plans
   */
  static enableAutoTracking(): void {
    // This would set up event listeners for trading plan creation and execution
    console.log('Auto-tracking enabled for trading plans');
    
    // In a real implementation, you would:
    // 1. Listen for new trading plan creation events
    // 2. Automatically initialize performance tracking
    // 3. Monitor transaction history for related trades
    // 4. Update performance metrics in real-time
  }

  /**
   * Disable automatic performance tracking
   */
  static disableAutoTracking(): void {
    console.log('Auto-tracking disabled for trading plans');
    // Remove event listeners and stop monitoring
  }

  /**
   * Get performance insights and recommendations
   */
  static getPerformanceInsights() {
    try {
      const dashboard = performanceTracker.generateDashboard();
      const alerts = performanceTracker.getAlerts();
      
      const insights = {
        // Strategy performance insights
        bestStrategy: dashboard.strategies.reduce((best, current) => 
          current.winRate > (best?.winRate || 0) ? current : best, null),
        
        worstStrategy: dashboard.strategies.reduce((worst, current) => 
          current.winRate < (worst?.winRate || 100) ? current : worst, null),
        
        // Risk insights
        riskLevel: this.assessRiskLevel(dashboard),
        
        // Performance trends
        recentPerformance: this.analyzeRecentPerformance(dashboard),
        
        // Recommendations
        recommendations: this.generateRecommendations(dashboard, alerts)
      };
      
      return insights;
    } catch (error) {
      console.error('Failed to get performance insights:', error);
      return null;
    }
  }

  /**
   * Assess current risk level
   */
  private static assessRiskLevel(dashboard: any): 'low' | 'medium' | 'high' | 'critical' {
    const currentDrawdown = dashboard.overview.currentDrawdown;
    const activePositions = dashboard.activePositions.length;
    const totalExposure = dashboard.riskMetrics.currentExposure;
    
    if (currentDrawdown > 20 || activePositions > 10) return 'critical';
    if (currentDrawdown > 10 || activePositions > 5) return 'high';
    if (currentDrawdown > 5 || activePositions > 2) return 'medium';
    return 'low';
  }

  /**
   * Analyze recent performance trends
   */
  private static analyzeRecentPerformance(dashboard: any): string {
    const last7Days = dashboard.strategies[0]?.last7Days;
    const last30Days = dashboard.strategies[0]?.last30Days;
    
    if (!last7Days || !last30Days) return 'Insufficient data';
    
    if (last7Days.winRate > last30Days.winRate + 10) return 'Improving';
    if (last7Days.winRate < last30Days.winRate - 10) return 'Declining';
    return 'Stable';
  }

  /**
   * Generate performance recommendations
   */
  private static generateRecommendations(dashboard: any, alerts: any[]): string[] {
    const recommendations: string[] = [];
    
    // Check win rate
    if (dashboard.overview.winRate < 40) {
      recommendations.push('Consider reviewing your trading strategy - win rate is below 40%');
    }
    
    // Check risk-reward ratio
    if (dashboard.overview.averageRiskReward < 1.5) {
      recommendations.push('Improve risk-reward ratio by setting better take profit levels');
    }
    
    // Check drawdown
    if (dashboard.overview.currentDrawdown > 10) {
      recommendations.push('Current drawdown is high - consider reducing position sizes');
    }
    
    // Check active alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged);
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical performance alerts immediately');
    }
    
    // Check strategy performance
    const poorStrategies = dashboard.strategies.filter(s => s.winRate < 30);
    if (poorStrategies.length > 0) {
      recommendations.push(`Consider disabling poor-performing strategies: ${poorStrategies.map(s => s.strategyName).join(', ')}`);
    }
    
    return recommendations;
  }
}

/**
 * Utility functions for performance integration
 */
export const PerformanceIntegrationUtils = {
  
  /**
   * Calculate slippage from expected vs actual price
   */
  calculateSlippage(expectedPrice: number, actualPrice: number): number {
    return Math.abs(actualPrice - expectedPrice);
  },
  
  /**
   * Extract fees from transaction data
   */
  extractFees(transaction: TransactionRecord): number {
    // This would parse transaction data to extract actual fees paid
    // For now, return a default estimate
    return transaction.amount ? transaction.amount * 0.001 : 0; // 0.1% fee estimate
  },
  
  /**
   * Match transaction to trading plan
   */
  matchTransactionToPlan(transaction: TransactionRecord, plans: TradingPlan[]): TradingPlan | null {
    // This would implement logic to match transactions to trading plans
    // Could use timestamp proximity, symbol matching, etc.
    return plans.find(plan => 
      plan.symbol === this.extractSymbolFromTransaction(transaction) &&
      Math.abs(plan.createdAt.getTime() - transaction.timestamp) < 3600000 // Within 1 hour
    ) || null;
  },
  
  /**
   * Extract symbol from transaction data
   */
  extractSymbolFromTransaction(transaction: TransactionRecord): string | null {
    // This would parse transaction data to extract the trading symbol
    // Implementation depends on transaction structure
    return null; // Placeholder
  },
  
  /**
   * Validate performance tracking data
   */
  validateTrackingData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.planId) errors.push('Plan ID is required');
    if (!data.symbol) errors.push('Symbol is required');
    if (typeof data.actualEntryPrice !== 'number') errors.push('Valid entry price is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

export default PerformanceIntegration;