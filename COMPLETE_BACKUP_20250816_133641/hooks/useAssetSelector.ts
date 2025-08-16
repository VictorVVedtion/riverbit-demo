/**
 * useAssetSelector - 资产选择器状态管理 Hook
 * 
 * 功能特色：
 * - 统一的资产选择状态管理
 * - 搜索和过滤逻辑
 * - 收藏功能管理
 * - 历史记录追踪
 * - 本地存储持久化
 * - 性能优化
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Asset, AssetFilter, AssetSortBy, AssetSortOptions } from '../types/asset';

interface AssetSelectorState {
  // 选中状态
  selectedAsset: Asset | null;
  
  // 搜索和过滤
  searchQuery: string;
  filter: AssetFilter;
  sortOptions: AssetSortOptions;
  
  // UI 状态
  isOpen: boolean;
  activeCategory: string;
  viewMode: 'grid' | 'list';
  
  // 收藏和历史
  favorites: Set<string>;
  searchHistory: string[];
  recentlySelected: Asset[];
}

interface UseAssetSelectorOptions {
  /** 资产列表 */
  assets: Asset[];
  
  /** 初始选中的资产 */
  initialAsset?: Asset;
  
  /** 是否启用本地存储 */
  enablePersistence?: boolean;
  
  /** 本地存储键前缀 */
  storageKeyPrefix?: string;
  
  /** 最大搜索历史条数 */
  maxSearchHistory?: number;
  
  /** 最大最近选择条数 */
  maxRecentlySelected?: number;
  
  /** 默认排序选项 */
  defaultSortOptions?: AssetSortOptions;
  
  /** 资产选择回调 */
  onAssetSelect?: (asset: Asset) => void;
  
  /** 收藏变化回调 */
  onFavoritesChange?: (favorites: Set<string>) => void;
}

/**
 * useAssetSelector Hook
 */
