import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  Info,
  Calendar,
  Percent,
  Clock,
  Zap
} from 'lucide-react';
import { RiverBrandText, RiverBrandCard } from '../ui/riverbit-brand-system';

interface PoolOption {
  id: string;
  name: string;
  baseAPY: number;
  riskLevel: 'low' | 'medium' | 'high';
  minDeposit: number;
  lockPeriod: number; // days, 0 for flexible
  category: 'stable' | 'growth' | 'aggressive';
  description: string;
  tvl: number;
  utilizationRate: number;
  rewardToken?: string;
}

interface YieldProjection {
  timeframe: '1d' | '7d' | '30d' | '90d' | '365d';
  earnings: number;
  compoundedEarnings: number;
  fees: number;
  netEarnings: number;
  apy: number;
}

interface EnhancedYieldCalculatorProps {
  className?: string;
}

const EnhancedYieldCalculator: React.FC<EnhancedYieldCalculatorProps> = ({
  className = ''
}) => {
  // Input states
  const [depositAmount, setDepositAmount] = useState('10000');
  const [selectedPool, setSelectedPool] = useState('stable-pool');
  const [reinvestRewards, setReinvestRewards] = useState(true);
  const [customDuration, setCustomDuration] = useState(365);
  const [riskTolerance, setRiskTolerance] = useState(50); // 0-100 scale

  // Advanced settings
  const [includeBonus, setIncludeBonus] = useState(true);
  const [marketVolatility, setMarketVolatility] = useState(20); // percentage
  const [compoundFrequency, setCompoundFrequency] = useState('daily');

  // Pool options
  const poolOptions: PoolOption[] = [
    {
      id: 'stable-pool',
      name: '稳定币池',
      baseAPY: 18.5,
      riskLevel: 'low',
      minDeposit: 100,
      lockPeriod: 0,
      category: 'stable',
      description: 'USDT/USDC 稳定币对，低风险稳定收益',
      tvl: 25000000,
      utilizationRate: 78,
      rewardToken: 'RVR'
    },
    {
      id: 'btc-eth-pool',
      name: 'BTC-ETH 主流池',
      baseAPY: 28.3,
      riskLevel: 'medium',
      minDeposit: 500,
      lockPeriod: 0,
      category: 'growth',
      description: 'BTC/ETH 主流币对，平衡收益与风险',
      tvl: 45000000,
      utilizationRate: 82,
      rewardToken: 'RVR'
    },
    {
      id: 'alt-pool',
      name: '山寨币高收益池',
      baseAPY: 45.8,
      riskLevel: 'high',
      minDeposit: 1000,
      lockPeriod: 7,
      category: 'aggressive',
      description: '精选山寨币池，高收益高风险',
      tvl: 8500000,
      utilizationRate: 68,
      rewardToken: 'RVR'
    },
    {
      id: 'derivative-pool',
      name: '衍生品做市池',
      baseAPY: 65.2,
      riskLevel: 'high',
      minDeposit: 5000,
      lockPeriod: 30,
      category: 'aggressive',
      description: '期权和期货做市，专业级高收益',
      tvl: 12000000,
      utilizationRate: 91,
      rewardToken: 'RVR'
    }
  ];

  // Get selected pool data
  const selectedPoolData = poolOptions.find(pool => pool.id === selectedPool)!;

  // Calculate dynamic APY based on market conditions
  const calculateDynamicAPY = useMemo(() => {
    let baseAPY = selectedPoolData.baseAPY;
    
    // Market volatility impact
    const volatilityMultiplier = 1 + (marketVolatility - 20) / 100;
    baseAPY *= volatilityMultiplier;
    
    // Risk tolerance adjustment
    if (selectedPoolData.riskLevel === 'high' && riskTolerance < 30) {
      baseAPY *= 0.8; // Conservative approach
    } else if (selectedPoolData.riskLevel === 'low' && riskTolerance > 70) {
      baseAPY *= 1.1; // Aggressive approach
    }
    
    // Utilization rate bonus
    const utilizationBonus = selectedPoolData.utilizationRate > 80 ? 1.05 : 1;
    baseAPY *= utilizationBonus;
    
    // Bonus rewards
    if (includeBonus) {
      baseAPY += 3.5; // Additional RVR token rewards
    }
    
    return Math.max(baseAPY, 0);
  }, [selectedPoolData, marketVolatility, riskTolerance, includeBonus]);

  // Calculate yield projections
  const calculateYieldProjections = useMemo((): YieldProjection[] => {
    const amount = parseFloat(depositAmount) || 0;
    const annualAPY = calculateDynamicAPY / 100;
    
    const timeframes: YieldProjection['timeframe'][] = ['1d', '7d', '30d', '90d', '365d'];
    const daysMap = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
    
    return timeframes.map(timeframe => {
      const days = daysMap[timeframe];
      const dailyRate = annualAPY / 365;
      
      // Simple interest
      const simpleEarnings = amount * dailyRate * days;
      
      // Compound interest (based on frequency)
      const compoundPeriods = compoundFrequency === 'daily' ? days : 
                             compoundFrequency === 'weekly' ? Math.floor(days / 7) :
                             compoundFrequency === 'monthly' ? Math.floor(days / 30) : 1;
      
      const periodRate = annualAPY / (compoundFrequency === 'daily' ? 365 : 
                                    compoundFrequency === 'weekly' ? 52 :
                                    compoundFrequency === 'monthly' ? 12 : 1);
      
      const compoundedTotal = reinvestRewards 
        ? amount * Math.pow(1 + periodRate, compoundPeriods)
        : amount + simpleEarnings;
      
      const compoundedEarnings = compoundedTotal - amount;
      
      // Fees (0.1% on earnings)
      const fees = compoundedEarnings * 0.001;
      const netEarnings = compoundedEarnings - fees;
      
      // Calculate effective APY for this timeframe
      const effectiveAPY = days === 365 ? calculateDynamicAPY : 
                          ((netEarnings / amount) * (365 / days)) * 100;
      
      return {
        timeframe,
        earnings: simpleEarnings,
        compoundedEarnings,
        fees,
        netEarnings,
        apy: effectiveAPY
      };
    });
  }, [depositAmount, calculateDynamicAPY, reinvestRewards, compoundFrequency]);

  // Risk assessment
  const riskAssessment = useMemo(() => {
    const pool = selectedPoolData;
    const amount = parseFloat(depositAmount) || 0;
    
    let riskScore = 0;
    let warnings: string[] = [];
    let recommendations: string[] = [];
    
    // Pool risk level
    if (pool.riskLevel === 'high') {
      riskScore += 40;
      warnings.push('高风险池子，可能出现较大波动');
    } else if (pool.riskLevel === 'medium') {
      riskScore += 20;
    }
    
    // Amount risk
    if (amount > 50000) {
      riskScore += 20;
      warnings.push('大额资金建议分散投资');
    }
    
    // Lock period risk
    if (pool.lockPeriod > 0) {
      riskScore += 10;
      warnings.push(`资金锁定 ${pool.lockPeriod} 天，请考虑流动性需求`);
    }
    
    // Market volatility
    if (marketVolatility > 30) {
      riskScore += 15;
      warnings.push('高市场波动期间，收益可能不稳定');
    }
    
    // Recommendations
    if (riskScore > 50) {
      recommendations.push('建议降低投资金额或选择较低风险的池子');
      recommendations.push('考虑分批进入，降低时机风险');
    }
    
    if (pool.utilizationRate > 90) {
      recommendations.push('池子利用率很高，建议密切关注');
    }
    
    if (!reinvestRewards && pool.riskLevel === 'low') {
      recommendations.push('稳定池建议开启复投以最大化收益');
    }
    
    return {
      score: Math.min(riskScore, 100),
      level: riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high',
      warnings,
      recommendations
    };
  }, [selectedPoolData, depositAmount, marketVolatility, reinvestRewards]);

  // Format currency
  const formatCurrency = (amount: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <RiverBrandText variant="heading" gradient>
          RiverPool 收益计算器
        </RiverBrandText>
        <p className="text-secondary">
          精确计算您的流动性挖矿收益，制定最优投资策略
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Inputs */}
        <div className="lg:col-span-1 space-y-4">
          <RiverBrandCard variant="trading">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="w-5 h-5" />
                <span>投资参数</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deposit Amount */}
              <div>
                <Label htmlFor="deposit-amount">投资金额 (USDT)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="输入投资金额"
                  className="mt-1"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[1000, 5000, 10000, 50000].map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount(amount.toString())}
                      className="text-xs"
                    >
                      ${amount.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Pool Selection */}
              <div>
                <Label>选择池子</Label>
                <Select value={selectedPool} onValueChange={setSelectedPool}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {poolOptions.map(pool => (
                      <SelectItem key={pool.id} value={pool.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{pool.name}</span>
                          <div className="flex items-center space-x-2 ml-4">
                            <Badge variant={
                              pool.riskLevel === 'low' ? 'default' :
                              pool.riskLevel === 'medium' ? 'secondary' : 'destructive'
                            } className="text-xs">
                              {pool.baseAPY.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reinvest">自动复投</Label>
                  <Switch
                    id="reinvest"
                    checked={reinvestRewards}
                    onCheckedChange={setReinvestRewards}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="bonus">包含奖励代币</Label>
                  <Switch
                    id="bonus"
                    checked={includeBonus}
                    onCheckedChange={setIncludeBonus}
                  />
                </div>

                <div>
                  <Label>风险偏好: {riskTolerance}%</Label>
                  <Slider
                    value={[riskTolerance]}
                    onValueChange={(value) => setRiskTolerance(value[0])}
                    max={100}
                    min={0}
                    step={5}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-secondary mt-1">
                    <span>保守</span>
                    <span>平衡</span>
                    <span>激进</span>
                  </div>
                </div>

                <div>
                  <Label>市场波动率: {marketVolatility}%</Label>
                  <Slider
                    value={[marketVolatility]}
                    onValueChange={(value) => setMarketVolatility(value[0])}
                    max={50}
                    min={5}
                    step={5}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>复投频率</Label>
                  <Select value={compoundFrequency} onValueChange={setCompoundFrequency}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">每日</SelectItem>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </RiverBrandCard>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pool Info */}
          <RiverBrandCard variant="premium">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{selectedPoolData.name}</h3>
                  <p className="text-sm text-secondary">{selectedPoolData.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-river-blue">
                    {calculateDynamicAPY.toFixed(1)}%
                  </div>
                  <div className="text-sm text-secondary">预期年化收益</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold">${(selectedPoolData.tvl / 1000000).toFixed(1)}M</div>
                  <div className="text-xs text-secondary">总锁仓量</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{selectedPoolData.utilizationRate}%</div>
                  <div className="text-xs text-secondary">利用率</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">${selectedPoolData.minDeposit}</div>
                  <div className="text-xs text-secondary">最小投资</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {selectedPoolData.lockPeriod === 0 ? '灵活' : `${selectedPoolData.lockPeriod}天`}
                  </div>
                  <div className="text-xs text-secondary">锁定期</div>
                </div>
              </div>
            </CardContent>
          </RiverBrandCard>

          {/* Yield Projections */}
          <Tabs defaultValue="projections" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="projections">收益预测</TabsTrigger>
              <TabsTrigger value="comparison">策略对比</TabsTrigger>
              <TabsTrigger value="risk">风险评估</TabsTrigger>
            </TabsList>

            <TabsContent value="projections" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {calculateYieldProjections.map(projection => (
                  <Card key={projection.timeframe} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline">
                          {projection.timeframe === '1d' ? '1天' :
                           projection.timeframe === '7d' ? '7天' :
                           projection.timeframe === '30d' ? '30天' :
                           projection.timeframe === '90d' ? '90天' : '1年'}
                        </Badge>
                        <div className={`flex items-center space-x-1 ${
                          projection.apy > calculateDynamicAPY ? 'text-success' : 'text-secondary'
                        }`}>
                          <Percent className="w-3 h-3" />
                          <span className="text-sm font-medium">{projection.apy.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-secondary text-sm">基础收益:</span>
                          <span className="font-medium">{formatCurrency(projection.earnings)}</span>
                        </div>
                        
                        {reinvestRewards && (
                          <div className="flex justify-between">
                            <span className="text-secondary text-sm">复投收益:</span>
                            <span className="font-medium text-success">
                              +{formatCurrency(projection.compoundedEarnings - projection.earnings)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-secondary text-sm">平台费:</span>
                          <span className="font-medium text-danger">-{formatCurrency(projection.fees)}</span>
                        </div>
                        
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-bold">
                            <span>净收益:</span>
                            <span className="text-profit">{formatCurrency(projection.netEarnings)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>策略对比分析</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Simple vs Compound */}
                    <div>
                      <h4 className="font-semibold mb-3">复投效果对比 (1年)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                          <span>简单收益</span>
                          <span className="font-bold">
                            {formatCurrency(calculateYieldProjections[4].earnings)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-success/10 border border-success/20 rounded-lg">
                          <span>复投收益</span>
                          <span className="font-bold text-success">
                            {formatCurrency(calculateYieldProjections[4].compoundedEarnings)}
                          </span>
                        </div>
                        <div className="text-center text-sm text-secondary">
                          复投额外收益: {formatCurrency(
                            calculateYieldProjections[4].compoundedEarnings - calculateYieldProjections[4].earnings
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pool Comparison */}
                    <div>
                      <h4 className="font-semibold mb-3">池子收益对比</h4>
                      <div className="space-y-2">
                        {poolOptions.map(pool => {
                          const annualEarnings = (parseFloat(depositAmount) || 0) * (pool.baseAPY / 100);
                          return (
                            <div key={pool.id} className={`flex justify-between items-center p-2 rounded ${
                              pool.id === selectedPool ? 'bg-river-blue/10 border border-river-blue/30' : 'bg-surface-2'
                            }`}>
                              <div>
                                <span className="text-sm font-medium">{pool.name}</span>
                                <Badge variant="outline" className="text-xs ml-2">
                                  {pool.baseAPY.toFixed(1)}%
                                </Badge>
                              </div>
                              <span className="font-medium">{formatCurrency(annualEarnings)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>风险评估报告</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Risk Score */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">综合风险评分</span>
                        <Badge variant={
                          riskAssessment.level === 'low' ? 'default' :
                          riskAssessment.level === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {riskAssessment.score}/100 - {
                            riskAssessment.level === 'low' ? '低风险' :
                            riskAssessment.level === 'medium' ? '中等风险' : '高风险'
                          }
                        </Badge>
                      </div>
                      <div className="w-full bg-surface-2 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            riskAssessment.level === 'low' ? 'bg-success' :
                            riskAssessment.level === 'medium' ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${riskAssessment.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Warnings */}
                    {riskAssessment.warnings.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <span>风险提示</span>
                        </h4>
                        <div className="space-y-2">
                          {riskAssessment.warnings.map((warning, index) => (
                            <div key={index} className="flex items-start space-x-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{warning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {riskAssessment.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center space-x-2">
                          <Target className="w-4 h-4 text-river-blue" />
                          <span>优化建议</span>
                        </h4>
                        <div className="space-y-2">
                          {riskAssessment.recommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start space-x-2 p-3 bg-river-blue/10 border border-river-blue/20 rounded-lg">
                              <Info className="w-4 h-4 text-river-blue mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{recommendation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EnhancedYieldCalculator;