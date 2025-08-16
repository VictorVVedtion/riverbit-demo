import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { 
  DollarSign, TrendingUp, Award, Zap, Clock, Target,
  Users, BarChart3, Calendar, Gift, AlertCircle, CheckCircle,
  Info, RefreshCw, Download, ExternalLink, Activity,
  Wallet, ArrowUpRight, ArrowDownRight, Star, Shield
} from 'lucide-react';

const TradingSubsidyPage = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [autoClaimEnabled, setAutoClaimEnabled] = useState(true);

  // 系统全局数据 - 根据市场方案
  const systemData = {
    totalTokensAllocated: 1000000000, // 10亿枚代币 (10%)
    totalValueAllocated: 100000000, // 1亿美金补贴
    tokenPrice: 0.1, // 0.1美元/枚
    dailyTokenLimit: 5000000, // 每天最高500万枚
    dailyValueLimit: 500000, // 50万美金
    userDailyLimit: 10000, // 单地址每天1万枚
    userDailyValueLimit: 1000, // 1000美金
    subsidyDays: 200, // 持续200天
    releaseDays: 180, // 180天线性释放
    currentDay: 156, // 当前第156天
    tokensDistributed: 780000000, // 已分配7.8亿枚
    remainingTokens: 220000000, // 剩余2.2亿枚
    totalUsers: 12847, // 总参与用户数
    activeUsersToday: 3421 // 今日活跃用户
  };

  // 用户个人数据
  const userData = {
    totalFeesTraded: 15680.50, // 累计交易手续费
    totalSubsidyReceived: 156805, // 累计获得补贴代币
    totalSubsidyValue: 15680.50, // 补贴价值(USD)
    todayFeesTraded: 245.60, // 今日交易手续费
    todaySubsidyReceived: 2456, // 今日获得补贴
    todaySubsidyValue: 245.60, // 今日补贴价值
    availableToRelease: 87113, // 可释放代币
    lockedTokens: 69692, // 锁仓代币
    releaseProgress: 55.6, // 释放进度 %
    nextReleaseAmount: 871, // 明日释放数量
    subsidyRate: 100, // 补贴比例 100% = 全额补贴
    eligibleForSubsidy: true, // 是否符合补贴条件
    dailyLimitUsed: 24.56, // 今日限额使用率 %
    consecutiveTradingDays: 89 // 连续交易天数
  };

  // 今日补贴分配数据
  const todayDistribution = {
    currentDistributed: 3200000, // 今日已分配
    remaining: 1800000, // 今日剩余
    totalLimit: 5000000, // 今日总限额
    usageRate: 64, // 使用率
    participatingUsers: 3421, // 参与用户数
    averagePerUser: 935, // 平均每用户获得
    peakHour: '14:00-15:00', // 高峰时段
    carryOverFromYesterday: 300000 // 昨日结转
  };

  // 历史补贴记录
  const subsidyHistory = [
    { date: '2024-01-20', fees: 245.60, subsidy: 2456, rate: 100, status: 'completed' },
    { date: '2024-01-19', fees: 180.40, subsidy: 1804, rate: 100, status: 'completed' },
    { date: '2024-01-18', fees: 320.80, subsidy: 3208, rate: 100, status: 'completed' },
    { date: '2024-01-17', fees: 156.20, subsidy: 1562, rate: 100, status: 'completed' },
    { date: '2024-01-16', fees: 289.50, subsidy: 2895, rate: 100, status: 'completed' },
    { date: '2024-01-15', fees: 234.70, subsidy: 2347, rate: 100, status: 'completed' },
    { date: '2024-01-14', fees: 198.30, subsidy: 1983, rate: 100, status: 'completed' }
  ];

  // 系统公告
  const systemAnnouncements = [
    {
      id: 1,
      type: 'important',
      title: '交易補貼計劃延期通知',
      content: '由於參與度超預期，交易補貼計劃將延長至220天，確保所有用戶都能充分受益。',
      date: '2024-01-20',
      isNew: true
    },
    {
      id: 2,
      type: 'info',
      title: '代幣釋放機制調整',
      content: '為了優化用戶體驗，代幣釋放將改為每小時釋放，提供更平滑的釋放體驗。',
      date: '2024-01-18',
      isNew: false
    },
    {
      id: 3,
      type: 'success',
      title: '補貼總額突破8億代幣',
      content: '恭喜！交易補貼計劃已成功分配超過8億枚RBT代幣，感謝社區的積極參與。',
      date: '2024-01-15',
      isNew: false
    }
  ];

  const calculateDailyRelease = () => {
    return Math.floor(userData.totalSubsidyReceived / systemData.releasedays);
  };

  const getRemainingDays = () => {
    return systemData.subsidyDays - systemData.currentDay;
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'important': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAnnouncementBadgeVariant = (type: string) => {
    switch (type) {
      case 'important': return 'destructive';
      case 'success': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* 顶部概览 */}
      <div className="bg-slate-900/50 border-slate-700/50 border-b px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2 text-white">
              <Gift className="w-6 h-6 text-[#92318D]" />
              <span>交易補貼計劃</span>
              <Badge variant="default" className="bg-[#92318D]/10 text-[#92318D]">
                10億 RBT 全額補貼
              </Badge>
            </h1>
            <p className="text-gray-300 mt-1">100% 交易手續費補貼 · 10億代幣池 · 1億美金價值</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-300">剩餘天數</div>
              <div className="text-lg font-bold text-gray-100">{getRemainingDays()}</div>
            </div>
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <Download className="w-4 h-4 mr-2" />
              補貼證明 (即將推出)
            </Button>
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新數據 (即將推出)
            </Button>
          </div>
        </div>

        {/* 核心数据卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* 个人累计补贴 */}
          <Card className="bg-gradient-to-br from-[#92318D] to-[#7A2074] text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">累計補貼獲得</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <h3 className="text-lg font-bold">{userData.totalSubsidyReceived.toLocaleString()}</h3>
                    <span className="text-sm">RBT</span>
                  </div>
                  <div className="text-purple-100 text-xs text-[12px]">
                    ≈ ${userData.totalSubsidyValue.toLocaleString()}
                  </div>
                </div>
                <Award className="w-8 h-8 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          {/* 今日补贴 */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">今日補貼</p>
                  <h3 className="text-lg font-bold text-green-600">+{userData.todaySubsidyReceived.toLocaleString()}</h3>
                  <p className="text-green-600 text-sm">${userData.todaySubsidyValue}</p>
                </div>
                <Zap className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* 可释放代币 */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">可釋放代幣</p>
                  <h3 className="text-lg font-bold text-white">{userData.availableToRelease.toLocaleString()}</h3>
                  <p className="text-[#92318D] text-sm">{userData.releaseProgress}% 已釋放</p>
                </div>
                <Wallet className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          {/* 补贴率 */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">補貼比例</p>
                  <h3 className="text-lg font-bold text-white">{userData.subsidyRate}%</h3>
                  <p className="text-[#92318D] text-sm">全額補貼</p>
                </div>
                <Target className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          {/* 连续交易天数 */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">連續交易</p>
                  <h3 className="text-lg font-bold text-white">{userData.consecutiveTradingDays}</h3>
                  <p className="text-[#92318D] text-sm">天</p>
                </div>
                <Activity className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          {/* 系统进度 */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">系統進度</p>
                  <h3 className="text-lg font-bold text-white">{((systemData.tokensDistributed / systemData.totalTokensAllocated) * 100).toFixed(1)}%</h3>
                  <p className="text-[#92318D] text-sm">第{systemData.currentDay}天</p>
                </div>
                <BarChart3 className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="bottom-panel border-b px-6 py-3 flex-shrink-0">
            <TabsList className="bottom-bg-card">
              <TabsTrigger value="overview" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">補貼概覽</TabsTrigger>
              <TabsTrigger value="daily" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">今日分配</TabsTrigger>
              <TabsTrigger value="release" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">代幣釋放</TabsTrigger>
              <TabsTrigger value="history" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">補貼歷史</TabsTrigger>
              <TabsTrigger value="system" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">系統狀態</TabsTrigger>
              <TabsTrigger value="announcements" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">系統公告</TabsTrigger>
            </TabsList>
          </div>

          {/* 补贴概览 */}
          <TabsContent value="overview" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* 补贴计划说明 */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Gift className="w-5 h-5 text-[#92318D]" />
                      <span>RiverBit 交易補貼計劃</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="flex items-center space-x-2">
                          <Target className="w-4 h-4 text-[#92318D]" />
                          <span>計劃詳情</span>
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span>代幣分配比例:</span>
                            <span className="text-lg font-bold text-white">10% (10億枚)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>補貼總價值:</span>
                            <span className="text-lg font-bold text-white">1億美金</span>
                          </div>
                          <div className="flex justify-between">
                            <span>代幣價格:</span>
                            <span className="text-lg font-bold text-white">$0.1 / RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>補貼類型:</span>
                            <span className="text-lg font-bold text-white">100% 手續費補貼</span>
                          </div>
                          <div className="flex justify-between">
                            <span>計劃週期:</span>
                            <span className="text-lg font-bold text-white">200天</span>
                          </div>
                          <div className="flex justify-between">
                            <span>代幣釋放:</span>
                            <span className="text-lg font-bold text-white">180天線性釋放</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-[#92318D]" />
                          <span>限額規則</span>
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span>單地址每日限額:</span>
                            <span className="text-lg font-bold text-white">10,000 RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>單地址每日價值:</span>
                            <span className="text-lg font-bold text-white">$1,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>系統每日限額:</span>
                            <span className="text-lg font-bold text-white">5,000,000 RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>系統每日價值:</span>
                            <span className="text-lg font-bold text-white">$500,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>結轉機制:</span>
                            <span className="text-lg font-bold text-white">次日繼續分配</span>
                          </div>
                          <div className="flex justify-between">
                            <span>分配週期:</span>
                            <span className="text-lg font-bold text-white">持續200天</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="bg-[#92318D]/10 p-4 rounded-lg border border-[#92318D]/20">
                      <h4 className="text-[#92318D] mb-2">補貼原理</h4>
                      <p className="text-white">
                        按照0.1美元一枚代幣價值，全額補貼交易手續費，直到10億枚代幣分配完畢。
                        當天補貼完則不再補貼，當天未補貼完則推到第二天繼續補貼，持續補貼200天。
                        代幣釋放採用TGE後180天線性釋放機制。
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 个人补贴统计 */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-[#92318D]" />
                        <span>個人補貼統計</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                          <div className="text-lg font-bold text-white text-[24px]">
                            {userData.totalSubsidyReceived.toLocaleString()}
                          </div>
                          <div className="text-sm text-[rgba(74,85,101,1)]">累計獲得代幣 (RBT)</div>
                          <div className="text-lg font-normal text-white mt-1 text-[14px]">
                            ≈ ${userData.totalSubsidyValue.toLocaleString()}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>交易手續費總額:</span>
                            <span className="text-lg font-bold text-white">${userData.totalFeesTraded.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>補貼覆蓋率:</span>
                            <span className="text-lg font-bold text-white">{userData.subsidyRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>平均每日補貼:</span>
                            <span className="text-lg font-bold text-white">{Math.floor(userData.totalSubsidyReceived / userData.consecutiveTradingDays).toLocaleString()} RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>今日限額使用:</span>
                            <span className="text-lg font-bold text-white">{userData.dailyLimitUsed}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-[#92318D]" />
                        <span>系統補貼統計</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                          <div className="text-lg font-bold text-white text-[24px]">
                            {((systemData.tokensDistributed / systemData.totalTokensAllocated) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-[rgba(74,85,101,1)]">系統分配進度</div>
                          <div className="text-lg font-normal text-white mt-1 text-[14px]">
                            {systemData.tokensDistributed.toLocaleString()} / {systemData.totalTokensAllocated.toLocaleString()}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>參與用戶總數:</span>
                            <span className="text-lg font-bold text-white">{systemData.totalUsers.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>今日活躍用戶:</span>
                            <span className="text-lg font-bold text-white">{systemData.activeUsersToday.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>平均每用戶獲得:</span>
                            <span className="text-lg font-bold text-white">{Math.floor(systemData.tokensDistributed / systemData.totalUsers).toLocaleString()} RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>剩餘分配天數:</span>
                            <span className="text-lg font-bold text-white">{getRemainingDays()}天</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 今日分配 */}
          <TabsContent value="daily" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* 今日分配进度 */}
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-[#92318D]" />
                        <span>今日分配進度</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-[24px] font-bold text-white">
                            {todayDistribution.usageRate}%
                          </div>
                          <div className="text-sm text-gray-300 font-medium">今日使用率</div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>已分配</span>
                            <span>{todayDistribution.currentDistributed.toLocaleString()} / {todayDistribution.totalLimit.toLocaleString()}</span>
                          </div>
                          <Progress value={todayDistribution.usageRate} className="h-3" />
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>剩餘額度:</span>
                            <span className="text-[16px] font-bold text-white">{todayDistribution.remaining.toLocaleString()} RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>昨日結轉:</span>
                            <span className="text-[16px] font-bold text-white">{todayDistribution.carryOverFromYesterday.toLocaleString()} RBT</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 参与统计 */}
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-[#92318D]" />
                        <span>參與統計</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-[24px] font-bold text-white">
                            {todayDistribution.participatingUsers.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-300 font-medium">參與用戶</div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>平均每用戶:</span>
                            <span className="text-[16px] font-bold text-white">{todayDistribution.averagePerUser} RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>補貼高峰:</span>
                            <span className="text-[16px] font-bold text-white">{todayDistribution.peakHour}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>您的排名:</span>
                            <span className="text-[16px] font-bold text-[rgba(0,166,62,1)]">TOP 15%</span>
                          </div>
                        </div>

                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <div className="text-[24px] font-bold text-white">
                            +{userData.todaySubsidyReceived.toLocaleString()}
                          </div>
                          <div className="text-sm text-green-700">您今日獲得 (RBT)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 个人今日状态 */}
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-[#92318D]" />
                        <span>個人今日狀態</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-[24px] font-bold text-white">
                            {userData.dailyLimitUsed.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-300 font-medium">限額使用率</div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>已使用</span>
                            <span>{userData.todaySubsidyReceived} / {systemData.userDailyLimit}</span>
                          </div>
                          <Progress value={userData.dailyLimitUsed} className="h-3" />
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>剩餘額度:</span>
                            <span className="text-[16px] font-bold text-white">{(systemData.userDailyLimit - userData.todaySubsidyReceived).toLocaleString()} RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>今日手續費:</span>
                            <span className="text-[16px] font-bold text-white">${userData.todayFeesTraded}</span>
                          </div>
                        </div>

                        <div className="text-center">
                          <Badge variant={userData.eligibleForSubsidy ? 'default' : 'secondary'}>
                            {userData.eligibleForSubsidy ? '✓ 符合補貼條件' : '不符合補貼條件'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 实时分配动态 */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-[#92318D]" />
                        <span>實時分配動態</span>
                      </div>
                      <Badge variant="outline">
                        自動刷新
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Array.from({ length: 8 }, (_, i) => {
                        const time = new Date();
                        time.setMinutes(time.getMinutes() - i * 3);
                        const amount = 50 + Math.random() * 200;
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-sans font-medium">
                                {time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-sm">用戶交易補貼</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-sans font-medium text-green-600">
                                +{amount.toFixed(0)} RBT
                              </div>
                              <div className="text-xs text-gray-300">
                                ${(amount * 0.1).toFixed(1)} 價值
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 代币释放 */}
          <TabsContent value="release" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* 释放概览 */}
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-[#92318D]" />
                        <span>代幣釋放概覽</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center bg-[#F9FAFC] p-4 rounded-lg">
                          <div className="text-2xl font-bold text-white">
                            {userData.releaseProgress}%
                          </div>
                          <div className="text-sm text-gray-300 font-medium">釋放進度</div>
                          <div className="text-base font-normal text-white mt-1">
                            {userData.availableToRelease.toLocaleString()} / {userData.totalSubsidyReceived.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>已釋放代幣</span>
                            <span>{userData.availableToRelease.toLocaleString()} RBT</span>
                          </div>
                          <Progress value={userData.releaseProgress} className="h-3" />
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>鎖倉代幣:</span>
                            <span className="text-orange-600">{userData.lockedTokens.toLocaleString()} RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>明日釋放:</span>
                            <span className="text-green-600">{userData.nextReleaseAmount} RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>每日釋放量:</span>
                            <span className="text-blue-600">{calculateDailyRelease()} RBT</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 释放设置 */}
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Wallet className="w-4 h-4 text-[#92318D]" />
                        <span>釋放設置</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4>自動領取釋放</h4>
                              <p className="text-sm text-gray-300">自動將已釋放代幣轉入錢包</p>
                            </div>
                            <Switch
                              checked={autoClaimEnabled}
                              onCheckedChange={setAutoClaimEnabled}
                            />
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            <h4>釋放機制</h4>
                            <div className="bg-[#92318D]/10 p-3 rounded-lg border border-[#92318D]/20 text-sm">
                              <p className="text-white">
                                <strong className="text-[#92318D]">180天線性釋放:</strong> TGE後按照180天，每天線性釋放 1/180 的獲得代幣。
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>釋放開始時間:</span>
                              <span>TGE + 0天</span>
                            </div>
                            <div className="flex justify-between">
                              <span>釋放結束時間:</span>
                              <span>TGE + 180天</span>
                            </div>
                            <div className="flex justify-between">
                              <span>剩餘釋放天數:</span>
                              <span className="text-orange-600">{180 - Math.floor(userData.releaseProgress * 180 / 100)}天</span>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full" disabled={userData.availableToRelease === 0}>
                          <Wallet className="w-4 h-4 mr-2" />
                          立即領取 {userData.availableToRelease.toLocaleString()} RBT
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 释放历史 */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-[#92318D]" />
                      <span>釋放歷史</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-300 p-3 bg-slate-800/50 rounded-lg">
                        <span>日期</span>
                        <span className="text-right">釋放數量</span>
                        <span className="text-right">累計釋放</span>
                        <span>狀態</span>
                      </div>

                      {Array.from({ length: 7 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        const dailyRelease = calculateDailyRelease();
                        const cumulativeRelease = userData.availableToRelease - (dailyRelease * i);
                        
                        return (
                          <div key={i} className="grid grid-cols-4 gap-4 text-sm p-3 hover:bg-slate-800/50 rounded-lg transition-colors">
                            <div>{date.toLocaleDateString('zh-TW')}</div>
                            <div className="text-right font-sans font-medium text-green-600">
                              +{dailyRelease} RBT
                            </div>
                            <div className="text-right font-sans font-medium">
                              {cumulativeRelease.toLocaleString()} RBT
                            </div>
                            <div>
                              <Badge variant={i === 0 ? 'secondary' : 'default'} className="text-xs">
                                {i === 0 ? '處理中' : '已完成'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 补贴历史 */}
          <TabsContent value="history" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6">
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-[#92318D]" />
                        <span>補貼歷史記錄</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        導出記錄
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 筛选和搜索 */}
                      <div className="flex items-center space-x-4">
                        <Select defaultValue="all">
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部狀態</SelectItem>
                            <SelectItem value="completed">已完成</SelectItem>
                            <SelectItem value="pending">處理中</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="搜索日期..." className="flex-1 max-w-sm" />
                      </div>

                      {/* 历史记录表格 */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-6 gap-4 text-sm text-gray-300 p-3 bg-slate-800/50 rounded-lg">
                          <span>日期</span>
                          <span className="text-right">交易手續費</span>
                          <span className="text-right">補貼代幣</span>
                          <span className="text-right">補貼比例</span>
                          <span>狀態</span>
                          <span className="text-center">操作</span>
                        </div>

                        {subsidyHistory.map((record, index) => (
                          <div key={index} className="grid grid-cols-6 gap-4 text-sm p-3 hover:bg-slate-800/50 rounded-lg transition-colors">
                            <div>{record.date}</div>
                            <div className="text-right font-sans font-medium">
                              ${record.fees}
                            </div>
                            <div className="text-right font-sans font-medium text-green-600">
                              +{record.subsidy.toLocaleString()} RBT
                            </div>
                            <div className="text-right">
                              <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                {record.rate}%
                              </Badge>
                            </div>
                            <div>
                              <Badge variant="default" className="text-xs">
                                已完成
                              </Badge>
                            </div>
                            <div className="flex justify-center">
                              <Button size="sm" variant="ghost" className="text-xs">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 分页 */}
                      <div className="flex justify-center pt-4">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" disabled>上一頁</Button>
                          <Badge variant="outline">第 1 頁，共 15 頁</Badge>
                          <Button size="sm" variant="outline">下一頁</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 系统状态 */}
          <TabsContent value="system" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h3>系統狀態監控</h3>
                  <p className="text-gray-300 mt-2">補貼系統運行狀態與統計數據</p>
                  <div className="mt-8">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto" />
                    <p className="text-gray-300 mt-2">此功能正在開發中</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 系统公告 */}
          <TabsContent value="announcements" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  {systemAnnouncements.map((announcement) => (
                    <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 mt-1">
                            {getAnnouncementIcon(announcement.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4>{announcement.title}</h4>
                              <Badge variant={getAnnouncementBadgeVariant(announcement.type)}>
                                {announcement.type === 'important' && '重要'}
                                {announcement.type === 'success' && '成功'}
                                {announcement.type === 'info' && '通知'}
                              </Badge>
                              {announcement.isNew && (
                                <Badge variant="destructive" className="text-xs">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm mb-3">
                              {announcement.content}
                            </p>
                            <div className="text-xs text-gray-300">
                              發布時間: {announcement.date}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TradingSubsidyPage;