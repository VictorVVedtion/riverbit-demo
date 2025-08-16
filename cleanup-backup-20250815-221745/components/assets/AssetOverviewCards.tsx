import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { TrendingUp, Shield } from 'lucide-react';
import { formatCurrency } from '../../utils/assetsUtils';

interface AssetOverviewCardsProps {
  assetData: any;
  showValues: boolean;
}

export const AssetOverviewCards: React.FC<AssetOverviewCardsProps> = ({ assetData, showValues }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      <Card className="bg-gradient-to-r from-[#92318D] via-[#B847A1] to-[#6B1F5C] text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">總資產價值</p>
              <h2 className="text-3xl font-bold mt-1 text-white">{formatCurrency(assetData.total.balance, showValues)}</h2>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`text-sm ${assetData.total.pnl >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {assetData.total.pnl >= 0 ? '+' : ''}{formatCurrency(assetData.total.pnl, showValues)}
                </span>
                <span className={`text-sm ${assetData.total.pnl >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  ({assetData.total.pnl >= 0 ? '+' : ''}{assetData.total.pnlPercent}%)
                </span>
              </div>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-100" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200" style={{ backgroundColor: '#EFF6FF' }}>
        <CardContent className="p-6 relative">
          <Badge variant="outline" className="absolute top-4 right-4 border-blue-300 text-blue-700">
            {assetData.isolated.positions} 倉位
          </Badge>
          <div>
            <p className="text-slate-700 font-medium text-sm">逐倉資產</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(assetData.isolated.balance, showValues)}</h3>
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span className="text-green-600">可用: {formatCurrency(assetData.isolated.availableBalance, showValues)}</span>
              <span className="text-red-600">占用: {formatCurrency(assetData.isolated.marginUsed, showValues)}</span>
            </div>
            <div className={`text-sm mt-1 ${assetData.isolated.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              PnL: {assetData.isolated.totalPnL >= 0 ? '+' : ''}{formatCurrency(assetData.isolated.totalPnL, showValues)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-[#FAF5F9]">
        <CardContent className="p-6 relative">
          <Badge variant="outline" className="absolute top-4 right-4 border-purple-300 text-purple-700">
            {assetData.cross.positions} 倉位
          </Badge>
          <div>
            <p className="text-slate-700 font-medium text-sm">全倉資產</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(assetData.cross.balance, showValues)}</h3>
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span className="text-green-600">可用: {formatCurrency(assetData.cross.availableBalance, showValues)}</span>
              <span className="text-red-600">占用: {formatCurrency(assetData.cross.marginUsed, showValues)}</span>
            </div>
            <div className={`text-sm mt-1 ${assetData.cross.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              PnL: {assetData.cross.totalPnL >= 0 ? '+' : ''}{formatCurrency(assetData.cross.totalPnL, showValues)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-700 font-medium text-sm">風險水平</p>
              <h3 className="text-2xl font-sans font-medium text-slate-900 mt-1">適中</h3>
              <div className="mt-2">
                <Progress value={35} className="h-2" />
                <span className="text-xs font-medium text-slate-300">35% 保證金使用率</span>
              </div>
            </div>
            <Shield className="w-8 h-8 text-slate-300" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};