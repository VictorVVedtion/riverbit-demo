/**
 * PositionsPanel - 持仓管理面板组件
 * 从 TradingPage 中拆分出来的持仓管理面板
 */

import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  TrendingUp, TrendingDown, Plus, Minus, Shield,
  ArrowUp, MoreHorizontal
} from 'lucide-react';
import { UI_CONFIG } from '../../constants/tradingConstants';

interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: string;
  entryPrice?: number;
  liquidationPrice?: number;
  marginRatio?: number;
  pnl: number;
  pnlPercent?: string;
  leverage?: number;
  marginMode?: string;
  fundingRate?: number;
  nextFunding?: string;
}

interface PositionsPanelProps {
  positions: Position[];
  onCloseAllPositions: () => void;
  onClosePosition: (index: number) => void;
  onAddToPosition: (index: number) => void;
  onReducePosition: (index: number) => void;
  tradeHistory?: any[];
}

export default function PositionsPanel({
  positions,
  onCloseAllPositions,
  onClosePosition,
  onAddToPosition,
  onReducePosition,
  tradeHistory = []
}: PositionsPanelProps) {
  
  // 计算总盈亏
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  
  return (
    <div 
      className="border-t border-default/50 bg-gradient-to-b from-surface-1 to-surface-0 flex-shrink-0 shadow-inner"
      style={{ 
        height: `${UI_CONFIG.POSITIONS_PANEL_HEIGHT.MOBILE}px`,
        [`@media (min-width: 768px)`]: { 
          height: `${UI_CONFIG.POSITIONS_PANEL_HEIGHT.TABLET}px` 
        },
        [`@media (min-width: 1280px)`]: { 
          height: `${UI_CONFIG.POSITIONS_PANEL_HEIGHT.DESKTOP}px` 
        }
      }}
    >
      <Tabs defaultValue="positions" className="h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-default/50 bg-surface-2/30 backdrop-blur-sm">
          <TabsList className="bg-surface-2/80 backdrop-blur-sm h-9 border border-default/30 rounded-lg">
            <TabsTrigger 
              value="positions" 
              className="text-sm font-semibold px-4 data-[state=active]:bg-surface-3 data-[state=active]:shadow-md transition-all"
            >
              Positions ({positions.length})
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="text-sm font-semibold px-4 data-[state=active]:bg-surface-3 data-[state=active]:shadow-md transition-all"
            >
              Orders (0)
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="text-sm font-semibold px-4 data-[state=active]:bg-surface-3 data-[state=active]:shadow-md transition-all"
            >
              History
            </TabsTrigger>
          </TabsList>
          
          {positions.length > 0 && (
            <div className="flex items-center space-x-4">
              <div className="bg-surface-2/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-default/30 flex items-center space-x-2">
                <span className="text-sm text-secondary font-medium">Total PnL:</span>
                <span className={`font-bold text-base ${totalPnL >= 0 ? 'text-profit' : 'text-danger'}`}>
                  {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toLocaleString()}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onCloseAllPositions}
                className="h-8 text-sm bg-surface-3/60 border-default/50 hover:bg-danger/20 hover:border-danger hover:text-danger transition-all duration-200 font-medium"
              >
                Close All
              </Button>
            </div>
          )}
        </div>
        
        {/* 持仓列表 */}
        <TabsContent value="positions" className="flex-1 overflow-auto px-5 py-4">
          {positions.length > 0 ? (
            <div className="space-y-3">
              {positions.map((position, index) => (
                <PositionCard
                  key={index}
                  position={position}
                  onClose={() => onClosePosition(index)}
                  onAdd={() => onAddToPosition(index)}
                  onReduce={() => onReducePosition(index)}
                />
              ))}
            </div>
          ) : (
            <EmptyPositions />
          )}
        </TabsContent>
        
        {/* 挂单列表 */}
        <TabsContent value="orders" className="flex-1 overflow-auto px-4 py-2">
          <EmptyOrders />
        </TabsContent>
        
        {/* 历史记录 */}
        <TabsContent value="history" className="flex-1 overflow-auto px-4 py-2">
          <HistoryList history={tradeHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 持仓卡片组件
function PositionCard({ 
  position, 
  onClose, 
  onAdd, 
  onReduce 
}: { 
  position: Position;
  onClose: () => void;
  onAdd: () => void;
  onReduce: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-surface-2/80 to-surface-3/60 backdrop-blur-sm rounded-lg p-4 border border-default/30 hover:bg-surface-3/80 hover:shadow-md transition-all duration-200">
      {/* 持仓头部 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <Badge 
            variant={position.side === 'long' ? 'default' : 'destructive'} 
            className="text-sm font-bold px-3 py-1 rounded-md"
          >
            {position.side === 'long' ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1" />
            )}
            {position.side.toUpperCase()} {position.leverage || '10'}x
          </Badge>
          <span className="font-bold text-lg text-primary">{position.symbol}</span>
          <Badge variant="outline" className="text-sm text-secondary border-default/50 bg-surface-1/50">
            <Shield className="w-3 h-3 mr-1" />
            {position.marginMode || 'Cross'}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onAdd}
            className="h-8 w-8 text-sm bg-surface-3/60 border-default/50 hover:bg-profit/20 hover:border-profit/50 hover:text-profit transition-all"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onReduce}
            className="h-8 w-8 text-sm bg-surface-3/60 border-default/50 hover:bg-loss/20 hover:border-loss/50 hover:text-loss transition-all"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={onClose}
            className="h-8 text-sm px-3 bg-danger/20 border-danger/50 text-danger hover:bg-danger hover:text-primary transition-all"
          >
            Close
          </Button>
        </div>
      </div>
      
      {/* 数据网格 */}
      <div className="grid grid-cols-4 gap-4 text-sm mb-4">
        <div className="bg-surface-1/30 rounded-md p-2 border border-default/20">
          <div className="text-secondary text-xs mb-1 font-medium">Position Size</div>
          <div className="font-bold text-primary text-base">{position.size}</div>
        </div>
        <div className="bg-surface-1/30 rounded-md p-2 border border-default/20">
          <div className="text-secondary text-xs mb-1 font-medium">Entry Price</div>
          <div className="font-bold text-primary text-base">
            ${position.entryPrice?.toLocaleString() || '45,000'}
          </div>
        </div>
        <div className="bg-surface-1/30 rounded-md p-2 border border-default/20">
          <div className="text-secondary text-xs mb-1 font-medium">Liquidation</div>
          <div className="font-bold text-danger text-base">
            ${position.liquidationPrice?.toLocaleString() || '40,500'}
          </div>
        </div>
        <div className="bg-surface-1/30 rounded-md p-2 border border-default/20">
          <div className="text-secondary text-xs mb-1 font-medium">Margin Ratio</div>
          <div className={`font-bold text-base ${(position.marginRatio || 75) > 50 ? 'text-profit' : 'text-loss'}`}>
            {position.marginRatio || '75.3'}%
          </div>
        </div>
      </div>
      
      {/* 盈亏显示 */}
      <div className="flex justify-between items-center pt-4 border-t border-default/30">
        <div className="flex items-center space-x-6">
          <div className={`bg-gradient-to-r rounded-lg p-3 border ${
            position.pnl >= 0 
              ? 'from-profit/10 to-profit/5 border-profit/30 text-profit' 
              : 'from-danger/10 to-danger/5 border-danger/30 text-danger'
          }`}>
            <span className="text-xl font-bold">
              {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString()}
            </span>
            <span className="text-sm ml-2 opacity-80">
              ({position.pnlPercent || ((position.pnl / 1000) * 100).toFixed(2)}%)
            </span>
          </div>
          <div className="bg-surface-1/30 rounded-md p-2 border border-default/20">
            <div className="text-xs text-secondary mb-1">Funding Rate</div>
            <span className={`text-sm font-bold ${(position.fundingRate || 0.01) > 0 ? 'text-danger' : 'text-profit'}`}>
              {(position.fundingRate || 0.01) > 0 ? '+' : ''}{((position.fundingRate || 0.01) * 100).toFixed(4)}%
            </span>
          </div>
        </div>
        <div className="bg-surface-1/30 rounded-md p-2 border border-default/20 text-center">
          <div className="text-xs text-secondary mb-1">Next Payment</div>
          <div className="text-sm font-medium text-primary">{position.nextFunding || '2h 15m'}</div>
        </div>
      </div>
    </div>
  );
}

// 空持仓状态
function EmptyPositions() {
  return (
    <div className="flex items-center justify-center h-full text-muted">
      <div className="text-center">
        <div className="text-4xl mb-2">📊</div>
        <div className="text-sm">No positions</div>
        <div className="text-xs text-muted mt-1">Open a position to start trading</div>
      </div>
    </div>
  );
}

// 空挂单状态
function EmptyOrders() {
  return (
    <div className="flex items-center justify-center h-full text-muted">
      <div className="text-center">
        <div className="text-4xl mb-2">📋</div>
        <div className="text-sm">No open orders</div>
        <div className="text-xs text-muted mt-1">Place an order to see it here</div>
        <Button size="sm" variant="outline" className="mt-3 h-7 text-xs bg-surface-3 border-default">
          Quick Order
        </Button>
      </div>
    </div>
  );
}

// 历史记录列表
function HistoryList({ history }: { history: any[] }) {
  if (history.length === 0) {
    // 显示模拟历史记录
    const mockHistory = [
      { side: 'LONG', symbol: 'BTC/USDT', leverage: '10x', pnl: 1245, entry: 44500, exit: 45250, time: '2h ago' },
      { side: 'SHORT', symbol: 'ETH/USDT', leverage: '5x', pnl: -320, entry: 2650, exit: 2680, time: '4h ago' },
      { side: 'LONG', symbol: 'xAAPL/USDT', leverage: '20x', pnl: 890, entry: 185, exit: 187, time: '1d ago' }
    ];
    
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted mb-3 flex justify-between items-center">
          <span>Recent Trades</span>
          <Button size="sm" variant="outline" className="h-6 text-xs bg-surface-3 border-default">
            Export
          </Button>
        </div>
        
        {mockHistory.map((trade, i) => (
          <div key={i} className="bg-surface-2 rounded p-2 border border-default">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={trade.side === 'LONG' ? 'default' : 'destructive'} 
                  className="text-xs bg-profit"
                >
                  {trade.side}
                </Badge>
                <span className="text-sm font-medium text-primary">{trade.symbol}</span>
                <span className="text-xs text-muted">{trade.leverage}</span>
              </div>
              <div className={`text-xs font-bold ${trade.pnl > 0 ? 'text-profit' : 'text-danger'}`}>
                {trade.pnl > 0 ? '+' : ''}${Math.abs(trade.pnl)}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Entry: ${trade.entry} → Exit: ${trade.exit}</span>
              <span>{trade.time}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {history.map((item, index) => (
        <div key={index} className="bg-surface-2 rounded p-2 border border-default">
          <div className="text-sm">{JSON.stringify(item)}</div>
        </div>
      ))}
    </div>
  );
}