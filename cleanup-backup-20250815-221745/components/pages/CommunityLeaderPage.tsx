import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Crown, Users, Settings, TrendingUp, DollarSign, 
  Edit3, Save, X, Search, Filter, AlertTriangle,
  CheckCircle, Clock, Star, Shield, Target, Award
} from 'lucide-react';

const CommunityLeaderPage = () => {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Mock 社区长数据
  const leaderData = {
    username: 'crypto_leader_01',
    level: 'Foundation社區長',
    isFoundation: true,
    currentRebateRate: 40,
    maxRebateRate: 40,
    tierLevels: 3,
    totalInvited: 234,
    activeUsers: 89,
    totalVolume: 4500000,
    monthlyCommission: 18750,
    subordinateUsers: 156,
    directReferrals: 42
  };

  // Mock 下级用户数据
  const subordinateUsers = [
    {
      id: 1,
      username: 'trader_001',
      walletAddress: '0x1234...5678',
      level: 'L1',
      currentRebateRate: 35,
      maxAllowedRate: 38,
      volume30d: 450000,
      commission30d: 1575,
      joinDate: '2024-01-15',
      status: 'active',
      lastActive: '2小時前',
      trades30d: 234,
      subordinates: 8
    },
    {
      id: 2,
      username: 'defi_lover',
      walletAddress: '0x5678...9abc',
      level: 'L2',
      currentRebateRate: 25,
      maxAllowedRate: 30,
      volume30d: 280000,
      commission30d: 700,
      joinDate: '2024-01-10',
      status: 'active',
      lastActive: '1天前',
      trades30d: 167,
      subordinates: 3
    },
    {
      id: 3,
      username: 'crypto_fan',
      walletAddress: '0x9abc...def0',
      level: 'L1',
      currentRebateRate: 32,
      maxAllowedRate: 38,
      volume30d: 680000,
      commission30d: 2176,
      joinDate: '2023-12-20',
      status: 'active',
      lastActive: '4小時前',
      trades30d: 345,
      subordinates: 12
    },
    {
      id: 4,
      username: 'blockchain_pro',
      walletAddress: '0xdef0...1234',
      level: 'L3',
      currentRebateRate: 15,
      maxAllowedRate: 20,
      volume30d: 125000,
      commission30d: 187.5,
      joinDate: '2024-01-08',
      status: 'inactive',
      lastActive: '7天前',
      trades30d: 45,
      subordinates: 0
    }
  ];

  const [tempRebateRates, setTempRebateRates] = useState({});

  const handleEditRebate = (user) => {
    setEditingUser(user);
    setTempRebateRates({ ...tempRebateRates, [user.id]: user.currentRebateRate });
    setIsEditDialogOpen(true);
  };

  const handleSaveRebate = () => {
    console.log('保存返佣率:', editingUser?.id, tempRebateRates[editingUser?.id]);
    // 这里会调用API保存返佣率
    setIsEditDialogOpen(false);
    setEditingUser(null);
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'text-green-600' : 'text-gray-300';
  };

  const getStatusBadge = (status) => {
    return status === 'active' 
      ? <Badge variant="default" className="bg-green-100 text-green-700">活躍</Badge>
      : <Badge variant="secondary">非活躍</Badge>;
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'L1': return 'text-blue-600';
      case 'L2': return 'text-purple-600';
      case 'L3': return 'text-orange-600';
      default: return 'text-gray-300';
    }
  };

  const filteredUsers = subordinateUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.walletAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === 'all' || user.level === selectedTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* 顶部概览 */}
      <div className="bg-slate-900/50 border-slate-700/50 border-b px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2 text-white">
              <Crown className="w-6 h-6 text-yellow-600" />
              <span>社區長管理後台</span>
              <Badge className="bg-yellow-100 text-yellow-800">
                {leaderData.level}
              </Badge>
            </h1>
            <p className="text-gray-300 mt-1">管理下級用戶返佣比例 • 團隊收益統計 • 用戶成長追蹤</p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-300">我的返佣率</div>
            <div className="text-lg font-bold text-yellow-400">{leaderData.currentRebateRate}%</div>
            <div className="text-sm text-gray-300">最高可設 {leaderData.maxRebateRate}%</div>
          </div>
        </div>

        {/* 核心数据卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">下級用戶總數</p>
                  <h3 className="text-lg font-bold text-[rgba(255,255,255,1)]">{leaderData.subordinateUsers}</h3>
                  <p className="text-yellow-100 text-sm">{leaderData.directReferrals} 直接邀請</p>
                </div>
                <Users className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">月返佣收入</p>
                  <h3 className="text-lg font-bold text-green-600">${leaderData.monthlyCommission.toLocaleString()}</h3>
                  <p className="text-green-600 text-sm">+15.2% 較上月</p>
                </div>
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[rgba(106,114,130,1)] text-sm">團隊總交易量</p>
                  <h3 className="text-base font-bold text-white">${(leaderData.totalVolume / 1000000).toFixed(1)}M</h3>
                  <p className="text-[#92318D] text-sm">30天</p>
                </div>
                <TrendingUp className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[rgba(106,114,130,1)] text-sm">活躍用戶</p>
                  <h3 className="text-base font-bold text-white">{leaderData.activeUsers}</h3>
                  <p className="text-[#92318D] text-sm">{((leaderData.activeUsers / leaderData.totalInvited) * 100).toFixed(1)}% 活躍率</p>
                </div>
                <Target className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[rgba(106,114,130,1)] text-sm">團隊層級</p>
                  <h3 className="text-base font-bold text-white">{leaderData.tierLevels} 層</h3>
                  <p className="text-[#92318D] text-sm">Foundation級</p>
                </div>
                <Star className="w-6 h-6 text-[#92318D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[rgba(106,114,130,1)] text-sm">管理權限</p>
                  <h3 className="text-base font-bold text-white">完整</h3>
                  <p className="text-[#92318D] text-sm">返佣設置</p>
                </div>
                <Settings className="w-6 h-6 text-[#92318D]" />
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
              <TabsTrigger value="dashboard" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">團隊總覽</TabsTrigger>
              <TabsTrigger value="rebate" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">返佣設置</TabsTrigger>
              <TabsTrigger value="analytics" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">數據分析</TabsTrigger>
              <TabsTrigger value="growth" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">成長路徑</TabsTrigger>
            </TabsList>
          </div>

          {/* 团队总览 */}
          <TabsContent value="dashboard" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-[#92318D]" />
                      <span className="text-white">團隊結構</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['L1', 'L2', 'L3'].map((level) => {
                        const levelUsers = subordinateUsers.filter(u => u.level === level);
                        const percentage = (levelUsers.length / subordinateUsers.length) * 100;
                        return (
                          <div key={level}>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-white">{level} 級用戶</span>
                              <span className="text-base font-bold text-white">{levelUsers.length} 人 ({percentage.toFixed(1)}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-[#92318D]" />
                      <span className="text-white">收益統計</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white">總返佣收入:</span>
                        <span className="text-base font-bold text-white">${leaderData.monthlyCommission.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white">平均返佣率:</span>
                        <span className="text-base font-bold text-white">
                          {(subordinateUsers.reduce((sum, u) => sum + u.currentRebateRate, 0) / subordinateUsers.length).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white">最高單用戶收入:</span>
                        <span className="text-base font-bold text-white">
                          ${Math.max(...subordinateUsers.map(u => u.commission30d)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white">團隊增長率:</span>
                        <span className="text-base font-bold text-white">+12.5% 月增</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-[#92318D]" />
                      <span className="text-white">管理權限</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-white">返佣率調整:</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">用戶等級設置:</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">數據查看權限:</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">子級管理權限:</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 返佣设置 */}
          <TabsContent value="rebate" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              {/* 搜索和筛选 */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300" />
                      <Input
                        placeholder="搜索用戶名或錢包地址..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedTier} onValueChange={setSelectedTier}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部層級</SelectItem>
                        <SelectItem value="L1">L1 級</SelectItem>
                        <SelectItem value="L2">L2 級</SelectItem>
                        <SelectItem value="L3">L3 級</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 用户列表 */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>下級用戶返佣管理</span>
                    </div>
                    <Badge variant="outline">
                      {filteredUsers.length} 個用戶
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 表头 */}
                    <div className="grid grid-cols-9 gap-4 text-sm text-gray-300 p-3 bg-slate-800/50 rounded-lg">
                      <span>用戶名</span>
                      <span>層級</span>
                      <span className="text-right">當前返佣率</span>
                      <span className="text-right">30天交易量</span>
                      <span className="text-right">30天返佣</span>
                      <span className="text-right">下級數</span>
                      <span>狀態</span>
                      <span>最後活躍</span>
                      <span className="text-center">操作</span>
                    </div>

                    {/* 用户数据 */}
                    <div className="space-y-2">
                      {filteredUsers.map((user) => (
                        <div key={user.id} className="grid grid-cols-9 gap-4 text-sm p-3 hover:bg-slate-800/50 rounded-lg transition-colors border">
                          <div className="flex items-center">
                            <div>
                              <div className="font-medium">{user.username}</div>
                              <div className="text-xs text-gray-300 font-sans font-medium">
                                {user.walletAddress}
                              </div>
                            </div>
                          </div>

                          <div>
                            <Badge variant="outline" className={getLevelColor(user.level)}>
                              {user.level}
                            </Badge>
                          </div>

                          <div className="text-right">
                            <div className="font-sans font-medium">{user.currentRebateRate}%</div>
                            <div className="text-xs text-gray-300">
                              最高 {user.maxAllowedRate}%
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-sans font-medium">${user.volume30d.toLocaleString()}</div>
                            <div className="text-xs text-gray-300">
                              {user.trades30d} 筆交易
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-sans font-medium text-green-600">
                              ${user.commission30d.toLocaleString()}
                            </div>
                          </div>

                          <div className="text-right font-sans font-medium">
                            {user.subordinates}
                          </div>

                          <div>
                            {getStatusBadge(user.status)}
                          </div>

                          <div className="text-xs text-gray-300">
                            {user.lastActive}
                          </div>

                          <div className="flex justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditRebate(user)}
                              className="text-xs"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              設置
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 数据分析 */}
          <TabsContent value="analytics" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <div className="text-center">
                <h3>團隊數據分析</h3>
                <p className="text-gray-300 mt-2">收益趨勢 • 用戶活躍度 • 返佣效率分析</p>
                <div className="mt-8 bg-slate-800/50 rounded-lg p-8">
                  <TrendingUp className="w-16 h-16 text-gray-300 mx-auto" />
                  <p className="text-gray-300 mt-4 text-lg">🚧 功能開發中</p>
                  <p className="text-gray-300 text-sm mt-2">預計將包含收益趨勢圖表、用戶活躍度分析、返佣效率統計等功能</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 成长路径 */}
          <TabsContent value="growth" className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <div className="text-center">
                <h3>用戶成長路徑</h3>
                <p className="text-gray-300 mt-2">升級條件 • 獎勵機制 • 培訓體系</p>
                <div className="mt-8 bg-slate-800/50 rounded-lg p-8">
                  <Award className="w-16 h-16 text-gray-300 mx-auto" />
                  <p className="text-gray-300 mt-4 text-lg">🚧 功能開發中</p>
                  <p className="text-gray-300 text-sm mt-2">預計將包含用戶等級升級路徑、獎勵達成條件、培訓課程體系等功能</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 返佣设置弹窗 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>設置返佣比例</span>
            </DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-300">用戶:</span>
                    <div className="font-medium">{editingUser.username}</div>
                  </div>
                  <div>
                    <span className="text-gray-300">當前等級:</span>
                    <div className="font-medium">{editingUser.level}</div>
                  </div>
                  <div>
                    <span className="text-gray-300">30天交易量:</span>
                    <div className="font-medium">${editingUser.volume30d.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-300">當前返佣:</span>
                    <div className="font-medium">{editingUser.currentRebateRate}%</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">新返佣比例</label>
                <div className="flex items-center space-x-4">
                  <Input
                    type="number"
                    min="0"
                    max={editingUser.maxAllowedRate}
                    value={tempRebateRates[editingUser.id] || editingUser.currentRebateRate}
                    onChange={(e) => setTempRebateRates({
                      ...tempRebateRates,
                      [editingUser.id]: parseFloat(e.target.value)
                    })}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-300">
                    最高 {editingUser.maxAllowedRate}%
                  </span>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  返佣比例調整將在下一個結算週期生效。請確保設置的比例符合團隊激勵策略。
                </AlertDescription>
              </Alert>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveRebate}>
                  <Save className="w-4 h-4 mr-2" />
                  保存設置
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityLeaderPage;