/**
 * RiverBit 性能优化工具
 * Performance Optimization Utilities
 */

import { Asset, MarketData } from '../types/asset';

// 性能监控配置
export interface PerformanceConfig {
  enableMetrics: boolean;
  sampleRate: number;
  maxMetrics: number;
  thresholds: {
    renderTime: number;
    searchLatency: number;
    memoryUsage: number;
  };
}

// 性能指标
export interface PerformanceMetrics {
  renderTime: number;
  searchLatency: number;
  memoryUsage: number;
  cacheHitRate: number;
  networkLatency: number;
  fps: number;
  timestamp: number;
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(null, args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(null, args);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 批处理器
export class BatchProcessor<T> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly delay: number;
  private readonly processor: (batch: T[]) => Promise<void>;

  constructor(
    processor: (batch: T[]) => Promise<void>,
    batchSize = 50,
    delay = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.delay = delay;
  }

  add(item: T): void {
    this.batch.push(item);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.delay);
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.batch.length === 0) return;
    
    const currentBatch = [...this.batch];
    this.batch = [];
    
    try {
      await this.processor(currentBatch);
    } catch (error) {
      console.error('Batch processing failed:', error);
    }
  }

  get size(): number {
    return this.batch.length;
  }
}

// 内存监控器
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private metrics: PerformanceMetrics[] = [];
  private config: PerformanceConfig;

  private constructor(config: PerformanceConfig) {
    this.config = config;
    this.startMonitoring();
  }

  public static getInstance(config?: PerformanceConfig): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor(config || {
        enableMetrics: true,
        sampleRate: 0.1,
        maxMetrics: 100,
        thresholds: {
          renderTime: 16.67, // 60fps
          searchLatency: 100,
          memoryUsage: 50 * 1024 * 1024 // 50MB
        }
      });
    }
    return MemoryMonitor.instance;
  }

  private startMonitoring(): void {
    if (!this.config.enableMetrics) return;

    // 监控渲染性能
    this.monitorRenderPerformance();
    
    // 监控内存使用
    this.monitorMemoryUsage();
    
    // 定期清理旧指标
    setInterval(() => {
      this.cleanupMetrics();
    }, 60000); // 每分钟清理一次
  }

  private monitorRenderPerformance(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.recordMetric({ fps } as PerformanceMetrics);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFrame);
    };

    requestAnimationFrame(countFrame);
  }

  private monitorMemoryUsage(): void {
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize;
        
        this.recordMetric({ memoryUsage } as PerformanceMetrics);
        
        // 检查内存阈值
        if (memoryUsage > this.config.thresholds.memoryUsage) {
          console.warn(`High memory usage detected: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
        }
      }
    }, 5000); // 每5秒检查一次
  }

  public recordMetric(metric: Partial<PerformanceMetrics>): void {
    if (!this.config.enableMetrics) return;
    if (Math.random() > this.config.sampleRate) return;

    const fullMetric: PerformanceMetrics = {
      renderTime: 0,
      searchLatency: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      networkLatency: 0,
      fps: 0,
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);
    
    // 保持指标数量在限制内
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getAverageMetrics(timeWindow = 60000): Partial<PerformanceMetrics> {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      metric => now - metric.timestamp <= timeWindow
    );

    if (recentMetrics.length === 0) {
      return {};
    }

    const totals = recentMetrics.reduce(
      (acc, metric) => ({
        renderTime: acc.renderTime + metric.renderTime,
        searchLatency: acc.searchLatency + metric.searchLatency,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
        cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
        networkLatency: acc.networkLatency + metric.networkLatency,
        fps: acc.fps + metric.fps
      }),
      {
        renderTime: 0,
        searchLatency: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
        networkLatency: 0,
        fps: 0
      }
    );

    const count = recentMetrics.length;
    return {
      renderTime: totals.renderTime / count,
      searchLatency: totals.searchLatency / count,
      memoryUsage: totals.memoryUsage / count,
      cacheHitRate: totals.cacheHitRate / count,
      networkLatency: totals.networkLatency / count,
      fps: totals.fps / count
    };
  }

  private cleanupMetrics(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.metrics = this.metrics.filter(metric => metric.timestamp > oneHourAgo);
  }
}

// 性能测量装饰器
export function measurePerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        
        const monitor = MemoryMonitor.getInstance();
        monitor.recordMetric({
          [name]: duration
        } as any);
        
        return result;
      } catch (error) {
        console.error(`Performance measurement failed for ${name}:`, error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

// 资产数据优化器
export class AssetDataOptimizer {
  private static readonly CHUNK_SIZE = 1000;

  // 优化资产数据结构
  public static optimizeAssets(assets: Asset[]): Asset[] {
    return assets.map(asset => ({
      ...asset,
      // 移除不必要的字段以减少内存使用
      metadata: {
        ...asset.metadata,
        // 只保留关键元数据
        chainId: asset.metadata.chainId,
        contractAddress: asset.metadata.contractAddress
      }
    }));
  }

  // 分块处理大量资产
  public static async processAssetsInChunks<T>(
    assets: Asset[],
    processor: (chunk: Asset[]) => Promise<T[]>
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < assets.length; i += this.CHUNK_SIZE) {
      const chunk = assets.slice(i, i + this.CHUNK_SIZE);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      
      // 让出控制权给浏览器
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }

  // 预计算常用的派生数据
  public static precomputeDerivedData(assets: Asset[]): Asset[] {
    return assets.map(asset => ({
      ...asset,
      // 预计算格式化的价格字符串
      _formattedPrice: this.formatPrice(asset.marketData.price, asset.precision.price),
      _formattedChange: this.formatChange(asset.marketData.priceChange.changePercent24h),
      _searchableText: this.createSearchableText(asset)
    }));
  }

  private static formatPrice(price: number, precision: number): string {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    return price.toFixed(precision);
  }

  private static formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  private static createSearchableText(asset: Asset): string {
    return [
      asset.symbol,
      asset.name,
      asset.category,
      ...asset.tags
    ].join(' ').toLowerCase();
  }
}

// 懒加载管理器
export class LazyLoadManager {
  private observers: Map<string, IntersectionObserver> = new Map();
  private loadQueue: Set<string> = new Set();
  private loading: Set<string> = new Set();

  constructor(
    private readonly threshold = 0.1,
    private readonly rootMargin = '100px'
  ) {}

  // 注册懒加载元素
  public observe(
    element: HTMLElement,
    key: string,
    loadCallback: () => Promise<void>
  ): void {
    if (!this.observers.has(key)) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !this.loading.has(key)) {
              this.loadItem(key, loadCallback);
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: this.threshold,
          rootMargin: this.rootMargin
        }
      );
      
      this.observers.set(key, observer);
    }

    this.observers.get(key)!.observe(element);
  }

  // 取消观察
  public unobserve(element: HTMLElement, key: string): void {
    const observer = this.observers.get(key);
    if (observer) {
      observer.unobserve(element);
    }
  }

  // 预加载关键资源
  public preload(keys: string[], loadCallbacks: Map<string, () => Promise<void>>): void {
    keys.forEach(key => {
      if (!this.loading.has(key)) {
        const callback = loadCallbacks.get(key);
        if (callback) {
          this.loadItem(key, callback);
        }
      }
    });
  }

  private async loadItem(key: string, loadCallback: () => Promise<void>): Promise<void> {
    if (this.loading.has(key)) return;
    
    this.loading.add(key);
    this.loadQueue.delete(key);
    
    try {
      await loadCallback();
    } catch (error) {
      console.error(`Lazy load failed for ${key}:`, error);
    } finally {
      this.loading.delete(key);
    }
  }

  // 清理资源
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.loadQueue.clear();
    this.loading.clear();
  }
}

// 缓存策略
export interface CacheStrategy<T> {
  get(key: string): T | null;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
}

// LRU缓存实现
export class LRUCache<T> implements CacheStrategy<T> {
  private cache = new Map<string, { value: T; timestamp: number; ttl: number }>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(
    private readonly maxSize: number = 100,
    private readonly defaultTTL: number = 300000 // 5分钟
  ) {}

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }
    
    // 更新访问顺序
    this.accessOrder.set(key, ++this.accessCounter);
    
    return entry.value;
  }

  set(key: string, value: T, ttl = this.defaultTTL): void {
    // 如果缓存已满，删除最少使用的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
    
    this.accessOrder.set(key, ++this.accessCounter);
  }

  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }

  private evictLRU(): void {
    let lruKey = '';
    let lruAccess = Infinity;
    
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.delete(lruKey);
    }
  }
}

// 导出工具函数
export const PerformanceUtils = {
  debounce,
  throttle,
  BatchProcessor,
  MemoryMonitor,
  measurePerformance,
  AssetDataOptimizer,
  LazyLoadManager,
  LRUCache
};

export default PerformanceUtils;