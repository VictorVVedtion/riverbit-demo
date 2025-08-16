import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Alert,
  AlertDescription,
} from '../ui/alert';
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
  Shield,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  Eye,
  EyeOff,
  Settings,
  Bell,
  BarChart3,
  Zap,
  Target,
  Clock,
  DollarSign,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

interface PoolRiskMetric {
  id: string;
  name: string;
  currentValue: number;
  threshold: number;
  warningThreshold: number;
  unit: string;
  status: 'safe' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
  impact: 'low' | 'medium' | 'high';
}

interface PoolData {
  id: string;
  name: string;
  tvl: number;
  apy: number;
  utilizationRate: number;
  riskScore: number;
  impermanentLoss: number;
  liquidityDepth: number;
  slippage: number;
  lastUpdate: number;
}

interface RiskAlert {
  id: string;
  poolId: string;
  type: 'metric' | 'market' | 'liquidity';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

interface RiskMonitoringDashboardProps {
  poolData: PoolData[];
  userDeposits: { poolId: string; amount: number }[];
  className?: string;
}

const RiskMonitoringDashboard: React.FC<RiskMonitoringDashboardProps> = ({
  poolData,
  userDeposits,
  className = ''
}) => {
  // Monitoring state
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(true);
  const [alertThresholds, setAlertThresholds] = useState({
    maxImpermanentLoss: 5, // percentage
    minLiquidityDepth: 100000, // USDT
    maxSlippage: 2, // percentage
    maxUtilization: 95, // percentage
    maxRiskScore: 70 // 0-100 scale
  });
  
  const [activeAlerts, setActiveAlerts] = useState<RiskAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<RiskAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);

  // Calculate risk metrics for each pool
  const calculateRiskMetrics = (pool: PoolData): PoolRiskMetric[] => {
    return [
      {
        id: 'impermanent-loss',
        name: '无常损失',
        currentValue: pool.impermanentLoss,
        threshold: alertThresholds.maxImpermanentLoss,
        warningThreshold: alertThresholds.maxImpermanentLoss * 0.7,
        unit: '%',
        status: pool.impermanentLoss > alertThresholds.maxImpermanentLoss ? 'critical' :
                pool.impermanentLoss > alertThresholds.maxImpermanentLoss * 0.7 ? 'warning' : 'safe',
        trend: pool.impermanentLoss > 2 ? 'up' : pool.impermanentLoss < 1 ? 'down' : 'stable',
        description: '由于价格差异导致的潜在损失',
        impact: 'high'
      },
      {
        id: 'utilization-rate',
        name: '资金利用率',
        currentValue: pool.utilizationRate,
        threshold: alertThresholds.maxUtilization,
        warningThreshold: alertThresholds.maxUtilization * 0.9,
        unit: '%',
        status: pool.utilizationRate > alertThresholds.maxUtilization ? 'critical' :
                pool.utilizationRate > alertThresholds.maxUtilization * 0.9 ? 'warning' : 'safe',
        trend: pool.utilizationRate > 90 ? 'up' : pool.utilizationRate < 70 ? 'down' : 'stable',
        description: '池子资金使用效率指标',
        impact: 'medium'
      },
      {
        id: 'liquidity-depth',
        name: '流动性深度',
        currentValue: pool.liquidityDepth,
        threshold: alertThresholds.minLiquidityDepth,
        warningThreshold: alertThresholds.minLiquidityDepth * 1.5,
        unit: 'USDT',
        status: pool.liquidityDepth < alertThresholds.minLiquidityDepth ? 'critical' :
                pool.liquidityDepth < alertThresholds.minLiquidityDepth * 1.5 ? 'warning' : 'safe',
        trend: pool.liquidityDepth < 200000 ? 'down' : pool.liquidityDepth > 500000 ? 'up' : 'stable',
        description: '可用流动性数量',
        impact: 'high'
      },
      {
        id: 'slippage',
        name: '滑点',
        currentValue: pool.slippage,
        threshold: alertThresholds.maxSlippage,
        warningThreshold: alertThresholds.maxSlippage * 0.7,
        unit: '%',
        status: pool.slippage > alertThresholds.maxSlippage ? 'critical' :
                pool.slippage > alertThresholds.maxSlippage * 0.7 ? 'warning' : 'safe',
        trend: pool.slippage > 1.5 ? 'up' : pool.slippage < 0.5 ? 'down' : 'stable',
        description: '大额交易的价格影响',
        impact: 'medium'
      },
      {
        id: 'risk-score',
        name: '综合风险评分',
        currentValue: pool.riskScore,
        threshold: alertThresholds.maxRiskScore,
        warningThreshold: alertThresholds.maxRiskScore * 0.8,
        unit: '',
        status: pool.riskScore > alertThresholds.maxRiskScore ? 'critical' :
                pool.riskScore > alertThresholds.maxRiskScore * 0.8 ? 'warning' : 'safe',
        trend: pool.riskScore > 60 ? 'up' : pool.riskScore < 40 ? 'down' : 'stable',
        description: '基于多项指标的综合风险评估',
        impact: 'high'
      }
    ];
  };

