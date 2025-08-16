import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { BarChart3, Activity, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/assetsUtils';

interface OverviewTabContentProps {
  assetData: any;
  showValues: boolean;
}

export const OverviewTabContent: React.FC<OverviewTabContentProps> = ({ assetData, showValues }) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#92318D]" />
              <span>資產分佈</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>逐倉模式</span>
                  <span>{((assetData.isolated.balance / assetData.total.balance) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(assetData.isolated.balance / assetData.total.balance) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>全倉模式</span>
                  <span>{((assetData.cross.balance / assetData.total.balance) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(assetData.cross.balance / assetData.total.balance) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#92318D]" />
              <span>風險統計</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>總保證金使用率:</span>
                <span className="text-[rgba(10,10,10,1)]">35.2%</span>
              </div>
              <div className="flex justify-between">
                <span>逐倉使用率:</span>
                <span className="text-[rgba(10,10,10,1)]">73.0%</span>
              </div>
              <div className="flex justify-between">
                <span>全倉使用率:</span>
                <span className="text-[rgba(10,10,10,1)]">29.5%</span>
              </div>
              <div className="flex justify-between">
                <span>總持倉數:</span>
                <span>{assetData.isolated.positions + assetData.cross.positions}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-[#92318D]" />
              <span>收益統計</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>總未實現盈虧:</span>
                <span className="text-green-600">{formatCurrency(assetData.total.pnl, showValues)}</span>
              </div>
              <div className="flex justify-between">
                <span>逐倉盈虧:</span>
                <span className="text-green-600">{formatCurrency(assetData.isolated.totalPnL, showValues)}</span>
              </div>
              <div className="flex justify-between">
                <span>全倉盈虧:</span>
                <span className="text-green-600">{formatCurrency(assetData.cross.totalPnL, showValues)}</span>
              </div>
              <div className="flex justify-between">
                <span>收益率:</span>
                <span className="text-green-600">+{assetData.total.pnlPercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};