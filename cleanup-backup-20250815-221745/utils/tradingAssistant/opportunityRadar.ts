// RiverBit Opportunity Radar - Proactive Market Scanning & Alert System
// Continuously scans markets for trading opportunities and pushes real-time alerts

import { 
  getUnifiedPrice, 
  getBatchUnifiedPrices, 
  UnifiedPriceData, 
  UnifiedPriceWebSocket 
} from '../unifiedPriceAPI';
import { 
  strategyEngine, 
  TradingPlan, 
  TechnicalAnalysis, 
  MarketRegimeDetector,
  TradingStrategies,
  type PriceBar,
  type TechnicalIndicators,
  type MarketRegime,
  type TradingSignal 
} from './strategyEngine';
import { DEFAULT_PARAMS } from '../contractConfig';
import { toast } from 'sonner';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface OpportunityAlert {
  id: string;
  symbol: string;
  type: 'breakout' | 'reversal' | 'momentum' | 'news_spike' | 'volume_spike';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  message: string;
  details: {
    currentPrice: number;
    priceChange: number;
    volume: string;
    signals: string[];
    timeframe: string;
    targetPrice?: number;
    stopLoss?: number;
    riskReward?: number;
  };
  timestamp: number;
  expiresAt: number;
}

export interface UserPreferences {
  enabledSymbols: string[];
  enabledStrategies: string[];
  minConfidence: number; // 0-100
  maxAlerts: number; // per hour
  notificationMethods: ('browser' | 'toast' | 'sound')[];
  timeframes: string[];
  tradingHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
  };
  filters: {
    minVolume: number;
    minPriceChange: number;
    maxPriceChange: number;
    riskTolerance: 'low' | 'medium' | 'high';
  };
}

export interface MarketSnapshot {
  symbol: string;
  priceHistory: PriceBar[];
  indicators: TechnicalIndicators;
  regime: MarketRegime;
  volume24h: number;
  priceChange24h: number;
  lastUpdate: number;
}

export interface OpportunityRadarConfig {
  scanInterval: number; // milliseconds
  maxHistoryLength: number;
  enableRealTimeScanning: boolean;
  enableBackgroundScanning: boolean;
  alertCooldown: number; // milliseconds between same-symbol alerts
}

// ============================================================================
// OPPORTUNITY DETECTION STRATEGIES
// ============================================================================

export class OpportunityDetector {
  
  // Detect breakout opportunities
  static detectBreakouts(
    snapshot: MarketSnapshot, 
    currentPrice: UnifiedPriceData
  ): OpportunityAlert | null {
    
    const { priceHistory, indicators, regime } = snapshot;
    if (priceHistory.length < 20 || indicators.sma.length === 0) return null;
    
    const sma20 = indicators.sma[indicators.sma.length - 1];
    const volume = parseFloat(currentPrice.volume);
    const avgVolume = indicators.volume.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumeRatio = volume / avgVolume;
    
    // Breakout conditions
    const priceAboveResistance = currentPrice.price > sma20 * 1.02;
    const volumeConfirmation = volumeRatio > 1.5;
    const strongTrend = regime.strength > 70;
    
    if (priceAboveResistance && volumeConfirmation && strongTrend) {
      const confidence = Math.min(95, 
        (regime.strength * 0.4) + 
        (Math.min(volumeRatio, 3) * 20) + 
        (regime.confidence * 0.3)
      );
      
      if (confidence >= 75) {
        return {
          id: `breakout_${currentPrice.symbol}_${Date.now()}`,
          symbol: currentPrice.symbol,
          type: 'breakout',
          priority: confidence > 85 ? 'high' : 'medium',
          confidence,
          message: `🚀 ${currentPrice.symbol} breakout detected! Price above resistance with ${volumeRatio.toFixed(1)}x volume`,
          details: {
            currentPrice: currentPrice.price,
            priceChange: currentPrice.change24h,
            volume: currentPrice.volume,
            signals: [
              `Price above SMA20 (${sma20.toFixed(2)})`,
              `Volume spike: ${volumeRatio.toFixed(1)}x average`,
              `Trend strength: ${regime.strength.toFixed(1)}%`,
              `Market regime: ${regime.type} ${regime.direction}`
            ],
            timeframe: '1h',
            targetPrice: currentPrice.price * 1.03,
            stopLoss: sma20,
            riskReward: 2.0
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + (2 * 3600000) // 2 hours
        };
      }
    }
    
    return null;
  }
  
  // Detect reversal opportunities  
  static detectReversals(
    snapshot: MarketSnapshot,
    currentPrice: UnifiedPriceData
  ): OpportunityAlert | null {
    
    const { indicators, regime } = snapshot;
    if (indicators.rsi.length === 0 || indicators.bollingerBands.lower.length === 0) return null;
    
    const rsi = indicators.rsi[indicators.rsi.length - 1];
    const bbLower = indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1];
    const bbUpper = indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1];
    
