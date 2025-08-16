import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Gift, BarChart3, Activity, CheckCircle } from 'lucide-react';
import type { UserTypeData } from '../../constants/referralConstants';

interface OverviewTabProps {
  userData: UserTypeData;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ userData }) => {
  const IconComponent = userData.icon;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* 当前等级特权展示 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IconComponent className="w-5 h-5" />
              <span>{userData.level} 專屬權益</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="flex items-center space-x-2">
                  <Gift className="w-4 h-4" />
                  <span>核心權益</span>
                </h4>
                <div className="space-y-3">
                  {userData.specialPrivileges.map((privilege, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{privilege}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>數據統計</span>
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>最高返佣比例:</span>
                    <span className="text-[rgba(10,10,10,1)] font-bold text-[16px]">{userData.maxRebateRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>分銷層級:</span>
                    <span className="text-[rgba(10,10,10,1)] font-bold text-[16px]">{userData.tierLevels} 級體系</span>
                  </div>
                  <div className="flex justify-between">
                    <span>今日活躍用戶:</span>
                    <span className="text-[rgba(10,10,10,1)] font-bold text-[16px]">{userData.dailyActiveUsers}人</span>
                  </div>
                  <div className="flex justify-between">
                    <span>連續活躍天數:</span>
                    <span className="text-[rgba(10,10,10,1)] font-bold text-[16px]">{userData.consecutiveActiveDays}天</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 实时数据 */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>實時數據</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>今日活躍用戶</span>
                  <span className="text-2xl font-bold text-[16px]">{userData.dailyActiveUsers}人</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>連續活躍天數</span>
                  <span className="text-2xl font-bold text-[16px]">{userData.consecutiveActiveDays}天</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>今日團隊交易量</span>
                  <span className="text-2xl font-bold text-[16px]">$245,600</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>預估今日代幣</span>
                  <span className="text-2xl font-bold text-green-600 text-[16px]">+2,450 RBT</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="w-4 h-4" />
                <span>代幣釋放</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>已釋放代幣</span>
                  <span className="text-2xl font-bold text-[16px]">{Math.floor(userData.tokenEarned * 0.62)} RBT</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>釋放進度 (180天)</span>
                    <span>62%</span>
                  </div>
                  <Progress value={62} className="h-2" />
                </div>
                <div className="flex justify-between items-center">
                  <span>剩餘鎖倉</span>
                  <span className="text-2xl font-bold text-[16px]">{Math.floor(userData.tokenEarned * 0.38)} RBT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>每日釋放</span>
                  <span className="text-2xl font-bold text-[16px]">{Math.floor(userData.tokenEarned / 180)} RBT</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};