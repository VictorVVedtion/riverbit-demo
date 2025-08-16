import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Target, Zap, BarChart3, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface MarketSignal {
  type: 'opportunity' | 'risk' | 'neutral';
  message: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  actionable: boolean;
  timestamp: Date;
}

interface TradingRecommendation {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
}

interface SmartTradingAssistantProps {
  currentSymbol: string;
  currentPrice: number;
  userPositions: any[];
  isConnected: boolean;
  onApplyRecommendation: (rec: TradingRecommendation) => void;
}

const SmartTradingAssistant: React.FC<SmartTradingAssistantProps> = ({
  currentSymbol,
  currentPrice,
  userPositions,
  isConnected,
  onApplyRecommendation
}) => {
  const [activeSignals, setActiveSignals] = useState<MarketSignal[]>([]);
  const [currentRecommendation, setCurrentRecommendation] = useState<TradingRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 模拟实时AI分析
  useEffect(() => {
    const analyzeMarket = () => {
      setIsAnalyzing(true);
      
      // 模拟AI市场分析延迟
      setTimeout(() => {
        // 生成市场信号
        const signals: MarketSignal[] = [
          {
            type: 'opportunity',
            message: `${currentSymbol}突破关键阻力位，技术指标显示强势上涨信号`,
            confidence: 85,
            urgency: 'high',
            actionable: true,
            timestamp: new Date()
          },
          {
            type: 'risk',
            message: '市场波动性增加，建议降低杠杆或设置更保守的止损',
            confidence: 75,
            urgency: 'medium',
            actionable: true,
            timestamp: new Date()
          }
        ];

        // 生成交易建议
        const recommendation: TradingRecommendation = {
          symbol: currentSymbol,
          action: 'buy',
          entry: currentPrice * 0.998, // 稍低于当前价格的建议入场点
          stopLoss: currentPrice * 0.975, // 2.5%止损
          takeProfit: currentPrice * 1.05, // 5%止盈
          confidence: 82,
          reasoning: '技术分析显示突破形态，RSI未超买，成交量放大，建议小仓位做多',
          riskLevel: 'medium',
          timeframe: '2-5天'
        };

        setActiveSignals(signals);
        setCurrentRecommendation(recommendation);
        setIsAnalyzing(false);
      }, 1500);
    };

    // 初始分析
    analyzeMarket();

    // 定期更新分析
    const interval = setInterval(analyzeMarket, 30000); // 30秒更新一次

    return () => clearInterval(interval);
  }, [currentSymbol, currentPrice]);

  // 处理信号的紧急程度样式
  const getSignalStyle = (signal: MarketSignal) => {
    const baseClass = "border-l-4 pl-3 py-2 rounded-r-lg ";
    
    switch (signal.type) {
      case 'opportunity':
        return baseClass + "bg-green-500/10 border-green-400 text-green-400";
      case 'risk':
        return baseClass + "bg-orange-500/10 border-orange-400 text-orange-400";
      default:
        return baseClass + "bg-blue-500/10 border-blue-400 text-blue-400";
    }
  };

  // 风险等级颜色
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 智能通知栏 - 始终可见的主动提醒 */}
      <div className="bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 border border-purple-500/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-semibold">AI市场监控</span>
            {isAnalyzing && (
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-blue-400 text-sm">分析中...</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-400/30 text-xs">
              实时监控
            </Badge>
          </div>
        </div>

        {/* 活跃信号列表 */}
        <div className="space-y-2">
          {activeSignals.map((signal, index) => (
            <div key={index} className={getSignalStyle(signal)}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium">{signal.message}</div>
                  <div className="text-xs opacity-75 mt-1">
                    置信度: {signal.confidence}% • {signal.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                {signal.actionable && (
                  <Button size="sm" variant="outline" className="ml-3 text-xs">
                    查看详情
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI交易建议卡片 */}
      {currentRecommendation && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-400/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-400" />
                <span className="text-lg font-semibold text-purple-400">AI交易建议</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={`text-xs ${
                  currentRecommendation.action === 'buy' ? 'border-green-400 text-green-400' : 
                  currentRecommendation.action === 'sell' ? 'border-red-400 text-red-400' : 
                  'border-gray-400 text-gray-400'
                }`}>
                  {currentRecommendation.action.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs border-purple-400 text-purple-400">
                  {currentRecommendation.confidence}% 置信度
                </Badge>
              </div>
            </div>

            {/* 交易参数网格 */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-xs text-slate-400">入场价</div>
                <div className="text-sm font-mono text-white">${currentRecommendation.entry.toLocaleString()}</div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-xs text-slate-400">止损</div>
                <div className="text-sm font-mono text-red-400">${currentRecommendation.stopLoss.toLocaleString()}</div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-xs text-slate-400">止盈</div>
                <div className="text-sm font-mono text-green-400">${currentRecommendation.takeProfit.toLocaleString()}</div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-xs text-slate-400">风险</div>
                <div className={`text-sm font-semibold ${getRiskColor(currentRecommendation.riskLevel)}`}>
                  {currentRecommendation.riskLevel === 'low' ? '低' : 
                   currentRecommendation.riskLevel === 'medium' ? '中' : '高'}
                </div>
              </div>
            </div>

            {/* AI推理说明 */}
            <div className="bg-slate-800/20 rounded-lg p-3 mb-3">
              <div className="text-sm text-slate-300">
                <span className="text-purple-400 font-medium">AI分析:</span> {currentRecommendation.reasoning}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                预期时间框架: {currentRecommendation.timeframe}
              </div>
            </div>

            {/* 风险收益分析 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-500/10 rounded-lg p-2 border border-green-400/30">
                <div className="text-xs text-green-400">潜在收益</div>
                <div className="text-sm font-bold text-green-400">
                  +{((currentRecommendation.takeProfit - currentRecommendation.entry) / currentRecommendation.entry * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-2 border border-red-400/30">
                <div className="text-xs text-red-400">最大风险</div>
                <div className="text-sm font-bold text-red-400">
                  -{((currentRecommendation.entry - currentRecommendation.stopLoss) / currentRecommendation.entry * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-2">
              <Button 
                onClick={() => onApplyRecommendation(currentRecommendation)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={!isConnected}
              >
                <Zap className="w-4 h-4 mr-2" />
                应用建议
              </Button>
              <Button variant="outline" size="sm" className="border-purple-400/50 text-purple-400">
                定制参数
              </Button>
            </div>

            {!isConnected && (
              <div className="mt-2 text-xs text-orange-400 text-center">
                连接钱包以应用AI交易建议
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 持仓风险监控 */}
      {userPositions.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-lg font-semibold text-white">持仓风险监控</span>
            </div>
            
            <div className="space-y-2">
              {userPositions.map((position, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium">{position.pair}</span>
                    <Badge variant="outline" className={`text-xs ${
                      position.side === 'Long' ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'
                    }`}>
                      {position.side}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`text-sm ${position.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                      {position.pnl}
                    </div>
                    
                    {/* AI风险评估 */}
                    <div className={`w-2 h-2 rounded-full ${
                      position.risk === 'low' ? 'bg-green-400' :
                      position.risk === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} title={`风险等级: ${position.risk}`} />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 p-2 bg-blue-500/10 rounded-lg border border-blue-400/30">
              <div className="text-sm text-blue-400">
                💡 AI建议: 当前持仓组合风险适中，建议维持现有策略并密切关注BTC阻力位突破情况
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartTradingAssistant;