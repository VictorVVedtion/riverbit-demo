import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/assetsUtils';

interface HistoryTabContentProps {
  tradeHistory: any[];
  showValues: boolean;
}

export const HistoryTabContent: React.FC<HistoryTabContentProps> = ({ tradeHistory, showValues }) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#92318D]" />
            <span>交易歷史</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tradeHistory.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-200 font-medium font-sans font-medium">{trade.time}</div>
                  <div className="flex items-center space-x-2">
                    <span>{trade.pair}</span>
                    <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                      {trade.side === 'buy' ? '買' : '賣'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {trade.type === 'market' ? '市價' : '限價'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-sans font-medium">{trade.amount} @ {formatCurrency(parseFloat(trade.price), showValues)}</div>
                  <div className="text-gray-200">手續費: ${trade.fee}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};