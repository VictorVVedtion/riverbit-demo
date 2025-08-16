import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Activity,
  AlertTriangle,
  Bell,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Eye,
  EyeOff,
  Settings,
  Zap,
  RefreshCw,
  Gauge,
  PieChart,
  BarChart3,
  LineChart,
  Clock,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  lastUpdated: number;
}

interface RiskMetric {
  id: string;
  name: string;
  value: number;
  threshold: number;
  status: 'safe' | 'warning' | 'danger';
  unit: string;
  description: string;
}

interface Alert {
  id: string;
  type: 'price' | 'pnl' | 'margin' | 'liquidation' | 'volume';
  symbol?: string;
  message: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error';
  triggered: boolean;
}

interface AdvancedMonitoringPanelProps {
  isWalletConnected: boolean;
  accountData: any;
  positions: any[];
  marketData: MarketData[];
  className?: string;
}

const AdvancedMonitoringPanel: React.FC<AdvancedMonitoringPanelProps> = ({
  isWalletConnected,
  accountData,
  positions,
  marketData,
  className = ''
}) => {
  // State for monitoring preferences
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);

  // Risk monitoring settings
  const [riskThresholds, setRiskThresholds] = useState({
    maxDailyLoss: 1000,
    marginCallLevel: 150,
    maxLeverage: 50,
    maxPositionSize: 10000,
    minAccountBalance: 500
  });

  // Price alerts
  const [priceAlerts, setPriceAlerts] = useState<{
    symbol: string;
    priceAbove?: number;
    priceBelow?: number;
    enabled: boolean;
  }[]>([]);

  // Real-time metrics
  const [metrics, setMetrics] = useState({
    totalPnL: 0,
    dailyPnL: 0,
    winRate: 0,
    avgHoldTime: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    totalTrades: 0,
    totalVolume: 0
  });

  // Risk metrics calculation
  const calculateRiskMetrics = useCallback((): RiskMetric[] => {
    const totalMargin = positions.reduce((sum, pos) => sum + (pos.margin || 0), 0);
    const totalValue = positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice || 0), 0);
    const avgLeverage = positions.length > 0 
      ? positions.reduce((sum, pos) => sum + (pos.leverage || 1), 0) / positions.length 
      : 0;
    const marginLevel = totalMargin > 0 ? (accountData.availableBalance / totalMargin) * 100 : 100;
    const dailyPnL = positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
    
    // Calculate portfolio diversification (Herfindahl Index)
    const symbolExposure = positions.reduce((acc, pos) => {
      const symbol = pos.symbol;
      acc[symbol] = (acc[symbol] || 0) + (pos.size * pos.currentPrice || 0);
      return acc;
    }, {} as Record<string, number>);
    
    const totalExposure = Object.values(symbolExposure).reduce((sum, exp) => sum + exp, 0);
    const herfindahlIndex = totalExposure > 0 
      ? Object.values(symbolExposure).reduce((sum, exp) => sum + Math.pow(exp / totalExposure, 2), 0)
      : 0;
    const diversificationScore = (1 - herfindahlIndex) * 100;

    return [
      {
        id: 'margin-level',
        name: '保证金水平',
        value: marginLevel,
        threshold: riskThresholds.marginCallLevel,
        status: marginLevel > 300 ? 'safe' : marginLevel > 150 ? 'warning' : 'danger',
        unit: '%',
        description: '账户保证金健康度指标'
      },
      {
        id: 'daily-pnl',
        name: '日内盈亏',
        value: dailyPnL,
        threshold: -riskThresholds.maxDailyLoss,
        status: dailyPnL > 0 ? 'safe' : dailyPnL > -riskThresholds.maxDailyLoss ? 'warning' : 'danger',
        unit: 'USDT',
        description: '当日累计盈亏情况'
      },
      {
        id: 'avg-leverage',
        name: '平均杠杆',
        value: avgLeverage,
        threshold: riskThresholds.maxLeverage,
        status: avgLeverage < 20 ? 'safe' : avgLeverage < 50 ? 'warning' : 'danger',
        unit: 'x',
        description: '持仓杠杆倍数平均值'
      },
      {
        id: 'portfolio-size',
        name: '组合规模',
        value: totalValue,
        threshold: riskThresholds.maxPositionSize,
        status: totalValue < riskThresholds.maxPositionSize * 0.8 ? 'safe' : totalValue < riskThresholds.maxPositionSize ? 'warning' : 'danger',
        unit: 'USDT',
        description: '总持仓价值'
      },
      {
        id: 'diversification',
        name: '组合分散度',
        value: diversificationScore,
        threshold: 50,
        status: diversificationScore > 70 ? 'safe' : diversificationScore > 50 ? 'warning' : 'danger',
        unit: '%',
        description: '投资组合多样化程度'
      }
    ];
  }, [positions, accountData, riskThresholds]);

  // Check for alerts
  const checkAlerts = useCallback(() => {
    if (!isMonitoringEnabled) return;

    const newAlerts: Alert[] = [];
    const riskMetrics = calculateRiskMetrics();

    // Risk-based alerts
    riskMetrics.forEach(metric => {
      if (metric.status === 'danger') {
        newAlerts.push({
          id: `risk-${metric.id}-${Date.now()}`,
          type: 'margin',
          message: `风险警告: ${metric.name} 已达到危险水平 (${metric.value.toFixed(2)}${metric.unit})`,
          timestamp: Date.now(),
          severity: 'error',
          triggered: true
        });
      } else if (metric.status === 'warning') {
        newAlerts.push({
          id: `warning-${metric.id}-${Date.now()}`,
          type: 'margin',
          message: `注意: ${metric.name} 需要关注 (${metric.value.toFixed(2)}${metric.unit})`,
          timestamp: Date.now(),
          severity: 'warning',
          triggered: true
        });
      }
    });

    // Price alerts
    priceAlerts.forEach(alert => {
      if (!alert.enabled) return;
      
      const market = marketData.find(m => m.symbol === alert.symbol);
      if (!market) return;

      if (alert.priceAbove && market.price >= alert.priceAbove) {
        newAlerts.push({
          id: `price-above-${alert.symbol}-${Date.now()}`,
          type: 'price',
          symbol: alert.symbol,
          message: `${alert.symbol} 价格突破 $${alert.priceAbove}，当前 $${market.price}`,
          timestamp: Date.now(),
          severity: 'info',
          triggered: true
        });
      }

      if (alert.priceBelow && market.price <= alert.priceBelow) {
        newAlerts.push({
          id: `price-below-${alert.symbol}-${Date.now()}`,
          type: 'price',
          symbol: alert.symbol,
          message: `${alert.symbol} 价格跌破 $${alert.priceBelow}，当前 $${market.price}`,
          timestamp: Date.now(),
          severity: 'warning',
          triggered: true
        });
      }
    });

    // Position alerts
    positions.forEach(position => {
      // Liquidation risk alert
      const liquidationDistance = Math.abs(position.currentPrice - position.liquidationPrice) / position.currentPrice;
      if (liquidationDistance < 0.05) { // Less than 5% from liquidation
        newAlerts.push({
          id: `liquidation-${position.id}-${Date.now()}`,
          type: 'liquidation',
          symbol: position.symbol,
          message: `${position.symbol} 持仓接近强平价格，距离仅 ${(liquidationDistance * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          severity: 'error',
          triggered: true
        });
      }
    });

    if (newAlerts.length > 0) {
      setActiveAlerts(prev => [...prev, ...newAlerts]);
      setAlertHistory(prev => [...newAlerts, ...prev].slice(0, 100)); // Keep last 100 alerts

      // Sound alerts
      if (soundAlerts) {
        const hasError = newAlerts.some(alert => alert.severity === 'error');
        const hasWarning = newAlerts.some(alert => alert.severity === 'warning');
        
        if (hasError) {
          // Play error sound
          playAlertSound('error');
        } else if (hasWarning) {
          // Play warning sound
          playAlertSound('warning');
        }
      }

      // Show toast notifications
      newAlerts.forEach(alert => {
        if (alert.severity === 'error') {
          toast.error(alert.message);
        } else if (alert.severity === 'warning') {
          toast.warning(alert.message);
        } else {
          toast.info(alert.message);
        }
      });
    }
  }, [isMonitoringEnabled, calculateRiskMetrics, priceAlerts, marketData, positions, soundAlerts]);

  // Play alert sound
  const playAlertSound = (type: 'error' | 'warning' | 'info') => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    const frequencies = {
      error: [800, 600, 400],
      warning: [600, 500],
      info: [800]
    };
    
    const sequence = frequencies[type];
    let time = 0;
    
    sequence.forEach((freq, index) => {
      oscillator.frequency.setValueAtTime(freq, context.currentTime + time);
      time += 0.2;
    });
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + time);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + time);
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !isMonitoringEnabled) return;

    const interval = setInterval(() => {
      checkAlerts();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isMonitoringEnabled, checkAlerts]);

  // Dismiss alert
  const dismissAlert = (alertId: string) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const riskMetrics = calculateRiskMetrics();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Monitoring Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>高级监控面板</span>
              {isMonitoringEnabled && (
                <Badge variant="default" className="bg-green-600">
                  <Eye className="w-3 h-3 mr-1" />
                  运行中
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center space-x-2">
              {autoRefresh && (
                <RefreshCw className="w-4 h-4 animate-spin text-river-blue" />
              )}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>监控设置</DialogTitle>
                    <DialogDescription>
                      配置风险监控和告警参数
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>启用监控</Label>
                      <Switch
                        checked={isMonitoringEnabled}
                        onCheckedChange={setIsMonitoringEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>自动刷新</Label>
                      <Switch
                        checked={autoRefresh}
                        onCheckedChange={setAutoRefresh}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>声音告警</Label>
                      <Switch
                        checked={soundAlerts}
                        onCheckedChange={setSoundAlerts}
                      />
                    </div>

                    <div>
                      <Label>刷新间隔 (秒)</Label>
                      <Input
                        type="number"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        min={1}
                        max={60}
                        className="mt-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">风险阈值</h4>
                      
                      <div>
                        <Label>最大日亏损 (USDT)</Label>
                        <Input
                          type="number"
                          value={riskThresholds.maxDailyLoss}
                          onChange={(e) => setRiskThresholds(prev => ({
                            ...prev,
                            maxDailyLoss: Number(e.target.value)
                          }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>保证金告警水平 (%)</Label>
                        <Input
                          type="number"
                          value={riskThresholds.marginCallLevel}
                          onChange={(e) => setRiskThresholds(prev => ({
                            ...prev,
                            marginCallLevel: Number(e.target.value)
                          }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>最大杠杆</Label>
                        <Input
                          type="number"
                          value={riskThresholds.maxLeverage}
                          onChange={(e) => setRiskThresholds(prev => ({
                            ...prev,
                            maxLeverage: Number(e.target.value)
                          }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="risk" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="risk">风险指标</TabsTrigger>
              <TabsTrigger value="performance">性能分析</TabsTrigger>
              <TabsTrigger value="alerts">告警中心</TabsTrigger>
              <TabsTrigger value="market">市场监控</TabsTrigger>
            </TabsList>

            <TabsContent value="risk" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {riskMetrics.map(metric => (
                  <Card key={metric.id} className={`border-l-4 ${
                    metric.status === 'safe' ? 'border-l-green-500' :
                    metric.status === 'warning' ? 'border-l-yellow-500' :
                    'border-l-red-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{metric.name}</h4>
                        <Badge variant={
                          metric.status === 'safe' ? 'default' :
                          metric.status === 'warning' ? 'secondary' :
                          'destructive'
                        } className="text-xs">
                          {metric.status === 'safe' ? '正常' :
                           metric.status === 'warning' ? '警告' : '危险'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">
                            {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}{metric.unit}
                          </span>
                          {metric.id === 'margin-level' && <Gauge className="w-5 h-5 text-secondary" />}
                          {metric.id === 'daily-pnl' && <DollarSign className="w-5 h-5 text-secondary" />}
                          {metric.id === 'avg-leverage' && <TrendingUp className="w-5 h-5 text-secondary" />}
                          {metric.id === 'portfolio-size' && <PieChart className="w-5 h-5 text-secondary" />}
                          {metric.id === 'diversification' && <BarChart3 className="w-5 h-5 text-secondary" />}
                        </div>

                        <Progress 
                          value={metric.id === 'daily-pnl' ? 50 + (metric.value / (metric.threshold * 2)) * 50 : 
                                (metric.value / (metric.threshold * 1.5)) * 100} 
                          className="h-2"
                        />

                        <p className="text-xs text-secondary">{metric.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${metrics.totalPnL.toLocaleString()}
                    </div>
                    <div className="text-sm text-secondary">总盈亏</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {metrics.winRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-secondary">胜率</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {metrics.sharpeRatio.toFixed(2)}
                    </div>
                    <div className="text-sm text-secondary">夏普比率</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {metrics.maxDrawdown.toFixed(1)}%
                    </div>
                    <div className="text-sm text-secondary">最大回撤</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">活跃告警</h3>
                <Badge variant="outline">
                  {activeAlerts.length} 条
                </Badge>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeAlerts.length === 0 ? (
                  <div className="text-center py-8 text-secondary">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>暂无活跃告警</p>
                  </div>
                ) : (
                  activeAlerts.map(alert => (
                    <Card key={alert.id} className={`border-l-4 ${
                      alert.severity === 'error' ? 'border-l-red-500' :
                      alert.severity === 'warning' ? 'border-l-yellow-500' :
                      'border-l-blue-500'
                    }`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {alert.severity === 'error' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                               alert.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                               <Bell className="w-4 h-4 text-blue-500" />}
                              
                              <Badge variant="outline" className="text-xs">
                                {alert.type}
                              </Badge>
                              
                              {alert.symbol && (
                                <Badge variant="secondary" className="text-xs">
                                  {alert.symbol}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm">{alert.message}</p>
                            
                            <div className="flex items-center space-x-2 mt-2 text-xs text-secondary">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissAlert(alert.id)}
                            className="ml-2"
                          >
                            <EyeOff className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="market" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketData.slice(0, 6).map(market => (
                  <Card key={market.symbol}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{market.symbol}</h4>
                        <Badge variant={market.change24h >= 0 ? 'default' : 'destructive'}>
                          {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xl font-bold">
                          ${market.price.toLocaleString()}
                        </div>
                        
                        <div className="text-sm text-secondary">
                          24h Vol: ${(market.volume24h / 1000000).toFixed(1)}M
                        </div>

                        <div className="flex items-center text-xs text-secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(market.lastUpdated).toLocaleTimeString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedMonitoringPanel;