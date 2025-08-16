/**
 * HyperliquidAssetSelector - 仿照 Hyperliquid 的资产选择器
 * 直接集成在交易界面的交易对旁边
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Bitcoin, Building, Search, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useRealTimePrices } from '../../hooks/useRealTimePrices';

// 资产基础信息（不包含价格，价格从API获取）
const ASSETS_INFO = [
  {
    id: 'BTC-PERP',
    symbol: 'BTC',
    name: 'Bitcoin',
    category: 'crypto',
    icon: Bitcoin,
    popular: true
  },
  {
    id: 'ETH-PERP', 
    symbol: 'ETH',
    name: 'Ethereum',
    category: 'crypto',
    icon: Bitcoin,
    popular: true
  },
  {
    id: 'SOL-PERP',
    symbol: 'SOL',
    name: 'Solana',
    category: 'crypto',
    icon: Bitcoin,
    popular: true
  },
  {
    id: 'AAPL-PERP',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    category: 'stock',
    icon: Building,
    popular: true
  },
  {
    id: 'MSFT-PERP',
    symbol: 'MSFT', 
    name: 'Microsoft Corp.',
    category: 'stock',
    icon: Building,
    popular: true
  },
  {
    id: 'TSLA-PERP',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    category: 'stock',
    icon: Building,
    popular: true
  },
  {
    id: 'GOOGL-PERP',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    category: 'stock',
    icon: Building,
    popular: false
  },
  {
    id: 'NVDA-PERP',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    category: 'stock',
    icon: Building,
    popular: true
  }
];

interface HyperliquidAssetSelectorProps {
  selectedAsset: string;
  onAssetSelect: (assetId: string) => void;
  className?: string;
}

const HyperliquidAssetSelector: React.FC<HyperliquidAssetSelectorProps> = ({
  selectedAsset,
  onAssetSelect,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'crypto' | 'stocks'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['BTC-PERP', 'AAPL-PERP']));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // 获取所有资产的实时价格
  const allSymbols = ASSETS_INFO.map(asset => asset.id);
  const { prices, isLoading, getPrice, getAssetIcon } = useRealTimePrices(allSymbols);
  
  // 获取当前选中的资产信息
  const currentAssetInfo = ASSETS_INFO.find(asset => asset.id === selectedAsset) || ASSETS_INFO[0];
  const currentPrice = getPrice(selectedAsset);
  
  // 过滤资产
  const filteredAssets = ASSETS_INFO.filter(asset => {
    const matchesTab = activeTab === 'all' || asset.category === (activeTab === 'crypto' ? 'crypto' : 'stock');
    const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // 计算下拉菜单位置
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  };

  // 点击外部关闭和位置更新
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    if (isOpen) {
      updateDropdownPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  // 资产选择
  const handleAssetSelect = (asset: typeof ASSETS_INFO[0]) => {
    onAssetSelect(asset.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  // 收藏切换
  const toggleFavorite = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(assetId)) {
      newFavorites.delete(assetId);
    } else {
      newFavorites.add(assetId);
    }
    setFavorites(newFavorites);
  };

  return (
    <>
      {/* 触发器 - 仿照 Hyperliquid 的设计 */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800/50 transition-all duration-200 group ${className}`}
      >
        {/* 资产图标 */}
        <div className="p-2 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50">
          {getAssetIcon(selectedAsset) ? (
            <img 
              src={getAssetIcon(selectedAsset)} 
              alt={currentAssetInfo.symbol}
              className="w-6 h-6 rounded-full"
              onError={(e) => {
                // 图标加载失败时使用默认图标
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : (
            <currentAssetInfo.icon className="w-6 h-6 text-white" />
          )}
          <currentAssetInfo.icon className="w-6 h-6 text-white hidden" />
        </div>
        
        {/* 资产信息 */}
        <div className="text-left">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {currentAssetInfo.symbol}/USDT
            </h1>
            {/* 实时价格指示器 */}
            {isLoading && (
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            )}
            {/* Hyperliquid 风格的下拉箭头 */}
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            } group-hover:text-white`} />
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-gray-300 text-sm font-medium">{currentAssetInfo.name} / Tether USDT</p>
            {currentPrice && (
              <span className={`text-xs font-semibold ${
                currentPrice.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {currentPrice.changePercent24h >= 0 ? '+' : ''}{currentPrice.changePercent24h.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </button>

      {/* 下拉菜单 - Hyperliquid 风格，使用 Portal 确保在最顶层 */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden"
          style={{ 
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 99999 
          }}
        >
          {/* 搜索栏 */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* 分类标签 */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex space-x-2">
              {[
                { id: 'all', label: 'All', count: ASSETS_INFO.length },
                { id: 'crypto', label: 'Crypto', count: ASSETS_INFO.filter(a => a.category === 'crypto').length },
                { id: 'stocks', label: 'Stocks', count: ASSETS_INFO.filter(a => a.category === 'stock').length }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  } text-xs`}
                >
                  {tab.label} ({tab.count})
                </Button>
              ))}
            </div>
          </div>

          {/* 资产列表 */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {filteredAssets.length > 0 ? (
              <div className="p-2">
                {filteredAssets.map(asset => {
                  const isSelected = asset.id === selectedAsset;
                  const isFavorited = favorites.has(asset.id);
                  const assetPrice = getPrice(asset.id);
                  const assetIcon = getAssetIcon(asset.id);
                  
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleAssetSelect(asset)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-blue-600/20 border border-blue-500/50' 
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {/* 资产图标 */}
                        <div className={`p-2 rounded-lg ${
                          isSelected 
                            ? 'bg-blue-600/20' 
                            : 'bg-slate-700/50'
                        }`}>
                          {assetIcon ? (
                            <img 
                              src={assetIcon} 
                              alt={asset.symbol}
                              className="w-4 h-4 rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <asset.icon className={`w-4 h-4 text-white ${assetIcon ? 'hidden' : ''}`} />
                        </div>
                        
                        {/* 资产信息 */}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">{asset.symbol}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                asset.category === 'crypto'
                                  ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
                                  : 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                              }`}
                            >
                              {asset.category === 'crypto' ? 'CRYPTO' : 'STOCK'}
                            </Badge>
                            {asset.popular && (
                              <Badge variant="outline" className="text-xs bg-amber-400/10 text-amber-400 border-amber-400/30">
                                HOT
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-400">{asset.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* 价格和涨跌幅 */}
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            {assetPrice ? `$${assetPrice.price.toLocaleString()}` : 'Loading...'}
                          </div>
                          {assetPrice && (
                            <div className={`text-xs flex items-center ${
                              assetPrice.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {assetPrice.changePercent24h >= 0 ? (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              ) : (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              )}
                              {assetPrice.changePercent24h >= 0 ? '+' : ''}{assetPrice.changePercent24h.toFixed(2)}%
                            </div>
                          )}
                        </div>

                        {/* 收藏按钮 */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => toggleFavorite(asset.id, e)}
                          className="p-1 h-8 w-8"
                        >
                          <Star 
                            className={`w-4 h-4 ${
                              isFavorited 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-slate-400 hover:text-yellow-400'
                            }`} 
                          />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="text-slate-400 text-sm">No assets found</div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-xs"
                >
                  Clear search
                </Button>
              </div>
            )}
          </div>

          {/* 底部统计 */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{filteredAssets.length} markets available</span>
              <span>{favorites.size} favorites</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default HyperliquidAssetSelector;