    // Oversold bounce opportunity
    const oversoldBounce = rsi < 30 && currentPrice.price <= bbLower * 1.01;
    // Overbought rejection opportunity  
    const overboughtRejection = rsi > 70 && currentPrice.price >= bbUpper * 0.99;
    
    if (oversoldBounce || overboughtRejection) {
      const isOversold = oversoldBounce;
      const confidence = Math.min(90, 
        60 + 
        (isOversold ? (30 - rsi) : (rsi - 70)) + 
        (regime.confidence * 0.2)
      );
      
      if (confidence >= 65) {
        return {
          id: `reversal_${currentPrice.symbol}_${Date.now()}`,
          symbol: currentPrice.symbol,
          type: 'reversal',
          priority: confidence > 80 ? 'high' : 'medium',
          confidence,
          message: `🔄 ${currentPrice.symbol} ${isOversold ? 'oversold bounce' : 'overbought rejection'} setup detected`,
          details: {
            currentPrice: currentPrice.price,
            priceChange: currentPrice.change24h,
            volume: currentPrice.volume,
            signals: [
              `RSI: ${rsi.toFixed(1)} (${isOversold ? 'oversold' : 'overbought'})`,
              `Price at ${isOversold ? 'lower' : 'upper'} Bollinger Band`,
              `Market volatility: ${regime.volatility}`,
              `Reversal probability: ${confidence.toFixed(1)}%`
            ],
            timeframe: '1h',
            targetPrice: isOversold ? currentPrice.price * 1.02 : currentPrice.price * 0.98,
            stopLoss: isOversold ? bbLower * 0.99 : bbUpper * 1.01,
            riskReward: 1.8
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + (4 * 3600000) // 4 hours
        };
      }
    }
    
    return null;
  }
  
