import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Target, PieChart } from 'lucide-react';
import { formatCrypto } from '../../utils/assetsUtils';

interface AssetDetailCardsProps {
  assetData: any;
  showValues: boolean;
}

export const AssetDetailCards: React.FC<AssetDetailCardsProps> = ({ assetData, showValues }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 逐仓资产明细 */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span>逐倉資產明細</span>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              獨立風控
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assetData.isolated.assets.map((asset: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 text-sm font-sans font-medium">{asset.symbol}</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{formatCrypto(asset.balance, asset.symbol, showValues)}</div>
                    <div className="text-xs text-slate-300 font-medium">
                      可用: {formatCrypto(asset.available, asset.symbol, showValues)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-300 font-medium">
                    鎖定: {formatCrypto(asset.locked, asset.symbol, showValues)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 全仓资产明细 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-[#92318D]" />
            <span>全倉資產明細</span>
            <Badge variant="outline" className="border-purple-300 text-purple-700">
              共享風險
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assetData.cross.assets.map((asset: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#FAF5F9] rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <span className="text-purple-700 text-sm font-sans font-medium">{asset.symbol}</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{formatCrypto(asset.balance, asset.symbol, showValues)}</div>
                    <div className="text-xs text-slate-300 font-medium">
                      可用: {formatCrypto(asset.available, asset.symbol, showValues)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-300 font-medium">
                    鎖定: {formatCrypto(asset.locked, asset.symbol, showValues)}
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