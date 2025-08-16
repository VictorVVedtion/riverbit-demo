import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Wallet } from 'lucide-react';
import { poolData, userData } from '../../data/riverPoolData';

export const OverviewTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="w-4 h-4 mr-2 text-[#92318D]" />
            我的 RiverPool 持倉
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-[#F9FAFC] rounded-lg">
              <div className="text-sm text-[#0A0A0A] mb-1">rLP 持倉數量</div>
              <div className="text-2xl font-bold text-[#0A0A0A]">{userData.rLPHolding.toLocaleString()}</div>
              <div className="text-sm text-[#0A0A0A]">當前價格 ${poolData.rLPPrice.toFixed(4)}</div>
            </div>
            <div className="p-4 bg-[#F9FAFC] rounded-lg">
              <div className="text-sm text-[#0A0A0A] mb-1">持倉總價值</div>
              <div className="text-2xl font-bold text-[#0A0A0A]">${(userData.rLPHolding * poolData.rLPPrice).toLocaleString()}</div>
              <div className="text-sm text-[#0A0A0A]">佔池總量 {userData.sharePercent.toFixed(3)}%</div>
            </div>
            <div className="p-4 bg-[#F9FAFC] rounded-lg">
              <div className="text-sm text-[#0A0A0A] mb-1">累計收益</div>
              <div className="text-2xl font-bold text-[#0A0A0A]">+${userData.totalEarnings.toFixed(2)}</div>
              <div className="text-sm text-[rgba(0,166,62,1)]">今日 +${userData.todayEarnings.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-[#F9FAFC] rounded-lg">
              <div className="text-sm text-[#0A0A0A] mb-1">未實現盈虧</div>
              <div className="text-2xl font-bold text-[#0A0A0A]">+$425.82</div>
              <div className="text-sm text-[rgba(0,166,62,1)]">ROI +4.07%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};