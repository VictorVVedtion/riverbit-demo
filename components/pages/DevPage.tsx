import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { 
  Shield, Users, Settings, BarChart3, Award, Crown, 
  CheckCircle, XCircle, Clock, AlertTriangle, Search,
  UserPlus, Edit3, Trash2, Download, Upload, RefreshCw,
  Target, DollarSign, TrendingUp, Activity, Calendar,
  Eye, EyeOff, Lock, Unlock, Star, Flag, ArrowUpDown
} from 'lucide-react';

const DevPage = () => {
  const [selectedTab, setSelectedTab] = useState('foundation');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock Foundation申请数据
  const foundationApplications = [
    {
      id: 1,
      username: 'crypto_leader',
      walletAddress: '0x1234...5678',
      totalInvited: 156,
      totalVolume: 2450000,
      activeUsers: 28,
      consecutiveActiveDays: 7,
      status: 'pending',
      appliedDate: '2024-01-20',
      notes: '符合所有條件，表現優異'
    },
    {
      id: 2,
      username: 'defi_master',
      walletAddress: '0x5678...9abc',
      totalInvited: 134,
      totalVolume: 2100000,
      activeUsers: 22,
      consecutiveActiveDays: 5,
      status: 'approved',
      approvedDate: '2024-01-18',
      bdNotes: '已批准，表現穩定'
    },
    {
      id: 3,
      username: 'trading_pro',
      walletAddress: '0x9abc...def0',
      totalInvited: 89,
      totalVolume: 1800000,
      activeUsers: 15,
      consecutiveActiveDays: 3,
      status: 'rejected',
      rejectedDate: '2024-01-15',
      rejectReason: '活躍用戶數未達標'
    }
  ];

  // Mock Foundation社区长管理数据
  const foundationLeaders = [
    {
      id: 1,
      username: 'crypto_king',
      walletAddress: '0x1111...2222',
      level: 'Foundation',
      rebateRate: 40,
      subLevels: 2,
      totalInvited: 234,
      activeUsers: 45,
      totalVolume: 3200000,
      tokenEarned: 450000,
      commissionEarned: 25600,
      status: 'active',
      createdDate: '2024-01-10'
    },
    {
      id: 2,
      username: 'defi_expert',
      walletAddress: '0x3333...4444',
      level: 'Foundation',
      rebateRate: 35,
      subLevels: 3,
      totalInvited: 189,
      activeUsers: 38,
      totalVolume: 2890000,
      tokenEarned: 380000,
      commissionEarned: 21200,
      status: 'active',
      createdDate: '2024-01-08'
    }
  ];

  // Mock 系统统计
  const systemStats = {
    totalFoundationLeaders: 156,
    totalNonFoundationLeaders: 324,
    totalC2CUsers: 1247,
    dailyTokenDistribution: 2000000,
    totalTokensDistributed: 312000000,
    averageRebateRate: 32.5,
    systemRevenue: 156780
  };

  const handleApproveApplication = (id: number) => {
    console.log('Approving Foundation application:', id);
    // 这里会调用API批准申请
  };

  const handleRejectApplication = (id: number, reason: string) => {
    console.log('Rejecting Foundation application:', id, reason);
    // 这里会调用API拒绝申请
  };

  const handleUpdateRebateRate = (leaderId: number, newRate: number) => {
    console.log('Updating rebate rate:', leaderId, newRate);
    // 这里会调用API更新返佣率
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'active': return 'text-blue-600';
      default: return 'text-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />待審核</Badge>;
      case 'approved': return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />已批准</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />已拒絕</Badge>;
      case 'active': return <Badge variant="default"><Shield className="w-3 h-3 mr-1" />活躍</Badge>;
      default: return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* 顶部标题 */}
      <div className="bg-slate-900/50 border-slate-700/50 border-b px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2 text-white">
              <Shield className="w-6 h-6 text-purple-600" />
              <span>開發者後台</span>
              <Badge variant="secondary">BD專用</Badge>
            </h1>
            <p className="text-gray-300 mt-1">Foundation社區長管理 & 邀請體系設置</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <Download className="w-4 h-4 mr-2" />
              導出數據 (即將推出)
            </Button>
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新 (即將推出)
            </Button>
          </div>
        </div>

        {/* 系统统计概览 */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Foundation社區長</p>
                  <h3 className="text-lg font-bold text-[rgba(255,255,255,1)]">{systemStats.totalFoundationLeaders}</h3>
                  <p className="text-purple-200 text-sm">+12 本月</p>
                </div>
                <Crown className="w-6 h-6 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">非Foundation</p>
                  <h3 className="text-lg font-bold text-gray-100">{systemStats.totalNonFoundationLeaders}</h3>
                  <p className="text-[#92318D] text-sm">社區長</p>
                </div>
                <Star className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">C2C用戶</p>
                  <h3 className="text-lg font-bold text-gray-100">{systemStats.totalC2CUsers}</h3>
                  <p className="text-[#92318D] text-sm">活躍</p>
                </div>
                <UserPlus className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">每日代幣分配</p>
                  <h3 className="text-lg font-bold text-gray-100">{(systemStats.dailyTokenDistribution / 1000000).toFixed(1)}M</h3>
                  <p className="text-[#92318D] text-sm">RBT</p>
                </div>
                <Award className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">已分配代幣</p>
                  <h3 className="text-lg font-bold text-gray-100">{(systemStats.totalTokensDistributed / 1000000).toFixed(0)}M</h3>
                  <p className="text-[#92318D] text-sm">RBT</p>
                </div>
                <Target className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">平均返佣率</p>
                  <h3 className="text-lg font-bold text-gray-100">{systemStats.averageRebateRate}%</h3>
                  <p className="text-[#92318D] text-sm">系統平均</p>
                </div>
                <TrendingUp className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">系統收益</p>
                  <h3 className="text-lg font-bold text-gray-100">${systemStats.systemRevenue.toLocaleString()}</h3>
                  <p className="text-[#92318D] text-sm">本月</p>
                </div>
                <DollarSign className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="border-slate-700/50 border-b bg-slate-900/50 px-6 py-3 flex-shrink-0">
            <TabsList>
              <TabsTrigger value="foundation">Foundation 申請</TabsTrigger>
              <TabsTrigger value="manage">社區長管理</TabsTrigger>
              <TabsTrigger value="rebate">返佣設置</TabsTrigger>
              <TabsTrigger value="tokens">代幣管理</TabsTrigger>
              <TabsTrigger value="analytics">數據分析</TabsTrigger>
              <TabsTrigger value="system">系統設置</TabsTrigger>
            </TabsList>
          </div>

          {/* Foundation申請審核 */}
          <TabsContent value="foundation" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* 搜索和筛选 */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 font-medium" />
                        <Input
                          placeholder="搜索用戶名或錢包地址..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部狀態</SelectItem>
                          <SelectItem value="pending">待審核</SelectItem>
                          <SelectItem value="approved">已批准</SelectItem>
                          <SelectItem value="rejected">已拒絕</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Foundation申请列表 */}
                <div className="space-y-4">
                  {foundationApplications.map((application) => (
                    <Card key={application.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="grid md:grid-cols-4 gap-6">
                          {/* 用户信息 */}
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-bold text-gray-100">{application.username}</h3>
                              {getStatusBadge(application.status)}
                            </div>
                            <p className="text-sm text-gray-300 font-medium font-sans font-medium">
                              {application.walletAddress}
                            </p>
                            <p className="text-sm text-gray-300 mt-1">
                              申請日期: {application.appliedDate}
                            </p>
                          </div>

                          {/* 资格数据 */}
                          <div className="space-y-2">
                            <h4 className="text-sm text-gray-700">資格數據</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>邀請用戶:</span>
                                <span className={application.totalInvited >= 100 ? 'text-green-600' : 'text-red-600'}>
                                  {application.totalInvited}/100
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>交易總量:</span>
                                <span className={application.totalVolume >= 2000000 ? 'text-green-600' : 'text-red-600'}>
                                  ${(application.totalVolume / 1000000).toFixed(1)}M/2M
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>活躍用戶:</span>
                                <span className={application.activeUsers >= 20 ? 'text-green-600' : 'text-red-600'}>
                                  {application.activeUsers}/20
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>連續活躍:</span>
                                <span className={application.consecutiveActiveDays >= 3 ? 'text-green-600' : 'text-red-600'}>
                                  {application.consecutiveActiveDays}/3天
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 资格进度 */}
                          <div className="space-y-3">
                            <h4 className="text-sm text-gray-700">完成度</h4>
                            <div className="space-y-2">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>邀請用戶</span>
                                  <span>{Math.min((application.totalInvited / 100) * 100, 100).toFixed(0)}%</span>
                                </div>
                                <Progress value={Math.min((application.totalInvited / 100) * 100, 100)} className="h-1" />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>交易量</span>
                                  <span>{Math.min((application.totalVolume / 2000000) * 100, 100).toFixed(0)}%</span>
                                </div>
                                <Progress value={Math.min((application.totalVolume / 2000000) * 100, 100)} className="h-1" />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>活躍用戶</span>
                                  <span>{Math.min((application.activeUsers / 20) * 100, 100).toFixed(0)}%</span>
                                </div>
                                <Progress value={Math.min((application.activeUsers / 20) * 100, 100)} className="h-1" />
                              </div>
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          <div className="space-y-3">
                            <h4 className="text-sm text-gray-700">操作</h4>
                            {application.status === 'pending' && (
                              <div className="space-y-2">
                                <Button 
                                  size="sm" 
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  disabled
                                  onClick={() => handleApproveApplication(application.id)}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  批准申請 (功能開發中)
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                                  disabled
                                  onClick={() => handleRejectApplication(application.id, '')}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  拒絕申請 (功能開發中)
                                </Button>
                              </div>
                            )}
                            {application.status === 'approved' && (
                              <div className="text-center text-sm text-green-600">
                                <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                                已批准
                              </div>
                            )}
                            {application.status === 'rejected' && (
                              <div className="text-center text-sm text-red-600">
                                <XCircle className="w-4 h-4 mx-auto mb-1" />
                                已拒絕
                                <p className="text-xs mt-1">{application.rejectReason}</p>
                              </div>
                            )}
                            
                            <Button size="sm" variant="outline" className="w-full" disabled>
                              <Eye className="w-3 h-3 mr-1" />
                              查看詳情 (即將推出)
                            </Button>
                          </div>
                        </div>

                        {/* 备注区域 */}
                        {(application.notes || application.bdNotes) && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="bg-slate-800/50 p-3 rounded-lg">
                              <p className="text-sm text-gray-300">
                                <strong>備註:</strong> {application.notes || application.bdNotes}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 社區長管理 */}
          <TabsContent value="manage" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6">
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4" />
                        <span>Foundation 社區長管理</span>
                      </div>
                      <Button size="sm" disabled className="opacity-50">
                        <UserPlus className="w-4 h-4 mr-2" />
                        新增社區長 (即將推出)
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 表格标题 */}
                      <div className="grid grid-cols-10 gap-4 text-sm text-gray-300 font-medium p-3 bg-slate-800/50 rounded-lg">
                        <span>用戶名</span>
                        <span>等級</span>
                        <span className="text-right">返佣率</span>
                        <span className="text-right">下級數</span>
                        <span className="text-right">邀請數</span>
                        <span className="text-right">活躍數</span>
                        <span className="text-right">交易量</span>
                        <span className="text-right">代幣收益</span>
                        <span>狀態</span>
                        <span className="text-center">操作</span>
                      </div>

                      {/* Foundation社区长列表 */}
                      <div className="space-y-2">
                        {foundationLeaders.map((leader) => (
                          <div key={leader.id} className="grid grid-cols-10 gap-4 text-sm p-3 hover:bg-slate-800/50 rounded-lg transition-colors">
                            <div className="flex items-center">
                              <Crown className="w-3 h-3 text-yellow-500 mr-1" />
                              <span>{leader.username}</span>
                            </div>
                            <div>
                              <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800">
                                Foundation
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <span className="font-sans font-medium">{leader.rebateRate}%</span>
                                <Button size="sm" variant="ghost" className="h-4 w-4 p-0">
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-right font-sans font-medium">
                              {leader.subLevels}級
                            </div>
                            <div className="text-right font-sans font-medium">
                              {leader.totalInvited}
                            </div>
                            <div className="text-right font-sans font-medium text-green-600">
                              {leader.activeUsers}
                            </div>
                            <div className="text-right font-sans font-medium">
                              ${(leader.totalVolume / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-right font-sans font-medium text-yellow-600">
                              {(leader.tokenEarned / 1000).toFixed(0)}K
                            </div>
                            <div>
                              {getStatusBadge(leader.status)}
                            </div>
                            <div className="flex justify-center space-x-1">
                              <Button size="sm" variant="outline" className="text-xs" disabled>
                                <Settings className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" disabled>
                                <BarChart3 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 返佣設置 */}
          <TabsContent value="rebate" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Foundation社区长返佣设置 */}
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span>Foundation 社區長返佣</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>最高返佣比例</span>
                          <div className="flex items-center space-x-2">
                            <Input type="number" defaultValue="40" className="w-16 text-center" />
                            <span>%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>支持分級數量</span>
                          <div className="flex items-center space-x-2">
                            <Select defaultValue="3">
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2級</SelectItem>
                                <SelectItem value="3">3級</SelectItem>
                              </SelectContent>
                            </Select>
                            <span>級</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>固定代幣獎勵</span>
                          <div className="flex items-center space-x-2">
                            <Input type="number" defaultValue="100000" className="w-24 text-center" />
                            <span>RBT</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 非Foundation社区长返佣设置 */}
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-blue-500" />
                        <span>非Foundation 社區長返佣</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>最高返佣比例</span>
                          <div className="flex items-center space-x-2">
                            <Input type="number" defaultValue="35" className="w-16 text-center" />
                            <span>%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>支持分級數量</span>
                          <div className="flex items-center space-x-2">
                            <Select defaultValue="2">
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1級</SelectItem>
                                <SelectItem value="2">2級</SelectItem>
                              </SelectContent>
                            </Select>
                            <span>級</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>代幣分配池</span>
                          <div className="flex items-center space-x-2">
                            <Input type="number" defaultValue="4" className="w-16 text-center" />
                            <span>% 按比例</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* C2C用户设置 */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <UserPlus className="w-4 h-4 text-green-500" />
                      <span>C2C 用戶設置</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <h4 className="text-sm text-gray-700">申請門檻</h4>
                        <div className="flex justify-between items-center">
                          <span>累計交易量</span>
                          <div className="flex items-center space-x-2">
                            <Input type="number" defaultValue="50000" className="w-24 text-center" />
                            <span>USD</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm text-gray-700">返佣設置</h4>
                        <div className="flex justify-between items-center">
                          <span>固定返佣比例</span>
                          <div className="flex items-center space-x-2">
                            <Input type="number" defaultValue="10" className="w-16 text-center" />
                            <span>%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm text-gray-700">分級設置</h4>
                        <div className="flex justify-between items-center">
                          <span>支持分級</span>
                          <div className="flex items-center space-x-2">
                            <Select defaultValue="1" disabled>
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1級直推</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 保存按钮 */}
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" disabled className="opacity-50">
                    重置設置 (即將推出)
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700" disabled>
                    <Settings className="w-4 h-4 mr-2" />
                    保存設置 (即將推出)
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 代幣管理 */}
          <TabsContent value="tokens" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* 代币分配概览 */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Award className="w-4 h-4" />
                        <span>交易用戶補貼</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-2xl font-sans font-bold text-[rgba(10,10,10,1)]">10億</div>
                          <div className="text-sm text-gray-300">總代幣 (10%)</div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>已補貼:</span>
                            <span className="font-sans font-medium">6.5億 RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>剩餘:</span>
                            <span className="font-sans font-medium">3.5億 RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>每日上限:</span>
                            <span className="font-sans font-medium">500萬 RBT</span>
                          </div>
                        </div>
                        <Progress value={65} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Target className="w-4 h-4" />
                        <span>Foundation LP Pool</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-2xl font-sans font-bold text-[rgba(10,10,10,1)]">5億</div>
                          <div className="text-sm text-gray-300">總代幣 (5%)</div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>參與人數:</span>
                            <span className="font-sans font-medium">100人</span>
                          </div>
                          <div className="flex justify-between">
                            <span>每人分配:</span>
                            <span className="font-sans font-medium">500萬 RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>鎖倉時間:</span>
                            <span className="font-sans font-medium">180天</span>
                          </div>
                        </div>
                        <Progress value={45} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Crown className="w-4 h-4" />
                        <span>Foundation 社區長</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-2xl font-sans font-bold text-[rgba(10,10,10,1)]">5億</div>
                          <div className="text-sm text-gray-300">總代幣 (5%)</div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>固定獎勵:</span>
                            <span className="font-sans font-medium">1億 RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>每日分配:</span>
                            <span className="font-sans font-medium">4億 RBT</span>
                          </div>
                          <div className="flex justify-between">
                            <span>分配期間:</span>
                            <span className="font-sans font-medium">200天</span>
                          </div>
                        </div>
                        <Progress value={78} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 每日分配管理 */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>每日代幣分配管理</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="flex items-center space-x-2">
                            <Activity className="w-4 h-4" />
                            <span>活躍地址分配 (20%)</span>
                          </h4>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-2xl font-sans font-bold text-[rgba(10,10,10,1)] text-center">
                              {(systemStats.dailyTokenDistribution * 0.2).toLocaleString()}
                            </div>
                            <div className="text-center text-sm text-blue-700">每日分配 RBT</div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>今日活躍地址:</span>
                              <span className="font-sans font-medium">1,247</span>
                            </div>
                            <div className="flex justify-between">
                              <span>平均每地址:</span>
                              <span className="font-sans font-medium">321 RBT</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4" />
                            <span>交易量分配 (80%)</span>
                          </h4>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-2xl font-sans font-bold text-[rgba(10,10,10,1)] text-center">
                              {(systemStats.dailyTokenDistribution * 0.8).toLocaleString()}
                            </div>
                            <div className="text-center text-sm text-green-700">每日分配 RBT</div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>今日總交易量:</span>
                              <span className="font-sans font-medium">$45.6M</span>
                            </div>
                            <div className="flex justify-between">
                              <span>每萬USD獲得:</span>
                              <span className="font-sans font-medium">351 RBT</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 手动调整 */}
                      <div className="border-t pt-6">
                        <h4 className="mb-4">手動調整分配</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm">每日總分配</label>
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="number" 
                                defaultValue={systemStats.dailyTokenDistribution} 
                                className="text-center"
                              />
                              <span className="text-sm">RBT</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm">活躍地址比例</label>
                            <div className="flex items-center space-x-2">
                              <Input type="number" defaultValue="20" className="w-16 text-center" />
                              <span className="text-sm">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm">交易量比例</label>
                            <div className="flex items-center space-x-2">
                              <Input type="number" defaultValue="80" className="w-16 text-center" />
                              <span className="text-sm">%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                          <Button className="bg-orange-600 hover:bg-orange-700" disabled>
                            <Target className="w-4 h-4 mr-2" />
                            更新分配規則 (即將推出)
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 數據分析 */}
          <TabsContent value="analytics" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h3>數據分析功能</h3>
                  <p className="text-gray-300 mt-2">邀請體系數據統計與分析圖表</p>
                  <div className="mt-8 bg-slate-800/50 rounded-lg p-8">
                    <BarChart3 className="w-16 h-16 text-gray-300 font-medium mx-auto" />
                    <p className="text-gray-300 font-medium mt-4 text-lg">🚧 功能開發中</p>
                    <p className="text-gray-300 font-medium text-sm mt-2">預計將包含邀請數據統計、收益趨勢分析、用戶活躍度報表等功能</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 系統設置 */}
          <TabsContent value="system" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h3>系統設置</h3>
                  <p className="text-gray-300 mt-2">邀請體系全局配置與安全設置</p>
                  <div className="mt-8 bg-slate-800/50 rounded-lg p-8">
                    <Settings className="w-16 h-16 text-gray-300 font-medium mx-auto" />
                    <p className="text-gray-300 font-medium mt-4 text-lg">🚧 功能開發中</p>
                    <p className="text-gray-300 font-medium text-sm mt-2">預計將包含系統參數配置、安全策略設置、備份恢復等功能</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DevPage;