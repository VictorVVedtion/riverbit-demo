import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Wallet, TrendingUp, TrendingDown, DollarSign, 
  BarChart3, PieChart, Activity, ExternalLink,
  ArrowUpRight, ArrowDownRight, Globe, Shield,
  Zap, Users, Star, ChevronRight, X, AlertTriangle,
  Target, StopCircle, Settings
} from 'lucide-react';
import { mockPositions } from '../../data/mockData';
import { closeAllPositions, closePosition, calculateTotals } from '../../utils/helpers';

interface DashboardPageProps {
  isWalletConnected: boolean;
  walletAddress: string;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onNavigate: (page: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  isWalletConnected,
  walletAddress,
  onConnectWallet,
  onDisconnectWallet,
  onNavigate
}) => {
  const { totalPnL, totalMargin } = calculateTotals();
  const hasPositions = mockPositions.length > 0;
  
  // Calculate account metrics
  const accountMetrics = {
    totalAssets: 125420.50,
    availableBalance: 98550.25,
    marginUsed: 26870.25,
    marginLevel: 467.2,
    unrealizedPnL: totalPnL,
    totalPositions: mockPositions.length,
    profitablePositions: mockPositions.filter(p => p.pnl > 0).length
  };

  const marginUsagePercent = (accountMetrics.marginUsed / accountMetrics.totalAssets) * 100;
  const isHighRisk = marginUsagePercent > 80;

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 顶部欢迎区域 */}
      <div className="bg-white border-b px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">交易總覽</h1>
            <p className="text-gray-600 mt-1">實時監控您的交易狀況和風險</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {!isWalletConnected ? (
              <Button onClick={onConnectWallet} className="bg-blue-600 hover:bg-blue-700">
                <Wallet className="w-4 h-4 mr-2" />
                連接錢包
              </Button>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="text-sm">
                  <div className="text-gray-500">已連接</div>
                  <div className="font-mono text-xs">{walletAddress}</div>
                </div>
                <Button variant="outline" size="sm" onClick={onDisconnectWallet}>
                  斷開連接
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主內容區域 - 可滾動 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* 緊急風險警告 */}
          {isHighRisk && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="flex items-center justify-between">
                  <span>保證金使用率過高 ({marginUsagePercent.toFixed(1)}%)，建議降低風險或增加資金</span>
                  <Button size="sm" variant="destructive" onClick={closeAllPositions}>
                    緊急平倉
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 核心指標卡片 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">總資產價值</p>
                    <h2 className="text-2xl font-bold">${accountMetrics.totalAssets.toLocaleString()}</h2>
                    <div className="flex items-center text-blue-100 text-sm mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +2.45% (24h)
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-300" />
                </div>
              </CardContent>
            </Card>

            <Card className={`${totalPnL >= 0 ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-red-600 to-red-700'} text-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${totalPnL >= 0 ? 'text-green-100' : 'text-red-100'} text-sm`}>未實現盈虧</p>
                    <h2 className="text-2xl font-bold">
                      {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
                    </h2>
                    <div className={`flex items-center ${totalPnL >= 0 ? 'text-green-100' : 'text-red-100'} text-sm mt-1`}>
                      {totalPnL >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                      {((totalPnL / accountMetrics.totalAssets) * 100).toFixed(2)}%
                    </div>
                  </div>
                  <BarChart3 className={`w-8 h-8 ${totalPnL >= 0 ? 'text-green-300' : 'text-red-300'}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">保證金使用</p>
                    <h3 className="text-xl font-bold">${accountMetrics.marginUsed.toLocaleString()}</h3>
                    <div className={`text-sm mt-1 ${isHighRisk ? 'text-red-600' : 'text-orange-600'}`}>
                      {marginUsagePercent.toFixed(1)}% 使用率
                    </div>
                  </div>
                  <Shield className={`w-6 h-6 ${isHighRisk ? 'text-red-500' : 'text-orange-500'}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">活躍持倉</p>
                    <h3 className="text-xl font-bold">{accountMetrics.totalPositions}</h3>
                    <p className="text-sm text-green-600 mt-1">
                      {accountMetrics.profitablePositions} 盈利 • {accountMetrics.totalPositions - accountMetrics.profitablePositions} 虧損
                    </p>
                  </div>
                  <Activity className="w-6 h-6 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 當前持倉 - 核心模組 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">當前持倉</CardTitle>
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">
                    總持仓: {mockPositions.length}
                  </Badge>
                  <Badge variant={totalPnL >= 0 ? 'default' : 'destructive'}>
                    總盈虧: {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
                  </Badge>
                  {hasPositions && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={closeAllPositions}
                      className="font-medium"
                    >
                      <X className="w-4 h-4 mr-1" />
                      一鍵平倉
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!hasPositions ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">暫無持倉</h3>
                  <p className="text-gray-500 mb-4">開始交易來建立您的第一個持倉</p>
                  <Button onClick={() => onNavigate('trading')} className="bg-blue-600 hover:bg-blue-700">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    開始交易
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 持仓列表头部 */}
                  <div className="grid grid-cols-8 gap-4 text-sm text-gray-500 pb-2 border-b">
                    <span>合約</span>
                    <span>方向/槓桿</span>
                    <span className="text-right">數量</span>
                    <span className="text-right">開倉價</span>
                    <span className="text-right">當前價</span>
                    <span className="text-right">盈虧</span>
                    <span className="text-right">強平價</span>
                    <span className="text-center">操作</span>
                  </div>
                  
                  {/* 持仓列表 */}
                  <div className="space-y-3">
                    {mockPositions.map((position) => (
                      <div 
                        key={position.id} 
                        className={`grid grid-cols-8 gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          position.pnl >= 0 
                            ? 'bg-green-50 border-green-200 hover:border-green-300' 
                            : 'bg-red-50 border-red-200 hover:border-red-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{position.pair}</span>
                          {position.pair.startsWith('x') && (
                            <Badge variant="secondary" className="text-xs">xStock</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center">
                          <Badge 
                            variant={position.side === 'long' ? 'default' : 'destructive'} 
                            className={`text-sm font-medium ${
                              position.side === 'long' 
                                ? 'bg-green-100 text-green-700 border-green-300' 
                                : 'bg-red-100 text-red-700 border-red-300'
                            }`}
                          >
                            {position.side === 'long' ? '多' : '空'} {position.leverage}x
                          </Badge>
                        </div>
                        
                        <div className="text-right">
                          <span className="font-mono font-medium">{position.size}</span>
                        </div>
                        
                        <div className="text-right">
                          <span className="font-mono">${position.entryPrice.toLocaleString()}</span>
                        </div>
                        
                        <div className="text-right">
                          <span className="font-mono">${position.currentPrice.toLocaleString()}</span>
                        </div>
                        
                        <div className="text-right">
                          <div className={`font-mono font-bold text-lg ${
                            position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(0)}
                          </div>
                          <div className={`text-sm font-medium ${
                            position.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent}%)
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className="font-mono text-red-600 font-medium">
                            ${position.liquidationPrice.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => closePosition(position.id)}
                            className="text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                          >
                            平倉
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-sm"
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 持仓总结 */}
                  <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-500">總持倉價值</div>
                        <div className="font-bold text-lg">${totalMargin.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">盈利持倉</div>
                        <div className="font-bold text-lg text-green-600">{accountMetrics.profitablePositions}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">虧損持倉</div>
                        <div className="font-bold text-lg text-red-600">{accountMetrics.totalPositions - accountMetrics.profitablePositions}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">勝率</div>
                        <div className="font-bold text-lg text-blue-600">
                          {((accountMetrics.profitablePositions / accountMetrics.totalPositions) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 快速操作區域 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 左側：市場概覽 */}
            <div className="xl:col-span-2 space-y-6">
              {/* 熱門交易對 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>熱門交易對</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => onNavigate('trading')}>
                      查看全部
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { pair: 'BTC/USDT', price: '67,420.50', change: '+2.45%', volume: '2.4B', positive: true },
                      { pair: 'ETH/USDT', price: '3,890.20', change: '+1.85%', volume: '1.8B', positive: true },
                      { pair: 'xAAPL', price: '185.60', change: '-0.75%', volume: '450M', positive: false },
                      { pair: 'xTSLA', price: '245.80', change: '+3.20%', volume: '380M', positive: true },
                      { pair: 'SOL/USDT', price: '98.45', change: '+5.60%', volume: '320M', positive: true },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="font-medium">{item.pair}</div>
                            <div className="text-sm text-gray-500">成交量: {item.volume}</div>
                          </div>
                          {item.pair.startsWith('x') && (
                            <Badge variant="secondary" className="text-xs">xStock</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${item.price}</div>
                          <div className={`text-sm ${item.positive ? 'text-green-600' : 'text-red-600'}`}>
                            {item.change}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 最近交易活動 */}
              <Card>
                <CardHeader>
                  <CardTitle>最近交易活動</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { type: '開倉', pair: 'BTC/USDT', side: 'long', amount: '0.5 BTC', pnl: '+$450', time: '5分鐘前' },
                      { type: '平倉', pair: 'ETH/USDT', side: 'short', amount: '2.5 ETH', pnl: '+$125', time: '1小時前' },
                      { type: '開倉', pair: 'xAAPL', side: 'long', amount: '$10,000', pnl: '-$85', time: '2小時前' },
                      { type: 'RiverPool', pair: 'USDT', side: 'deposit', amount: '$5,000', pnl: '+$12', time: '1天前' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'RiverPool' ? 'bg-purple-500' :
                            activity.side === 'long' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <div className="font-medium">{activity.type} • {activity.pair}</div>
                            <div className="text-sm text-gray-500">{activity.amount}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${activity.pnl.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {activity.pnl}
                          </div>
                          <div className="text-sm text-gray-500">{activity.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右側：快速操作 */}
            <div className="space-y-6">
              {/* 快速交易 */}
              <Card>
                <CardHeader>
                  <CardTitle>快速操作</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                    onClick={() => onNavigate('trading')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    開始交易
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => onNavigate('assets')}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    資產管理
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => onNavigate('riverpool')}
                  >
                    <PieChart className="w-4 h-4 mr-2" />
                    RiverPool 挖礦
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => onNavigate('referral')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    邀請獎勵
                  </Button>
                </CardContent>
              </Card>

              {/* 保證金狀態 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    保證金狀態
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>保證金使用率</span>
                      <span className={`font-medium ${isHighRisk ? 'text-red-600' : 'text-orange-600'}`}>
                        {marginUsagePercent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={marginUsagePercent} 
                      className={`h-3 ${isHighRisk ? '[&>div]:bg-red-500' : '[&>div]:bg-orange-500'}`} 
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {isHighRisk ? '⚠️ 高風險：建議降低槓桿' : '✅ 風險可控'}
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>可用保證金</span>
                      <span className="text-green-600 font-medium">${accountMetrics.availableBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>已用保證金</span>
                      <span className="text-orange-600 font-medium">${accountMetrics.marginUsed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>保證金比例</span>
                      <span className="text-blue-600 font-medium">{accountMetrics.marginLevel}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 平台特色 */}
              <Card>
                <CardHeader>
                  <CardTitle>平台特色</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <div>
                      <div className="font-medium text-sm">高性能交易</div>
                      <div className="text-xs text-gray-500">毫秒級別執行</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="font-medium text-sm">安全保障</div>
                      <div className="text-xs text-gray-500">多重安全機制</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium text-sm">xStock 交易</div>
                      <div className="text-xs text-gray-500">美股永續合約</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Star className="w-4 h-4 text-purple-500" />
                    <div>
                      <div className="font-medium text-sm">流動性挖礦</div>
                      <div className="text-xs text-gray-500">RiverPool 收益</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;