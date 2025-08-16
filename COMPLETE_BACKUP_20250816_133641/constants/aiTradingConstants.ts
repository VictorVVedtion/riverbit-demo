/**
 * AI Trading Assistant Constants
 * AI交易助手相关的常量配置
 */

// AI交易助手配置
export const AI_TRADING_CONFIG = {
  // 模拟数据生成配置
  MOCK_DATA: {
    // 交易品种
    SYMBOLS: ['BTC', 'ETH', 'SOL', 'xAAPL', 'xTSLA'],
    
    // 交易动作
    ACTIONS: ['long', 'short', 'buy', 'sell'] as const,
    
    // 杠杆选项
    LEVERAGE_OPTIONS: [5, 10, 20, 50],
    
    // 时间框架
    TIMEFRAMES: ['1h', '4h', '1d', '1w'],
    
    // 交易大小范围
    MIN_TRADE_SIZE: 500,
    MAX_TRADE_SIZE: 5500,
    
    // 信心度范围
    MIN_CONFIDENCE: 60,
    MAX_CONFIDENCE: 100,
    
    // 价格范围
    BASE_PRICE: 40000,
    PRICE_VARIATION: 10000,
    
    // 止损范围
    STOP_LOSS_BASE: 39000,
    STOP_LOSS_VARIATION: 1000,
    
    // 止盈范围
    TAKE_PROFIT_BASE: 45000,
    TAKE_PROFIT_VARIATION: 5000,
  },
  
  // 分析配置
  ANALYSIS: {
    // 模拟AI处理时间范围
    MIN_PROCESSING_TIME: 2000, // 2秒
    MAX_PROCESSING_TIME: 4000, // 4秒
    
    // 生成交易计划数量范围
    MIN_PLANS: 1,
    MAX_PLANS: 3,
    
    // 信心度阈值
    CONFIDENCE_THRESHOLDS: {
      HIGH: 80,
      MEDIUM: 60,
      LOW: 0,
    },
  },
  
  // UI配置
  UI: {
    // 颜色配置
    CONFIDENCE_COLORS: {
      HIGH: 'text-green-400 bg-green-900/30 border-green-700',
      MEDIUM: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
      LOW: 'text-orange-400 bg-orange-900/30 border-orange-700',
    },
    
    // 图标大小
    ICON_SIZES: {
      SMALL: 'h-4 w-4',
      MEDIUM: 'h-5 w-5',
      LARGE: 'h-6 w-6',
    },
    
    // 按钮样式
    BUTTON_STYLES: {
      PRIMARY: 'bg-blue-600 hover:bg-blue-700',
      SECONDARY: 'bg-slate-800 border-slate-600 hover:bg-slate-700',
      SUGGESTION: 'text-xs bg-slate-800 border-slate-600 hover:bg-slate-700',
    },
    
    // 卡片样式
    CARD_STYLES: {
      MAIN: 'bg-slate-900/50 border-slate-700',
      INPUT: 'flex-1 bg-slate-800 border-slate-600 text-white placeholder-gray-400',
    },
  },
  
  // 预设分析理由模板
  REASONING_TEMPLATES: [
    (action: string, timeframe: string, price: number) => 
      `Technical analysis shows strong ${action} momentum with RSI indicating oversold conditions. Price has broken above key resistance at $${price.toFixed(0)}.`,
    (timeframe: string) => 
      `Market sentiment is bullish with increasing volume and institutional buying pressure. Breakout pattern forming on ${timeframe} charts.`,
    (action: string) => 
      `Fundamental analysis suggests undervaluation. Recent developments and adoption metrics support ${action} position.`,
    (action: string) => 
      `Risk-reward ratio is favorable at current levels. Support levels holding strong with potential for ${action} breakout.`,
  ],
  
  // 建议查询示例
  SUGGESTION_QUERIES: [
    'Analyze BTC for long opportunities',
    'What\'s the market sentiment for ETH?',
    'Find low-risk trades for today',
    'Show me profitable setups',
  ],
} as const;

