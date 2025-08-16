// Natural Language Query Processor for RiverBit Trading Assistant
// Converts natural language trading questions into structured trading intents

import { getUnifiedPrice, getMarketStatus, type UnifiedPriceData } from '../unifiedPriceAPI';
import { isCryptoSymbol } from '../coinGeckoAPI';
import { positions, assetData } from '../../data/assetsData';

// Trading intent types
export type TradingIntent = 'buy' | 'sell' | 'analyze' | 'exit' | 'entry' | 'hold' | 'monitor';

// Timeframe options
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | 'immediate';

// Confidence levels
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Market sentiment
export type MarketSentiment = 'bullish' | 'bearish' | 'neutral' | 'volatile';

// Structured query result
export interface TradingQuery {
  originalText: string;
  symbol: string | null;
  intent: TradingIntent;
  timeframe: TimeFrame;
  confidence: ConfidenceLevel;
  sentiment: MarketSentiment;
  urgency: 'high' | 'medium' | 'low';
  context: {
    hasPosition: boolean;
    currentPrice?: number;
    marketStatus: 'open' | 'closed' | 'unknown';
    priceData?: UnifiedPriceData;
    userBalance?: number;
    positionSize?: string;
    positionPnL?: number;
  };
  suggestedActions: string[];
  riskFactors: string[];
  timestamp: number;
}

// Symbol extraction patterns
const SYMBOL_PATTERNS = [
  // Crypto patterns
  /\b(BTC|ETH|SOL|AVAX|LINK|ADA|DOT|MATIC|UNI|AAVE)(?:\/USDT)?\b/gi,
  // Stock patterns  
  /\b(AAPL|GOOGL|MSFT|TSLA|AMZN|NVDA|META)?\b/gi,
  // Generic patterns
  /\b([A-Z]{2,5})(?:\/USDT|\/USD)?\b/g
];

// Intent classification patterns
const INTENT_PATTERNS = {
  buy: [
    /\b(buy|purchase|long|bullish on|invest in|get into|accumulate)\b/i,
    /\bshould i buy\b/i,
    /\bgood time to buy\b/i,
    /\bentry point\b/i
  ],
  sell: [
    /\b(sell|short|bearish on|dump|liquidate|exit)\b/i,
    /\bshould i sell\b/i,
    /\bgood time to sell\b/i,
    /\btake profit\b/i
  ],
  analyze: [
    /\b(analyze|analysis|look|looking|check|how's|what's|opinion|thoughts)\b/i,
    /\bhow.+looking\b/i,
    /\bwhat.+think\b/i,
    /\bmarket analysis\b/i
  ],
  exit: [
    /\b(exit|close|stop loss|cut losses|get out)\b/i,
    /\bexit strategy\b/i,
    /\bwhen to exit\b/i
  ],
  entry: [
    /\b(entry|enter|good entry|best entry|entry point)\b/i,
    /\bwhen to enter\b/i,
    /\bgood time to enter\b/i
  ],
  hold: [
    /\b(hold|hodl|keep|maintain|stay)\b/i,
    /\bshould i hold\b/i
  ],
  monitor: [
    /\b(watch|monitor|keep an eye|track|observe)\b/i,
    /\bkeep watching\b/i
  ]
};

// Timeframe extraction patterns
const TIMEFRAME_PATTERNS = {
  '1m': /\b(1\s*min|one minute|immediate|now|right now)\b/i,
  '5m': /\b(5\s*min|five minute)\b/i,
  '15m': /\b(15\s*min|fifteen minute|quarter hour)\b/i,
  '1h': /\b(1\s*hour|one hour|hourly)\b/i,
  '4h': /\b(4\s*hour|four hour)\b/i,
  '1d': /\b(1\s*day|daily|today|this day)\b/i,
  '1w': /\b(1\s*week|weekly|this week)\b/i,
  'immediate': /\b(now|immediate|asap|urgent|quickly)\b/i
};

// Urgency indicators
const URGENCY_PATTERNS = {
  high: /\b(urgent|asap|immediately|now|quick|fast|emergency)\b/i,
  medium: /\b(soon|today|this session|short term)\b/i,
  low: /\b(eventual|long term|when possible|no rush)\b/i
};

// Sentiment indicators
const SENTIMENT_PATTERNS = {
  bullish: /\b(bullish|bull|up|pump|moon|rocket|green|positive|optimistic)\b/i,
  bearish: /\b(bearish|bear|down|dump|crash|red|negative|pessimistic)\b/i,
  volatile: /\b(volatile|crazy|wild|unpredictable|choppy|uncertain)\b/i,
  neutral: /\b(neutral|sideways|flat|stable|steady|uncertain)\b/i
};

// Extract symbol from text
function extractSymbol(text: string): string | null {
  for (const pattern of SYMBOL_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Clean up the symbol
      let symbol = matches[0].toUpperCase();
      symbol = symbol.replace(/\/USDT|\/USD/, '');
      
      // Validate it's a known symbol
      if (isCryptoSymbol(symbol) || ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'].includes(symbol)) {
        return symbol;
      }
    }
  }
  return null;
}

