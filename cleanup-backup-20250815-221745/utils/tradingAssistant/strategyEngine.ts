// RiverBit Trading Assistant - Core Strategy Engine
// Generates rule-based trading plans using technical analysis

import { UnifiedPriceData, getUnifiedPrice, getBatchUnifiedPrices } from '../unifiedPriceAPI';
import { RISK_THRESHOLDS, POSITION_SIDES } from '../../constants/riverPoolConstants';
import { DEFAULT_PARAMS } from '../contractConfig';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PriceBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma: number[];     // Simple Moving Average
  ema: number[];     // Exponential Moving Average
  rsi: number[];     // Relative Strength Index
  atr: number[];     // Average True Range
  volume: number[];  // Volume data
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

export interface MarketRegime {
  type: 'trending' | 'ranging' | 'volatile';
  strength: number; // 0-100
  direction: 'bullish' | 'bearish' | 'neutral';
  volatility: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
}

export interface TradingSignal {
  type: 'entry' | 'exit' | 'stop_loss' | 'take_profit';
  direction: 'long' | 'short';
  strength: number; // 0-100
  price: number;
  timestamp: number;
  reason: string;
  indicators: Record<string, number>;
}

export interface RiskParameters {
  maxLeverage: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxPositionSize: number;
  accountRiskPercent: number; // % of account to risk per trade
}

export interface TradingPlan {
  symbol: string;
  strategy: string;
  signal: TradingSignal;
  entry: {
    price: number;
    type: 'market' | 'limit';
    conditions: string[];
  };
  stopLoss: {
    price: number;
    percent: number;
  };
  takeProfit: {
    price: number;
    percent: number;
    targets: { price: number; percent: number }[];
  };
  positionSizing: {
    notionalSize: number;
    leverage: number;
    margin: number;
    riskAmount: number;
  };
  marketRegime: MarketRegime;
  riskReward: number;
  confidence: number;
  timeframe: string;
  expiryTime?: number;
  notes: string[];
}

export interface StrategyConfig {
  enabled: boolean;
  timeframes: string[];
  minConfidence: number;
  riskParams: RiskParameters;
  indicators: {
    periods: Record<string, number>;
    thresholds: Record<string, number>;
  };
}

// ============================================================================
// TECHNICAL INDICATORS IMPLEMENTATION
// ============================================================================

export class TechnicalAnalysis {
  
  // Simple Moving Average
  static calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  // Exponential Moving Average
  static calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    if (prices.length === 0) return ema;
    
    // First EMA is just the first price
    ema[0] = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  }

  // Relative Strength Index
  static calculateRSI(prices: number[], period: number = 14): number[] {
    if (prices.length < period + 1) return [];
    
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // Calculate gains and losses
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // Calculate RSI for each period
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      const rs = avgGain / (avgLoss || 0.0001); // Avoid division by zero
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(rsiValue);
    }
    
    return rsi;
  }

  // Average True Range
  static calculateATR(bars: PriceBar[], period: number = 14): number[] {
    if (bars.length < 2) return [];
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < bars.length; i++) {
      const high = bars[i].high;
      const low = bars[i].low;
      const prevClose = bars[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    return this.calculateSMA(trueRanges, period);
  }

  // Bollinger Bands
  static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
    const sma = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < sma.length; i++) {
      const priceSlice = prices.slice(i, i + period);
      const mean = sma[i];
      const variance = priceSlice.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / period;
      const standardDev = Math.sqrt(variance);
      
      upper.push(mean + (standardDev * stdDev));
      lower.push(mean - (standardDev * stdDev));
    }
    
    return {
      upper,
      middle: sma,
      lower
    };
  }

  // Volume analysis
  static analyzeVolume(bars: PriceBar[], period: number = 20): {
    avgVolume: number[];
    volumeRatio: number[];
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    const volumes = bars.map(bar => bar.volume);
    const avgVolume = this.calculateSMA(volumes, period);
    const volumeRatio: number[] = [];
    
    for (let i = period - 1; i < volumes.length; i++) {
      const currentVol = volumes[i];
      const avgVol = avgVolume[i - period + 1];
      volumeRatio.push(currentVol / avgVol);
    }
    
    // Determine volume trend
    const recentRatios = volumeRatio.slice(-5);
    const avgRecentRatio = recentRatios.reduce((a, b) => a + b, 0) / recentRatios.length;
    
    let volumeTrend: 'increasing' | 'decreasing' | 'stable';
    if (avgRecentRatio > 1.2) volumeTrend = 'increasing';
    else if (avgRecentRatio < 0.8) volumeTrend = 'decreasing';
    else volumeTrend = 'stable';
    
    return { avgVolume, volumeRatio, volumeTrend };
  }
}

