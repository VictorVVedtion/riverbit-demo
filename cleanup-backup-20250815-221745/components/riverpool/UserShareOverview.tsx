import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Eye } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/riverPoolUtils';

interface UserShareOverviewProps {
  sharePercent: number;
  rLPHolding: number;
  contributedMargin: number;
  shareOfPnL: number;
  shareOfFunding: number;
}

export const UserShareOverview: React.FC<UserShareOverviewProps> = ({
  sharePercent,
  rLPHolding,
  contributedMargin,
  shareOfPnL,
  shareOfFunding
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="w-4 h-4 mr-2 text-blue-600" />
          我在 RiverPool 中的份額
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">我的持倉佔比</div>
            <div className="text-2xl font-bold text-blue-700">{sharePercent.toFixed(3)}%</div>
            <div className="text-sm text-blue-600">共 {rLPHolding.toLocaleString()} rLP</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 mb-1">分配到的保證金</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(contributedMargin)}</div>
            <div className="text-sm text-green-600">參與系統做市</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">我的收益份額</div>
            <div className={`text-2xl font-bold ${shareOfPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {shareOfPnL >= 0 ? '+' : ''}{formatCurrency(shareOfPnL)}
            </div>
            <div className="text-sm text-purple-600">來自系統盈虧</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-orange-600 mb-1">資金費收益</div>
            <div className={`text-2xl font-bold ${shareOfFunding >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {shareOfFunding >= 0 ? '+' : ''}{formatCurrency(shareOfFunding)}
            </div>
            <div className="text-sm text-orange-600">累計資金費</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};