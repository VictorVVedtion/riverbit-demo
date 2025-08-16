import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Activity } from 'lucide-react';
import { formatCurrency } from '../../utils/riverPoolUtils';

interface SystemStats {
  totalMargin: number;
  totalPnL: number;
  totalFunding: number;
  positionCount: number;
  profitablePositions: number;
}

interface SystemStatusOverviewProps {
  systemStats: SystemStats;
}

export const SystemStatusOverview: React.FC<SystemStatusOverviewProps> = ({
  systemStats
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="w-4 h-4 mr-2 text-green-600" />
          RiverPool 系統狀態
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">系統總保證金</div>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(systemStats.totalMargin)}</div>
            <div className="text-sm text-blue-600">AMM 做市資金</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 mb-1">持倉數量</div>
            <div className="text-2xl font-bold text-green-700">{systemStats.positionCount}</div>
            <div className="text-sm text-green-600">活躍交易對</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">總未實現盈虧</div>
            <div className={`text-2xl font-bold ${systemStats.totalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {systemStats.totalPnL >= 0 ? '+' : ''}{formatCurrency(systemStats.totalPnL)}
            </div>
            <div className="text-sm text-purple-600">系統總收益</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-orange-600 mb-1">累計資金費</div>
            <div className={`text-2xl font-bold ${systemStats.totalFunding >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {systemStats.totalFunding >= 0 ? '+' : ''}{formatCurrency(systemStats.totalFunding)}
            </div>
            <div className="text-sm text-orange-600">8小時結算</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="text-sm text-gray-300 mb-1">盈利持倉比例</div>
            <div className="text-2xl font-bold text-white">
              {((systemStats.profitablePositions / systemStats.positionCount) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-300">{systemStats.profitablePositions}/{systemStats.positionCount} 盈利</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};