// ============================================================================
// MARKET REGIME DETECTION
// ============================================================================

export class MarketRegimeDetector {
  
  static analyzeMarketRegime(bars: PriceBar[], indicators: TechnicalIndicators): MarketRegime {
    const prices = bars.map(bar => bar.close);
    const sma20 = indicators.sma;
    const atr = indicators.atr;
    
    // Trend strength analysis
    const trendStrength = this.calculateTrendStrength(prices, sma20);
    const volatility = this.calculateVolatility(atr, prices);
    const direction = this.determineDirection(prices, sma20);
    
    // Determine regime type
    let type: 'trending' | 'ranging' | 'volatile';
    if (volatility === 'high') {
      type = 'volatile';
    } else if (trendStrength > 60) {
      type = 'trending';
    } else {
      type = 'ranging';
    }
    
    // Calculate confidence
    const confidence = this.calculateRegimeConfidence(trendStrength, volatility, bars);
    
    return {
      type,
      strength: trendStrength,
      direction,
      volatility,
      confidence
    };
  }

  private static calculateTrendStrength(prices: number[], sma: number[]): number {
    if (prices.length < 20 || sma.length === 0) return 0;
    
    const recentPrices = prices.slice(-20);
    const recentSMA = sma.slice(-1)[0];
    
    // Count how many recent prices are above/below SMA consistently
    let consistentDirection = 0;
    const isAboveSMA = recentPrices[recentPrices.length - 1] > recentSMA;
    
    for (let i = recentPrices.length - 1; i >= 0; i--) {
      if ((recentPrices[i] > recentSMA) === isAboveSMA) {
        consistentDirection++;
      } else {
        break;
      }
    }
    
    return Math.min(100, (consistentDirection / 20) * 100);
  }

  private static calculateVolatility(atr: number[], prices: number[]): 'low' | 'medium' | 'high' {
    if (atr.length === 0 || prices.length === 0) return 'medium';
    
    const currentATR = atr[atr.length - 1];
    const currentPrice = prices[prices.length - 1];
    const atrPercentage = (currentATR / currentPrice) * 100;
    
    if (atrPercentage > 3) return 'high';
    if (atrPercentage < 1) return 'low';
    return 'medium';
  }

  private static determineDirection(prices: number[], sma: number[]): 'bullish' | 'bearish' | 'neutral' {
    if (prices.length === 0 || sma.length === 0) return 'neutral';
    
    const currentPrice = prices[prices.length - 1];
    const currentSMA = sma[sma.length - 1];
    const priceChange = prices.length > 1 ? ((currentPrice - prices[prices.length - 2]) / prices[prices.length - 2]) * 100 : 0;
    
    if (currentPrice > currentSMA && priceChange > 0.1) return 'bullish';
    if (currentPrice < currentSMA && priceChange < -0.1) return 'bearish';
    return 'neutral';
  }

  private static calculateRegimeConfidence(trendStrength: number, volatility: 'low' | 'medium' | 'high', bars: PriceBar[]): number {
    let confidence = 50;
    
    // Higher confidence for strong trends
    if (trendStrength > 70) confidence += 20;
    else if (trendStrength > 50) confidence += 10;
    
    // Adjust for volatility
    if (volatility === 'low') confidence += 15;
    else if (volatility === 'high') confidence -= 10;
    
    // Volume confirmation
    if (bars.length > 5) {
      const recentVolumes = bars.slice(-5).map(bar => bar.volume);
      const avgRecentVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
      const olderVolumes = bars.slice(-20, -5).map(bar => bar.volume);
      const avgOlderVolume = olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length;
      
      if (avgRecentVolume > avgOlderVolume * 1.2) confidence += 10;
    }
    
    return Math.min(100, Math.max(0, confidence));
  }
}

// ============================================================================
// TRADING STRATEGIES
// ============================================================================

export class TradingStrategies {
  
