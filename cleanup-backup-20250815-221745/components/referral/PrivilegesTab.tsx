import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Shield, Crown, Star, UserPlus, Activity } from 'lucide-react';
import type { UserTypeData, UserType } from '../../constants/referralConstants';

interface PrivilegesTabProps {
  userData: UserTypeData;
  userType: UserType;
}

export const PrivilegesTab: React.FC<PrivilegesTabProps> = ({ userData, userType }) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>{userData.level} 專屬特權詳情</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* 根据用户类型显示不同特权 */}
            {userType === 'foundation' && (
              <>
                <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Crown className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <h4 className="text-yellow-800 mb-2">Foundation 頂級特權</h4>
                  <div className="space-y-2 text-sm">
                    <div>固定10萬RBT獎勵</div>
                    <div>最高40%返佣</div>
                    <div>3級分銷體系</div>
                    <div>VIP專屬通道</div>
                  </div>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <Activity className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h4 className="text-blue-800 mb-2">治理投票權</h4>
                  <div className="space-y-2 text-sm">
                    <div>平台重大決策投票</div>
                    <div>新功能提案權</div>
                    <div>代幣經濟治理</div>
                  </div>
                </div>
              </>
            )}
            
            {userType === 'community' && (
              <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                <Star className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h4 className="text-blue-800 mb-2">社區長特權</h4>
                <div className="space-y-2 text-sm">
                  <div>4%代幣池分配</div>
                  <div>最高35%返佣</div>
                  <div>2級分銷體系</div>
                  <div>優先客服支持</div>
                </div>
              </div>
            )}

            {userType === 'c2c' && (
              <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                <UserPlus className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h4 className="text-green-800 mb-2">C2C 用戶權益</h4>
                <div className="space-y-2 text-sm">
                  <div>固定10%返佣</div>
                  <div>1級直推體系</div>
                  <div>基礎數據分析</div>
                  <div>升級申請通道</div>
                </div>
              </div>
            )}

            <div className="text-center p-6 bg-slate-800/50 rounded-lg border border-gray-200">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-white mb-2">數據分析權限</h4>
              <div className="space-y-2 text-sm">
                <div>團隊收益統計</div>
                <div>用戶活躍度分析</div>
                <div>交易量趨勢圖</div>
                <div>返佣效率分析</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};