import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import LiquidGlassCard from '../ui/LiquidGlassCard';
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
    <div className="h-full flex flex-col bg-gradient-to-br from-river-depth via-surface-0 to-river-depth overflow-hidden">
      {/* River-Themed Header - Professional Referral Standard */}
      <LiquidGlassCard 
        variant="intense" 
        className="text-white px-6 py-6 flex-shrink-0 rounded-none border-x-0 border-t-0 bg-gradient-to-r from-river-depth/90 to-river-flow/20 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-river-surface to-river-glow rounded-xl flex items-center justify-center shadow-lg shadow-river-surface/25">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                邀請獎勵系統
              </h1>
              <p className="text-river-surface/80 mt-1 font-medium">RiverBit 三層邀請體系 • 共享平台成長收益 • 持續收益分成</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-xl border transition-all duration-300 bg-river-surface/20 text-river-surface border-river-surface/30 shadow-lg shadow-river-surface/10`}>
              <div className="flex items-center space-x-2">
                <IconComponent className="w-4 h-4" />
                <span className="font-semibold text-sm">{userData.badge}</span>
              </div>
            </div>
            
            <Button variant="outline" size="sm" disabled className="opacity-50 border-river-surface/30 text-river-surface/60">
              <Share2 className="w-4 h-4 mr-2" />
              分享推廣 (即將推出)
            </Button>

            {/* 用户类型切换 - 仅用于演示 */}
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="w-32 border-river-surface/30 text-river-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-river-depth/95 border-river-surface/30">
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="community">社區長</SelectItem>
                <SelectItem value="c2c">C2C用戶</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 核心统计卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <LiquidGlassCard variant="intense" className="bg-gradient-to-br from-river-surface to-river-glow text-white shadow-lg shadow-river-surface/25">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">累積代幣獲得</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <h3 className="text-lg font-bold text-white">{userData.tokenEarned.toLocaleString()}</h3>
                    <span className="text-sm text-white/90">RBT</span>
                  </div>
                  <div className="text-white/70 text-sm">
                    ≈ ${(userData.tokenEarned * 0.1).toLocaleString()}
                  </div>
                </div>
                <Award className="w-8 h-8 text-white/80" />
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard variant="medium" className="text-primary shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">返佣收入</p>
                  <h3 className="text-lg font-bold text-river-profit">${userData.commissionEarned.toLocaleString()}</h3>
                  <p className="text-river-profit text-sm">{userData.rebateRate}% 返佣率</p>
                </div>
                <DollarSign className="w-6 h-6 text-river-profit" />
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard variant="medium" className="text-primary shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">邀請用戶</p>
                  <h3 className="text-lg font-bold text-primary">{userData.totalInvited}</h3>
                  <p className="text-river-surface text-sm">{userData.activeUsers} 活躍中</p>
                </div>
                <Users className="w-6 h-6 text-river-surface" />
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard variant="medium" className="text-primary shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">團隊交易量</p>
                  <h3 className="text-lg font-bold text-primary">${(userData.totalVolume / 1000000).toFixed(1)}M</h3>
                  <p className="text-river-surface text-sm">本月</p>
                </div>
                <BarChart3 className="w-6 h-6 text-river-surface" />
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard variant="medium" className="text-primary shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">分銷層級</p>
                  <h3 className="text-lg font-bold text-primary">{userData.tierLevels}級</h3>
                  <p className="text-river-surface text-sm">體系</p>
                </div>
                <TrendingUp className="w-6 h-6 text-river-surface" />
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard variant="medium" className="text-primary shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-medium">等級排名</p>
                  <h3 className="text-lg font-bold text-primary">TOP {userType === 'foundation' ? '15' : userType === 'community' ? '45' : '120'}</h3>
                  <p className="text-river-surface text-sm">{userData.badge}</p>
                </div>
                <Trophy className="w-6 h-6 text-river-surface" />
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* 成长路径提示 */}
        {userData.growthPath && (
          <LiquidGlassCard variant="subtle" className="mt-6 bg-river-surface/10 border-river-surface/20 shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <ArrowUpRight className="w-5 h-5 text-river-surface" />
                    <span className="text-river-surface font-medium">成長路徑進度</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-river-surface/20 text-river-surface border-river-surface/30">當前: {userData.badge}</Badge>
                    <ChevronRight className="w-4 h-4 text-river-surface" />
                    <Badge variant="outline" className="border-river-warning/50 text-river-warning">
                      目標: {userData.nextLevelRequirement?.targetLevel}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-river-surface">{userData.growthPath.progress}%</div>
                  <div className="text-sm text-river-surface/80">完成度</div>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={userData.growthPath.progress} className="h-3" />
              </div>
            </div>
          </LiquidGlassCard>
        )}
      </LiquidGlassCard>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <LiquidGlassCard variant="nano" className="border-x-0 border-t-0 rounded-none px-6 py-3 flex-shrink-0">
            <TabsList className="bg-river-depth/50 border-river-surface/20">
              <TabsTrigger value="overview" className="text-secondary data-[state=active]:text-primary data-[state=active]:bg-river-surface/20">我的權益</TabsTrigger>
              {userData.nextLevelRequirement && (
                <TabsTrigger value="upgrade" className="text-secondary data-[state=active]:text-primary data-[state=active]:bg-river-surface/20">升級路徑</TabsTrigger>
              )}
              <TabsTrigger value="privileges" className="text-secondary data-[state=active]:text-primary data-[state=active]:bg-river-surface/20">專屬特權</TabsTrigger>
              <TabsTrigger value="team" className="text-secondary data-[state=active]:text-primary data-[state=active]:bg-river-surface/20">團隊管理</TabsTrigger>
              <TabsTrigger value="invite" className="text-secondary data-[state=active]:text-primary data-[state=active]:bg-river-surface/20">邀請推廣</TabsTrigger>
              <TabsTrigger value="history" className="text-secondary data-[state=active]:text-primary data-[state=active]:bg-river-surface/20">收益歷史</TabsTrigger>
            </TabsList>
          </LiquidGlassCard>

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
              <LiquidGlassCard variant="medium" className="shadow-lg">
                <div className="text-center text-secondary py-12">
                  <BarChart3History className="w-12 h-12 mx-auto mb-4 text-secondary" />
                  <p className="text-lg text-primary">🚧 功能開發中</p>
                  <p className="text-sm mt-2 text-secondary">預計將包含詳細的收益歷史記錄和統計圖表</p>
                </div>
              </LiquidGlassCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReferralPage;