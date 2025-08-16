import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../ui/utils';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Wallet,
  Settings,
  Menu,
  X,
  Zap,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';

interface MobileTradingInterfaceProps {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  onTrade?: (data: any) => Promise<void>;
  positions?: any[];
  orders?: any[];
  isConnected?: boolean;
  onConnect?: () => void;
  className?: string;
}

const MobileTradingInterface: React.FC<MobileTradingInterfaceProps> = ({
  symbol,
  currentPrice,
  priceChange,
  onTrade,
  positions = [],
  orders = [],
  isConnected = false,
  onConnect,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'trade' | 'positions' | 'orderbook' | 'chart'>('trade');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [tradeData, setTradeData] = useState({
    side: 'buy' as 'buy' | 'sell',
    amount: '',
    price: '',
    orderType: 'market' as 'market' | 'limit',
    leverage: 10
  });
  const [quickAmountPercent, setQuickAmountPercent] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 格式化价格显示
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // 快速金额设置
  const setQuickAmount = useCallback((percent: number) => {
    // 这里应该根据实际可用余额计算
    const mockAvailableBalance = 10000;
    const amount = (mockAvailableBalance * percent / 100).toFixed(2);
    setTradeData(prev => ({ ...prev, amount }));
    setQuickAmountPercent(percent);
  }, []);

  // 处理交易提交
  const handleTrade = async () => {
    if (!isConnected) {
      onConnect?.();
      return;
    }
    
    if (!tradeData.amount || parseFloat(tradeData.amount) <= 0) {
      return;
    }

    try {
      await onTrade?.(tradeData);
      setTradeData(prev => ({ ...prev, amount: '', price: '' }));
      setQuickAmountPercent(0);
    } catch (error) {
      console.error('Trade failed:', error);
    }
  };

  // Tab配置
  const tabs = [
    { id: 'trade', label: 'Trade', icon: Zap },
    { id: 'positions', label: 'Positions', icon: Target },
    { id: 'orderbook', label: 'Book', icon: Activity },
    { id: 'chart', label: 'Chart', icon: BarChart3 }
  ];

  const containerClasses = cn(
    'mobile-trading-interface',
    'min-h-screen bg-gradient-to-b from-slate-950 to-slate-900',
    'text-white relative overflow-hidden',
    className
  );

  return (
    <div className={containerClasses}>
      {/* 移动端头部 */}
      <div className="mobile-trading-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <h1 className="text-lg font-bold">RiverBit</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">Connected</span>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30"
              >
                <Wallet className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">Connect</span>
              </button>
            )}
            
            <button className="p-2 text-slate-400 hover:text-white">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 价格显示区域 */}
      <div className="mobile-price-header">
        <div className="text-center">
          <div className="mobile-price-display">
            {formatPrice(currentPrice)}
          </div>
          <div className={cn(
            'mobile-price-change',
            priceChange >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
          </div>
          <div className="text-xs text-slate-400 mt-1">{symbol}</div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="mobile-content-area">
        <div className="mobile-swipe-panel">
          {/* 交易表单标签页 */}
          {activeTab === 'trade' && (
            <div className="p-4 space-y-4">
              {/* 买卖切换 */}
              <div className="mobile-buy-sell-toggle">
                <button
                  onClick={() => setTradeData(prev => ({ ...prev, side: 'buy' }))}
                  className={cn(
                    'mobile-buy-sell-button buy',
                    tradeData.side === 'buy' ? 'active' : ''
                  )}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  BUY
                </button>
                <button
                  onClick={() => setTradeData(prev => ({ ...prev, side: 'sell' }))}
                  className={cn(
                    'mobile-buy-sell-button sell',
                    tradeData.side === 'sell' ? 'active' : ''
                  )}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  SELL
                </button>
              </div>

              {/* 订单类型选择 */}
              <div className="mobile-input-group">
                <label className="mobile-input-label">Order Type</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTradeData(prev => ({ ...prev, orderType: 'market' }))}
                    className={cn(
                      'mobile-quick-button flex-1',
                      tradeData.orderType === 'market' ? 'active' : ''
                    )}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => setTradeData(prev => ({ ...prev, orderType: 'limit' }))}
                    className={cn(
                      'mobile-quick-button flex-1',
                      tradeData.orderType === 'limit' ? 'active' : ''
                    )}
                  >
                    Limit
                  </button>
                </div>
              </div>

              {/* 价格输入 (限价单) */}
              {tradeData.orderType === 'limit' && (
                <div className="mobile-input-group">
                  <label className="mobile-input-label">Price (USDT)</label>
                  <input
                    type="number"
                    value={tradeData.price}
                    onChange={(e) => setTradeData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder={currentPrice.toFixed(2)}
                    className="mobile-input"
                  />
                </div>
              )}

              {/* 数量输入 */}
              <div className="mobile-input-group">
                <label className="mobile-input-label">
                  Amount ({symbol.split('/')[0]})
                </label>
                <input
                  type="number"
                  value={tradeData.amount}
                  onChange={(e) => {
                    setTradeData(prev => ({ ...prev, amount: e.target.value }));
                    setQuickAmountPercent(0);
                  }}
                  placeholder="0.00"
                  className="mobile-input"
                />
                
                {/* 快速金额按钮 */}
                <div className="mobile-quick-buttons mt-2">
                  {[25, 50, 75, 100].map(percent => (
                    <button
                      key={percent}
                      onClick={() => setQuickAmount(percent)}
                      className={cn(
                        'mobile-quick-button',
                        quickAmountPercent === percent ? 'active' : ''
                      )}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 杠杆设置 */}
              <div className="mobile-input-group">
                <div className="flex items-center justify-between mb-2">
                  <label className="mobile-input-label">Leverage</label>
                  <span className="text-sm font-bold text-white">{tradeData.leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={tradeData.leverage}
                  onChange={(e) => setTradeData(prev => ({ ...prev, leverage: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>100x</span>
                </div>
              </div>

              {/* 高级选项切换 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Advanced Options</span>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* 高级选项 */}
              {showAdvanced && (
                <div className="space-y-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Stop Loss</label>
                      <input
                        type="number"
                        placeholder="Stop price"
                        className="mobile-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Take Profit</label>
                      <input
                        type="number"
                        placeholder="Profit price"
                        className="mobile-input text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 交易摘要 */}
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Est. Cost:</span>
                  <span className="font-mono text-white">
                    ${((parseFloat(tradeData.amount) || 0) * currentPrice).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Trading Fee:</span>
                  <span className="font-mono text-white">
                    ${(((parseFloat(tradeData.amount) || 0) * currentPrice) * 0.0004).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 交易按钮 */}
              <button
                onClick={handleTrade}
                className={cn(
                  'w-full h-14 rounded-xl font-bold text-lg tracking-wide',
                  'transition-all duration-200 transform active:scale-98',
                  tradeData.side === 'buy'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/30'
                    : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30'
                )}
              >
                {!isConnected ? (
                  <span>Connect Wallet</span>
                ) : (
                  <span>{tradeData.side.toUpperCase()} {symbol.split('/')[0]}</span>
                )}
              </button>
            </div>
          )}

          {/* 持仓标签页 */}
          {activeTab === 'positions' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Positions ({positions.length})</h3>
                <span className="text-sm text-green-400 font-mono">+$1,234.56</span>
              </div>
              
              {positions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div className="text-lg font-medium">No Open Positions</div>
                  <div className="text-sm mt-1">Your positions will appear here</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 这里会渲染实际的持仓卡片 */}
                  <div className="mobile-position-card">
                    <div className="mobile-position-header">
                      <div>
                        <div className="mobile-position-symbol">BTC/USDT</div>
                        <div className="mobile-position-side long">LONG</div>
                      </div>
                      <div className="text-right">
                        <div className="mobile-position-pnl positive">+$432.10</div>
                        <div className="text-xs text-green-400">+5.67%</div>
                      </div>
                    </div>
                    
                    <div className="mobile-position-details">
                      <div className="mobile-position-row">
                        <span className="mobile-position-label">Size</span>
                        <span className="mobile-position-value">0.1234 BTC</span>
                      </div>
                      <div className="mobile-position-row">
                        <span className="mobile-position-label">Entry Price</span>
                        <span className="mobile-position-value">$65,420.00</span>
                      </div>
                      <div className="mobile-position-row">
                        <span className="mobile-position-label">Mark Price</span>
                        <span className="mobile-position-value">{formatPrice(currentPrice)}</span>
                      </div>
                      <div className="mobile-position-row">
                        <span className="mobile-position-label">Leverage</span>
                        <span className="mobile-position-value">10x</span>
                      </div>
                    </div>
                    
                    <div className="mobile-position-actions">
                      <button className="mobile-position-action-button modify">
                        Modify
                      </button>
                      <button className="mobile-position-action-button close">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 订单簿标签页 */}
          {activeTab === 'orderbook' && (
            <div className="mobile-orderbook">
              <div className="mobile-orderbook-header">
                <div className="mobile-orderbook-title">Order Book - {symbol}</div>
              </div>
              
              <div className="mobile-orderbook-list">
                {/* 卖单 */}
                <div className="space-y-1 p-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={`ask-${i}`} className="mobile-orderbook-item">
                      <span className="mobile-orderbook-price ask">
                        ${(currentPrice + (i + 1) * 10).toFixed(2)}
                      </span>
                      <span className="mobile-orderbook-size">
                        {(Math.random() * 5).toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 中间价格 */}
                <div className="py-3 px-4 bg-slate-800/50 border-y border-slate-700/30">
                  <div className="text-center">
                    <div className="text-lg font-mono font-bold text-white">
                      {formatPrice(currentPrice)}
                    </div>
                    <div className="text-xs text-slate-400">Last Price</div>
                  </div>
                </div>

                {/* 买单 */}
                <div className="space-y-1 p-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={`bid-${i}`} className="mobile-orderbook-item">
                      <span className="mobile-orderbook-price bid">
                        ${(currentPrice - (i + 1) * 10).toFixed(2)}
                      </span>
                      <span className="mobile-orderbook-size">
                        {(Math.random() * 5).toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 图表标签页 */}
          {activeTab === 'chart' && (
            <div className="mobile-chart-container">
              <div className="mobile-chart-header">
                <h3 className="text-sm font-semibold text-white">{symbol} Chart</h3>
                <div className="mobile-chart-timeframes">
                  {['1m', '5m', '1h', '4h', '1D'].map(timeframe => (
                    <button
                      key={timeframe}
                      className={cn(
                        'mobile-timeframe-button',
                        timeframe === '1h' ? 'active' : ''
                      )}
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center bg-slate-800/30">
                <div className="text-center text-slate-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div>Chart Integration</div>
                  <div className="text-xs mt-1">TradingView widget will be loaded here</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部导航 */}
      <div className="mobile-tab-navigation">
        <div className="mobile-tab-buttons">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'mobile-tab-button',
                  activeTab === tab.id ? 'active' : ''
                )}
              >
                <Icon className="mobile-tab-icon" />
                <span className="mobile-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 样式 */}
      <style jsx>{`
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default MobileTradingInterface;