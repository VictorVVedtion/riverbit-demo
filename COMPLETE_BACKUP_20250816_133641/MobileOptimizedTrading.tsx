import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  TrendingUp, TrendingDown, Settings, MoreHorizontal, 
  Zap, Shield, Target, ChevronUp, ChevronDown, Maximize2
} from 'lucide-react';

interface MobileOptimizedTradingProps {
  selectedPair: string;
  currentPrice: number;
  change24h: number;
  onTrade: (side: 'buy' | 'sell', amount: string, leverage: number) => void;
}

const MobileOptimizedTrading: React.FC<MobileOptimizedTradingProps> = ({
  selectedPair,
  currentPrice,
  change24h,
  onTrade
}) => {
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  
  const leverageSliderRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // 手势滑动杠杆调整
  const handleLeverageTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    const rect = leverageSliderRef.current?.getBoundingClientRect();
    if (!rect) return;

    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newLeverage = Math.round(percentage * 100) || 1;
    
    setLeverage(Math.min(100, Math.max(1, newLeverage)));
    
    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // 快速金额选择
  const quickAmountSelection = (percentage: number) => {
    const balance = 10000; // 模拟余额
    const quickAmount = (balance * percentage / 100).toString();
    setAmount(quickAmount);
    
    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };

  // 双击快速最大杠杆
  const handleDoubleTap = () => {
    setLeverage(100);
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background mobile-optimized-container">
      {/* 移动端顶部价格栏 - 紧凑设计 */}
      <div className="glass-nav px-4 py-3 border-b border-border-light flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-river-blue-main rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">₿</span>
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">{selectedPair}</div>
              <div className="text-xs text-muted-foreground">Perpetual</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="data-professional font-bold text-lg">
              ${currentPrice.toLocaleString()}
            </div>
            <div className={`text-sm font-medium flex items-center justify-end space-x-1 ${
              change24h >= 0 ? 'text-success-500' : 'text-danger-500'
            }`}>
              {change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要交易区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 移动端多空选择 - 手势友好 */}
        <Card className="glass-premium border-primary/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOrderSide('buy')}
                className={`h-14 rounded-xl font-bold text-base transition-all duration-300 mobile-touch-friendly relative overflow-hidden ${
                  orderSide === 'buy'
                    ? 'bg-gradient-to-r from-success-600 to-success-500 text-white shadow-lg scale-[1.02]'
                    : 'border-2 border-success-500/30 text-success-500 hover:bg-success-500/10'
                }`}
              >
                <span className="flex items-center justify-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>开多 LONG</span>
                </span>
              </button>
              
              <button
                onClick={() => setOrderSide('sell')}
                className={`h-14 rounded-xl font-bold text-base transition-all duration-300 mobile-touch-friendly relative overflow-hidden ${
                  orderSide === 'sell'
                    ? 'bg-gradient-to-r from-danger-600 to-danger-500 text-white shadow-lg scale-[1.02]'
                    : 'border-2 border-danger-500/30 text-danger-500 hover:bg-danger-500/10'
                }`}
              >
                <span className="flex items-center justify-center space-x-2">
                  <TrendingDown className="w-5 h-5" />
                  <span>开空 SHORT</span>
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 杠杆选择 - 手势滑动 */}
        <Card className="glass-premium border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <label className="font-semibold tracking-wide">杠杆倍数</label>
              <div className="flex items-center space-x-2">
                <span className={`data-professional font-bold text-xl ${
                  leverage <= 10 ? 'text-success-500' :
                  leverage <= 50 ? 'text-warning-500' : 'text-danger-500'
                }`}>
                  {leverage}x
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  leverage <= 10 ? 'bg-success-500' :
                  leverage <= 50 ? 'bg-warning-500' : 'bg-danger-500'
                } animate-pulse`}></div>
              </div>
            </div>
            
            {/* 手势滑动杠杆条 */}
            <div 
              ref={leverageSliderRef}
              className="relative h-12 bg-surface-2 rounded-xl mb-4 overflow-hidden cursor-pointer"
              onTouchMove={handleLeverageTouch}
              onDoubleClick={handleDoubleTap}
            >
              {/* 背景渐变 */}
              <div className="absolute inset-0 bg-gradient-to-r from-success-500/20 via-warning-500/20 to-danger-500/20"></div>
              
              {/* 滑块 */}
              <div 
                className="absolute top-1 bottom-1 w-8 bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center"
                style={{ left: `${(leverage / 100) * (100 - 8)}%` }}
              >
                <div className="w-1 h-4 bg-white/60 rounded-full"></div>
              </div>
              
              {/* 刻度标记 */}
              <div className="absolute inset-0 flex items-center justify-between px-2">
                {[10, 25, 50, 75, 100].map((mark) => (
                  <div key={mark} className="text-xs text-muted-foreground font-medium">
                    {mark}
                  </div>
                ))}
              </div>
            </div>
            
            {/* 快速杠杆按钮 */}
            <div className="grid grid-cols-5 gap-2">
              {[10, 25, 50, 75, 100].map((lev) => (
                <Button
                  key={lev}
                  size="sm"
                  variant={leverage === lev ? "default" : "outline"}
                  onClick={() => setLeverage(lev)}
                  className="h-8 text-xs mobile-touch-friendly"
                >
                  {lev}x
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 交易金额 - 优化的移动端输入 */}
        <Card className="glass-premium border-primary/20">
          <CardContent className="p-4">
            <label className="font-semibold tracking-wide mb-3 block">交易金额 (USDT)</label>
            
            <Input
              ref={amountInputRef}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="输入金额..."
              className="h-14 text-lg data-professional font-semibold rounded-xl border-2 border-border-light focus:border-primary mb-4 mobile-touch-friendly"
            />
            
            {/* 快速金额选择 */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { percent: 25, label: '25%', color: 'primary' },
                { percent: 50, label: '50%', color: 'primary' },
                { percent: 75, label: '75%', color: 'warning' },
                { percent: 100, label: 'MAX', color: 'danger' }
              ].map((item) => (
                <Button
                  key={item.percent}
                  size="sm"
                  variant="outline"
                  onClick={() => quickAmountSelection(item.percent)}
                  className={`h-10 mobile-touch-friendly border-2 ${
                    item.color === 'danger' 
                      ? 'border-danger-500/30 text-danger-500 hover:bg-danger-500/10'
                      : item.color === 'warning'
                      ? 'border-warning-500/30 text-warning-500 hover:bg-warning-500/10'
                      : 'border-primary/30 text-primary hover:bg-primary/10'
                  }`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            
            {/* 预估信息 */}
            {amount && (
              <div className="glass-card p-3 rounded-lg border border-border-light space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">仓位价值</span>
                  <span className="data-professional font-semibold">
                    ${(parseFloat(amount) * leverage).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">保证金</span>
                  <span className="data-professional font-semibold">
                    ${parseFloat(amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">预估费用</span>
                  <span className="data-professional font-semibold">
                    ${(parseFloat(amount) * 0.0005).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 移动端专用交易按钮 */}
        <Button
          size="lg"
          onClick={() => onTrade(orderSide, amount, leverage)}
          disabled={!amount}
          className={`w-full h-16 text-lg font-bold mobile-touch-friendly transition-all duration-300 active:scale-[0.98] relative overflow-hidden ${
            orderSide === 'buy'
              ? 'btn-trading-long shadow-xl'
              : 'btn-trading-short shadow-xl'
          }`}
        >
          <span className="flex items-center justify-center space-x-3">
            <span>
              {orderSide === 'buy' ? '开多 LONG' : '开空 SHORT'}
            </span>
            <span className="text-2xl">
              {orderSide === 'buy' ? '📈' : '📉'}
            </span>
          </span>
          
          {/* 动态光效 */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 -translate-x-full group-active:translate-x-full transition-transform duration-700"></div>
        </Button>
      </div>

      {/* 底部导航指示器 */}
      <div className="flex-shrink-0 p-4 border-t border-border-light">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <div className="w-6 h-2 bg-primary/30 rounded-full"></div>
          <div className="w-2 h-2 bg-primary/20 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default MobileOptimizedTrading;