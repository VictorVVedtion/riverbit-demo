import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Target, Shield
} from 'lucide-react';
import { systemPositions, userData, getSystemStats, getUserPoolContribution } from '../../data/riverPoolData';
import { UserShareOverview } from './UserShareOverview';
import { SystemStatusOverview } from './SystemStatusOverview';
import { 
  formatCurrency, formatPercentage, calculatePnLPercentage, 
  isLongPosition, getPositionSideText, getRiskLevel
} from '../../utils/riverPoolUtils';

export const SystemPositionsTab: React.FC = () => {
  const systemStats = getSystemStats();
  const userContribution = getUserPoolContribution();

  return (
    <div className="space-y-6">
      {/* 用户份额概览 */}
      <UserShareOverview
        sharePercent={userData.sharePercent}
        rLPHolding={userData.rLPHolding}
        contributedMargin={userContribution.contributedMargin}
        shareOfPnL={userContribution.shareOfPnL}
        shareOfFunding={userContribution.shareOfFunding}
      />

      {/* 系统状态概览 */}
      <SystemStatusOverview systemStats={systemStats} />

      {/* 系统持仓详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-2 text-blue-600" />
              系統持倉詳情 (僅供查看)
            </div>
            <Badge variant="outline" className="text-blue-600">
              <Shield className="w-3 h-3 mr-1" />
              系統自動管理
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemPositions.map((position) => {
              const isLong = isLongPosition(position.side);
              const pnlPercentage = calculatePnLPercentage(position.unrealizedPnL, position.totalMargin);
              const userPnLShare = (position.unrealizedPnL * userData.sharePercent) / 100;
              const exposureRisk = getRiskLevel(position.exposurePercent, 'exposure');
              
              return (
                <div key={position.id} className="p-4 border rounded-lg bg-slate-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="font-bold text-lg">{position.symbol}</div>
                      <Badge variant={isLong ? "default" : "destructive"}>
                        {getPositionSideText(position.side)}
                      </Badge>
                      <Badge variant={
                        position.riskLevel === 'low' ? 'default' :
                        position.riskLevel === 'medium' ? 'secondary' : 'destructive'
                      }>
                        風險: {
                          position.riskLevel === 'low' ? '低' :
                          position.riskLevel === 'medium' ? '中' : '高'
                        }
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-300 font-medium">
                      更新時間: {position.lastUpdated}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-8 gap-4 text-sm">
                    <div>
                      <div className="text-gray-300 font-medium">淨持倉大小</div>
                      <div className="font-bold">{Math.abs(position.netSize).toLocaleString()}</div>
                    </div>
                    
                    <div>
                      <div className="text-gray-300 font-medium">平均價格</div>
                      <div className="font-bold">{formatCurrency(position.avgPrice)}</div>
                    </div>
                    
                    <div>
                      <div className="text-gray-300 font-medium">當前價格</div>
                      <div className="font-bold">{formatCurrency(position.currentPrice)}</div>
                    </div>
                    
                    <div>
                      <div className="text-gray-300 font-medium">系統保證金</div>
                      <div className="font-bold">{formatCurrency(position.totalMargin)}</div>
                    </div>
                    
                    <div>
                      <div className="text-gray-300 font-medium">未實現盈虧</div>
                      <div className={`font-bold flex items-center ${
                        position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {position.unrealizedPnL >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                      </div>
                      <div className={`text-xs ${
                        pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ({formatPercentage(pnlPercentage)})
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-300 font-medium">TVL 敞口</div>
                      <div className="font-bold">{position.exposurePercent.toFixed(1)}%</div>
                      <Progress 
                        value={position.exposurePercent} 
                        max={25}
                        className={`h-1 mt-1 ${
                          exposureRisk === 'safe' ? '[&>div]:bg-green-500' :
                          exposureRisk === 'warning' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <div className="text-gray-300 font-medium">累計資金費</div>
                      <div className={`font-bold ${
                        position.fundingAccrued >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {position.fundingAccrued >= 0 ? '+' : ''}{formatCurrency(position.fundingAccrued)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-300 font-medium">我的收益份額</div>
                      <div className={`font-bold ${
                        userPnLShare >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {userPnLShare >= 0 ? '+' : ''}{formatCurrency(userPnLShare)}
                      </div>
                      <div className="text-xs text-gray-300 font-medium">
                        ({userData.sharePercent.toFixed(3)}%)
                      </div>
                    </div>
                  </div>
                  
                  {/* 风险提示 */}
                  {position.exposurePercent > 20 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                      <div className="flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        ⚠️ 該交易對敞口較高，系統將自動調整風險敞口
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 透明化说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-4 h-4 mr-2 text-blue-600" />
            系統透明化說明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">自動做市機制</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>• RiverPool 使用 AMM 自動做市商機制</div>
                <div>• 系統根據市場需求自動調整持倉</div>
                <div>• 用戶無需手動管理，享受被動收益</div>
                <div>• 所有操作完全透明化，可隨時查看</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">風險管理</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>• 單個交易對敞口限制在 25% TVL</div>
                <div>• 系統自動監控並調整風險敞口</div>
                <div>• 保險金池提供額外保護</div>
                <div>• 24小時回撤超過閾值自動熔斷</div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="font-medium mb-2 text-blue-800">收益來源</div>
            <div className="text-sm text-blue-700">
              您的收益來自系統做市產生的交易手續費、資金費差價以及 AMM 價差收入。
              作為 LP，您按持有的 rLP 比例分享系統總收益，同時承擔相應的市場風險。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};