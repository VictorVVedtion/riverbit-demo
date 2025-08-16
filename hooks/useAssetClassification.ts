/**
 * RiverBit 资产分类系统 Hook
 * Asset Classification System Hook - State Management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Asset, 
  AssetFilter, 
  AssetSortOptions, 
  AssetSortBy,
  AssetGroup,
  CustomAssetGroup,
  AssetType,
  AssetCategory 
} from '../types/asset';
import { AssetClassificationService } from '../services/AssetClassificationService';
import { SearchResult } from '../services/SearchIndexService';

export interface AssetClassificationState {
  // 核心数据
  assets: Asset[];
  groups: AssetGroup[];
  customGroups: CustomAssetGroup[];
  favoriteAssets: Asset[];
  
  // UI状态
  selectedAsset: Asset | null;
  selectedGroup: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  
  // 过滤和排序
  activeFilter: AssetFilter;
  sortOptions: AssetSortOptions;
  
  // 加载状态
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  
  // 性能优化
  virtualScrollEnabled: boolean;
  lazyLoadEnabled: boolean;
}

export interface AssetClassificationActions {
  // 搜索操作
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  getSuggestions: (query: string) => string[];
  
  // 过滤和排序
  setFilter: (filter: Partial<AssetFilter>) => void;
  clearFilter: () => void;
  setSortOptions: (options: AssetSortOptions) => void;
  
  // 资产操作
  selectAsset: (asset: Asset | null) => void;
  addToFavorites: (assetId: string) => Promise<void>;
  removeFromFavorites: (assetId: string) => Promise<void>;
  
  // 分组操作
  selectGroup: (groupId: string | null) => void;
  createCustomGroup: (name: string, description: string, assetIds: string[]) => Promise<CustomAssetGroup>;
  deleteCustomGroup: (groupId: string) => Promise<void>;
  
  // 数据操作
  refreshAssets: () => Promise<void>;
  loadMoreAssets: () => Promise<void>;
  
  // 设置操作
  toggleVirtualScroll: () => void;
  toggleLazyLoad: () => void;
}

export interface UseAssetClassificationOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialFilter?: AssetFilter;
  initialSort?: AssetSortOptions;
  virtualScrollEnabled?: boolean;
  lazyLoadEnabled?: boolean;
}

export function useAssetClassification(
  options: UseAssetClassificationOptions = {}
): AssetClassificationState & AssetClassificationActions {
  
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    initialFilter = {},
    initialSort = { sortBy: AssetSortBy.MARKET_CAP, direction: 'desc' },
    virtualScrollEnabled = true,
    lazyLoadEnabled = true
  } = options;

  // 服务实例
  const [service] = useState(() => AssetClassificationService.getInstance());

  // 状态管理
  const [state, setState] = useState<AssetClassificationState>({
    assets: [],
    groups: [],
    customGroups: [],
    favoriteAssets: [],
    selectedAsset: null,
    selectedGroup: null,
    searchQuery: '',
    searchResults: [],
    activeFilter: initialFilter,
    sortOptions: initialSort,
    loading: true,
    refreshing: false,
    error: null,
    virtualScrollEnabled,
    lazyLoadEnabled
  });

  // 初始化
  useEffect(() => {
    const initializeService = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // 获取初始数据
        const [assets, groups] = await Promise.all([
          service.getAllAssets(),
          service.getGroups()
        ]);

        setState(prev => ({
          ...prev,
          assets,
          groups,
          favoriteAssets: assets.filter(asset => asset.isFavorite),
          loading: false
        }));
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize assets',
          loading: false
        }));
      }
    };

    initializeService();
  }, [service]);

  // 监听服务事件
  useEffect(() => {
    const handleAssetUpdated = (asset: Asset) => {
      setState(prev => ({
        ...prev,
        assets: prev.assets.map(a => a.id === asset.id ? asset : a)
      }));
    };

    const handleAssetsRefreshed = () => {
      const assets = service.getAllAssets();
      setState(prev => ({
        ...prev,
        assets,
        favoriteAssets: assets.filter(asset => asset.isFavorite),
        refreshing: false
      }));
    };

    const handleFavoriteAdded = (asset: Asset) => {
      setState(prev => ({
        ...prev,
        favoriteAssets: [...prev.favoriteAssets, asset]
      }));
    };

    const handleFavoriteRemoved = (asset: Asset) => {
      setState(prev => ({
        ...prev,
        favoriteAssets: prev.favoriteAssets.filter(a => a.id !== asset.id)
      }));
    };

    service.on('assetUpdated', handleAssetUpdated);
    service.on('assetsRefreshed', handleAssetsRefreshed);
    service.on('favoriteAdded', handleFavoriteAdded);
    service.on('favoriteRemoved', handleFavoriteRemoved);

    return () => {
      service.off('assetUpdated', handleAssetUpdated);
      service.off('assetsRefreshed', handleAssetsRefreshed);
      service.off('favoriteAdded', handleFavoriteAdded);
      service.off('favoriteRemoved', handleFavoriteRemoved);
    };
  }, [service]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshAssets();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // 计算过滤后的资产
  const filteredAssets = useMemo(() => {
    let result = state.assets;

    // 应用过滤器
    if (Object.keys(state.activeFilter).length > 0) {
      result = service.filterAssets(state.activeFilter);
    }

    // 应用分组过滤
    if (state.selectedGroup) {
      result = service.getGroupAssets(state.selectedGroup);
    }

    // 应用排序
    result = service.sortAssets(result, state.sortOptions);

    return result;
  }, [state.assets, state.activeFilter, state.selectedGroup, state.sortOptions, service]);

  // 显示的资产（考虑搜索结果）
  const displayAssets = useMemo(() => {
    if (state.searchQuery && state.searchResults.length > 0) {
      return state.searchResults.map(result => result.asset);
    }
    return filteredAssets;
  }, [state.searchQuery, state.searchResults, filteredAssets]);

  // Actions
  const search = useCallback(async (query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
    
    if (!query.trim()) {
      setState(prev => ({ ...prev, searchResults: [] }));
      return;
    }

    try {
      const results = await service.searchAssets(query);
      setState(prev => ({ ...prev, searchResults: results }));
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [service]);

  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      searchResults: []
    }));
  }, []);

  const getSuggestions = useCallback((query: string): string[] => {
    return service.searchService.getSuggestions(query);
  }, [service]);

  const setFilter = useCallback((filter: Partial<AssetFilter>) => {
    setState(prev => ({
      ...prev,
      activeFilter: { ...prev.activeFilter, ...filter }
    }));
  }, []);

  const clearFilter = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeFilter: {}
    }));
  }, []);

  const setSortOptions = useCallback((options: AssetSortOptions) => {
    setState(prev => ({
      ...prev,
      sortOptions: options
    }));
  }, []);

  const selectAsset = useCallback((asset: Asset | null) => {
    setState(prev => ({ ...prev, selectedAsset: asset }));
  }, []);

  const addToFavorites = useCallback(async (assetId: string) => {
    try {
      await service.addToFavorites(assetId);
    } catch (error) {
      console.error('Failed to add to favorites:', error);
    }
  }, [service]);

  const removeFromFavorites = useCallback(async (assetId: string) => {
    try {
      await service.removeFromFavorites(assetId);
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
    }
  }, [service]);

  const selectGroup = useCallback((groupId: string | null) => {
    setState(prev => ({ ...prev, selectedGroup: groupId }));
  }, []);

  const createCustomGroup = useCallback(async (
    name: string, 
    description: string, 
    assetIds: string[]
  ): Promise<CustomAssetGroup> => {
    try {
      const customGroup = await service.createCustomGroup(name, description, assetIds);
      setState(prev => ({
        ...prev,
        customGroups: [...prev.customGroups, customGroup]
      }));
      return customGroup;
    } catch (error) {
      console.error('Failed to create custom group:', error);
      throw error;
    }
  }, [service]);

  const deleteCustomGroup = useCallback(async (groupId: string) => {
    try {
      await service.deleteCustomGroup(groupId);
      setState(prev => ({
        ...prev,
        customGroups: prev.customGroups.filter(group => group.id !== groupId)
      }));
    } catch (error) {
      console.error('Failed to delete custom group:', error);
      throw error;
    }
  }, [service]);

  const refreshAssets = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, refreshing: true, error: null }));
      
      // 触发服务刷新
      await service.refreshAssetData();
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh assets',
        refreshing: false
      }));
    }
  }, [service]);

  const loadMoreAssets = useCallback(async () => {
    // 实现懒加载逻辑
    // 这里可以加载更多资产或页面
    console.log('Loading more assets...');
  }, []);

  const toggleVirtualScroll = useCallback(() => {
    setState(prev => ({
      ...prev,
      virtualScrollEnabled: !prev.virtualScrollEnabled
    }));
  }, []);

  const toggleLazyLoad = useCallback(() => {
    setState(prev => ({
      ...prev,
      lazyLoadEnabled: !prev.lazyLoadEnabled
    }));
  }, []);

  return {
    // State
    ...state,
    
    // Computed values
    assets: displayAssets,
    
    // Actions
    search,
    clearSearch,
    getSuggestions,
    setFilter,
    clearFilter,
    setSortOptions,
    selectAsset,
    addToFavorites,
    removeFromFavorites,
    selectGroup,
    createCustomGroup,
    deleteCustomGroup,
    refreshAssets,
    loadMoreAssets,
    toggleVirtualScroll,
    toggleLazyLoad
  };
}

// 资产选择器Hook
export function useAssetSelector() {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  const selectAsset = useCallback((assetId: string) => {
    setSelectedAssets(prev => new Set([...prev, assetId]));
  }, []);

  const deselectAsset = useCallback((assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      newSet.delete(assetId);
      return newSet;
    });
  }, []);

  const toggleAsset = useCallback((assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((assetIds: string[]) => {
    setSelectedAssets(new Set(assetIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAssets(new Set());
  }, []);

  const isSelected = useCallback((assetId: string) => {
    return selectedAssets.has(assetId);
  }, [selectedAssets]);

  return {
    selectedAssets: Array.from(selectedAssets),
    selectedCount: selectedAssets.size,
    selectAsset,
    deselectAsset,
    toggleAsset,
    selectAll,
    clearSelection,
    isSelected
  };
}

// 资产比较Hook
export function useAssetComparison() {
  const [comparisonAssets, setComparisonAssets] = useState<Asset[]>([]);

  const addToComparison = useCallback((asset: Asset) => {
    setComparisonAssets(prev => {
      if (prev.length >= 4) return prev; // 最多比较4个资产
      if (prev.find(a => a.id === asset.id)) return prev; // 避免重复
      return [...prev, asset];
    });
  }, []);

  const removeFromComparison = useCallback((assetId: string) => {
    setComparisonAssets(prev => prev.filter(asset => asset.id !== assetId));
  }, []);

  const clearComparison = useCallback(() => {
    setComparisonAssets([]);
  }, []);

  const canAddMore = comparisonAssets.length < 4;

  return {
    comparisonAssets,
    addToComparison,
    removeFromComparison,
    clearComparison,
    canAddMore,
    count: comparisonAssets.length
  };
}

export default useAssetClassification;