import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Zap, Eye, BarChart3, DollarSign } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

interface IntelligentTradingInterfaceProps {
  userAddress?: string;
  isConnected: boolean;
}

const IntelligentTradingInterface: React.FC<IntelligentTradingInterfaceProps> = ({
  userAddress,
  isConnected,
}) => {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState({
    action: 'buy' as 'buy' | 'sell' | 'hold',
    confidence: 85,
    entry: 67420,
    stopLoss: 66800,
    takeProfit: 68500,
    reasoning: 'BTC突破关键阻力位，RSI显示超买但动能强劲，建议小仓位做多',
    riskLevel: 'medium' as 'low' | 'medium' | 'high'
  });

  // 模拟实时AI建议更新
  useEffect(() => {
    const interval = setInterval(() => {
      // 模拟AI建议更新
      setAiSuggestion(prev => ({
        ...prev,
        confidence: Math.floor(Math.random() * 30) + 70,
        entry: 67420 + (Math.random() - 0.5) * 100
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // 模拟数据
  const marketData = {
    price: 67425.23,
    change24h: 2.45,
    volume: '$2.4B',
    high24h: 68234,
    low24h: 66543
  };

  const positions = [
    { pair: 'BTC/USDT', side: 'Long', size: '0.5 BTC', pnl: '+$1,234.56', risk: 'low' },
    { pair: 'ETH/USDT', side: 'Short', size: '10 ETH', pnl: '-$234.78', risk: 'medium' },
    { pair: 'SOL/USDT', side: 'Long', size: '50 SOL', pnl: '+$567.89', risk: 'high' }
  ];

  const aiAlerts = [
    {
      type: 'opportunity',
      message: 'BTC突破关键阻力位$67,500，建议关注多头机会',
      urgency: 'high'
    },
    {
      type: 'risk',
      message: '您的SOL持仓接近止损线，建议调整策略',
      urgency: 'medium'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* AI智能通知栏 - 始终可见的主动提醒 */}
      <div className="bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 border-b border-purple-500/30 p-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-semibold">AI Trading Assistant</span>
            </div>
            
            {aiAlerts.map((alert, index) => (
              <Alert key={index} className={`border-none p-2 ${
                alert.type === 'opportunity' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
              }`}>
                <AlertDescription className="text-sm">
                  {alert.type === 'opportunity' ? '💡' : '⚠️'} {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
          
          <div className="flex items-center space-x-3 text-sm text-slate-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>AI实时分析中</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要交易区域 - F型布局 */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-4 min-h-[calc(100vh-80px)]">
        
        {/* 左侧：价格信息 + 图表区域 (8列) */}
        <div className="col-span-8 space-y-4">
          
          {/* 价格头部 - 专业紧凑设计 */}
          <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold">₿</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">BTC/USDT</h1>
                      <div className="flex items-center space-x-4 text-sm text-slate-400">
                        <span>Vol: {marketData.volume}</span>
                        <span>24h: {marketData.low24h.toLocaleString()} - {marketData.high24h.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-white">
                      ${marketData.price.toLocaleString()}
                    </div>
                    <div className={`text-lg font-semibold ${marketData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {marketData.change24h >= 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* AI市场洞察简报 */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-3 border border-purple-400/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-400">AI Market Pulse</span>
                    <Badge variant="outline" className="text-xs border-green-400 text-green-400">
                      {aiSuggestion.confidence}% 置信度
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-300">
                    {aiSuggestion.reasoning}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 图表区域 - AI增强技术分析 */}
          <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-sm flex-1">
            <CardContent className="p-4 h-full">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">价格图表 + AI技术分析</h3>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">1m</Button>
                    <Button size="sm" variant="outline">5m</Button>
                    <Button size="sm" variant="default">1h</Button>
                    <Button size="sm" variant="outline">4h</Button>
                  </div>
                </div>
                
                {/* 模拟图表区域 - 实际应用中集成TradingView */}
                <div className="flex-1 bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg border border-slate-700/30 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">TradingView图表组件</p>
                      <p className="text-sm text-slate-500">集成AI技术分析标注</p>
                    </div>
                  </div>
                  
                  {/* AI分析覆盖层 */}
                  <div className="absolute top-4 left-4 space-y-2">
                    <div className="bg-green-500/10 border border-green-400/50 rounded-lg p-2 text-xs">
                      <div className="text-green-400 font-semibold">AI支撑位: $66,800</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-400/50 rounded-lg p-2 text-xs">
                      <div className="text-red-400 font-semibold">AI阻力位: $68,500</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：AI集成交易面板 (4列) */}
        <div className="col-span-4 space-y-4">
          
          {/* AI增强的交易表单 */}
          <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="space-y-4">
                
                {/* AI建议头部 */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-3 border border-purple-400/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-purple-400">AI交易建议</span>
                    </div>
                    <Badge variant="outline" className={`text-xs ${
                      aiSuggestion.action === 'buy' ? 'border-green-400 text-green-400' : 'border-red-400 text-red-400'
                    }`}>
                      {aiSuggestion.action.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-slate-400">入场</div>
                      <div className="text-white font-mono">${aiSuggestion.entry.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">止损</div>
                      <div className="text-red-400 font-mono">${aiSuggestion.stopLoss.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">止盈</div>
                      <div className="text-green-400 font-mono">${aiSuggestion.takeProfit.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* 交易表单 */}
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button
                      variant={orderSide === 'buy' ? 'default' : 'outline'}
                      onClick={() => setOrderSide('buy')}
                      className={`flex-1 ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-600/20'}`}
                    >
                      买入
                    </Button>
                    <Button
                      variant={orderSide === 'sell' ? 'default' : 'outline'}
                      onClick={() => setOrderSide('sell')}
                      className={`flex-1 ${orderSide === 'sell' ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-600/20'}`}
                    >
                      卖出
                    </Button>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">数量 (BTC)</label>
                    <Input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-slate-800/50 border-slate-600"
                    />
                  </div>

                  {/* AI一键应用建议 */}
                  <Button 
                    variant="outline" 
                    className="w-full border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
                    onClick={() => {
                      // 应用AI建议的价格
                      console.log('Applying AI suggestion');
                    }}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    应用AI建议
                  </Button>

                  {/* 执行按钮 */}
                  <Button
                    className={`w-full h-12 font-bold ${
                      orderSide === 'buy'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                    }`}
                    disabled={!isConnected}
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    {!isConnected ? '连接钱包以交易' : `${orderSide === 'buy' ? '买入' : '卖出'} BTC`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 投资组合概览 */}
          <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">投资组合</h3>
                
                <div className="bg-slate-800/40 rounded-lg p-3">
                  <div className="text-sm text-slate-400">总余额</div>
                  <div className="text-2xl font-bold text-white">$125,340.56</div>
                  <div className="text-green-400 text-sm">+$2,845.23 (+2.35%)</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center bg-slate-800/30 rounded p-2">
                    <div className="text-slate-400">持仓</div>
                    <div className="text-white font-semibold">3</div>
                  </div>
                  <div className="text-center bg-slate-800/30 rounded p-2">
                    <div className="text-slate-400">胜率</div>
                    <div className="text-green-400 font-semibold">87.5%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部：AI增强的持仓管理 - 横向布局 */}
        <div className="col-span-12">
          <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">活跃持仓</h3>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-500/20 text-green-400">总盈亏: +$1,567.67</Badge>
                  <Button size="sm" variant="outline" className="text-red-400 border-red-400/50">
                    一键平仓
                  </Button>
                </div>
              </div>

              {/* 横向持仓卡片 */}
              <div className="grid grid-cols-3 gap-4">
                {positions.map((position, index) => (
                  <div key={index} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-white">{position.pair}</div>
                      <Badge variant="outline" className={`text-xs ${
                        position.side === 'Long' ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'
                      }`}>
                        {position.side}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">规模:</span>
                        <span className="text-white font-mono">{position.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">盈亏:</span>
                        <span className={`font-mono ${position.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                          {position.pnl}
                        </span>
                      </div>
                    </div>

                    {/* AI风险指示器 */}
                    <div className={`mt-2 p-2 rounded text-xs text-center ${
                      position.risk === 'low' ? 'bg-green-500/10 text-green-400' :
                      position.risk === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      AI风险评估: {position.risk === 'low' ? '低风险' : position.risk === 'medium' ? '中风险' : '高风险'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IntelligentTradingInterface;