  // Trend Breakout Strategy
  static trendBreakoutStrategy(
    bars: PriceBar[], 
    indicators: TechnicalIndicators, 
    regime: MarketRegime,
    config: StrategyConfig
  ): TradingSignal | null {
    
    if (!config.enabled || regime.type === 'ranging') return null;
    
    const currentPrice = bars[bars.length - 1].close;
    const sma20 = indicators.sma[indicators.sma.length - 1];
    const ema12 = indicators.ema[indicators.ema.length - 1];
    const volume = bars[bars.length - 1].volume;
    const avgVolume = indicators.volume[indicators.volume.length - 1];
    const volumeConfirmation = volume > avgVolume * 1.5;
    
    // MA crossover with volume confirmation
    const bullishCross = ema12 > sma20 && currentPrice > sma20 && volumeConfirmation;
    const bearishCross = ema12 < sma20 && currentPrice < sma20 && volumeConfirmation;
    
    if (bullishCross && regime.direction === 'bullish') {
      return {
        type: 'entry',
        direction: 'long',
        strength: Math.min(90, regime.strength + (volumeConfirmation ? 15 : 0)),
        price: currentPrice,
        timestamp: Date.now(),
        reason: 'Bullish MA crossover with volume confirmation in trending market',
        indicators: {
          sma20,
          ema12,
          volume: volume / avgVolume,
          trendStrength: regime.strength
        }
      };
    }
    
    if (bearishCross && regime.direction === 'bearish') {
      return {
        type: 'entry',
        direction: 'short',
        strength: Math.min(90, regime.strength + (volumeConfirmation ? 15 : 0)),
        price: currentPrice,
        timestamp: Date.now(),
        reason: 'Bearish MA crossover with volume confirmation in trending market',
        indicators: {
          sma20,
          ema12,
          volume: volume / avgVolume,
          trendStrength: regime.strength
        }
      };
    }
    
    return null;
  }

  // Support/Resistance Bounce Strategy
  static supportResistanceBounceStrategy(
    bars: PriceBar[], 
    indicators: TechnicalIndicators, 
    regime: MarketRegime,
    config: StrategyConfig
  ): TradingSignal | null {
    
    if (!config.enabled) return null;
    
    const currentPrice = bars[bars.length - 1].close;
    const rsi = indicators.rsi[indicators.rsi.length - 1];
    const bbUpper = indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1];
    const bbLower = indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1];
    const bbMiddle = indicators.bollingerBands.middle[indicators.bollingerBands.middle.length - 1];
    
    // Support bounce (oversold + price near lower BB)
    const nearLowerBB = currentPrice <= bbLower * 1.02;
    const oversold = rsi < 30;
    const supportBounce = nearLowerBB && oversold;
    
    // Resistance rejection (overbought + price near upper BB)
    const nearUpperBB = currentPrice >= bbUpper * 0.98;
    const overbought = rsi > 70;
    const resistanceRejection = nearUpperBB && overbought;
    
    if (supportBounce) {
      return {
        type: 'entry',
        direction: 'long',
        strength: Math.min(85, 70 + ((30 - rsi) * 0.5)),
        price: currentPrice,
        timestamp: Date.now(),
        reason: 'Support bounce: oversold RSI + price at lower Bollinger Band',
        indicators: {
          rsi,
          bbLower,
          distanceFromBB: ((currentPrice - bbLower) / bbLower) * 100
        }
      };
    }
    
    if (resistanceRejection) {
      return {
        type: 'entry',
        direction: 'short',
        strength: Math.min(85, 70 + ((rsi - 70) * 0.5)),
        price: currentPrice,
        timestamp: Date.now(),
        reason: 'Resistance rejection: overbought RSI + price at upper Bollinger Band',
        indicators: {
          rsi,
          bbUpper,
          distanceFromBB: ((bbUpper - currentPrice) / bbUpper) * 100
        }
      };
    }
    
    return null;
  }

  // Momentum Continuation Strategy
  static momentumContinuationStrategy(
    bars: PriceBar[], 
    indicators: TechnicalIndicators, 
    regime: MarketRegime,
    config: StrategyConfig
  ): TradingSignal | null {
    
    if (!config.enabled || regime.type !== 'trending' || regime.strength < 60) return null;
    
    const currentPrice = bars[bars.length - 1].close;
    const sma20 = indicators.sma[indicators.sma.length - 1];
    const rsi = indicators.rsi[indicators.rsi.length - 1];
    const atr = indicators.atr[indicators.atr.length - 1];
    
    // Look for pullback in strong trend
    const isInUptrend = currentPrice > sma20 && regime.direction === 'bullish';
    const isInDowntrend = currentPrice < sma20 && regime.direction === 'bearish';
    
    // Pullback conditions
    const bullishPullback = isInUptrend && rsi < 55 && rsi > 40 && currentPrice > sma20 * 0.98;
    const bearishPullback = isInDowntrend && rsi > 45 && rsi < 60 && currentPrice < sma20 * 1.02;
    
    if (bullishPullback) {
      return {
        type: 'entry',
        direction: 'long',
        strength: Math.min(80, regime.strength * 0.9),
        price: currentPrice,
        timestamp: Date.now(),
        reason: 'Momentum continuation: pullback in strong uptrend',
        indicators: {
          sma20,
          rsi,
          trendStrength: regime.strength,
          pullbackLevel: ((sma20 - currentPrice) / sma20) * 100
        }
      };
    }
    
    if (bearishPullback) {
      return {
        type: 'entry',
        direction: 'short',
        strength: Math.min(80, regime.strength * 0.9),
        price: currentPrice,
        timestamp: Date.now(),
        reason: 'Momentum continuation: pullback in strong downtrend',
        indicators: {
          sma20,
          rsi,
          trendStrength: regime.strength,
          pullbackLevel: ((currentPrice - sma20) / sma20) * 100
        }
      };
    }
    
    return null;
  }
}

// ============================================================================
// POSITION SIZING & RISK MANAGEMENT
// ============================================================================

export class PositionSizingCalculator {
  
  static calculatePositionSize(
    signal: TradingSignal,
    accountBalance: number,
    riskParams: RiskParameters,
    currentPrice: number,
    atr: number
  ): {
    notionalSize: number;
    leverage: number;
    margin: number;
    riskAmount: number;
    stopLossDistance: number;
  } {
    
    // Calculate risk amount (% of account)
    const riskAmount = accountBalance * (riskParams.accountRiskPercent / 100);
    
    // Calculate stop loss distance based on ATR and risk parameters
    const atrMultiplier = riskParams.stopLossPercent / 100;
    const stopLossDistance = Math.max(atr * 2, currentPrice * atrMultiplier);
    
    // Calculate position size based on risk
    const dollarRiskPerUnit = stopLossDistance;
    const baseNotionalSize = riskAmount / dollarRiskPerUnit;
    
    // Apply maximum position size constraint
    const maxNotionalFromAccount = accountBalance * (riskParams.maxPositionSize / 100);
    const notionalSize = Math.min(baseNotionalSize, maxNotionalFromAccount);
    
    // Calculate optimal leverage (but not exceeding max)
    const requiredMargin = notionalSize * 0.01; // Minimum 1% margin
    const optimalLeverage = Math.min(
      notionalSize / requiredMargin,
      riskParams.maxLeverage
    );
    
    const margin = notionalSize / optimalLeverage;
    
    return {
      notionalSize,
      leverage: optimalLeverage,
      margin,
      riskAmount,
      stopLossDistance
    };
  }
  
  static calculateStopLossAndTakeProfit(
    signal: TradingSignal,
    currentPrice: number,
    atr: number,
    riskParams: RiskParameters
  ): {
    stopLoss: { price: number; percent: number };
    takeProfit: { price: number; percent: number; targets: { price: number; percent: number }[] };
  } {
    
    const stopLossPercent = riskParams.stopLossPercent;
    const takeProfitPercent = riskParams.takeProfitPercent;
    
    let stopLossPrice: number;
    let takeProfitPrice: number;
    
    if (signal.direction === 'long') {
      stopLossPrice = currentPrice * (1 - stopLossPercent / 100);
      takeProfitPrice = currentPrice * (1 + takeProfitPercent / 100);
    } else {
      stopLossPrice = currentPrice * (1 + stopLossPercent / 100);
      takeProfitPrice = currentPrice * (1 - takeProfitPercent / 100);
    }
    
    // Multiple take profit targets
    const targets = [];
    const targetPercentages = [0.5, 1.0, 1.5]; // 50%, 100%, 150% of initial target
    
    for (const multiplier of targetPercentages) {
      const targetPercent = takeProfitPercent * multiplier;
      let targetPrice: number;
      
      if (signal.direction === 'long') {
        targetPrice = currentPrice * (1 + targetPercent / 100);
      } else {
        targetPrice = currentPrice * (1 - targetPercent / 100);
      }
      
      targets.push({
        price: targetPrice,
        percent: targetPercent
      });
    }
    
    return {
      stopLoss: {
        price: stopLossPrice,
        percent: stopLossPercent
      },
      takeProfit: {
        price: takeProfitPrice,
        percent: takeProfitPercent,
        targets
      }
    };
  }
}