// Classify trading intent
function classifyIntent(text: string): TradingIntent {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return intent as TradingIntent;
      }
    }
  }
  
  // Default to analyze if no specific intent found
  return 'analyze';
}

// Extract timeframe
function extractTimeframe(text: string): TimeFrame {
  for (const [timeframe, pattern] of Object.entries(TIMEFRAME_PATTERNS)) {
    if (pattern.test(text)) {
      return timeframe as TimeFrame;
    }
  }
  
  // Default timeframe based on intent
  return '1h';
}

// Determine urgency
function determineUrgency(text: string, intent: TradingIntent): 'high' | 'medium' | 'low' {
  for (const [urgency, pattern] of Object.entries(URGENCY_PATTERNS)) {
    if (pattern.test(text)) {
      return urgency as 'high' | 'medium' | 'low';
    }
  }
  
  // Default urgency based on intent
  switch (intent) {
    case 'exit':
    case 'sell':
      return 'high';
    case 'buy':
    case 'entry':
      return 'medium';
    default:
      return 'low';
  }
}

// Determine sentiment
function determineSentiment(text: string): MarketSentiment {
  for (const [sentiment, pattern] of Object.entries(SENTIMENT_PATTERNS)) {
    if (pattern.test(text)) {
      return sentiment as MarketSentiment;
    }
  }
  return 'neutral';
}

