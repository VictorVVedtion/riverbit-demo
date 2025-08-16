import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Users, DollarSign, Award, TrendingUp, Share2, BarChart3, 
  Trophy, ChevronRight, ArrowUpRight, Clock, BarChart3 as BarChart3History
} from 'lucide-react';

import { userTypeData, mockTeamData, type UserType } from '../../constants/referralConstants';
import { handleCopyLink as handleCopyLinkUtil, getFilteredTeamData } from '../../utils/referralHelpers';
import { OverviewTab } from '../referral/OverviewTab';
import { UpgradeTab } from '../referral/UpgradeTab';
import { PrivilegesTab } from '../referral/PrivilegesTab';
import { TeamTab } from '../referral/TeamTab';
import { InviteTab } from '../referral/InviteTab';

const ReferralPage = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [referralLink, setReferralLink] = useState('https://riverbit.io/ref/RB123456');
  const [copied, setCopied] = useState(false);
  const [userType, setUserType] = useState<UserType>('foundation');

  const userData = userTypeData[userType];
  const teamData = getFilteredTeamData(mockTeamData, userData.tierLevels);
  
  const IconComponent = userData.icon;

  const handleCopyLinkClick = () => {
    handleCopyLinkUtil(referralLink, setCopied);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* 顶部概览 */}
      <div className="bg-slate-900/50 border-slate-700/50 border-b px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">邀請獎勵系統</h1>
            <p className="text-gray-300 mt-1">RiverBit 三層邀請體系 - 共享平台成長收益</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge className={userData.badgeColor}>
              <IconComponent className="w-3 h-3 mr-1" />
              {userData.badge}
            </Badge>
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <Share2 className="w-4 h-4 mr-2" />
              分享推廣 (即將推出)
            </Button>

            {/* 用户类型切换 - 仅用于演示 */}
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="community">社區長</SelectItem>
                <SelectItem value="c2c">C2C用戶</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 核心统计卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <Card className="bg-gradient-to-br from-[#92318D] to-[#B847A1] text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">累積代幣獲得</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <h3 className="text-lg font-bold text-[rgba(255,255,255,1)]">{userData.tokenEarned.toLocaleString()}</h3>
                    <span className="text-sm">RBT</span>
                  </div>
                  <div className="text-purple-100 text-sm">
                    ≈ ${(userData.tokenEarned * 0.1).toLocaleString()}
                  </div>
                </div>
                <Award className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">返佣收入</p>
                  <h3 className="text-lg font-bold text-green-600">${userData.commissionEarned.toLocaleString()}</h3>
                  <p className="text-green-600 text-sm">{userData.rebateRate}% 返佣率</p>
                </div>
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">邀請用戶</p>
                  <h3 className="text-lg font-bold text-white">{userData.totalInvited}</h3>
                  <p className="text-[#92318D] text-sm">{userData.activeUsers} 活躍中</p>
                </div>
                <Users className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">團隊交易量</p>
                  <h3 className="text-lg font-bold text-white">${(userData.totalVolume / 1000000).toFixed(1)}M</h3>
                  <p className="text-[#92318D] text-sm">本月</p>
                </div>
                <BarChart3 className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">分銷層級</p>
                  <h3 className="text-lg font-bold text-white">{userData.tierLevels}級</h3>
                  <p className="text-[#92318D] text-sm">體系</p>
                </div>
                <TrendingUp className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">等級排名</p>
                  <h3 className="text-lg font-bold text-white">TOP {userType === 'foundation' ? '15' : userType === 'community' ? '45' : '120'}</h3>
                  <p className="text-[#92318D] text-sm">{userData.badge}</p>
                </div>
                <Trophy className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 成长路径提示 */}
        {userData.growthPath && (
          <Card className="mt-6 border-[#92318D]/20 bg-[#92318D]/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <ArrowUpRight className="w-5 h-5 text-[#92318D]" />
                    <span className="text-[#92318D]">成長路徑進度</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={userData.badgeColor}>當前: {userData.badge}</Badge>
                    <ChevronRight className="w-4 h-4 text-[#92318D]" />
                    <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                      目標: {userData.nextLevelRequirement?.targetLevel}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#92318D]">{userData.growthPath.progress}%</div>
                  <div className="text-sm text-[#92318D]/80">完成度</div>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={userData.growthPath.progress} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="bottom-panel border-b px-6 py-3 flex-shrink-0">
            <TabsList className="bottom-bg-card">
              <TabsTrigger value="overview" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">我的權益</TabsTrigger>
              {userData.nextLevelRequirement && (
                <TabsTrigger value="upgrade" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">升級路徑</TabsTrigger>
              )}
              <TabsTrigger value="privileges" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">專屬特權</TabsTrigger>
              <TabsTrigger value="team" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">團隊管理</TabsTrigger>
              <TabsTrigger value="invite" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">邀請推廣</TabsTrigger>
              <TabsTrigger value="history" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">收益歷史</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 overflow-hidden">
            <OverviewTab userData={userData} />
          </TabsContent>

          {userData.nextLevelRequirement && (
            <TabsContent value="upgrade" className="flex-1 overflow-hidden">
              <UpgradeTab userData={userData} />
            </TabsContent>
          )}

          <TabsContent value="privileges" className="flex-1 overflow-hidden">
            <PrivilegesTab userData={userData} userType={userType} />
          </TabsContent>

          <TabsContent value="team" className="flex-1 overflow-hidden">
            <TeamTab teamData={teamData} />
          </TabsContent>

          <TabsContent value="invite" className="flex-1 overflow-hidden">
            <InviteTab 
              userData={userData}
              referralLink={referralLink}
              copied={copied}
              onCopyLink={handleCopyLinkClick}
            />
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="text-center text-gray-300 py-12">
                  <BarChart3History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">🚧 功能開發中</p>
                  <p className="text-sm mt-2">預計將包含詳細的收益歷史記錄和統計圖表</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReferralPage;