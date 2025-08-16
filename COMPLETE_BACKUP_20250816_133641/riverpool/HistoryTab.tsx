import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, Download, ExternalLink, Clock, DollarSign,
  TrendingUp, TrendingDown, Plus, Minus, Star, AlertCircle,
  Shield, Target, AlertTriangle
} from 'lucide-react';
import { mockTransactionHistory, revenueHistory, riskEventHistory } from '../../data/riverPoolData';

export const HistoryTab: React.FC = () => {
  const [historyTab, setHistoryTab] = useState('pool');

  return (
    <div className="space-y-6">
      <Tabs value={historyTab} onValueChange={setHistoryTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white border rounded-lg">
          <TabsTrigger value="pool" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>我的 LP 記錄</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>系統收益</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>風險事件</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>收益分析</span>
          </TabsTrigger>
        </TabsList>

        {/* RiverPool 交易历史 */}
        <TabsContent value="pool" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-green-600" />
                  RiverPool 交易歷史
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  導出 CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTransactionHistory.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' ? 'bg-blue-100 text-blue-600' :
                        tx.type === 'withdraw' ? 'bg-red-100 text-red-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {tx.type === 'deposit' ? <Plus className="w-5 h-5" /> :
                         tx.type === 'withdraw' ? <Minus className="w-5 h-5" /> :
                         <Star className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-medium">
                          {tx.type === 'deposit' ? '存入 USDC' :
                           tx.type === 'withdraw' ? '提取 USDC' :
                           '收益分配'}
                        </div>
                        <div className="text-sm text-gray-300 font-medium">{tx.date}</div>
                        <div className="text-xs text-gray-300">TxHash: {tx.hash}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-8 items-center text-right">
                      <div>
                        <div className="text-sm text-gray-300 font-medium">USDC 金額</div>
                        <div className={`font-bold ${
                          tx.type === 'withdraw' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {tx.type === 'withdraw' ? '-' : '+'}{tx.amount}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-300 font-medium">rLP 變化</div>
                        <div className={`font-bold ${
                          parseFloat(tx.rLP) < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {parseFloat(tx.rLP) > 0 ? '+' : ''}{tx.rLP}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-300 font-medium">rLP 價格</div>
                        <div className="font-bold">${tx.price}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-300 font-medium">手續費</div>
                        <div className="font-bold text-orange-600">${tx.fee}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {tx.status === 'confirmed' ? '已確認' : '待確認'}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <Button variant="outline">
                  載入更多記錄
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 系统收益历史 */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                  系統收益分配歷史
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  導出收益
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueHistory.map((revenue) => (
                  <div key={revenue.id} className="p-4 border rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-600`}>
                          <Star className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold">{revenue.date}</div>
                          <div className="text-sm text-gray-300 font-medium">每日收益結算</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-green-600 text-lg">
                          +${revenue.totalRevenue.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-300 font-medium">總收益</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <div className="text-gray-300 font-medium">交易手續費</div>
                        <div className="font-bold text-blue-600">${revenue.tradingFees.toLocaleString()}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-300 font-medium">資金費收入</div>
                        <div className="font-bold text-purple-600">${revenue.fundingFees.toLocaleString()}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-300 font-medium">AMM 價差</div>
                        <div className="font-bold text-orange-600">${revenue.ammSpread.toLocaleString()}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-300 font-medium">LP 分配 (80%)</div>
                        <div className="font-bold text-green-600">${revenue.lpShare.toLocaleString()}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-300 font-medium">平台分配 (20%)</div>
                        <div className="font-bold text-gray-300">${revenue.platformShare.toLocaleString()}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-300 font-medium">rLP 價格變化</div>
                        <div className="font-bold text-green-600">+{(revenue.rLPPriceChange * 100).toFixed(3)}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 风险事件历史 */}
        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-orange-600" />
                  風險管理事件
                </div>
                <div className="text-sm text-gray-300 font-medium">
                  系統自動風控記錄
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskEventHistory.map((event) => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          event.type === 'exposure_warning' ? 'bg-yellow-100 text-yellow-600' :
                          event.type === 'drawdown_alert' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium">{event.symbol}</div>
                          <div className="text-sm text-gray-300 font-medium">{event.timestamp}</div>
                        </div>
                      </div>
                      
                      <Badge variant={event.resolved ? "default" : "destructive"}>
                        {event.resolved ? '已處理' : '處理中'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-300 font-medium">事件類型</div>
                        <div className="font-bold">
                          {event.type === 'exposure_warning' ? '敞口警告' :
                           event.type === 'drawdown_alert' ? '回撤警告' :
                           event.type === 'funding_spike' ? '資金費異常' : event.type}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-300 font-medium">事件描述</div>
                        <div className="font-bold">{event.description}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-300 font-medium">系統響應</div>
                        <div className="font-bold">{event.action}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="w-4 h-4 mr-2 text-blue-600" />
                  <div className="font-medium text-blue-800">自動風控機制</div>
                </div>
                <div className="text-sm text-blue-700">
                  RiverPool 配備了完善的自動風控系統，實時監控市場風險並自動執行保護措施。
                  所有風險事件和系統響應都記錄在案，確保運營透明度。
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 收益分析 */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                收益分析統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${revenueHistory.reduce((sum, r) => sum + r.totalRevenue, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700 mt-1">累計總收益</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${revenueHistory.reduce((sum, r) => sum + r.lpShare, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700 mt-1">LP 總分配</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(revenueHistory.reduce((sum, r) => sum + r.rLPPriceChange, 0) * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-purple-700 mt-1">rLP 累計升值</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${(revenueHistory.reduce((sum, r) => sum + r.totalRevenue, 0) / revenueHistory.length).toFixed(0)}
                  </div>
                  <div className="text-sm text-orange-700 mt-1">日均收益</div>
                </div>
              </div>
              
              <div className="text-center text-gray-300 font-medium py-8">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <div>更多詳細分析圖表開發中...</div>
                <div className="text-sm mt-2">包括收益趨勢、風險收益比、LP表現評估等</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};