// Calculate confidence based on various factors
function calculateConfidence(
  text: string, 
  symbol: string | null, 
  priceData: UnifiedPriceData | null,
  hasPosition: boolean
): ConfidenceLevel {
  let score = 0;
  
  // Symbol identification adds confidence
  if (symbol) score += 30;
  
  // Clear intent words add confidence
  const intentWords = ['buy', 'sell', 'exit', 'entry', 'analyze'];
  const hasIntentWord = intentWords.some(word => 
    new RegExp(`\\b${word}\\b`, 'i').test(text)
  );
  if (hasIntentWord) score += 25;
  
  // Recent price data adds confidence
  if (priceData && (Date.now() - priceData.lastUpdated) < 60000) {
    score += 20;
  }
  
  // Having position context adds confidence
  if (hasPosition) score += 15;
  
  // Text length and specificity
  if (text.length > 20) score += 10;
  
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// User context interface
interface UserContext {
  hasPosition: boolean;
  positionSize?: string;
  positionPnL?: number;
  userBalance: number;
}

// Get user context for symbol
function getUserContext(symbol: string): UserContext {
  const position = positions.find(pos => 
    pos.pair.startsWith(symbol) || pos.pair.includes(symbol)
  );
  
  const isolatedAsset = assetData.isolated.assets.find(asset => 
    asset.symbol === symbol
  );
  
  const crossAsset = assetData.cross.assets.find(asset => 
    asset.symbol === symbol
  );
  
  return {
    hasPosition: !!position,
    positionSize: position?.size,
    positionPnL: position?.pnl,
    userBalance: (isolatedAsset?.available || 0) + (crossAsset?.available || 0)
  };
}

// Generate suggested actions based on analysis
function generateSuggestedActions(
  intent: TradingIntent,
  symbol: string | null,
  priceData: UnifiedPriceData | null,
  context: any
): string[] {
  const actions: string[] = [];
  
  if (!symbol || !priceData) {
    actions.push('Specify a valid trading symbol');
    return actions;
  }
  
  switch (intent) {
    case 'buy':
    case 'entry':
      actions.push(`Check ${symbol} support levels for entry`);
      actions.push(`Analyze ${symbol} technical indicators`);
      actions.push(`Set stop-loss at 2-3% below entry`);
      if (priceData.change24h < -5) {
        actions.push('Consider dollar-cost averaging due to recent decline');
      }
      break;
      
    case 'sell':
    case 'exit':
      if (context.hasPosition) {
        actions.push(`Review ${symbol} resistance levels`);
        actions.push('Consider partial profit taking');
        actions.push('Set trailing stop-loss');
      } else {
        actions.push(`Monitor ${symbol} for short entry opportunities`);
      }
      break;
      
    case 'analyze':
      actions.push(`Review ${symbol} price action and volume`);
      actions.push(`Check ${symbol} news and fundamentals`);
      actions.push(`Analyze ${symbol} technical indicators (RSI, MACD, etc.)`);
      break;
      
    case 'hold':
      actions.push(`Monitor ${symbol} key support/resistance levels`);
      actions.push('Review position size and risk management');
      break;
      
    case 'monitor':
      actions.push(`Set price alerts for ${symbol}`);
      actions.push(`Track ${symbol} volume and momentum`);
      break;
  }
  
  return actions;
}

// Generate risk factors
function generateRiskFactors(
  intent: TradingIntent,
  symbol: string | null,
  priceData: UnifiedPriceData | null,
  marketStatus: string
): string[] {
  const risks: string[] = [];
  
  if (!symbol || !priceData) return risks;
  
  // Market status risks
  if (marketStatus === 'closed') {
    risks.push('Market is currently closed - limited liquidity');
  }
  
  // Volatility risks
  if (Math.abs(priceData.change24h) > 10) {
    risks.push('High volatility detected - increased risk');
  }
  
  // Volume risks
  const volumeNum = parseFloat(priceData.volume.replace(/[BMK]/g, ''));
  if (volumeNum < 1) {
    risks.push('Low trading volume - potential slippage');
  }
  
  // Intent-specific risks
  switch (intent) {
    case 'buy':
    case 'entry':
      if (priceData.change24h > 20) {
        risks.push('Price has pumped significantly - potential FOMO');
      }
      risks.push('Consider position sizing and stop-loss placement');
      break;
      
    case 'sell':
    case 'exit':
      if (priceData.change24h < -20) {
        risks.push('Price declining rapidly - consider partial exit');
      }
      break;
  }
  
  // Crypto-specific risks
  if (isCryptoSymbol(symbol)) {
    risks.push('Cryptocurrency markets are highly volatile');
    if (['BTC', 'ETH'].includes(symbol)) {
      risks.push('Major crypto - monitor for market-wide effects');
    }
  }
  
  return risks;
}

// Main NLQ processing function
export async function processNaturalLanguageQuery(text: string): Promise<TradingQuery> {
  const originalText = text.trim();
  const symbol = extractSymbol(text);
  const intent = classifyIntent(text);
  const timeframe = extractTimeframe(text);
  const urgency = determineUrgency(text, intent);
  const sentiment = determineSentiment(text);
  
  // Get market data if symbol is identified
  let priceData: UnifiedPriceData | null = null;
  let marketStatus: 'open' | 'closed' | 'unknown' = 'unknown';
  
  if (symbol) {
    try {
      priceData = await getUnifiedPrice(symbol);
      marketStatus = getMarketStatus(symbol);
    } catch (error) {
      console.warn(`Failed to get price data for ${symbol}:`, error);
    }
  }
  
  // Get user context
  const userContext = symbol ? getUserContext(symbol) : {
    hasPosition: false,
    userBalance: 0
  };
  
  // Calculate confidence
  const confidence = calculateConfidence(text, symbol, priceData, userContext.hasPosition);
  
  // Build context object
  const context = {
    hasPosition: userContext.hasPosition,
    currentPrice: priceData?.price,
    marketStatus,
    priceData: priceData || undefined,
    userBalance: userContext.userBalance,
    positionSize: userContext.positionSize,
    positionPnL: userContext.positionPnL
  };
  
  // Generate suggestions and risks
  const suggestedActions = generateSuggestedActions(intent, symbol, priceData, userContext);
  const riskFactors = generateRiskFactors(intent, symbol, priceData, marketStatus);
  
  return {
    originalText,
    symbol,
    intent,
    timeframe,
    confidence,
    sentiment,
    urgency,
    context,
    suggestedActions,
    riskFactors,
    timestamp: Date.now()
  };
}

// Utility function to format query result for display
export function formatQueryResult(query: TradingQuery): string {
  const lines: string[] = [];
  
  lines.push(`📊 Trading Query Analysis`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Original: "${query.originalText}"`);
  lines.push('');
  
  if (query.symbol) {
    lines.push(`🎯 Symbol: ${query.symbol}`);
    if (query.context.currentPrice) {
      lines.push(`💰 Current Price: $${query.context.currentPrice.toLocaleString()}`);
    }
    lines.push(`📈 Market Status: ${query.context.marketStatus}`);
  }
  
  lines.push(`🎬 Intent: ${query.intent.toUpperCase()}`);
  lines.push(`⏰ Timeframe: ${query.timeframe}`);
  lines.push(`🎯 Confidence: ${query.confidence.toUpperCase()}`);
  lines.push(`📊 Sentiment: ${query.sentiment}`);
  lines.push(`🚨 Urgency: ${query.urgency.toUpperCase()}`);
  
  if (query.context.hasPosition) {
    lines.push('');
    lines.push(`💼 Position Context:`);
    if (query.context.positionSize) {
      lines.push(`   Size: ${query.context.positionSize}`);
    }
    if (query.context.positionPnL) {
      lines.push(`   PnL: $${query.context.positionPnL.toLocaleString()}`);
    }
  }
  
  if (query.suggestedActions.length > 0) {
    lines.push('');
    lines.push(`💡 Suggested Actions:`);
    query.suggestedActions.forEach(action => {
      lines.push(`   • ${action}`);
    });
  }
  
  if (query.riskFactors.length > 0) {
    lines.push('');
    lines.push(`⚠️ Risk Factors:`);
    query.riskFactors.forEach(risk => {
      lines.push(`   • ${risk}`);
    });
  }
  
  return lines.join('\n');
}

// Export types for use by other modules
export type { 
  TradingQuery as ITradingQuery, 
  TradingIntent as ITradingIntent, 
  TimeFrame as ITimeFrame, 
  ConfidenceLevel as IConfidenceLevel, 
  MarketSentiment as IMarketSentiment 
};