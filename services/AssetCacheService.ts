/**
 * RiverBit 资产缓存服务
 * Asset Cache Service - Performance Optimization
 */

import { Asset, MarketData } from '../types/asset';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessed: number;
  accessCount: number;
}

export interface CacheConfig {
  maxEntries: number;
  defaultTTL: number;
  cleanupInterval: number;
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
}

export class AssetCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private accessLog: Map<string, number[]> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  private readonly config: CacheConfig = {
    maxEntries: 1000,
    defaultTTL: 30000, // 30秒
    cleanupInterval: 60000, // 1分钟清理一次
    compressionEnabled: true,
    persistenceEnabled: true
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config };
    this.initialize();
  }

  // 初始化缓存服务
  private initialize(): void {
    this.startCleanupTimer();
    this.loadFromPersistence();
    
    // 监听页面卸载事件，保存缓存到持久化存储
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToPersistence();
      });
    }
  }

  // 设置缓存项
  public async set<T>(
    key: string, 
    data: T, 
    ttl: number = this.config.defaultTTL
  ): Promise<void> {
    const now = Date.now();
    
    // 如果缓存已满，清理最少使用的项
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data: this.config.compressionEnabled ? this.compress(data) : data,
      timestamp: now,
      ttl,
      accessed: now,
      accessCount: 0
    };

    this.cache.set(key, entry);
    this.updateAccessLog(key);
  }

  // 获取缓存项
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // 检查是否过期
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问信息
    entry.accessed = now;
    entry.accessCount++;
    this.updateAccessLog(key);

    return this.config.compressionEnabled ? 
      this.decompress(entry.data) : entry.data;
  }

  // 检查缓存是否存在且有效
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // 删除缓存项
  public delete(key: string): boolean {
    this.accessLog.delete(key);
    return this.cache.delete(key);
  }

  // 清空缓存
  public clear(): void {
    this.cache.clear();
    this.accessLog.clear();
  }

  // 资产特定的缓存方法
  public async setAsset(assetId: string, asset: Asset): Promise<void> {
    await this.set(`asset:${assetId}`, asset, 60000); // 1分钟TTL
  }

  public getAsset(assetId: string): Asset | null {
    return this.get<Asset>(`asset:${assetId}`);
  }

  public async setMarketData(symbol: string, data: MarketData): Promise<void> {
    await this.set(`market:${symbol}`, data, 30000); // 30秒TTL
  }

  public getMarketData(symbol: string): MarketData | null {
    return this.get<MarketData>(`market:${symbol}`);
  }

  // 批量设置
  public async setBatch<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
    const promises = entries.map(({ key, data, ttl }) => 
      this.set(key, data, ttl)
    );
    await Promise.all(promises);
  }

  // 批量获取
  public getBatch<T>(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }
    
    return result;
  }

  // 获取缓存统计信息
  public getStats(): {
    size: number;
    maxEntries: number;
    hitRate: number;
    memoryUsage: number;
    topAccessed: Array<{ key: string; count: number }>;
  } {
    const entries = Array.from(this.cache.entries());
    const totalAccess = entries.reduce((sum, [, entry]) => sum + entry.accessCount, 0);
    const avgAccess = entries.length > 0 ? totalAccess / entries.length : 0;
    
    // 计算内存使用（粗略估算）
    const memoryUsage = this.estimateMemoryUsage();
    
    // 获取访问次数最多的缓存项
    const topAccessed = entries
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({ key, count: entry.accessCount }));

    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      hitRate: avgAccess,
      memoryUsage,
      topAccessed
    };
  }

  // 预热缓存
  public async warmup(assets: Asset[]): Promise<void> {
    console.log('Warming up asset cache...');
    
    const promises = assets.map(asset => 
      this.setAsset(asset.id, asset)
    );
    
    await Promise.all(promises);
    console.log(`Cache warmed up with ${assets.length} assets`);
  }

  // 获取缓存键列表
  public getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys());
    
    if (pattern) {
      const regex = new RegExp(pattern);
      return keys.filter(key => regex.test(key));
    }
    
    return keys;
  }

  // 更新缓存项TTL
  public updateTTL(key: string, newTTL: number): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      entry.ttl = newTTL;
      entry.timestamp = Date.now(); // 重置时间戳
      return true;
    }
    return false;
  }

  // 获取缓存项信息
  public getEntryInfo(key: string): {
    exists: boolean;
    size?: number;
    age?: number;
    ttl?: number;
    accessCount?: number;
    lastAccessed?: number;
  } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { exists: false };
    }

    const now = Date.now();
    return {
      exists: true,
      size: this.estimateEntrySize(entry),
      age: now - entry.timestamp,
      ttl: entry.ttl,
      accessCount: entry.accessCount,
      lastAccessed: entry.accessed
    };
  }

  // 私有方法

  // 更新访问日志
  private updateAccessLog(key: string): void {
    const now = Date.now();
    const log = this.accessLog.get(key) || [];
    
    log.push(now);
    
    // 只保留最近1小时的访问记录
    const oneHourAgo = now - 3600000;
    const filtered = log.filter(timestamp => timestamp > oneHourAgo);
    
    this.accessLog.set(key, filtered);
  }

  // LRU 淘汰策略
  private async evictLRU(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    if (entries.length === 0) return;

    // 计算每个条目的LRU分数（基于最后访问时间和访问频率）
    const scored = entries.map(([key, entry]) => {
      const now = Date.now();
      const timeSinceAccess = now - entry.accessed;
      const accessFrequency = entry.accessCount / Math.max(1, (now - entry.timestamp) / 3600000); // 每小时访问次数
      
      // LRU分数：时间越久 + 访问频率越低 = 分数越高（优先淘汰）
      const score = timeSinceAccess / 1000 - accessFrequency * 100;
      
      return { key, score };
    });

    // 按分数排序，淘汰分数最高的项
    scored.sort((a, b) => b.score - a.score);
    
    // 淘汰最少使用的20%
    const evictCount = Math.max(1, Math.floor(entries.length * 0.2));
    
    for (let i = 0; i < evictCount; i++) {
      this.delete(scored[i].key);
    }
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // 清理过期项
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  // 数据压缩（简单的JSON压缩）
  private compress<T>(data: T): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.warn('Failed to compress cache data:', error);
      return data as any;
    }
  }

  // 数据解压缩
  private decompress<T>(compressed: string): T {
    try {
      return JSON.parse(compressed);
    } catch (error) {
      console.warn('Failed to decompress cache data:', error);
      return compressed as any;
    }
  }

  // 估算内存使用
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // 字符串在内存中占用2字节
      totalSize += this.estimateEntrySize(entry);
    }
    
    return totalSize;
  }

  // 估算缓存项大小
  private estimateEntrySize(entry: CacheEntry<any>): number {
    try {
      const serialized = JSON.stringify(entry);
      return serialized.length * 2; // 粗略估算
    } catch (error) {
      return 100; // 默认值
    }
  }

  // 持久化存储
  private saveToPersistence(): void {
    if (!this.config.persistenceEnabled || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const persistData = {
        cache: Array.from(this.cache.entries()),
        timestamp: Date.now()
      };
      
      const compressed = JSON.stringify(persistData);
      localStorage.setItem('riverbit_asset_cache', compressed);
    } catch (error) {
      console.warn('Failed to save cache to persistence:', error);
    }
  }

  // 从持久化存储加载
  private loadFromPersistence(): void {
    if (!this.config.persistenceEnabled || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('riverbit_asset_cache');
      if (!stored) return;

      const persistData = JSON.parse(stored);
      const now = Date.now();
      
      // 检查持久化数据是否过期（1小时）
      if (now - persistData.timestamp > 3600000) {
        localStorage.removeItem('riverbit_asset_cache');
        return;
      }

      // 恢复缓存数据
      for (const [key, entry] of persistData.cache) {
        if (now - entry.timestamp < entry.ttl) {
          this.cache.set(key, entry);
        }
      }

      console.log(`Restored ${this.cache.size} cache entries from persistence`);
    } catch (error) {
      console.warn('Failed to load cache from persistence:', error);
      localStorage.removeItem('riverbit_asset_cache');
    }
  }

  // 清理资源
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.saveToPersistence();
    this.clear();
  }
}

export default AssetCacheService;