// ============================================================================
// MAIN STRATEGY ENGINE
// ============================================================================

export class StrategyEngine {
  private config: Map<string, StrategyConfig> = new Map();
  
  constructor() {
    this.initializeDefaultConfigs();
  }
  
  private initializeDefaultConfigs() {
    // Default configuration for different strategies
    const defaultRiskParams: RiskParameters = {
      maxLeverage: DEFAULT_PARAMS.maxLeverage.crypto,
      stopLossPercent: 2.0,
      takeProfitPercent: 4.0,
      maxPositionSize: 10.0, // 10% of account
      accountRiskPercent: 1.0 // 1% risk per trade
    };
    
    this.config.set('trend_breakout', {
      enabled: true,
      timeframes: ['4h', '1d'],
      minConfidence: 70,
      riskParams: defaultRiskParams,
      indicators: {
        periods: { sma: 20, ema: 12, rsi: 14, atr: 14 },
        thresholds: { volumeMultiplier: 1.5, trendStrength: 60 }
      }
    });
    
    this.config.set('support_resistance', {
      enabled: true,
      timeframes: ['1h', '4h'],
      minConfidence: 65,
      riskParams: { ...defaultRiskParams, stopLossPercent: 1.5 },
      indicators: {
        periods: { bb: 20, rsi: 14 },
        thresholds: { rsiOversold: 30, rsiOverbought: 70 }
      }
    });
    
    this.config.set('momentum_continuation', {
      enabled: true,
      timeframes: ['1h', '4h'],
      minConfidence: 75,
      riskParams: defaultRiskParams,
      indicators: {
        periods: { sma: 20, rsi: 14, atr: 14 },
        thresholds: { minTrendStrength: 60, pullbackRSI: [40, 60] }
      }
    });
  }
  
  // Generate mock price bars for demonstration (in real implementation, this would come from price data)
  private generateMockPriceBars(currentPrice: number, count: number = 50): PriceBar[] {
    const bars: PriceBar[] = [];
    let price = currentPrice * 0.95; // Start 5% below current price
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% random change
      const open = price;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = 100000 + Math.random() * 200000;
      
      bars.push({
        timestamp: Date.now() - (count - i) * 3600000, // 1 hour intervals
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    return bars;
  }
  
  // Main method to generate trading plan
  async generateTradingPlan(
    symbol: string, 
    accountBalance: number,
    timeframe: string = '4h'
  ): Promise<TradingPlan | null> {
    
    try {
      // Get current price data
      const priceData = await getUnifiedPrice(symbol);
      if (!priceData) {
        throw new Error(`Unable to fetch price data for ${symbol}`);
      }
      
      // Generate historical price bars (in real implementation, fetch from data source)
      const bars = this.generateMockPriceBars(priceData.price);
      const prices = bars.map(bar => bar.close);
      
      // Calculate technical indicators
      const indicators: TechnicalIndicators = {
        sma: TechnicalAnalysis.calculateSMA(prices, 20),
        ema: TechnicalAnalysis.calculateEMA(prices, 12),
        rsi: TechnicalAnalysis.calculateRSI(prices, 14),
        atr: TechnicalAnalysis.calculateATR(bars, 14),
        volume: bars.map(bar => bar.volume),
        bollingerBands: TechnicalAnalysis.calculateBollingerBands(prices, 20, 2)
      };
      
      // Analyze market regime
      const marketRegime = MarketRegimeDetector.analyzeMarketRegime(bars, indicators);
      
      // Try each strategy and pick the best signal
      const strategies = [
        { name: 'trend_breakout', func: TradingStrategies.trendBreakoutStrategy },
        { name: 'support_resistance', func: TradingStrategies.supportResistanceBounceStrategy },
        { name: 'momentum_continuation', func: TradingStrategies.momentumContinuationStrategy }
      ];
      
      let bestSignal: TradingSignal | null = null;
      let bestStrategy = '';
      
      for (const strategy of strategies) {
        const config = this.config.get(strategy.name);
        if (!config || !config.enabled) continue;
        
        const signal = strategy.func(bars, indicators, marketRegime, config);
        if (signal && signal.strength >= config.minConfidence) {
          if (!bestSignal || signal.strength > bestSignal.strength) {
            bestSignal = signal;
            bestStrategy = strategy.name;
          }
        }
      }
      
      if (!bestSignal) {
        return null; // No valid signals found
      }
      
      // Calculate position sizing and risk management
      const config = this.config.get(bestStrategy)!;
      const currentATR = indicators.atr[indicators.atr.length - 1] || priceData.price * 0.02;
      
      const positionSizing = PositionSizingCalculator.calculatePositionSize(
        bestSignal,
        accountBalance,
        config.riskParams,
        priceData.price,
        currentATR
      );
      
      const { stopLoss, takeProfit } = PositionSizingCalculator.calculateStopLossAndTakeProfit(
        bestSignal,
        priceData.price,
        currentATR,
        config.riskParams
      );
      
      // Calculate risk-reward ratio
      const riskAmount = Math.abs(priceData.price - stopLoss.price);
      const rewardAmount = Math.abs(takeProfit.price - priceData.price);
      const riskReward = rewardAmount / riskAmount;
      
      // Generate trading plan
      const tradingPlan: TradingPlan = {
        symbol,
        strategy: bestStrategy,
        signal: bestSignal,
        entry: {
          price: priceData.price,
          type: 'market',
          conditions: [
            bestSignal.reason,
            `Market regime: ${marketRegime.type} (${marketRegime.direction})`,
            `Signal strength: ${bestSignal.strength.toFixed(1)}%`
          ]
        },
        stopLoss,
        takeProfit,
        positionSizing: {
          notionalSize: positionSizing.notionalSize,
          leverage: positionSizing.leverage,
          margin: positionSizing.margin,
          riskAmount: positionSizing.riskAmount
        },
        marketRegime,
        riskReward,
        confidence: bestSignal.strength,
        timeframe,
        expiryTime: Date.now() + (4 * 3600000), // 4 hours
        notes: [
          `Generated at ${new Date().toISOString()}`,
          `Market volatility: ${marketRegime.volatility}`,
          `Trend strength: ${marketRegime.strength.toFixed(1)}%`,
          `Risk per trade: ${config.riskParams.accountRiskPercent}% of account`,
          `Expected max loss: $${positionSizing.riskAmount.toFixed(2)}`
        ]
      };
      
      return tradingPlan;
      
    } catch (error) {
      console.error(`Error generating trading plan for ${symbol}:`, error);
      return null;
    }
  }
  
  // Update strategy configuration
  updateStrategyConfig(strategyName: string, config: Partial<StrategyConfig>) {
    const existing = this.config.get(strategyName);
    if (existing) {
      this.config.set(strategyName, { ...existing, ...config });
    }
  }
  
  // Get strategy configuration
  getStrategyConfig(strategyName: string): StrategyConfig | undefined {
    return this.config.get(strategyName);
  }
  
  // List all available strategies
  getAvailableStrategies(): string[] {
    return Array.from(this.config.keys());
  }
  
  // Validate trading plan against risk parameters
  validateTradingPlan(plan: TradingPlan, accountBalance: number): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check account balance
    if (plan.positionSizing.margin > accountBalance) {
      errors.push('Insufficient account balance for required margin');
    }
    
    // Check leverage limits
    const maxLeverage = plan.symbol.startsWith('x') ? 
      DEFAULT_PARAMS.maxLeverage.xStock : 
      DEFAULT_PARAMS.maxLeverage.crypto;
      
    if (plan.positionSizing.leverage > maxLeverage) {
      errors.push(`Leverage ${plan.positionSizing.leverage.toFixed(1)}x exceeds maximum ${maxLeverage}x for ${plan.symbol}`);
    }
    
    // Check risk-reward ratio
    if (plan.riskReward < 1.5) {
      warnings.push(`Low risk-reward ratio: ${plan.riskReward.toFixed(2)}. Consider waiting for better setup.`);
    }
    
    // Check confidence level
    if (plan.confidence < 70) {
      warnings.push(`Low confidence signal: ${plan.confidence.toFixed(1)}%. Consider reducing position size.`);
    }
    
    // Check market conditions
    if (plan.marketRegime.volatility === 'high') {
      warnings.push('High market volatility detected. Consider reducing position size or tighter stops.');
    }
    
    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const strategyEngine = new StrategyEngine();

// Classes are already exported with their declarations above