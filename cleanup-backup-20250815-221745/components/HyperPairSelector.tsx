import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Search, 
  Star, 
  TrendingUp, 
  X
} from 'lucide-react';
import { mockTradingPairs } from '../data/mockData';
import TradingViewIcon from './TradingViewIcon';

interface HyperPairSelectorProps {
  selectedPair: string;
  onPairSelect: (pair: string) => void;
  isOpen: boolean;
  onClose: () => void;
  favoriteAssets: string[];
  onToggleFavorite: (symbol: string) => void;
}

const HyperPairSelector: React.FC<HyperPairSelectorProps> = ({
  selectedPair,
  onPairSelect,
  isOpen,
  onClose,
  favoriteAssets,
  onToggleFavorite
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'crypto' | 'xstock' | 'favorites'>('all');

  // 过滤逻辑
  const filteredPairs = useMemo(() => {
    let filtered = mockTradingPairs;

    // 按分类过滤
    if (activeTab === 'crypto') {
      filtered = filtered.filter(pair => pair.type === 'crypto');
    } else if (activeTab === 'xstock') {
      filtered = filtered.filter(pair => pair.type === 'xstock');
    } else if (activeTab === 'favorites') {
      filtered = filtered.filter(pair => favoriteAssets.includes(pair.symbol));
    }

    // 按搜索词过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pair => 
        pair.symbol.toLowerCase().includes(term) ||
        pair.baseAsset.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => {
      // 优先显示收藏的
      const aIsFav = favoriteAssets.includes(a.symbol);
      const bIsFav = favoriteAssets.includes(b.symbol);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      
      // 然后按成交量排序
      return Math.abs(b.change24h) - Math.abs(a.change24h);
    });
  }, [searchTerm, activeTab, favoriteAssets]);

  const handlePairSelect = (symbol: string) => {
    onPairSelect(symbol);
    onClose();
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <VisuallyHidden>
          <DialogTitle>Select Trading Pair</DialogTitle>
          <DialogDescription>
            Choose a trading pair from the list below. You can search, filter by category, and mark favorites.
          </DialogDescription>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Select Market</h3>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 font-medium w-4 h-4" />
            <Input
              placeholder="Search markets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-10 bg-slate-800/50 border-gray-200"
              autoFocus
            />
            {searchTerm && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-3 border-b">
          <div className="flex space-x-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'crypto', label: 'Crypto' },
              { id: 'xstock', label: 'Stocks' },
              { id: 'favorites', label: 'Favorites' }
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab.id as any)}
                className={`h-8 text-xs ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white' 
                    : 'text-gray-300 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Market List */}
        <div className="max-h-80 overflow-y-auto">
          {filteredPairs.length === 0 ? (
            <div className="text-center py-8 text-gray-300 font-medium">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300 font-medium" />
              <p className="text-sm">No markets found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredPairs.map((pair) => (
                <div
                  key={pair.symbol}
                  onClick={() => handlePairSelect(pair.symbol)}
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                    selectedPair === pair.symbol ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(pair.symbol);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Star 
                          className={`w-3 h-3 ${
                            favoriteAssets.includes(pair.symbol) 
                              ? 'text-yellow-500 fill-current' 
                              : 'text-gray-300 font-medium'
                          }`} 
                        />
                      </Button>
                      <TradingViewIcon 
                        symbol={pair.symbol} 
                        size={24}
                        fallback={
                          <div className={`w-6 h-6 ${pair.icon?.color || 'bg-slate-800/500'} rounded-full flex items-center justify-center text-xs font-bold text-white`}>
                            {pair.icon?.symbol || pair.baseAsset.charAt(0)}
                          </div>
                        }
                      />
                      <span className="font-semibold">{pair.baseAsset}</span>
                      <span className="text-gray-300 font-medium text-sm">/{pair.quoteAsset}</span>
                    </div>
                    
                    {pair.type === 'xstock' && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        Stock
                      </Badge>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-semibold tabular-nums">
                      ${pair.price.toLocaleString()}
                    </div>
                    <div className={`text-xs tabular-nums ${
                      pair.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-slate-800/50 text-xs text-gray-300 font-medium text-center">
          {filteredPairs.length} markets • Press ESC to close
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HyperPairSelector;