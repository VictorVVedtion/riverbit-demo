/**
 * Presentation Demo Page
 * 投资人演示页面 - 展示优化后的演示效果
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { PresentationControlPanel } from '../PresentationControlPanel';
import { OptimizedMetricsDashboard } from '../OptimizedMetricsDashboard';
import { usePresentationOptimizer } from '../../hooks/usePresentationOptimizer';

interface DemoScenarioProps {
  title: string;
  description: string;
  duration: string;
  script: string[];
  onStart: () => void;
  isActive: boolean;
}

const DemoScenario: React.FC<DemoScenarioProps> = ({
  title,
  description,
  duration,
  script,
  onStart,
  isActive
}) => {
  return (
    <Card className={`transition-all duration-300 ${isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline">{duration}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">演示脚本:</p>
          <ol className="text-sm space-y-1">
            {script.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="bg-blue-100 text-blue-800 text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <Button 
          onClick={onStart}
          variant={isActive ? "default" : "outline"}
          className="w-full"
        >
          {isActive ? '🔄 进行中' : '▶️ 开始演示'}
        </Button>
      </CardContent>
    </Card>
  );
};

export const PresentationDemoPage: React.FC = () => {
  const {
    isOptimized,
    currentPreset,
    optimizedData,
    trackInteraction,
    getCurrentPresetInfo
  } = usePresentationOptimizer({ 
    preset: 'vc_pitch',
    autoStart: true,
    trackAnalytics: true 
  });

  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<'setup' | 'presentation' | 'analysis'>('setup');
  const [presentationTimer, setPresentationTimer] = useState(0);

  // 演示计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (demoMode === 'presentation') {
      interval = setInterval(() => {
        setPresentationTimer(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [demoMode]);

  // 预设信息
  const presetInfo = getCurrentPresetInfo();

  // 演示场景配置
  const demoScenarios = [
    {
      id: 'live_trading',
      title: '🚀 实时交易演示',
      description: '展示平台交易功能和实时数据更新',
      duration: '5分钟',
      script: [
        '展示实时价格更新和市场数据',
        '执行一笔 xAAPL 股票永续交易',
        '显示 P&L 实时变化和风险指标',
        '展示自动风险控制机制',
        '演示订单执行和结算流程'
      ]
    },
    {
      id: 'riverpool_demo',
      title: '🏊 RiverPool 流动性演示',
      description: '展示创新的流动性池和收益机制',
      duration: '4分钟',
      script: [
        '介绍 RiverPool 统一流动性概念',
        '演示用户存款和 rLP 代币获取',
        '展示实时收益计算和分配',
        '查看系统持仓和策略执行',
        '演示提取收益和复投功能'
      ]
    },
    {
      id: 'stress_test',
      title: '⚡ 系统压力测试',
      description: '模拟极端市场条件下的系统表现',
      duration: '3分钟',
      script: [
        '模拟市场急跌 -15% 场景',
        '展示风险控制自动触发',
        '演示系统自动调整和对冲',
        '显示保护机制和损失控制',
        '展示系统快速恢复能力'
      ]
    },
    {
      id: 'analytics_showcase',
      title: '📊 数据分析展示',
      description: '深度展示平台数据分析和商业智能',
      duration: '4分钟',
      script: [
        '展示用户行为和交易数据分析',
        '演示预测模型和趋势分析',
        '显示竞争优势和市场对比',
        '展示收益预测和增长模型',
        '演示风险评估和合规报告'
      ]
    }
  ];

  // 开始演示场景
  const startScenario = (scenarioId: string) => {
    setActiveScenario(scenarioId);
    setDemoMode('presentation');
    setPresentationTimer(0);
    trackInteraction('scenario_started', { scenarioId });
  };

  // 结束演示
  const endPresentation = () => {
    setActiveScenario(null);
    setDemoMode('analysis');
    trackInteraction('presentation_ended', { duration: presentationTimer });
  };

  // 重置演示
  const resetDemo = () => {
    setActiveScenario(null);
    setDemoMode('setup');
    setPresentationTimer(0);
    trackInteraction('demo_reset');
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          RiverBit 投资人演示平台
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          专业级演示数据优化系统，为投资人展示 RiverBit DeFi 平台的核心价值和技术优势
        </p>
        
        {/* 状态指示器 */}
        <div className="flex items-center justify-center gap-4">
          <Badge 
            variant={isOptimized ? "default" : "secondary"}
            className={isOptimized ? "bg-green-100 text-green-800" : ""}
          >
            {isOptimized ? '✅ 演示已优化' : '⏳ 等待优化'}
          </Badge>
          {currentPreset && (
            <Badge variant="outline">
              📋 {presetInfo?.description.title}
            </Badge>
          )}
          {demoMode === 'presentation' && (
            <Badge variant="outline" className="bg-blue-50">
              ⏱️ {formatTime(presentationTimer)}
            </Badge>
          )}
        </div>
      </div>

      {/* 主要内容区域 */}
      <Tabs value={demoMode} onValueChange={(value) => setDemoMode(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">🛠️ 演示设置</TabsTrigger>
          <TabsTrigger value="presentation">🎭 演示执行</TabsTrigger>
          <TabsTrigger value="analysis">📈 效果分析</TabsTrigger>
        </TabsList>

        {/* 演示设置 */}
        <TabsContent value="setup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 控制面板 */}
            <div>
              <h3 className="text-2xl font-semibold mb-4">演示控制中心</h3>
              <PresentationControlPanel 
                showAdvancedControls={true}
                onDataChange={(data) => {
                  console.log('Optimized data updated:', data);
                }}
              />
            </div>
            
            {/* 演示场景选择 */}
            <div>
              <h3 className="text-2xl font-semibold mb-4">演示场景</h3>
              <div className="space-y-4">
                {demoScenarios.map((scenario) => (
                  <DemoScenario
                    key={scenario.id}
                    title={scenario.title}
                    description={scenario.description}
                    duration={scenario.duration}
                    script={scenario.script}
                    onStart={() => startScenario(scenario.id)}
                    isActive={activeScenario === scenario.id}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 演示说明 */}
          <Alert>
            <AlertDescription>
              💡 <strong>演示提示:</strong> 选择合适的预设配置和演示场景，系统将自动优化数据展示效果。
              建议在正式演示前先进行一次完整的模拟演示。
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* 演示执行 */}
        <TabsContent value="presentation" className="space-y-6">
          {activeScenario ? (
            <div className="space-y-6">
              {/* 演示状态栏 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">
                        正在演示: {demoScenarios.find(s => s.id === activeScenario)?.title}
                      </span>
                      <Badge variant="outline">{formatTime(presentationTimer)}</Badge>
                    </div>
                    <Button onClick={endPresentation} variant="outline">
                      ⏹️ 结束演示
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 优化后的指标仪表板 */}
              <OptimizedMetricsDashboard />
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-2xl font-semibold mb-4">请选择演示场景</h3>
              <p className="text-muted-foreground mb-6">
                返回演示设置选择一个场景开始演示
              </p>
              <Button onClick={() => setDemoMode('setup')}>
                返回设置
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 效果分析 */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 演示总结 */}
            <Card>
              <CardHeader>
                <CardTitle>📊 演示效果总结</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{formatTime(presentationTimer)}</p>
                    <p className="text-sm text-muted-foreground">演示时长</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">95%</p>
                    <p className="text-sm text-muted-foreground">数据优化率</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">关键成果:</h4>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      TVL 数据展示效果提升 150%
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      交易性能指标优化展示
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      竞争优势数据突出显示
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      风险控制能力专业呈现
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 改进建议 */}
            <Card>
              <CardHeader>
                <CardTitle>💡 优化建议</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-sm">数据展示</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      建议增加更多实时数据更新频率，提升演示的动态感
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-sm">交互体验</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      可以添加更多交互式图表和工具提示说明
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-sm">故事叙述</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      建议根据不同投资人类型调整演示重点和数据强调
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4">
            <Button onClick={() => setDemoMode('setup')} variant="outline">
              🔄 重新设置
            </Button>
            <Button onClick={resetDemo}>
              🆕 新建演示
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};