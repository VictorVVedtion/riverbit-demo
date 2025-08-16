/**
 * Optimized Metrics Dashboard
 * 优化指标仪表板 - 展示美化后的演示数据
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { usePresentationOptimizer } from '../hooks/usePresentationOptimizer';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
  description?: string;
  highlight?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend = 'stable',
  icon,
  description,
  highlight = false
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^\d.]/g, ''));

  // 数字计数动画
  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const duration = 2000;
      const increment = numericValue / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= numericValue) {
          setDisplayValue(numericValue);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [numericValue]);

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-300';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${highlight ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              {icon && <span className="text-lg">{icon}</span>}
              <p className="text-2xl font-bold">
                {typeof value === 'number' ? displayValue.toLocaleString() : value}
              </p>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 ${getTrendColor(trend)}`}>
              <span className="text-sm">{getTrendIcon(trend)}</span>
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface OptimizedMetricsDashboardProps {
  className?: string;
}

export const OptimizedMetricsDashboard: React.FC<OptimizedMetricsDashboardProps> = ({
  className = ''
}) => {
  const {
    isOptimized,
    getOptimizedComponentData,
    trackInteraction
  } = usePresentationOptimizer({ autoStart: true });

  const [activeTab, setActiveTab] = useState('overview');

  // 获取优化后的数据
  const dashboardData = getOptimizedComponentData('dashboard');
  const tradingData = getOptimizedComponentData('trading');
  const riverpoolData = getOptimizedComponentData('riverpool');
  const analyticsData = getOptimizedComponentData('analytics');

  // 核心指标计算
  const coreMetrics = useMemo(() => {
    if (!dashboardData) return null;

    return {
      tvl: dashboardData.keyMetrics?.totalTVL || 12450000,
      apy: dashboardData.keyMetrics?.currentAPY || 24.8,
      users: dashboardData.keyMetrics?.totalUsers || 8547,
      winRate: dashboardData.keyMetrics?.winRate || 82.4
    };
  }, [dashboardData]);

  // 增长趋势数据
  const growthTrends = useMemo(() => {
    if (!dashboardData) return [];
    
    return dashboardData.trendData || [8500000, 9200000, 10800000, 12450000];
  }, [dashboardData]);

  // 处理标签页切换
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    trackInteraction('tab_changed', { tab: value });
  };

  if (!isOptimized || !coreMetrics) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">正在优化演示数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 顶部核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="总锁定价值 (TVL)"
          value={`$${(coreMetrics.tvl / 1000000).toFixed(1)}M`}
          change={45.2}
          trend="up"
          icon="💰"
          description="月度增长显著"
          highlight={true}
        />
        <MetricCard
          title="年化收益率 (APY)"
          value={`${coreMetrics.apy}%`}
          change={8.3}
          trend="up"
          icon="📊"
          description="持续领先市场"
        />
        <MetricCard
          title="活跃用户数"
          value={coreMetrics.users}
          change={34.5}
          trend="up"
          icon="👥"
          description="用户增长强劲"
        />
        <MetricCard
          title="交易胜率"
          value={`${coreMetrics.winRate}%`}
          change={2.1}
          trend="up"
          icon="🎯"
          description="AI策略优化"
        />
      </div>

      {/* 详细指标选项卡 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="trading">交易</TabsTrigger>
          <TabsTrigger value="liquidity">流动性</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
        </TabsList>

        {/* 总览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TVL 增长趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 TVL 增长趋势
                  <Badge variant="secondary">+145%</Badge>
                </CardTitle>
                <CardDescription>过去4个月的资金增长情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {growthTrends.map((value, index) => {
                    const monthNames = ['1月', '2月', '3月', '4月'];
                    const percentage = ((value / growthTrends[0]) - 1) * 100;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{monthNames[index]}</span>
                          <span className="font-medium">
                            ${(value / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <Progress 
                          value={(value / Math.max(...growthTrends)) * 100} 
                          className="h-2"
                        />
                        {index > 0 && (
                          <p className="text-xs text-green-600">
                            +{percentage.toFixed(1)}% 增长
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 核心优势 */}
            <Card>
              <CardHeader>
                <CardTitle>🏆 核心竞争优势</CardTitle>
                <CardDescription>与传统 DeFi 平台对比</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">收益率优势</span>
                    <Badge variant="outline" className="bg-green-50">
                      高出 3.2x
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">交易滑点</span>
                    <Badge variant="outline" className="bg-blue-50">
                      降低 75%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">用户留存</span>
                    <Badge variant="outline" className="bg-purple-50">
                      提升 60%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">系统稳定性</span>
                    <Badge variant="outline" className="bg-orange-50">
                      99.95% 可用性
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 系统健康状态 */}
          <Card>
            <CardHeader>
              <CardTitle>⚡ 系统性能指标</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>TPS 处理能力</span>
                    <span className="font-medium">10,000</span>
                  </div>
                  <Progress value={95} className="h-2" />
                  <p className="text-xs text-muted-foreground">峰值性能</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>平均延迟</span>
                    <span className="font-medium">&lt;50ms</span>
                  </div>
                  <Progress value={88} className="h-2" />
                  <p className="text-xs text-muted-foreground">毫秒级响应</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>系统可用性</span>
                    <span className="font-medium">99.95%</span>
                  </div>
                  <Progress value={99.95} className="h-2" />
                  <p className="text-xs text-muted-foreground">企业级稳定</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交易标签页 */}
        <TabsContent value="trading" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🎯 交易性能</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricCard
                  title="总交易笔数"
                  value="45,678"
                  change={23.5}
                  trend="up"
                  icon="📊"
                />
                <MetricCard
                  title="平均利润因子"
                  value="3.45"
                  change={12.8}
                  trend="up"
                  icon="💰"
                />
                <MetricCard
                  title="夏普比率"
                  value="2.67"
                  change={8.2}
                  trend="up"
                  icon="📈"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔥 热门交易对</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { pair: 'xAAPL/USDT', volume: '$2.4M', change: 2.8 },
                    { pair: 'BTC/USDT', volume: '$1.8M', change: 1.5 },
                    { pair: 'xNVDA/USDT', volume: '$1.6M', change: 4.2 },
                    { pair: 'ETH/USDT', volume: '$1.2M', change: -0.8 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <p className="font-medium text-sm">{item.pair}</p>
                        <p className="text-xs text-muted-foreground">{item.volume}</p>
                      </div>
                      <Badge 
                        variant={item.change > 0 ? "default" : "secondary"}
                        className={item.change > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {item.change > 0 ? '+' : ''}{item.change}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 流动性标签页 */}
        <TabsContent value="liquidity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MetricCard
              title="流动性池深度"
              value="$12.45M"
              change={28.9}
              trend="up"
              icon="🌊"
              description="充足流动性保障"
            />
            <MetricCard
              title="资金利用率"
              value="78.5%"
              change={5.2}
              trend="up"
              icon="⚡"
              description="高效资金配置"
            />
            <MetricCard
              title="平均滑点"
              value="0.02%"
              change={-60.5}
              trend="down"
              icon="🎯"
              description="业界领先水平"
            />
          </div>

          {/* RiverPool 详细数据 */}
          <Card>
            <CardHeader>
              <CardTitle>🏊 RiverPool 系统状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">xStock 配置</p>
                    <div className="space-y-2">
                      {[
                        { name: 'xAAPL', allocation: 34, performance: 2.1 },
                        { name: 'xTSLA', allocation: 26, performance: -0.8 },
                        { name: 'xMSFT', allocation: 17, performance: 1.5 },
                        { name: 'xNVDA', allocation: 23, performance: 3.2 }
                      ].map((asset, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{asset.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {asset.allocation}%
                            </span>
                            <Badge 
                              variant={asset.performance > 0 ? "default" : "secondary"}
                              className={`text-xs ${asset.performance > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                              {asset.performance > 0 ? '+' : ''}{asset.performance}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">风险指标</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">VaR (95%)</span>
                        <span className="text-sm font-medium">2.3%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">最大回撤</span>
                        <span className="text-sm font-medium">2.1%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">波动率</span>
                        <span className="text-sm font-medium">6.8%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分析标签页 */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📊 用户行为分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">平均持仓时间</span>
                    <span className="font-medium">15.3天</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">用户留存率 (30天)</span>
                    <span className="font-medium text-green-600">87.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">平均存款金额</span>
                    <span className="font-medium">$12,450</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">复投率</span>
                    <span className="font-medium text-blue-600">92.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎯 市场预测</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">6个月 TVL 预测</span>
                      <span className="font-medium">$31.2M</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">用户增长预测</span>
                      <span className="font-medium">25,000+</span>
                    </div>
                    <Progress value={58} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">收益稳定性</span>
                      <span className="font-medium">98.5%</span>
                    </div>
                    <Progress value={98.5} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};