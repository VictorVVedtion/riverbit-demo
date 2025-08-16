/**
 * RiverBit 市场数据服务
 * Market Data Service - Real-time Data Integration
 */

import { MarketData, PriceChange } from '../types/asset';
import { EventEmitter } from 'events';

export interface PriceUpdateEvent {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'price_update' | 'market_data' | 'error';
  data: any;
}

export class MarketDataService extends EventEmitter {
  private static instance: MarketDataService;
  
  // WebSocket连接管理
  private wsConnections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // 数据缓存
  private priceCache: Map<string, MarketData> = new Map();
  private lastUpdate: Map<string, number> = new Map();
  
  // 配置
  private readonly config = {
    CRYPTO_WS_URL: 'wss://stream.binance.com:9443/ws',
    STOCK_WS_URL: 'wss://fmpcloud.io/ws', // 示例URL
    RECONNECT_DELAY: 5000,
    MAX_RECONNECT_ATTEMPTS: 5,
    PRICE_CACHE_TTL: 30000, // 30秒
    BATCH_UPDATE_INTERVAL: 1000, // 1秒批量更新
  };

  private constructor() {
    super();
    this.initialize();
  }

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  // 初始化服务
  private initialize(): void {
    this.setupBatchUpdateTimer();
    console.log('Market Data Service initialized');
  }

  // 设置批量更新定时器
  private setupBatchUpdateTimer(): void {
    setInterval(() => {
      this.processBatchUpdates();
    }, this.config.BATCH_UPDATE_INTERVAL);
  }

  // 获取资产市场数据
  public async getAssetMarketData(symbol: string): Promise<MarketData> {
    // 首先检查缓存
    const cached = this.getCachedData(symbol);
    if (cached) {
      return cached;
    }

    // 根据资产类型选择数据源
    const data = symbol.startsWith('x') 
      ? await this.fetchStockData(symbol)
      : await this.fetchCryptoData(symbol);

    // 缓存数据
    this.priceCache.set(symbol, data);
    this.lastUpdate.set(symbol, Date.now());

    return data;
  }

  // 批量获取市场数据
  public async getBatchMarketData(symbols: string[]): Promise<Map<string, MarketData>> {
    const result = new Map<string, MarketData>();
    const needFetch: string[] = [];

    // 检查缓存
    for (const symbol of symbols) {
      const cached = this.getCachedData(symbol);
      if (cached) {
        result.set(symbol, cached);
      } else {
        needFetch.push(symbol);
      }
    }

    // 批量获取未缓存的数据
    if (needFetch.length > 0) {
      const fetched = await this.batchFetchMarketData(needFetch);
      for (const [symbol, data] of fetched.entries()) {
        result.set(symbol, data);
        this.priceCache.set(symbol, data);
        this.lastUpdate.set(symbol, Date.now());
      }
    }

    return result;
  }

  // 订阅实时价格更新
  public subscribeToPrice(symbol: string): void {
    if (symbol.startsWith('x')) {
      this.subscribeToStockPrice(symbol);
    } else {
      this.subscribeToCryptoPrice(symbol);
    }
  }

  // 取消订阅
  public unsubscribeFromPrice(symbol: string): void {
    // 从订阅列表中移除
    for (const [endpoint, symbols] of this.subscriptions.entries()) {
      symbols.delete(symbol);
      if (symbols.size === 0) {
        // 如果没有更多订阅，关闭WebSocket连接
        this.closeWebSocket(endpoint);
      }
    }
  }