  // Check for alerts
  const checkAlerts = () => {
    if (!isMonitoringEnabled) return;

    const newAlerts: RiskAlert[] = [];

    poolData.forEach(pool => {
      const metrics = calculateRiskMetrics(pool);
      const userDeposit = userDeposits.find(d => d.poolId === pool.id);
      
      // Only check pools where user has deposits
      if (!userDeposit || userDeposit.amount === 0) return;

      metrics.forEach(metric => {
        if (metric.status === 'critical') {
          newAlerts.push({
            id: `${pool.id}-${metric.id}-${Date.now()}`,
            poolId: pool.id,
            type: 'metric',
            severity: 'critical',
            message: `${pool.name}: ${metric.name} 达到临界值 ${metric.currentValue.toFixed(2)}${metric.unit}`,
            timestamp: Date.now(),
            acknowledged: false
          });
        } else if (metric.status === 'warning') {
          newAlerts.push({
            id: `${pool.id}-${metric.id}-${Date.now()}`,
            poolId: pool.id,
            type: 'metric',
            severity: 'warning',
            message: `${pool.name}: ${metric.name} 需要关注 ${metric.currentValue.toFixed(2)}${metric.unit}`,
            timestamp: Date.now(),
            acknowledged: false
          });
        }
      });

      // Market-specific alerts
      if (pool.apy < 5) {
        newAlerts.push({
          id: `${pool.id}-low-apy-${Date.now()}`,
          poolId: pool.id,
          type: 'market',
          severity: 'warning',
          message: `${pool.name}: 收益率异常偏低 (${pool.apy.toFixed(1)}%)`,
          timestamp: Date.now(),
          acknowledged: false
        });
      }

      if (pool.tvl < 1000000) {
        newAlerts.push({
          id: `${pool.id}-low-tvl-${Date.now()}`,
          poolId: pool.id,
          type: 'liquidity',
          severity: 'info',
          message: `${pool.name}: TVL 较低，建议关注流动性风险`,
          timestamp: Date.now(),
          acknowledged: false
        });
      }
    });

    if (newAlerts.length > 0) {
      setActiveAlerts(prev => [...prev, ...newAlerts]);
      setAlertHistory(prev => [...newAlerts, ...prev].slice(0, 100));

      // Sound alerts
      if (soundEnabled) {
        const criticalAlerts = newAlerts.filter(alert => alert.severity === 'critical');
        if (criticalAlerts.length > 0) {
          playAlertSound('critical');
        } else {
          playAlertSound('warning');
        }
      }

      // Toast notifications
      newAlerts.forEach(alert => {
        if (alert.severity === 'critical') {
          toast.error(alert.message);
        } else if (alert.severity === 'warning') {
          toast.warning(alert.message);
        } else {
          toast.info(alert.message);
        }
      });
    }
  };

