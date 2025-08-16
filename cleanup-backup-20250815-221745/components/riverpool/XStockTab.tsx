import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Globe, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { xStockPairs, marketStatus } from '../../data/riverPoolData';

export const XStockTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 主池概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="w-4 h-4 mr-2 text-blue-600" />
            xStock 主池概覽
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium text-blue-700">市場狀態</div>
                <div className="text-sm text-blue-600">
                  {marketStatus.isMarketOpen ? '🟢 開市中' : '🟡 休市中'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div>
                <div className="font-medium text-green-700">支持交易對</div>
                <div className="text-sm text-green-600">7 個永續合約</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
              <Globe className="w-4 h-4 text-purple-600" />
              <div>
                <div className="font-medium text-purple-700">總開倉量</div>
                <div className="text-sm text-purple-600">
                  ${(xStockPairs.reduce((sum, pair) => sum + pair.openInterest, 0) / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <div>
                <div className="font-medium text-orange-700">24h 成交量</div>
                <div className="text-sm text-orange-600">
                  ${(xStockPairs.reduce((sum, pair) => sum + pair.volume, 0) / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>

          {!marketStatus.isMarketOpen && (
            <div className="p-4 rounded-lg border mb-6 border-orange-200 bg-orange-50">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <div className="font-medium text-orange-800">
                  美股休市期間：點差擴大至 {marketStatus.spreadMultiplier}x，使用前一收盤價作為參考
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 支持的交易对列表 */}
      <Card>
        <CardHeader>
          <CardTitle>支持的永續合約</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {xStockPairs.map((pair, index) => (
              <div key={pair.symbol} className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600', 'bg-pink-600'][index]
                  }`}>
                    {pair.symbol.slice(1, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{pair.symbol}</div>
                    <div className="text-sm text-gray-300">{pair.name}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-6 gap-6 items-center text-center">
                  <div>
                    <div className="text-sm text-gray-300 font-medium">當前價格</div>
                    <div className="font-bold text-lg">${pair.price.toFixed(2)}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-300 font-medium">24h 變化</div>
                    <div className={`font-bold flex items-center justify-center ${pair.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pair.change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {pair.change >= 0 ? '+' : ''}{pair.change.toFixed(2)}%
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-300 font-medium">24h 成交量</div>
                    <div className="font-bold">${(pair.volume / 1000000).toFixed(1)}M</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-300 font-medium">開倉量</div>
                    <div className="font-bold">${(pair.openInterest / 1000000).toFixed(1)}M</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-300 font-medium">資金費率</div>
                    <div className={`font-bold ${pair.fundingRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pair.fundingRate >= 0 ? '+' : ''}{(pair.fundingRate * 100).toFixed(4)}%
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-300 font-medium">池子敞口</div>
                    <div className="space-y-1">
                      <div className={`font-bold ${
                        pair.exposure <= 15 ? 'text-green-600' :
                        pair.exposure <= 20 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {pair.exposure.toFixed(1)}%
                      </div>
                      <Progress 
                        value={pair.exposure} 
                        max={25}
                        className={`h-1 ${
                          pair.exposure <= 15 ? '[&>div]:bg-green-500' :
                          pair.exposure <= 20 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant={pair.exposure <= 15 ? "default" : pair.exposure <= 20 ? "secondary" : "destructive"}>
                    {pair.exposure <= 15 ? '正常' : pair.exposure <= 20 ? '警告' : '風險'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 风控规则说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
            主池風控規則
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">敞口管理</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>單個交易對敞口上限</span>
                  <span className="font-bold text-orange-600">25% TVL</span>
                </div>
                <div className="flex justify-between">
                  <span>總淨敞口上限</span>
                  <span className="font-bold text-orange-600">25% TVL</span>
                </div>
                <div className="flex justify-between">
                  <span>風險預警閾值</span>
                  <span className="font-bold text-yellow-600">20% TVL</span>
                </div>
                <div className="flex justify-between">
                  <span>正常運行閾值</span>
                  <span className="font-bold text-green-600">≤15% TVL</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">市場狀態管理</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>正常開市</span>
                  <span className="font-bold text-green-600">Mon-Fri 21:00-01:30 UTC</span>
                </div>
                <div className="flex justify-between">
                  <span>休市點差</span>
                  <span className="font-bold text-orange-600">2x 擴大</span>
                </div>
                <div className="flex justify-between">
                  <span>緊急熔斷</span>
                  <span className="font-bold text-red-600">24h 回撤 ≥8%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="font-medium mb-2">透明化原則</div>
            <div className="text-sm text-gray-300">
              xStock 主池採用完全透明的運營方式，所有交易對的敞口、資金費率、開倉量等數據均實時公開。
              池子通過 AMM 自動做市機制為用戶提供流動性，同時嚴格控制風險敞口，確保系統穩定運行。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};