  // 订阅加密货币价格
  private subscribeToCryptoPrice(symbol: string): void {
    const endpoint = this.config.CRYPTO_WS_URL;
    
    if (!this.wsConnections.has(endpoint)) {
      this.createWebSocketConnection(endpoint, 'crypto');
    }

    if (!this.subscriptions.has(endpoint)) {
      this.subscriptions.set(endpoint, new Set());
    }

    this.subscriptions.get(endpoint)!.add(symbol);

    // 发送订阅消息
    const ws = this.wsConnections.get(endpoint);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const subscribeMsg = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase().replace('/', '')}@ticker`],
        id: Date.now()
      };
      ws.send(JSON.stringify(subscribeMsg));
    }
  }

  // 订阅股票价格
  private subscribeToStockPrice(symbol: string): void {
    const endpoint = this.config.STOCK_WS_URL;
    
    if (!this.wsConnections.has(endpoint)) {
      this.createWebSocketConnection(endpoint, 'stock');
    }

    if (!this.subscriptions.has(endpoint)) {
      this.subscriptions.set(endpoint, new Set());
    }

    this.subscriptions.get(endpoint)!.add(symbol);

    // 发送订阅消息（根据实际股票数据提供商API调整）
    const ws = this.wsConnections.get(endpoint);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const subscribeMsg = {
        action: 'subscribe',
        symbols: [symbol.replace('x', '').replace('/USDT', '')]
      };
      ws.send(JSON.stringify(subscribeMsg));
    }
  }

  // 创建WebSocket连接
  private createWebSocketConnection(endpoint: string, type: 'crypto' | 'stock'): void {
    try {
      const ws = new WebSocket(endpoint);
      
      ws.onopen = () => {
        console.log(`WebSocket connected to ${endpoint}`);
        this.clearReconnectTimer(endpoint);
      };

      ws.onmessage = (event) => {
        this.handleWebSocketMessage(event.data, type);
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${endpoint}:`, error);
      };

      ws.onclose = () => {
        console.log(`WebSocket disconnected from ${endpoint}`);
        this.wsConnections.delete(endpoint);
        this.scheduleReconnect(endpoint, type);
      };

      this.wsConnections.set(endpoint, ws);
    } catch (error) {
      console.error(`Failed to create WebSocket connection to ${endpoint}:`, error);
      this.scheduleReconnect(endpoint, type);
    }
  }

  // 处理WebSocket消息
  private handleWebSocketMessage(data: string, type: 'crypto' | 'stock'): void {
    try {
      const message = JSON.parse(data);
      
      if (type === 'crypto') {
        this.handleCryptoMessage(message);
      } else {
        this.handleStockMessage(message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // 处理加密货币消息
  private handleCryptoMessage(message: any): void {
    if (message.stream && message.data) {
      const data = message.data;
      const symbol = this.parseCryptoSymbol(message.stream);
      
      if (symbol) {
        const priceUpdate: PriceUpdateEvent = {
          symbol,
          price: parseFloat(data.c), // 最新价格
          change24h: parseFloat(data.P), // 24h变动百分比
          changePercent24h: parseFloat(data.P),
          volume24h: parseFloat(data.v), // 24h成交量
          timestamp: Date.now()
        };

        this.emit('priceUpdate', priceUpdate);
        this.updatePriceCache(symbol, priceUpdate);
      }
    }
  }

  // 处理股票消息
  private handleStockMessage(message: any): void {
    if (message.symbol && message.price) {
      const symbol = `x${message.symbol}/USDT`;
      
      const priceUpdate: PriceUpdateEvent = {
        symbol,
        price: parseFloat(message.price),
        change24h: parseFloat(message.change || '0'),
        changePercent24h: parseFloat(message.changePercent || '0'),
        volume24h: parseFloat(message.volume || '0'),
        timestamp: Date.now()
      };

      this.emit('priceUpdate', priceUpdate);
      this.updatePriceCache(symbol, priceUpdate);
    }
  }

  // 解析加密货币符号
  private parseCryptoSymbol(stream: string): string | null {
    const match = stream.match(/^(.+)@ticker$/);
    if (match) {
      const symbol = match[1].toUpperCase();
      // 转换为标准格式，例如 BTCUSDT -> BTC/USDT
      if (symbol.endsWith('USDT')) {
        const base = symbol.replace('USDT', '');
        return `${base}/USDT`;
      }
    }
    return null;
  }

  // 更新价格缓存
  private updatePriceCache(symbol: string, priceUpdate: PriceUpdateEvent): void {
    const existing = this.priceCache.get(symbol);
    
    if (existing) {
      // 更新现有数据
      existing.price = priceUpdate.price;
      existing.priceChange.change24h = priceUpdate.change24h;
      existing.priceChange.changePercent24h = priceUpdate.changePercent24h;
      existing.volume24h = priceUpdate.volume24h;
      existing.lastUpdate = priceUpdate.timestamp;
    } else {
      // 创建新的市场数据
      const marketData: MarketData = {
        price: priceUpdate.price,
        priceChange: {
          change1h: 0,
          change24h: priceUpdate.change24h,
          change7d: 0,
          changePercent1h: 0,
          changePercent24h: priceUpdate.changePercent24h,
          changePercent7d: 0
        },
        volume24h: priceUpdate.volume24h,
        high24h: priceUpdate.price,
        low24h: priceUpdate.price,
        lastUpdate: priceUpdate.timestamp
      };
      
      this.priceCache.set(symbol, marketData);
    }
    
    this.lastUpdate.set(symbol, priceUpdate.timestamp);
  }

  // 获取缓存数据
  private getCachedData(symbol: string): MarketData | null {
    const data = this.priceCache.get(symbol);
    const lastUpdate = this.lastUpdate.get(symbol);
    
    if (data && lastUpdate) {
      const age = Date.now() - lastUpdate;
      if (age < this.config.PRICE_CACHE_TTL) {
        return data;
      }
    }
    
    return null;
  }

  // 获取加密货币数据
  private async fetchCryptoData(symbol: string): Promise<MarketData> {
    try {
      // 模拟API调用 - 实际应该调用真实的API
      const response = await this.mockFetchCryptoPrice(symbol);
      return this.transformCryptoData(response);
    } catch (error) {
      console.error(`Failed to fetch crypto data for ${symbol}:`, error);
      return this.getDefaultMarketData();
    }
  }

  // 获取股票数据
  private async fetchStockData(symbol: string): Promise<MarketData> {
    try {
      // 模拟API调用 - 实际应该调用真实的API
      const response = await this.mockFetchStockPrice(symbol);
      return this.transformStockData(response);
    } catch (error) {
      console.error(`Failed to fetch stock data for ${symbol}:`, error);
      return this.getDefaultMarketData();
    }
  }

  // 批量获取市场数据
  private async batchFetchMarketData(symbols: string[]): Promise<Map<string, MarketData>> {
    const result = new Map<string, MarketData>();
    
    // 分离加密货币和股票
    const cryptoSymbols = symbols.filter(s => !s.startsWith('x'));
    const stockSymbols = symbols.filter(s => s.startsWith('x'));

    // 并行获取数据
    const promises: Promise<void>[] = [];

    if (cryptoSymbols.length > 0) {
      promises.push(
        this.batchFetchCryptoData(cryptoSymbols).then(data => {
          for (const [symbol, marketData] of data.entries()) {
            result.set(symbol, marketData);
          }
        })
      );
    }

    if (stockSymbols.length > 0) {
      promises.push(
        this.batchFetchStockData(stockSymbols).then(data => {
          for (const [symbol, marketData] of data.entries()) {
            result.set(symbol, marketData);
          }
        })
      );
    }

    await Promise.all(promises);
    return result;
  }

  // 批量获取加密货币数据
  private async batchFetchCryptoData(symbols: string[]): Promise<Map<string, MarketData>> {
    const result = new Map<string, MarketData>();
    
    // 实际实现中应该调用真实的批量API
    for (const symbol of symbols) {
      const data = await this.fetchCryptoData(symbol);
      result.set(symbol, data);
    }
    
    return result;
  }

  // 批量获取股票数据
  private async batchFetchStockData(symbols: string[]): Promise<Map<string, MarketData>> {
    const result = new Map<string, MarketData>();
    
    // 实际实现中应该调用真实的批量API
    for (const symbol of symbols) {
      const data = await this.fetchStockData(symbol);
      result.set(symbol, data);
    }
    
    return result;
  }

  // 模拟获取加密货币价格
  private async mockFetchCryptoPrice(symbol: string): Promise<any> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 模拟价格数据
    const basePrice = this.getMockBasePrice(symbol);
    const variation = (Math.random() - 0.5) * 0.1; // ±5% 变动
    
    return {
      symbol,
      price: basePrice * (1 + variation),
      change24h: basePrice * variation,
      changePercent24h: variation * 100,
      volume24h: Math.random() * 1000000000,
      high24h: basePrice * (1 + Math.abs(variation)),
      low24h: basePrice * (1 - Math.abs(variation))
    };
  }

  // 模拟获取股票价格
  private async mockFetchStockPrice(symbol: string): Promise<any> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 模拟价格数据
    const basePrice = this.getMockBasePrice(symbol);
    const variation = (Math.random() - 0.5) * 0.05; // ±2.5% 变动
    
    return {
      symbol,
      price: basePrice * (1 + variation),
      change24h: basePrice * variation,
      changePercent24h: variation * 100,
      volume24h: Math.random() * 100000000,
      high24h: basePrice * (1 + Math.abs(variation)),
      low24h: basePrice * (1 - Math.abs(variation))
    };
  }

  // 获取模拟基础价格
  private getMockBasePrice(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      'BTC/USDT': 45000,
      'ETH/USDT': 2800,
      'SOL/USDT': 110,
      'xAAPL/USDT': 185,
      'xMSFT/USDT': 380,
      'xGOOGL/USDT': 2800,
      'xAMZN/USDT': 145,
      'xTSLA/USDT': 250,
      'xMETA/USDT': 320,
      'xNVDA/USDT': 480
    };
    
    return basePrices[symbol] || 100;
  }

  // 转换加密货币数据
  private transformCryptoData(data: any): MarketData {
    return {
      price: data.price,
      priceChange: {
        change1h: 0, // 需要额外API获取
        change24h: data.change24h,
        change7d: 0, // 需要额外API获取
        changePercent1h: 0,
        changePercent24h: data.changePercent24h,
        changePercent7d: 0
      },
      volume24h: data.volume24h,
      high24h: data.high24h,
      low24h: data.low24h,
      lastUpdate: Date.now()
    };
  }

  // 转换股票数据
  private transformStockData(data: any): MarketData {
    return {
      price: data.price,
      priceChange: {
        change1h: 0,
        change24h: data.change24h,
        change7d: 0,
        changePercent1h: 0,
        changePercent24h: data.changePercent24h,
        changePercent7d: 0
      },
      volume24h: data.volume24h,
      high24h: data.high24h,
      low24h: data.low24h,
      lastUpdate: Date.now()
    };
  }

  // 获取默认市场数据
  private getDefaultMarketData(): MarketData {
    return {
      price: 0,
      priceChange: {
        change1h: 0,
        change24h: 0,
        change7d: 0,
        changePercent1h: 0,
        changePercent24h: 0,
        changePercent7d: 0
      },
      volume24h: 0,
      high24h: 0,
      low24h: 0,
      lastUpdate: Date.now()
    };
  }

  // 处理批量更新
  private processBatchUpdates(): void {
    // 实现批量更新逻辑，减少频繁的单个更新
    // 这里可以收集一段时间内的更新，然后批量发送
  }

  // 安排重连
  private scheduleReconnect(endpoint: string, type: 'crypto' | 'stock'): void {
    const existingTimer = this.reconnectTimers.get(endpoint);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      console.log(`Attempting to reconnect to ${endpoint}`);
      this.createWebSocketConnection(endpoint, type);
    }, this.config.RECONNECT_DELAY);

    this.reconnectTimers.set(endpoint, timer);
  }

  // 清除重连定时器
  private clearReconnectTimer(endpoint: string): void {
    const timer = this.reconnectTimers.get(endpoint);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(endpoint);
    }
  }

  // 关闭WebSocket连接
  private closeWebSocket(endpoint: string): void {
    const ws = this.wsConnections.get(endpoint);
    if (ws) {
      ws.close();
      this.wsConnections.delete(endpoint);
    }
    
    this.clearReconnectTimer(endpoint);
    this.subscriptions.delete(endpoint);
  }

  // 清理资源
  public destroy(): void {
    // 关闭所有WebSocket连接
    for (const [endpoint, ws] of this.wsConnections.entries()) {
      ws.close();
    }
    
    // 清除所有定时器
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    
    // 清理缓存
    this.wsConnections.clear();
    this.subscriptions.clear();
    this.reconnectTimers.clear();
    this.priceCache.clear();
    this.lastUpdate.clear();
    
    // 移除所有监听器
    this.removeAllListeners();
  }
}

export default MarketDataService;