export function useAssetSelector({
  assets,
  initialAsset,
  enablePersistence = true,
  storageKeyPrefix = 'asset-selector',
  maxSearchHistory = 10,
  maxRecentlySelected = 20,
  defaultSortOptions = { sortBy: AssetSortBy.NAME, direction: 'asc' },
  onAssetSelect,
  onFavoritesChange
}: UseAssetSelectorOptions) {
  
  // 状态键
  const storageKeys = useMemo(() => ({
    favorites: `${storageKeyPrefix}-favorites`,
    searchHistory: `${storageKeyPrefix}-search-history`,
    recentlySelected: `${storageKeyPrefix}-recently-selected`,
    preferences: `${storageKeyPrefix}-preferences`
  }), [storageKeyPrefix]);

  // 从本地存储加载初始状态
  const loadFromStorage = useCallback(<T>(key: string, defaultValue: T): T => {
    if (!enablePersistence || typeof window === 'undefined') {
      return defaultValue;
    }
    
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load from localStorage (${key}):`, error);
      return defaultValue;
    }
  }, [enablePersistence]);

  // 保存到本地存储
  const saveToStorage = useCallback((key: string, value: any) => {
    if (!enablePersistence || typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save to localStorage (${key}):`, error);
    }
  }, [enablePersistence]);

  // 主要状态
  const [state, setState] = useState<AssetSelectorState>(() => {
    const savedFavorites = loadFromStorage(storageKeys.favorites, []);
    const savedSearchHistory = loadFromStorage(storageKeys.searchHistory, []);
    const savedRecentlySelected = loadFromStorage(storageKeys.recentlySelected, []);
    const savedPreferences = loadFromStorage(storageKeys.preferences, {});

    return {
      selectedAsset: initialAsset || null,
      searchQuery: '',
      filter: {},
      sortOptions: savedPreferences.sortOptions || defaultSortOptions,
      isOpen: false,
      activeCategory: 'all',
      viewMode: savedPreferences.viewMode || 'list',
      favorites: new Set(savedFavorites),
      searchHistory: savedSearchHistory,
      recentlySelected: savedRecentlySelected
    };
  });

  // 防抖的搜索查询
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(state.searchQuery);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(state.searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [state.searchQuery]);

  // 过滤和排序资产
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;

    // 应用过滤器
    if (state.filter.types && state.filter.types.length > 0) {
      filtered = filtered.filter(asset => state.filter.types!.includes(asset.type));
    }

    if (state.filter.categories && state.filter.categories.length > 0) {
      filtered = filtered.filter(asset => state.filter.categories!.includes(asset.category));
    }

    if (state.filter.favorites) {
      filtered = filtered.filter(asset => state.favorites.has(asset.id));
    }

    if (state.filter.trending) {
      filtered = filtered.filter(asset => asset.trending);
    }

    if (state.filter.popular) {
      filtered = filtered.filter(asset => asset.isPopular);
    }

    if (state.filter.priceRange) {
      const { min, max } = state.filter.priceRange;
      filtered = filtered.filter(asset => 
        asset.marketData.price >= min && asset.marketData.price <= max
      );
    }

    if (state.filter.volumeRange) {
      const { min, max } = state.filter.volumeRange;
      filtered = filtered.filter(asset => 
        asset.marketData.volume24h >= min && asset.marketData.volume24h <= max
      );
    }

    // 应用搜索查询
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(asset =>
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query) ||
        asset.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 应用排序
    const { sortBy, direction } = state.sortOptions;
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case AssetSortBy.NAME:
          comparison = a.name.localeCompare(b.name);
          break;
        case AssetSortBy.SYMBOL:
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case AssetSortBy.PRICE:
          comparison = a.marketData.price - b.marketData.price;
          break;
        case AssetSortBy.CHANGE_24H:
          comparison = a.marketData.priceChange.changePercent24h - b.marketData.priceChange.changePercent24h;
          break;
        case AssetSortBy.VOLUME_24H:
          comparison = a.marketData.volume24h - b.marketData.volume24h;
          break;
        case AssetSortBy.MARKET_CAP:
          comparison = (a.marketData.marketCap || 0) - (b.marketData.marketCap || 0);
          break;
        case AssetSortBy.TRENDING:
          comparison = (Number(b.trending) - Number(a.trending)) || 
                      (Number(b.isPopular) - Number(a.isPopular));
          break;
        default:
          comparison = 0;
      }
      
      return direction === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [assets, state.filter, state.favorites, debouncedSearchQuery, state.sortOptions]);

  // 分类资产
  const categorizedAssets = useMemo(() => {
    const favoriteAssets = assets.filter(asset => state.favorites.has(asset.id));
    const cryptoAssets = assets.filter(asset => asset.type === 'crypto');
    const stockAssets = assets.filter(asset => asset.type === 'stock');
    const trendingAssets = assets.filter(asset => asset.trending);

    return {
      all: filteredAndSortedAssets,
      favorites: favoriteAssets.filter(asset => 
        filteredAndSortedAssets.some(filtered => filtered.id === asset.id)
      ),
      crypto: cryptoAssets.filter(asset => 
        filteredAndSortedAssets.some(filtered => filtered.id === asset.id)
      ),
      stocks: stockAssets.filter(asset => 
        filteredAndSortedAssets.some(filtered => filtered.id === asset.id)
      ),
      trending: trendingAssets.filter(asset => 
        filteredAndSortedAssets.some(filtered => filtered.id === asset.id)
      )
    };
  }, [assets, state.favorites, filteredAndSortedAssets]);

  // 获取当前分类的资产
  const currentCategoryAssets = useMemo(() => {
    return categorizedAssets[state.activeCategory as keyof typeof categorizedAssets] || categorizedAssets.all;
  }, [categorizedAssets, state.activeCategory]);

  // 更新状态的通用方法
  const updateState = useCallback((updates: Partial<AssetSelectorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 选择资产
  const selectAsset = useCallback((asset: Asset) => {
    // 更新最近选择列表
    const updatedRecentlySelected = [
      asset,
      ...state.recentlySelected.filter(item => item.id !== asset.id)
    ].slice(0, maxRecentlySelected);

    updateState({
      selectedAsset: asset,
      recentlySelected: updatedRecentlySelected,
      isOpen: false
    });

    // 保存到本地存储
    saveToStorage(storageKeys.recentlySelected, updatedRecentlySelected);

    // 触发回调
    onAssetSelect?.(asset);
  }, [state.recentlySelected, maxRecentlySelected, updateState, saveToStorage, storageKeys.recentlySelected, onAssetSelect]);

  // 切换收藏
  const toggleFavorite = useCallback((assetId: string) => {
    const newFavorites = new Set(state.favorites);
    
    if (newFavorites.has(assetId)) {
      newFavorites.delete(assetId);
    } else {
      newFavorites.add(assetId);
    }

    updateState({ favorites: newFavorites });

    // 保存到本地存储
    saveToStorage(storageKeys.favorites, Array.from(newFavorites));

    // 触发回调
    onFavoritesChange?.(newFavorites);
  }, [state.favorites, updateState, saveToStorage, storageKeys.favorites, onFavoritesChange]);

  // 更新搜索查询
  const updateSearchQuery = useCallback((query: string) => {
    updateState({ searchQuery: query });
  }, [updateState]);

  // 添加到搜索历史
  const addToSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    const updatedHistory = [
      query,
      ...state.searchHistory.filter(item => item !== query)
    ].slice(0, maxSearchHistory);

    updateState({ searchHistory: updatedHistory });
    saveToStorage(storageKeys.searchHistory, updatedHistory);
  }, [state.searchHistory, maxSearchHistory, updateState, saveToStorage, storageKeys.searchHistory]);

  // 更新过滤器
  const updateFilter = useCallback((filter: AssetFilter) => {
    updateState({ filter });
  }, [updateState]);

  // 更新排序选项
  const updateSortOptions = useCallback((sortOptions: AssetSortOptions) => {
    updateState({ sortOptions });
    
    // 保存偏好设置
    const preferences = { sortOptions, viewMode: state.viewMode };
    saveToStorage(storageKeys.preferences, preferences);
  }, [updateState, state.viewMode, saveToStorage, storageKeys.preferences]);

  // 更新分类
  const updateActiveCategory = useCallback((category: string) => {
    updateState({ activeCategory: category });
  }, [updateState]);

  // 更新视图模式
  const updateViewMode = useCallback((viewMode: 'grid' | 'list') => {
    updateState({ viewMode });
    
    // 保存偏好设置
    const preferences = { sortOptions: state.sortOptions, viewMode };
    saveToStorage(storageKeys.preferences, preferences);
  }, [updateState, state.sortOptions, saveToStorage, storageKeys.preferences]);

  // 开关下拉菜单
  const toggleOpen = useCallback(() => {
    updateState({ isOpen: !state.isOpen });
  }, [state.isOpen, updateState]);

  // 清除搜索
  const clearSearch = useCallback(() => {
    updateState({ searchQuery: '', filter: {} });
  }, [updateState]);

  // 清除过滤器
  const clearFilters = useCallback(() => {
    updateState({ filter: {} });
  }, [updateState]);

  // 重置状态
  const reset = useCallback(() => {
    updateState({
      searchQuery: '',
      filter: {},
      activeCategory: 'all',
      isOpen: false
    });
  }, [updateState]);

  // 清理效果
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 返回状态和方法
  return {
    // 状态
    selectedAsset: state.selectedAsset,
    searchQuery: state.searchQuery,
    debouncedSearchQuery,
    filter: state.filter,
    sortOptions: state.sortOptions,
    isOpen: state.isOpen,
    activeCategory: state.activeCategory,
    viewMode: state.viewMode,
    favorites: state.favorites,
    searchHistory: state.searchHistory,
    recentlySelected: state.recentlySelected,

    // 计算属性
    filteredAssets: filteredAndSortedAssets,
    categorizedAssets,
    currentCategoryAssets,

    // 方法
    selectAsset,
    toggleFavorite,
    updateSearchQuery,
    addToSearchHistory,
    updateFilter,
    updateSortOptions,
    updateActiveCategory,
    updateViewMode,
    toggleOpen,
    clearSearch,
    clearFilters,
    reset,

    // 统计
    stats: {
      totalAssets: assets.length,
      filteredCount: filteredAndSortedAssets.length,
      favoritesCount: state.favorites.size,
      categoryCounts: {
        all: categorizedAssets.all.length,
        favorites: categorizedAssets.favorites.length,
        crypto: categorizedAssets.crypto.length,
        stocks: categorizedAssets.stocks.length,
        trending: categorizedAssets.trending.length
      }
    }
  };
}

// 导出类型
export type UseAssetSelectorReturn = ReturnType<typeof useAssetSelector>;
export type { UseAssetSelectorOptions };