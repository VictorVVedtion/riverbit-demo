// RiverBit Trading Assistant - NLQ Integration
// Main entry point for Natural Language Query processing

export {
  processNaturalLanguageQuery,
  formatQueryResult,
  type TradingQuery,
  type TradingIntent,
  type TimeFrame,
  type ConfidenceLevel,
  type MarketSentiment
} from './nlqProcessor';

// Test functions removed - use proper testing framework instead

export {
  OpportunityRadar,
  OpportunityDetector,
  opportunityRadar,
  startOpportunityRadar,
  stopOpportunityRadar,
  getActiveOpportunities,
  getOpportunityHistory,
  updateRadarPreferences,
  type OpportunityAlert,
  type UserPreferences,
  type MarketSnapshot,
  type OpportunityRadarConfig
} from './opportunityRadar';

export {
  PerformanceTracker,
  performanceTracker,
  PerformanceUtils,
  type TradingPlanExecution,
  type StrategyPerformance,
  type StrategyMetrics,
  type MarketConditionPerformance,
  type TimeBasedAnalysis,
  type BacktestResult,
  type BacktestTrade,
  type RealTimePosition,
  type PerformanceDashboard,
  type PerformanceAlert
} from './performanceTracker';

export {
  strategyEngine,
  StrategyEngine,
  TechnicalAnalysis,
  MarketRegimeDetector,
  TradingStrategies,
  PositionSizingCalculator,
  type TradingPlan as StrategyTradingPlan,
  type TradingSignal,
  type MarketRegime,
  type TechnicalIndicators,
  type RiskParameters,
  type StrategyConfig
} from './strategyEngine';

export {
  PerformanceIntegration,
  PerformanceIntegrationUtils
} from './performanceIntegration';

// Re-export commonly used functions for convenience
import { processNaturalLanguageQuery, formatQueryResult } from './nlqProcessor';

// Simplified interface for quick integration
export class TradingAssistant {
  /**
   * Process a natural language trading query
   * @param query - The user's trading question in natural language
   * @returns Structured trading analysis and recommendations
   */
  static async analyze(query: string) {
    return await processNaturalLanguageQuery(query);
  }
  
  /**
   * Get a formatted, human-readable analysis
   * @param query - The user's trading question in natural language  
   * @returns Formatted string ready for display
   */
  static async getFormattedAnalysis(query: string): Promise<string> {
    const result = await processNaturalLanguageQuery(query);
    return formatQueryResult(result);
  }
  
  /**
   * Quick intent classification without full analysis
   * @param query - The user's trading question
   * @returns The detected trading intent
   */
  static async getIntent(query: string): Promise<string> {
    const result = await processNaturalLanguageQuery(query);
    return result.intent;
  }
  
  /**
   * Extract trading symbol from natural language
   * @param query - The user's trading question
   * @returns The detected symbol or null
   */
  static async getSymbol(query: string): Promise<string | null> {
    const result = await processNaturalLanguageQuery(query);
    return result.symbol;
  }
}

