/**
 * RiverBit 资产分类服务
 * Asset Classification Service - Core Architecture
 */

import { 
  Asset, 
  AssetBase, 
  AssetFilter, 
  AssetSortOptions, 
  AssetSortBy, 
  AssetGroup, 
  CustomAssetGroup,
  AssetType,
  AssetCategory,
  CRYPTO_ASSETS,
  STOCK_ASSETS,
  DEFAULT_ASSET_GROUPS,
  ASSET_CATEGORIES
} from '../types/asset';
import { MarketDataService } from './MarketDataService';
import { AssetCacheService } from './AssetCacheService';
import { SearchIndexService } from './SearchIndexService';

export class AssetClassificationService {
  private static instance: AssetClassificationService;
  private marketDataService: MarketDataService;
  private cacheService: AssetCacheService;
  private searchService: SearchIndexService;
  
  private assets: Map<string, Asset> = new Map();
  private groups: Map<string, AssetGroup> = new Map();
  private customGroups: Map<string, CustomAssetGroup> = new Map();
  private favoriteAssets: Set<string> = new Set();
  
  // 事件监听器
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.marketDataService = MarketDataService.getInstance();
    this.cacheService = new AssetCacheService();
    this.searchService = new SearchIndexService();
    
    this.initialize();
  }

  public static getInstance(): AssetClassificationService {
    if (!AssetClassificationService.instance) {
      AssetClassificationService.instance = new AssetClassificationService();
    }
    return AssetClassificationService.instance;
  }

  // 初始化服务
  private async initialize(): Promise<void> {
    try {
      // 1. 加载基础资产数据
      await this.loadBaseAssets();
      
      // 2. 初始化默认分组
      await this.initializeDefaultGroups();
      
      // 3. 加载用户偏好设置
      await this.loadUserPreferences();
      
      // 4. 建立搜索索引
      await this.buildSearchIndex();
      
      // 5. 启动实时数据更新
      this.startRealtimeUpdates();
      
      console.log('Asset Classification Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Asset Classification Service:', error);
      throw error;
    }
  }

  // 加载基础资产数据
  private async loadBaseAssets(): Promise<void> {
    const allAssets = [...CRYPTO_ASSETS, ...STOCK_ASSETS];
    
    for (const baseAsset of allAssets) {
      try {
        // 获取市场数据
        const marketData = await this.marketDataService.getAssetMarketData(baseAsset.symbol);
        
        // 构建完整资产对象
        const asset: Asset = {
          ...baseAsset,
          marketData,
          isFavorite: false,
          isPopular: false,
          trending: false,
          tags: this.generateAssetTags(baseAsset),
          metadata: this.getAssetMetadata(baseAsset)
        };
        
        this.assets.set(asset.id, asset);
        
        // 缓存资产数据
        await this.cacheService.setAsset(asset.id, asset);
        
      } catch (error) {
        console.error(`Failed to load asset ${baseAsset.symbol}:`, error);
      }
    }
  }

  // 初始化默认分组
  private async initializeDefaultGroups(): Promise<void> {
    for (const groupConfig of DEFAULT_ASSET_GROUPS) {
      const assets = this.getAssetsByGroup(groupConfig);
      
      const group: AssetGroup = {
        ...groupConfig,
        assets
      };
      
      this.groups.set(group.id, group);
    }
  }

  // 根据分组配置获取资产
  private getAssetsByGroup(groupConfig: Omit<AssetGroup, 'assets'>): Asset[] {
    const allAssets = Array.from(this.assets.values());
    
    // 特殊分组处理
    if (groupConfig.id === 'favorites') {
      return allAssets.filter(asset => asset.isFavorite);
    }
    
    // 按类型和分类过滤
    return allAssets.filter(asset => {
      if (groupConfig.type && asset.type !== groupConfig.type) {
        return false;
      }
      if (groupConfig.category && asset.category !== groupConfig.category) {
        return false;
      }
      return true;
    });
  }

  // 生成资产标签
  private generateAssetTags(asset: AssetBase): string[] {
    const tags: string[] = [];
    
    // 基础标签
    tags.push(asset.type, asset.category);
    
    // 特殊标签
    if (asset.category === AssetCategory.MAGNIFICENT_7) {
      tags.push('mega-cap', 'blue-chip');
    }
    
    if (asset.category === AssetCategory.LAYER_1) {
      tags.push('blockchain', 'infrastructure');
    }
    
    if (asset.type === AssetType.CRYPTO) {
      tags.push('cryptocurrency', 'digital-asset');
    }
    
    if (asset.type === AssetType.STOCK) {
      tags.push('equity', 'stock-market');
    }
    
    return tags;
  }

  // 获取资产元数据
  private getAssetMetadata(asset: AssetBase): Asset['metadata'] {
    const metadata: Asset['metadata'] = {};
    
    // 根据资产类型设置相应的元数据
    if (asset.type === AssetType.CRYPTO) {
      // 设置加密货币相关的元数据
      metadata.coingeckoId = asset.symbol.toLowerCase().replace('/usdt', '');
    }
    
    return metadata;
  }

  // 构建搜索索引
  private async buildSearchIndex(): Promise<void> {
    const assets = Array.from(this.assets.values());
    await this.searchService.buildIndex(assets);
  }

  // 启动实时数据更新
  private startRealtimeUpdates(): void {
    // 订阅市场数据更新
    this.marketDataService.on('priceUpdate', (data: any) => {
      this.handlePriceUpdate(data);
    });
    
    // 定期刷新资产数据
    setInterval(() => {
      this.refreshAssetData();
    }, 30000); // 30秒刷新一次
  }

  // 处理价格更新
  private handlePriceUpdate(priceData: any): void {
    const asset = this.assets.get(priceData.symbol);
    if (asset) {
      // 更新市场数据
      asset.marketData = {
        ...asset.marketData,
        ...priceData,
        lastUpdate: Date.now()
      };
      
      // 更新缓存
      this.cacheService.setAsset(asset.id, asset);
      
      // 触发更新事件
      this.emit('assetUpdated', asset);
    }
  }

  // 刷新资产数据
  private async refreshAssetData(): Promise<void> {
    try {
      const symbols = Array.from(this.assets.keys());
      const marketDataBatch = await this.marketDataService.getBatchMarketData(symbols);
      
      for (const [assetId, marketData] of marketDataBatch.entries()) {
        const asset = this.assets.get(assetId);
        if (asset) {
          asset.marketData = marketData;
          await this.cacheService.setAsset(assetId, asset);
        }
      }
      
      this.emit('assetsRefreshed');
    } catch (error) {
      console.error('Failed to refresh asset data:', error);
    }
  }

  // 公共API方法

  // 获取所有资产
  public getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  // 获取资产
  public getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  // 搜索资产
  public async searchAssets(query: string): Promise<Asset[]> {
    if (!query.trim()) {
      return this.getAllAssets();
    }
    
    const searchResults = await this.searchService.search(query);
    return searchResults;
  }

  // 过滤资产
  public filterAssets(filter: AssetFilter): Asset[] {
    let assets = Array.from(this.assets.values());
    
    // 按类型过滤
    if (filter.types && filter.types.length > 0) {
      assets = assets.filter(asset => filter.types!.includes(asset.type));
    }
    
    // 按分类过滤
    if (filter.categories && filter.categories.length > 0) {
      assets = assets.filter(asset => filter.categories!.includes(asset.category));
    }
    
    // 按收藏过滤
    if (filter.favorites) {
      assets = assets.filter(asset => asset.isFavorite);
    }
    
    // 按热门过滤
    if (filter.trending) {
      assets = assets.filter(asset => asset.trending);
    }
    
    // 按价格范围过滤
    if (filter.priceRange) {
      assets = assets.filter(asset => 
        asset.marketData.price >= filter.priceRange!.min &&
        asset.marketData.price <= filter.priceRange!.max
      );
    }
    
    // 按变动范围过滤
    if (filter.changeFilter) {
      const { period, min, max } = filter.changeFilter;
      assets = assets.filter(asset => {
        let change: number;
        switch (period) {
          case '1h':
            change = asset.marketData.priceChange.changePercent1h;
            break;
          case '24h':
            change = asset.marketData.priceChange.changePercent24h;
            break;
          case '7d':
            change = asset.marketData.priceChange.changePercent7d;
            break;
          default:
            change = asset.marketData.priceChange.changePercent24h;
        }
        return change >= min && change <= max;
      });
    }
    
    return assets;
  }

  // 排序资产
  public sortAssets(assets: Asset[], options: AssetSortOptions): Asset[] {
    return assets.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (options.sortBy) {
        case AssetSortBy.NAME:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case AssetSortBy.SYMBOL:
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case AssetSortBy.PRICE:
          aValue = a.marketData.price;
          bValue = b.marketData.price;
          break;
        case AssetSortBy.CHANGE_24H:
          aValue = a.marketData.priceChange.changePercent24h;
          bValue = b.marketData.priceChange.changePercent24h;
          break;
        case AssetSortBy.VOLUME_24H:
          aValue = a.marketData.volume24h;
          bValue = b.marketData.volume24h;
          break;
        case AssetSortBy.MARKET_CAP:
          aValue = a.marketData.marketCap || 0;
          bValue = b.marketData.marketCap || 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        return options.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return options.direction === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    });
  }

  // 获取分组
  public getGroups(): AssetGroup[] {
    return Array.from(this.groups.values()).sort((a, b) => a.order - b.order);
  }

  // 获取分组资产
  public getGroupAssets(groupId: string): Asset[] {
    const group = this.groups.get(groupId);
    if (!group) return [];
    
    // 实时更新分组中的资产
    if (groupId === 'favorites') {
      return this.getAllAssets().filter(asset => asset.isFavorite);
    }
    
    return this.getAssetsByGroup(group);
  }

  // 添加到收藏
  public async addToFavorites(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (asset) {
      asset.isFavorite = true;
      this.favoriteAssets.add(assetId);
      
      // 更新缓存
      await this.cacheService.setAsset(assetId, asset);
      
      // 保存用户偏好
      await this.saveUserPreferences();
      
      this.emit('favoriteAdded', asset);
    }
  }

  // 从收藏移除
  public async removeFromFavorites(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (asset) {
      asset.isFavorite = false;
      this.favoriteAssets.delete(assetId);
      
      // 更新缓存
      await this.cacheService.setAsset(assetId, asset);
      
      // 保存用户偏好
      await this.saveUserPreferences();
      
      this.emit('favoriteRemoved', asset);
    }
  }

  // 创建自定义分组
  public async createCustomGroup(
    name: string, 
    description: string, 
    assetIds: string[]
  ): Promise<CustomAssetGroup> {
    const id = `custom_${Date.now()}`;
    const customGroup: CustomAssetGroup = {
      id,
      name,
      description,
      type: AssetType.CRYPTO, // 默认类型
      assetIds,
      isCustom: true,
      order: this.groups.size,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.customGroups.set(id, customGroup);
    
    // 保存到本地存储
    await this.saveCustomGroups();
    
    this.emit('customGroupCreated', customGroup);
    return customGroup;
  }

  // 删除自定义分组
  public async deleteCustomGroup(groupId: string): Promise<void> {
    if (this.customGroups.has(groupId)) {
      this.customGroups.delete(groupId);
      await this.saveCustomGroups();
      this.emit('customGroupDeleted', groupId);
    }
  }

  // 保存用户偏好
  private async saveUserPreferences(): Promise<void> {
    const preferences = {
      favoriteAssets: Array.from(this.favoriteAssets),
      lastUpdated: Date.now()
    };
    
    localStorage.setItem('riverbit_user_preferences', JSON.stringify(preferences));
  }

  // 加载用户偏好
  private async loadUserPreferences(): Promise<void> {
    try {
      const stored = localStorage.getItem('riverbit_user_preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.favoriteAssets = new Set(preferences.favoriteAssets || []);
        
        // 更新资产收藏状态
        for (const assetId of this.favoriteAssets) {
          const asset = this.assets.get(assetId);
          if (asset) {
            asset.isFavorite = true;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }

  // 保存自定义分组
  private async saveCustomGroups(): Promise<void> {
    const groups = Array.from(this.customGroups.values());
    localStorage.setItem('riverbit_custom_groups', JSON.stringify(groups));
  }

  // 加载自定义分组
  private async loadCustomGroups(): Promise<void> {
    try {
      const stored = localStorage.getItem('riverbit_custom_groups');
      if (stored) {
        const groups = JSON.parse(stored);
        for (const group of groups) {
          this.customGroups.set(group.id, group);
        }
      }
    } catch (error) {
      console.error('Failed to load custom groups:', error);
    }
  }

  // 事件系统
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // 清理资源
  public destroy(): void {
    this.listeners.clear();
    this.assets.clear();
    this.groups.clear();
    this.customGroups.clear();
    this.favoriteAssets.clear();
  }
}

export default AssetClassificationService;