  // Detect momentum continuation opportunities
  static detectMomentum(
    snapshot: MarketSnapshot,
    currentPrice: UnifiedPriceData
  ): OpportunityAlert | null {
    
    const { regime, indicators } = snapshot;
    if (regime.type !== 'trending' || regime.strength < 60) return null;
    
    const sma20 = indicators.sma[indicators.sma.length - 1];
    const rsi = indicators.rsi[indicators.rsi.length - 1];
    
    // Look for pullback in strong trend
    const isUptrend = regime.direction === 'bullish' && currentPrice.price > sma20;
    const isDowntrend = regime.direction === 'bearish' && currentPrice.price < sma20;
    
    const bullishPullback = isUptrend && rsi < 55 && rsi > 40 && currentPrice.price > sma20 * 0.98;
    const bearishPullback = isDowntrend && rsi > 45 && rsi < 60 && currentPrice.price < sma20 * 1.02;
    
    if (bullishPullback || bearishPullback) {
      const confidence = Math.min(85, regime.strength * 0.8 + 15);
      
      if (confidence >= 70) {
        return {
          id: `momentum_${currentPrice.symbol}_${Date.now()}`,
          symbol: currentPrice.symbol,
          type: 'momentum',
          priority: confidence > 80 ? 'high' : 'medium',
          confidence,
          message: `⚡ ${currentPrice.symbol} momentum continuation setup - ${bullishPullback ? 'bullish' : 'bearish'} pullback`,
          details: {
            currentPrice: currentPrice.price,
            priceChange: currentPrice.change24h,
            volume: currentPrice.volume,
            signals: [
              `Strong ${regime.direction} trend (${regime.strength.toFixed(1)}%)`,
              `Healthy pullback: RSI ${rsi.toFixed(1)}`,
              `Price above/below SMA20: ${sma20.toFixed(2)}`,
              `Momentum continuation probability: ${confidence.toFixed(1)}%`
            ],
            timeframe: '4h',
            targetPrice: bullishPullback ? currentPrice.price * 1.025 : currentPrice.price * 0.975,
            stopLoss: bullishPullback ? sma20 * 0.98 : sma20 * 1.02,
            riskReward: 2.2
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + (6 * 3600000) // 6 hours
        };
      }
    }
    
    return null;
  }
  
  // Detect volume/news spikes
  static detectVolumeSpikes(
    snapshot: MarketSnapshot,
    currentPrice: UnifiedPriceData
  ): OpportunityAlert | null {
    
    const { indicators } = snapshot;
    const currentVolume = parseFloat(currentPrice.volume);
    const avgVolume = indicators.volume.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumeRatio = currentVolume / avgVolume;
    
    // Significant volume spike with price movement
    const volumeSpike = volumeRatio > 3.0;
    const significantPriceMove = Math.abs(currentPrice.change24h) > 2.0;
    
    if (volumeSpike && significantPriceMove) {
      const confidence = Math.min(90, 50 + (volumeRatio * 8) + (Math.abs(currentPrice.change24h) * 2));
      
      if (confidence >= 70) {
        return {
          id: `volume_spike_${currentPrice.symbol}_${Date.now()}`,
          symbol: currentPrice.symbol,
          type: 'volume_spike',
          priority: volumeRatio > 5 ? 'critical' : 'high',
          confidence,
          message: `📈 ${currentPrice.symbol} massive volume spike! ${volumeRatio.toFixed(1)}x average volume`,
          details: {
            currentPrice: currentPrice.price,
            priceChange: currentPrice.change24h,
            volume: currentPrice.volume,
            signals: [
              `Volume spike: ${volumeRatio.toFixed(1)}x average`,
              `Price change: ${currentPrice.change24h > 0 ? '+' : ''}${currentPrice.change24h.toFixed(2)}%`,
              `Possible news event or institutional activity`,
              `High momentum probability`
            ],
            timeframe: '15m',
            targetPrice: currentPrice.change24h > 0 ? 
              currentPrice.price * 1.01 : currentPrice.price * 0.99,
            riskReward: 1.5
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + (30 * 60000) // 30 minutes
        };
      }
    }
    
    return null;
  }
}

// ============================================================================
// MAIN OPPORTUNITY RADAR CLASS
// ============================================================================

export class OpportunityRadar {
  private config: OpportunityRadarConfig;
  private userPreferences: UserPreferences;
  private marketSnapshots: Map<string, MarketSnapshot> = new Map();
  private activeAlerts: Map<string, OpportunityAlert> = new Map();
  private alertHistory: OpportunityAlert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private priceWebSocket: UnifiedPriceWebSocket | null = null;
  private isScanning = false;
  
  constructor(config?: Partial<OpportunityRadarConfig>, userPrefs?: Partial<UserPreferences>) {
    this.config = {
      scanInterval: 5 * 60 * 1000, // 5 minutes
      maxHistoryLength: 100,
      enableRealTimeScanning: true,
      enableBackgroundScanning: true,
      alertCooldown: 15 * 60 * 1000, // 15 minutes
      ...config
    };
    
    this.userPreferences = {
      enabledSymbols: DEFAULT_PARAMS.supportedSymbols,
      enabledStrategies: ['breakout', 'reversal', 'momentum', 'volume_spike'],
      minConfidence: 70,
      maxAlerts: 10,
      notificationMethods: ['toast', 'browser'],
      timeframes: ['1h', '4h'],
      tradingHours: {
        enabled: false,
        start: '09:30',
        end: '16:00'
      },
      filters: {
        minVolume: 100000,
        minPriceChange: 0.5,
        maxPriceChange: 15.0,
        riskTolerance: 'medium'
      },
      ...userPrefs
    };
  }
  
  // ============================================================================
  // CORE SCANNING METHODS
  // ============================================================================
  
  async start(): Promise<void> {
    if (this.isScanning) return;
    
    console.log('🎯 Starting Opportunity Radar...');
    this.isScanning = true;
    
    // Initial market snapshot
    await this.performFullMarketScan();
    
    // Set up periodic scanning
    if (this.config.enableBackgroundScanning) {
      this.scanInterval = setInterval(() => {
        this.performIncrementalScan();
      }, this.config.scanInterval);
    }
    
    // Set up real-time WebSocket monitoring
    if (this.config.enableRealTimeScanning) {
      this.setupRealTimeMonitoring();
    }
    
    console.log(`✅ Opportunity Radar started - monitoring ${this.userPreferences.enabledSymbols.length} symbols`);
  }
  
  async stop(): Promise<void> {
    console.log('🛑 Stopping Opportunity Radar...');
    this.isScanning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    if (this.priceWebSocket) {
      this.priceWebSocket.disconnect();
      this.priceWebSocket = null;
    }
    
    this.activeAlerts.clear();
    console.log('✅ Opportunity Radar stopped');
  }
  
  private async performFullMarketScan(): Promise<void> {
    try {
      console.log('🔍 Performing full market scan...');
      
      // Check trading hours if enabled
      if (!this.isWithinTradingHours()) {
        console.log('⏰ Outside trading hours, skipping scan');
        return;
      }
      
      // Get current prices for all symbols
      const priceData = await getBatchUnifiedPrices(this.userPreferences.enabledSymbols);
      
      // Update market snapshots and detect opportunities
      for (const [symbol, currentPrice] of priceData) {
        await this.updateMarketSnapshot(symbol, currentPrice);
        await this.scanSymbolForOpportunities(symbol, currentPrice);
      }
      
      // Clean up expired alerts
      this.cleanupExpiredAlerts();
      
      console.log(`✅ Full market scan completed - ${this.activeAlerts.size} active alerts`);
    } catch (error) {
      console.error('❌ Error in full market scan:', error);
    }
  }
  
  private async performIncrementalScan(): Promise<void> {
    try {
      if (!this.isWithinTradingHours()) return;
      
      // Quick scan of a subset of symbols
      const symbolsToScan = this.selectHighPrioritySymbols();
      const priceData = await getBatchUnifiedPrices(symbolsToScan);
      
      for (const [symbol, currentPrice] of priceData) {
        await this.updateMarketSnapshot(symbol, currentPrice);
        await this.scanSymbolForOpportunities(symbol, currentPrice);
      }
      
      this.cleanupExpiredAlerts();
    } catch (error) {
      console.error('❌ Error in incremental scan:', error);
    }
  }
  
  private setupRealTimeMonitoring(): void {
    this.priceWebSocket = new UnifiedPriceWebSocket();
    
    this.userPreferences.enabledSymbols.forEach(symbol => {
      this.priceWebSocket!.subscribe(symbol, async (priceUpdate) => {
        if (!this.isWithinTradingHours()) return;
        
        await this.updateMarketSnapshot(symbol, priceUpdate);
        await this.scanSymbolForOpportunities(symbol, priceUpdate);
      });
    });
  }
  
  // ============================================================================
  // OPPORTUNITY DETECTION
  // ============================================================================
  
  private async scanSymbolForOpportunities(symbol: string, currentPrice: UnifiedPriceData): Promise<void> {
    const snapshot = this.marketSnapshots.get(symbol);
    if (!snapshot) return;
    
    // Check alert cooldown
    const lastAlert = this.lastAlertTime.get(symbol) || 0;
    if (Date.now() - lastAlert < this.config.alertCooldown) return;
    
    // Apply user filters
    if (!this.passesUserFilters(currentPrice)) return;
    
    // Detect opportunities using enabled strategies
    const opportunities: OpportunityAlert[] = [];
    
    if (this.userPreferences.enabledStrategies.includes('breakout')) {
      const breakout = OpportunityDetector.detectBreakouts(snapshot, currentPrice);
      if (breakout) opportunities.push(breakout);
    }
    
    if (this.userPreferences.enabledStrategies.includes('reversal')) {
      const reversal = OpportunityDetector.detectReversals(snapshot, currentPrice);
      if (reversal) opportunities.push(reversal);
    }
    
    if (this.userPreferences.enabledStrategies.includes('momentum')) {
      const momentum = OpportunityDetector.detectMomentum(snapshot, currentPrice);
      if (momentum) opportunities.push(momentum);
    }
    
    if (this.userPreferences.enabledStrategies.includes('volume_spike')) {
      const volumeSpike = OpportunityDetector.detectVolumeSpikes(snapshot, currentPrice);
      if (volumeSpike) opportunities.push(volumeSpike);
    }
    
    // Process and send alerts
    for (const opportunity of opportunities) {
      if (opportunity.confidence >= this.userPreferences.minConfidence) {
        await this.processOpportunityAlert(opportunity);
      }
    }
  }
  
  private async updateMarketSnapshot(symbol: string, currentPrice: UnifiedPriceData): Promise<void> {
    let snapshot = this.marketSnapshots.get(symbol);
    
    if (!snapshot) {
      // Create new snapshot with mock historical data
      snapshot = {
        symbol,
        priceHistory: this.generateInitialPriceHistory(currentPrice.price),
        indicators: { sma: [], ema: [], rsi: [], atr: [], volume: [], bollingerBands: { upper: [], middle: [], lower: [] } },
        regime: { type: 'ranging', strength: 50, direction: 'neutral', volatility: 'medium', confidence: 50 },
        volume24h: parseFloat(currentPrice.volume),
        priceChange24h: currentPrice.change24h,
        lastUpdate: Date.now()
      };
    }
    
    // Update price history
    const newBar: PriceBar = {
      timestamp: Date.now(),
      open: currentPrice.openPrice || currentPrice.price,
      high: currentPrice.high24h,
      low: currentPrice.low24h,
      close: currentPrice.price,
      volume: parseFloat(currentPrice.volume)
    };
    
    snapshot.priceHistory.push(newBar);
    
    // Keep only recent history
    if (snapshot.priceHistory.length > this.config.maxHistoryLength) {
      snapshot.priceHistory = snapshot.priceHistory.slice(-this.config.maxHistoryLength);
    }
    
    // Recalculate indicators
    const prices = snapshot.priceHistory.map(bar => bar.close);
    snapshot.indicators = {
      sma: TechnicalAnalysis.calculateSMA(prices, 20),
      ema: TechnicalAnalysis.calculateEMA(prices, 12),
      rsi: TechnicalAnalysis.calculateRSI(prices, 14),
      atr: TechnicalAnalysis.calculateATR(snapshot.priceHistory, 14),
      volume: snapshot.priceHistory.map(bar => bar.volume),
      bollingerBands: TechnicalAnalysis.calculateBollingerBands(prices, 20, 2)
    };
    
    // Update market regime
    snapshot.regime = MarketRegimeDetector.analyzeMarketRegime(snapshot.priceHistory, snapshot.indicators);
    snapshot.volume24h = parseFloat(currentPrice.volume);
    snapshot.priceChange24h = currentPrice.change24h;
    snapshot.lastUpdate = Date.now();
    
    this.marketSnapshots.set(symbol, snapshot);
  }
  
  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================
  
  private async processOpportunityAlert(alert: OpportunityAlert): Promise<void> {
    // Check if we already have a similar active alert
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      a => a.symbol === alert.symbol && a.type === alert.type
    );
    
    if (existingAlert) return; // Avoid duplicate alerts
    
    // Check alert limits
    const recentAlerts = this.alertHistory.filter(
      a => Date.now() - a.timestamp < 3600000 // Last hour
    );
    
    if (recentAlerts.length >= this.userPreferences.maxAlerts) {
      console.log(`⚠️ Alert limit reached (${this.userPreferences.maxAlerts}/hour)`);
      return;
    }
    
    // Add to active alerts
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.lastAlertTime.set(alert.symbol, alert.timestamp);
    
    // Send notifications
    await this.sendAlert(alert);
    
    console.log(`🚨 New ${alert.priority} priority alert: ${alert.message}`);
  }
  
  private async sendAlert(alert: OpportunityAlert): Promise<void> {
    const methods = this.userPreferences.notificationMethods;
    
    // Toast notification
    if (methods.includes('toast')) {
      const priorityEmoji = {
        low: '💡',
        medium: '⚡',
        high: '🚨',
        critical: '🔥'
      };
      
      toast(alert.message, {
        description: `Confidence: ${alert.confidence.toFixed(1)}% | ${alert.details.signals[0]}`,
        duration: alert.priority === 'critical' ? 10000 : 5000,
        action: {
          label: 'View Details',
          onClick: () => this.showAlertDetails(alert)
        }
      });
    }
    
    // Browser notification
    if (methods.includes('browser') && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`RiverBit Opportunity Alert`, {
          body: alert.message,
          icon: '/riverbit-logo.png',
          tag: alert.id
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(`RiverBit Opportunity Alert`, {
            body: alert.message,
            icon: '/riverbit-logo.png',
            tag: alert.id
          });
        }
      }
    }
    
    // Sound notification (optional)
    if (methods.includes('sound') && alert.priority === 'critical') {
      // Implement sound notification if needed
      console.log('🔊 Playing alert sound...');
    }
  }
  
  private showAlertDetails(alert: OpportunityAlert): void {
    // This could open a modal or navigate to a detailed view
    console.log('Alert Details:', alert);
  }
  
  private cleanupExpiredAlerts(): void {
    const now = Date.now();
    
    for (const [id, alert] of this.activeAlerts) {
      if (now > alert.expiresAt) {
        this.activeAlerts.delete(id);
      }
    }
    
    // Keep only recent history (last 24 hours)
    this.alertHistory = this.alertHistory.filter(
      alert => now - alert.timestamp < 24 * 3600000
    );
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  private isWithinTradingHours(): boolean {
    if (!this.userPreferences.tradingHours.enabled) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.userPreferences.tradingHours.start.split(':').map(Number);
    const [endHour, endMin] = this.userPreferences.tradingHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  }
  
  private passesUserFilters(price: UnifiedPriceData): boolean {
    const filters = this.userPreferences.filters;
    const volume = parseFloat(price.volume);
    const priceChange = Math.abs(price.change24h);
    
    return (
      volume >= filters.minVolume &&
      priceChange >= filters.minPriceChange &&
      priceChange <= filters.maxPriceChange
    );
  }
  
  private selectHighPrioritySymbols(): string[] {
    // Select symbols with recent high volatility or volume
    const recentAlerts = this.alertHistory.filter(
      alert => Date.now() - alert.timestamp < 3600000
    );
    
    const highPrioritySymbols = new Set(
      recentAlerts.map(alert => alert.symbol)
    );
    
    // Add a few random symbols for comprehensive coverage
    const randomSymbols = this.userPreferences.enabledSymbols
      .filter(s => !highPrioritySymbols.has(s))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    return [...highPrioritySymbols, ...randomSymbols];
  }
  
  private generateInitialPriceHistory(currentPrice: number): PriceBar[] {
    // Generate mock historical data for initial indicators calculation
    const bars: PriceBar[] = [];
    let price = currentPrice * 0.98; // Start slightly below current
    
    for (let i = 0; i < 50; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% random change
      const open = price;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      const volume = 100000 + Math.random() * 200000;
      
      bars.push({
        timestamp: Date.now() - (50 - i) * 3600000, // Hourly intervals
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
  
  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================
  
  // Update user preferences
  updatePreferences(newPrefs: Partial<UserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...newPrefs };
    console.log('✅ User preferences updated');
  }
  
  // Get current preferences
  getPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }
  
  // Get active alerts
  getActiveAlerts(): OpportunityAlert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }
  
  // Get alert history
  getAlertHistory(hours = 24): OpportunityAlert[] {
    const cutoff = Date.now() - (hours * 3600000);
    return this.alertHistory
      .filter(alert => alert.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  // Dismiss an alert
  dismissAlert(alertId: string): void {
    this.activeAlerts.delete(alertId);
  }
  
  // Get market snapshots
  getMarketSnapshots(): Map<string, MarketSnapshot> {
    return new Map(this.marketSnapshots);
  }
  
  // Force scan a specific symbol
  async forceScanSymbol(symbol: string): Promise<OpportunityAlert[]> {
    const priceData = await getUnifiedPrice(symbol);
    if (!priceData) return [];
    
    await this.updateMarketSnapshot(symbol, priceData);
    
    const opportunities: OpportunityAlert[] = [];
    const snapshot = this.marketSnapshots.get(symbol);
    if (!snapshot) return opportunities;
    
    // Run all detection strategies
    const breakout = OpportunityDetector.detectBreakouts(snapshot, priceData);
    const reversal = OpportunityDetector.detectReversals(snapshot, priceData);
    const momentum = OpportunityDetector.detectMomentum(snapshot, priceData);
    const volumeSpike = OpportunityDetector.detectVolumeSpikes(snapshot, priceData);
    
    [breakout, reversal, momentum, volumeSpike].forEach(opp => {
      if (opp && opp.confidence >= this.userPreferences.minConfidence) {
        opportunities.push(opp);
      }
    });
    
    return opportunities;
  }
  
  // Get system status
  getStatus(): {
    isScanning: boolean;
    activeAlerts: number;
    monitoredSymbols: number;
    lastScanTime: number;
  } {
    return {
      isScanning: this.isScanning,
      activeAlerts: this.activeAlerts.size,
      monitoredSymbols: this.userPreferences.enabledSymbols.length,
      lastScanTime: Math.max(...Array.from(this.marketSnapshots.values()).map(s => s.lastUpdate))
    };
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE AND UTILITIES
// ============================================================================

// Default configuration for production use
const defaultConfig: OpportunityRadarConfig = {
  scanInterval: 5 * 60 * 1000, // 5 minutes
  maxHistoryLength: 100,
  enableRealTimeScanning: true,
  enableBackgroundScanning: true,
  alertCooldown: 15 * 60 * 1000 // 15 minutes
};

const defaultPreferences: UserPreferences = {
  enabledSymbols: DEFAULT_PARAMS.supportedSymbols,
  enabledStrategies: ['breakout', 'reversal', 'momentum', 'volume_spike'],
  minConfidence: 70,
  maxAlerts: 10,
  notificationMethods: ['toast', 'browser'],
  timeframes: ['1h', '4h'],
  tradingHours: {
    enabled: false,
    start: '09:30',
    end: '16:00'
  },
  filters: {
    minVolume: 100000,
    minPriceChange: 0.5,
    maxPriceChange: 15.0,
    riskTolerance: 'medium'
  }
};

// Global instance
export const opportunityRadar = new OpportunityRadar(defaultConfig, defaultPreferences);

// Utility functions
export const startOpportunityRadar = () => opportunityRadar.start();
export const stopOpportunityRadar = () => opportunityRadar.stop();
export const getActiveOpportunities = () => opportunityRadar.getActiveAlerts();
export const getOpportunityHistory = (hours?: number) => opportunityRadar.getAlertHistory(hours);
export const updateRadarPreferences = (prefs: Partial<UserPreferences>) => 
  opportunityRadar.updatePreferences(prefs);

// Export types
export type {
  OpportunityAlert,
  UserPreferences,
  MarketSnapshot,
  OpportunityRadarConfig
};