// Example usage patterns for documentation
export const USAGE_EXAMPLES = {
  // Basic usage
  basic: `
import { TradingAssistant } from './utils/tradingAssistant';

// Analyze a trading question
const result = await TradingAssistant.analyze("Should I buy BTC?");
console.log(result.intent); // 'buy'
console.log(result.symbol); // 'BTC'
console.log(result.confidence); // 'high'
`,

  // Formatted output
  formatted: `
import { TradingAssistant } from './utils/tradingAssistant';

// Get formatted analysis for display
const analysis = await TradingAssistant.getFormattedAnalysis(
  "Should I buy BTC right now? Market seems bullish!"
);
console.log(analysis);
`,

  // Quick operations
  quick: `
import { TradingAssistant } from './utils/tradingAssistant';

// Quick intent detection
const intent = await TradingAssistant.getIntent("Should I sell ETH?");
console.log(intent); // 'sell'

// Quick symbol extraction  
const symbol = await TradingAssistant.getSymbol("How's AAPL looking?");
console.log(symbol); // 'AAPL'
`,

  // Advanced usage
  advanced: `
import { processNaturalLanguageQuery } from './utils/tradingAssistant';

const query = "BTC is pumping, should I FOMO in or wait?";
const result = await processNaturalLanguageQuery(query);

// Access detailed analysis
console.log('Symbol:', result.symbol);
console.log('Intent:', result.intent);
console.log('Sentiment:', result.sentiment);
console.log('Urgency:', result.urgency);
console.log('Market Status:', result.context.marketStatus);
console.log('Current Price:', result.context.currentPrice);
console.log('Suggested Actions:', result.suggestedActions);
console.log('Risk Factors:', result.riskFactors);
`,

  // Integration with React components
  react: `
// In a React component
import { useState } from 'react';
import { TradingAssistant } from './utils/tradingAssistant';

function TradingChat() {
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState('');
  
  const handleSubmit = async () => {
    const result = await TradingAssistant.getFormattedAnalysis(query);
    setAnalysis(result);
  };
  
  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a trading question..."
      />
      <button onClick={handleSubmit}>Analyze</button>
      <pre>{analysis}</pre>
    </div>
  );
}
`,

  // Batch processing
  batch: `
import { processNaturalLanguageQuery } from './utils/tradingAssistant';

const queries = [
  "Should I buy BTC?",
  "ETH exit strategy?", 
  "How's SOL looking?"
];

// Process multiple queries
const results = await Promise.all(
  queries.map(q => processNaturalLanguageQuery(q))
);

results.forEach((result, i) => {
  console.log(\`Query \${i + 1}: \${result.symbol} - \${result.intent}\`);
});
`,

  // Performance tracking
  performance: `
import { performanceTracker, PerformanceUtils } from './utils/tradingAssistant';
import { TradingPlan } from './components/trading-assistant/types';

// Record a new trading plan
const plan: TradingPlan = {
  id: 'plan_123',
  symbol: 'BTC',
  direction: 'long',
  entry: 45000,
  takeProfit: 47000,
  stopLoss: 44000,
  confidence: 85,
  riskRewardRatio: 2.0,
  // ... other plan properties
};

// Track the plan
const planId = performanceTracker.recordPlan(plan);

// Record when position is entered
performanceTracker.recordEntry(planId, {
  actualEntryPrice: 45050,
  positionSize: 1000,
  leverage: 5,
  margin: 200,
  slippage: 50,
  fees: 15,
  transactionHash: '0x123...'
});

// Record when position is closed
performanceTracker.recordExit(planId, {
  actualExitPrice: 46800,
  exitReason: 'take_profit',
  slippage: 30,
  fees: 15,
  transactionHash: '0x456...'
});

// Get performance dashboard
const dashboard = performanceTracker.generateDashboard();
console.log('Win Rate:', PerformanceUtils.formatPercentage(dashboard.overview.winRate));
console.log('Total P&L:', PerformanceUtils.formatPnL(dashboard.overview.totalPnL));
`,

  // Backtesting
  backtesting: `
import { performanceTracker } from './utils/tradingAssistant';

// Run a backtest
const backtestResult = await performanceTracker.runBacktest({
  strategyName: 'trend_breakout',
  symbol: 'BTC',
  timeframe: '4h',
  startDate: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 days ago
  endDate: Date.now(),
  initialBalance: 10000
});

console.log('Backtest Results:');
console.log('Total Trades:', backtestResult.totalTrades);
console.log('Win Rate:', backtestResult.winRate.toFixed(2) + '%');
console.log('Total Return:', backtestResult.totalReturn.toFixed(2));
console.log('Max Drawdown:', backtestResult.maxDrawdown.toFixed(2) + '%');
console.log('Sharpe Ratio:', backtestResult.sharpeRatio.toFixed(2));
`,

  // Real-time monitoring
  realtime: `
import { performanceTracker } from './utils/tradingAssistant';

// Get active positions
const activePositions = performanceTracker.getActivePositions();
activePositions.forEach(position => {
  console.log(\`\${position.symbol}: \${position.unrealizedPnL > 0 ? '+' : ''}\${position.unrealizedPnL.toFixed(2)} USD\`);
});

// Get performance alerts
const alerts = performanceTracker.getAlerts();
alerts.forEach(alert => {
  console.log(\`[\${alert.severity.toUpperCase()}] \${alert.message}\`);
});

// Get strategy performance
const dashboard = performanceTracker.generateDashboard();
dashboard.strategies.forEach(strategy => {
  console.log(\`\${strategy.strategyName}: \${strategy.winRate.toFixed(1)}% win rate, \${strategy.totalPnL.toFixed(2)} USD P&L\`);
});
`
};

// Configuration options for advanced usage
export interface NLQConfig {
  enableCache?: boolean;
  cacheTimeout?: number;
  defaultTimeframe?: string;
  enableMarketData?: boolean;
  enableUserContext?: boolean;
  confidenceThreshold?: number;
}

// Default configuration
export const DEFAULT_CONFIG: NLQConfig = {
  enableCache: true,
  cacheTimeout: 30000, // 30 seconds
  defaultTimeframe: '1h',
  enableMarketData: true,
  enableUserContext: true,
  confidenceThreshold: 0.4
};

// Helper function to validate configuration
export function validateConfig(config: Partial<NLQConfig>): NLQConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config
  };
}

// Export risk management utilities
export {
  riskManager,
  setupUserRiskProfile,
  quickValidatePlan,
  getSafePositionSize,
  getRiskStatusForUI,
  getRiskBadges,
  getRecommendedPositionSize,
  initializeDemoUser,
  testRiskManagement
} from './riskManagerIntegration';

export {
  RiskManager,
  DEFAULT_RISK_PARAMETERS,
  RISK_TOLERANCE_PRESETS,
  type RiskParameters,
  type UserRiskProfile,
  type PositionRisk,
  type PlanRiskAssessment,
  type RiskViolation,
  type EmergencyAction
} from './riskManager';

// Export trading execution engine and related components
export {
  TradingExecutionEngine,
  executionEngine,
  type TradingPlan,
  type ExecutionStep,
  type ExecutionPlan,
  type PreflightChecks,
  type ExecutionStatus,
  type ExecutionEvent,
  type ExecutionEventType
} from './executionEngine';

export {
  useTradingExecution,
  useExecutionStatus,
  useExecutionMonitor,
  type UseTradingExecutionReturn
} from './useTradingExecution';