  // Play alert sound
  const playAlertSound = (type: 'critical' | 'warning') => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    if (type === 'critical') {
      // Critical: rapid beeps
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      oscillator.frequency.setValueAtTime(600, context.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, context.currentTime + 0.2);
    } else {
      // Warning: single tone
      oscillator.frequency.setValueAtTime(600, context.currentTime);
    }
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
  };

  // Auto-check alerts
  useEffect(() => {
    if (!isMonitoringEnabled) return;

    const interval = setInterval(checkAlerts, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [poolData, userDeposits, alertThresholds, isMonitoringEnabled, soundEnabled]);

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Calculate portfolio risk summary
  const portfolioRiskSummary = useMemo(() => {
    let totalDeposit = 0;
    let weightedRiskScore = 0;
    let criticalPools = 0;
    let warningPools = 0;

    userDeposits.forEach(deposit => {
      if (deposit.amount === 0) return;
      
      const pool = poolData.find(p => p.id === deposit.poolId);
      if (!pool) return;

      totalDeposit += deposit.amount;
      weightedRiskScore += pool.riskScore * deposit.amount;

      const metrics = calculateRiskMetrics(pool);
      const hasCritical = metrics.some(m => m.status === 'critical');
      const hasWarning = metrics.some(m => m.status === 'warning');

      if (hasCritical) criticalPools++;
      else if (hasWarning) warningPools++;
    });

    const avgRiskScore = totalDeposit > 0 ? weightedRiskScore / totalDeposit : 0;

    return {
      totalDeposit,
      avgRiskScore,
      criticalPools,
      warningPools,
      overallStatus: criticalPools > 0 ? 'critical' : warningPools > 0 ? 'warning' : 'safe'
    };
  }, [poolData, userDeposits]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Shield className="w-6 h-6" />
            <span>风险监控中心</span>
          </h2>
          <p className="text-secondary mt-1">
            实时监控您的流动性池投资风险
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isMonitoringEnabled}
              onCheckedChange={setIsMonitoringEnabled}
            />
            <Label>启用监控</Label>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                设置
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>风险监控设置</DialogTitle>
                <DialogDescription>
                  配置风险告警阈值和通知偏好
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>声音告警</Label>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">风险阈值</h4>
                  
                  <div>
                    <Label>最大无常损失 (%)</Label>
                    <Input
                      type="number"
                      value={alertThresholds.maxImpermanentLoss}
                      onChange={(e) => setAlertThresholds(prev => ({
                        ...prev,
                        maxImpermanentLoss: Number(e.target.value)
                      }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>最小流动性深度 (USDT)</Label>
                    <Input
                      type="number"
                      value={alertThresholds.minLiquidityDepth}
                      onChange={(e) => setAlertThresholds(prev => ({
                        ...prev,
                        minLiquidityDepth: Number(e.target.value)
                      }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>最大滑点 (%)</Label>
                    <Input
                      type="number"
                      value={alertThresholds.maxSlippage}
                      onChange={(e) => setAlertThresholds(prev => ({
                        ...prev,
                        maxSlippage: Number(e.target.value)
                      }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>最大利用率 (%)</Label>
                    <Input
                      type="number"
                      value={alertThresholds.maxUtilization}
                      onChange={(e) => setAlertThresholds(prev => ({
                        ...prev,
                        maxUtilization: Number(e.target.value)
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

      {/* Portfolio Risk Overview */}
      <Card className={`border-l-4 ${
        portfolioRiskSummary.overallStatus === 'critical' ? 'border-l-red-500' :
        portfolioRiskSummary.overallStatus === 'warning' ? 'border-l-yellow-500' :
        'border-l-green-500'
      }`}>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-2xl font-bold">
                ${portfolioRiskSummary.totalDeposit.toLocaleString()}
              </div>
              <div className="text-sm text-secondary">总投资金额</div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">
                  {portfolioRiskSummary.avgRiskScore.toFixed(0)}
                </div>
                <Badge variant={
                  portfolioRiskSummary.avgRiskScore > 70 ? 'destructive' :
                  portfolioRiskSummary.avgRiskScore > 50 ? 'secondary' : 'default'
                }>
                  {portfolioRiskSummary.avgRiskScore > 70 ? '高风险' :
                   portfolioRiskSummary.avgRiskScore > 50 ? '中风险' : '低风险'}
                </Badge>
              </div>
              <div className="text-sm text-secondary">加权风险评分</div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-red-600">
                  {portfolioRiskSummary.criticalPools}
                </div>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-sm text-secondary">高风险池数量</div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-yellow-600">
                  {portfolioRiskSummary.warningPools}
                </div>
                <Eye className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-sm text-secondary">需关注池数量</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>活跃告警</span>
              <Badge variant="destructive">{activeAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {activeAlerts.map(alert => (
                <Alert key={alert.id} className={
                  alert.severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                  alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                  'border-blue-500 bg-blue-50 dark:bg-blue-950'
                }>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                         alert.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                         <Bell className="w-4 h-4 text-blue-500" />}
                        
                        <Badge variant="outline" className="text-xs">
                          {alert.type}
                        </Badge>
                        
                        <div className="text-xs text-secondary">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <AlertDescription className="text-sm">
                        {alert.message}
                      </AlertDescription>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="ml-2"
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Risk Details */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">风险指标</TabsTrigger>
          <TabsTrigger value="trends">趋势分析</TabsTrigger>
          <TabsTrigger value="history">告警历史</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {poolData
              .filter(pool => userDeposits.some(d => d.poolId === pool.id && d.amount > 0))
              .map(pool => {
                const metrics = calculateRiskMetrics(pool);
                const userDeposit = userDeposits.find(d => d.poolId === pool.id)?.amount || 0;
                
                return (
                  <Card key={pool.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pool.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            ${userDeposit.toLocaleString()}
                          </Badge>
                          <Badge variant={
                            pool.riskScore > 70 ? 'destructive' :
                            pool.riskScore > 50 ? 'secondary' : 'default'
                          }>
                            风险 {pool.riskScore}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {metrics.map(metric => (
                          <div key={metric.id}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{metric.name}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold">
                                  {metric.currentValue.toFixed(2)}{metric.unit}
                                </span>
                                {metric.trend === 'up' ? <TrendingUp className="w-3 h-3 text-red-500" /> :
                                 metric.trend === 'down' ? <TrendingDown className="w-3 h-3 text-green-500" /> :
                                 <Activity className="w-3 h-3 text-gray-500" />}
                              </div>
                            </div>
                            
                            <Progress 
                              value={Math.min((metric.currentValue / metric.threshold) * 100, 100)}
                              className={`h-2 ${
                                metric.status === 'critical' ? 'bg-red-100' :
                                metric.status === 'warning' ? 'bg-yellow-100' : 'bg-green-100'
                              }`}
                            />
                            
                            <div className="flex justify-between text-xs text-secondary mt-1">
                              <span>{metric.description}</span>
                              <span>阈值: {metric.threshold}{metric.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>风险趋势分析</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-secondary">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>风险趋势图表功能开发中...</p>
                <p className="text-sm mt-2">将显示各项风险指标的历史趋势</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>告警历史</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alertHistory.length === 0 ? (
                  <div className="text-center py-8 text-secondary">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>暂无告警历史</p>
                  </div>
                ) : (
                  alertHistory.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'warning' ? 'secondary' : 'default'
                          } className="text-xs">
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {alert.type}
                          </Badge>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                      </div>
                      <div className="text-xs text-secondary ml-4">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskMonitoringDashboard;