import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Activity } from 'lucide-react';
import { formatCurrency } from '../../utils/assetsUtils';

interface PositionsTabContentProps {
  positions: any[];
  showValues: boolean;
}

export const PositionsTabContent: React.FC<PositionsTabContentProps> = ({ positions, showValues }) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#92318D]" />
              <span>當前持倉</span>
            </div>
            <Badge variant="outline">
              {positions.length} 個倉位
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {positions.map((position) => (
              <div key={position.id} className="border rounded-lg p-4 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h4>{position.pair}</h4>
                    <Badge variant={position.side === 'long' ? 'default' : 'destructive'}>
                      {position.side === 'long' ? '多倉' : '空倉'} {position.leverage}
                    </Badge>
                    <Badge variant={position.marginMode === 'isolated' ? 'outline' : 'secondary'}>
                      {position.marginMode === 'isolated' ? '逐倉' : '全倉'}
                    </Badge>
                  </div>
                  <div className={`text-right ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div>{position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl, showValues)}</div>
                    <div className="text-sm">({position.pnl >= 0 ? '+' : ''}{position.pnlPercent}%)</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm text-gray-200">
                  <div>
                    <span>數量</span>
                    <div className="font-sans font-medium">{position.size}</div>
                  </div>
                  <div>
                    <span>開倉價</span>
                    <div className="font-sans font-medium">{formatCurrency(position.entryPrice, showValues)}</div>
                  </div>
                  <div>
                    <span>當前價</span>
                    <div className="font-sans font-medium">{formatCurrency(position.currentPrice, showValues)}</div>
                  </div>
                  <div className="text-right">
                    <Button variant="outline" size="sm" disabled>
                      管理 (即將推出)
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};