// 风险等级计算
export const RISK_LEVEL_CALCULATOR = {
  getRiskLevel: (confidence: number): 'low' | 'medium' | 'high' => {
    if (confidence > AI_TRADING_CONFIG.ANALYSIS.CONFIDENCE_THRESHOLDS.HIGH) return 'low';
    if (confidence > AI_TRADING_CONFIG.ANALYSIS.CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
    return 'high';
  },
  
  getConfidenceColor: (confidence: number): string => {
    const riskLevel = RISK_LEVEL_CALCULATOR.getRiskLevel(confidence);
    switch (riskLevel) {
      case 'low':
        return AI_TRADING_CONFIG.UI.CONFIDENCE_COLORS.HIGH;
      case 'medium':
        return AI_TRADING_CONFIG.UI.CONFIDENCE_COLORS.MEDIUM;
      case 'high':
        return AI_TRADING_CONFIG.UI.CONFIDENCE_COLORS.LOW;
      default:
        return AI_TRADING_CONFIG.UI.CONFIDENCE_COLORS.LOW;
    }
  },
} as const;

// 随机数据生成器
export const MOCK_DATA_GENERATOR = {
  generateRandomSymbol: (): string => {
    const symbols = AI_TRADING_CONFIG.MOCK_DATA.SYMBOLS;
    return symbols[Math.floor(Math.random() * symbols.length)];
  },
  
  generateRandomAction: (): typeof AI_TRADING_CONFIG.MOCK_DATA.ACTIONS[number] => {
    const actions = AI_TRADING_CONFIG.MOCK_DATA.ACTIONS;
    return actions[Math.floor(Math.random() * actions.length)];
  },
  
  generateRandomLeverage: (): number => {
    const leverages = AI_TRADING_CONFIG.MOCK_DATA.LEVERAGE_OPTIONS;
    return leverages[Math.floor(Math.random() * leverages.length)];
  },
  
  generateRandomTimeframe: (): string => {
    const timeframes = AI_TRADING_CONFIG.MOCK_DATA.TIMEFRAMES;
    return timeframes[Math.floor(Math.random() * timeframes.length)];
  },
  
  generateRandomTradeSize: (): number => {
    const { MIN_TRADE_SIZE, MAX_TRADE_SIZE } = AI_TRADING_CONFIG.MOCK_DATA;
    return Math.floor(Math.random() * (MAX_TRADE_SIZE - MIN_TRADE_SIZE)) + MIN_TRADE_SIZE;
  },
  
  generateRandomConfidence: (): number => {
    const { MIN_CONFIDENCE, MAX_CONFIDENCE } = AI_TRADING_CONFIG.MOCK_DATA;
    return Math.floor(Math.random() * (MAX_CONFIDENCE - MIN_CONFIDENCE)) + MIN_CONFIDENCE;
  },
  
  generateRandomPrice: (): number => {
    const { BASE_PRICE, PRICE_VARIATION } = AI_TRADING_CONFIG.MOCK_DATA;
    return Math.random() * PRICE_VARIATION + BASE_PRICE;
  },
  
  generateRandomStopLoss: (): number => {
    const { STOP_LOSS_BASE, STOP_LOSS_VARIATION } = AI_TRADING_CONFIG.MOCK_DATA;
    return Math.random() * STOP_LOSS_VARIATION + STOP_LOSS_BASE;
  },
  
  generateRandomTakeProfit: (): number => {
    const { TAKE_PROFIT_BASE, TAKE_PROFIT_VARIATION } = AI_TRADING_CONFIG.MOCK_DATA;
    return Math.random() * TAKE_PROFIT_VARIATION + TAKE_PROFIT_BASE;
  },
  
  generateRandomReasoning: (action: string, timeframe: string): string => {
    const templates = AI_TRADING_CONFIG.REASONING_TEMPLATES;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const price = MOCK_DATA_GENERATOR.generateRandomPrice();
    return template(action, timeframe, price);
  },
  
  generateProcessingDelay: (): number => {
    const { MIN_PROCESSING_TIME, MAX_PROCESSING_TIME } = AI_TRADING_CONFIG.ANALYSIS;
    return MIN_PROCESSING_TIME + Math.random() * (MAX_PROCESSING_TIME - MIN_PROCESSING_TIME);
  },
  
  generatePlanCount: (): number => {
    const { MIN_PLANS, MAX_PLANS } = AI_TRADING_CONFIG.ANALYSIS;
    return Math.floor(Math.random() * (MAX_PLANS - MIN_PLANS + 1)) + MIN_PLANS;
  },
} as const;

// 类型定义
export type AITradingAction = typeof AI_TRADING_CONFIG.MOCK_DATA.ACTIONS[number];
export type RiskLevel = 'low' | 'medium' | 'high';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// 默认导出
export default {
  AI_TRADING_CONFIG,
  RISK_LEVEL_CALCULATOR,
  MOCK_DATA_GENERATOR,
} as const;