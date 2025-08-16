/**
 * Presentation Control Panel
 * 演示控制面板 - 用于管理演示优化设置
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { usePresentationOptimizer } from '../hooks/usePresentationOptimizer';
import { DEMO_PRESETS } from '../agents/presentation-optimizer';

interface PresentationControlPanelProps {
  className?: string;
  onDataChange?: (optimizedData: any) => void;
  showAdvancedControls?: boolean;
}

export const PresentationControlPanel: React.FC<PresentationControlPanelProps> = ({
  className = '',
  onDataChange,
  showAdvancedControls = false
}) => {
  const {
    isOptimized,
    currentPreset,
    optimizedData,
    isLoading,
    error,
    startOptimization,
    stopOptimization,
    switchPreset,
    saveCurrentConfig,
    loadSavedConfig,
    trackInteraction,
    generatePresentationReport,
    availablePresets,
    getCurrentPresetInfo
  } = usePresentationOptimizer({ 
    preset: 'vc_pitch',
    trackAnalytics: true 
  });

  const [selectedPreset, setSelectedPreset] = useState<keyof typeof DEMO_PRESETS>('vc_pitch');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [presentationReport, setPresentationReport] = useState<any>(null);
  const [savedConfigs, setSavedConfigs] = useState<string[]>([]);

  // 监听优化数据变化
  useEffect(() => {
    if (optimizedData && onDataChange) {
      onDataChange(optimizedData);
    }
  }, [optimizedData, onDataChange]);

  // 加载保存的配置列表
  useEffect(() => {
    const loadSavedConfigsList = () => {
      const configs: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('riverbit-demo-')) {
          configs.push(key.replace('riverbit-demo-', ''));
        }
      }
      setSavedConfigs(configs);
    };

    loadSavedConfigsList();
  }, []);

  // 自动刷新逻辑
  useEffect(() => {
    if (!autoRefresh || !isOptimized) return;

    const interval = setInterval(() => {
      if (currentPreset) {
        switchPreset(currentPreset as keyof typeof DEMO_PRESETS);
        trackInteraction('auto_refresh');
      }
    }, 30000); // 每30秒刷新

    return () => clearInterval(interval);
  }, [autoRefresh, isOptimized, currentPreset, switchPreset, trackInteraction]);

  // 处理预设切换
  const handlePresetChange = async (preset: string) => {
    setSelectedPreset(preset as keyof typeof DEMO_PRESETS);
    await switchPreset(preset as keyof typeof DEMO_PRESETS);
    trackInteraction('preset_changed', { newPreset: preset });
  };

  // 启动优化
  const handleStartOptimization = async () => {
    await startOptimization(selectedPreset);
    trackInteraction('optimization_started', { preset: selectedPreset });
  };

  // 停止优化
  const handleStopOptimization = () => {
    stopOptimization();
    trackInteraction('optimization_stopped');
  };

  // 生成报告
  const handleGenerateReport = () => {
    const report = generatePresentationReport();
    setPresentationReport(report);
    trackInteraction('report_generated');
  };

  // 保存配置
  const handleSaveConfig = () => {
    const configName = `config_${Date.now()}`;
    const saved = saveCurrentConfig(configName);
    if (saved) {
      setSavedConfigs(prev => [...prev, configName]);
      trackInteraction('config_saved', { configName });
    }
  };

  // 获取预设信息
  const presetInfo = getCurrentPresetInfo();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 主控制面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🎯 演示优化控制台
                {isOptimized && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    已优化
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                管理投资人演示数据优化和美化设置
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-refresh">自动刷新</Label>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 预设选择 */}
          <div className="space-y-2">
            <Label htmlFor="preset-select">演示预设</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="选择演示预设" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vc_pitch">
                  🎯 VC 投资人演示
                </SelectItem>
                <SelectItem value="institutional">
                  🏛️ 机构投资者演示
                </SelectItem>
                <SelectItem value="technical_demo">
                  ⚙️ 技术演示
                </SelectItem>
                <SelectItem value="retail_demo">
                  👤 零售用户演示
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 当前预设信息 */}
          {presetInfo && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm">{presetInfo.description.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {presetInfo.description.description}
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  受众: {presetInfo.description.audience}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  重点: {presetInfo.description.focus}
                </Badge>
              </div>
            </div>
          )}

          {/* 控制按钮 */}
          <div className="flex gap-2">
            {!isOptimized ? (
              <Button 
                onClick={handleStartOptimization}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? '优化中...' : '🚀 启动优化'}
              </Button>
            ) : (
              <Button 
                onClick={handleStopOptimization}
                variant="outline"
              >
                ⏹️ 停止优化
              </Button>
            )}
            
            <Button 
              onClick={handleSaveConfig}
              variant="outline"
              disabled={!isOptimized}
            >
              💾 保存配置
            </Button>
            
            <Button 
              onClick={handleGenerateReport}
              variant="outline"
              disabled={!isOptimized}
            >
              📊 生成报告
            </Button>
          </div>

          {/* 进度指示器 */}
          {isLoading && (
            <div className="space-y-2">
              <Label className="text-sm">优化进度</Label>
              <Progress value={75} className="w-full" />
              <p className="text-xs text-muted-foreground">
                正在增强关键指标和视觉效果...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 高级控制选项 */}
      {showAdvancedControls && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">⚙️ 高级设置</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="enhancement" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="enhancement">数据增强</TabsTrigger>
                <TabsTrigger value="visual">视觉优化</TabsTrigger>
                <TabsTrigger value="configs">配置管理</TabsTrigger>
              </TabsList>
              
              <TabsContent value="enhancement" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="increase-metrics">增强指标</Label>
                    <Switch id="increase-metrics" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="add-trends">添加趋势线</Label>
                    <Switch id="add-trends" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="optimize-numbers">优化数字</Label>
                    <Switch id="optimize-numbers" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enhance-visuals">增强视觉</Label>
                    <Switch id="enhance-visuals" defaultChecked />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="visual" className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">颜色主题</Label>
                    <div className="flex gap-2 mt-2">
                      <div className="w-8 h-8 rounded bg-green-500" title="成功色"></div>
                      <div className="w-8 h-8 rounded bg-blue-500" title="主色"></div>
                      <div className="w-8 h-8 rounded bg-yellow-500" title="警告色"></div>
                      <div className="w-8 h-8 rounded bg-red-500" title="错误色"></div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium">动画效果</Label>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm">计数动画</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm">渐变效果</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="configs" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">保存的配置</Label>
                  {savedConfigs.length > 0 ? (
                    <div className="space-y-2">
                      {savedConfigs.map((config) => (
                        <div key={config} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{config}</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              loadSavedConfig(config);
                              trackInteraction('config_loaded', { configName: config });
                            }}
                          >
                            加载
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无保存的配置</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 演示报告 */}
      {presentationReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 演示效果报告</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">演示时长</Label>
                <p className="text-2xl font-bold">
                  {Math.round(presentationReport.totalDuration / 1000 / 60)} 分钟
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">参与度评分</Label>
                <p className="text-2xl font-bold text-green-600">
                  {presentationReport.engagementScore}/100
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <Label className="text-sm font-medium mb-2 block">关键亮点</Label>
              <ul className="space-y-1">
                {presentationReport.keyHighlights?.map((highlight: string, index: number) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">改进建议</Label>
              <ul className="space-y-1">
                {presentationReport.recommendedImprovements?.map((improvement: string, index: number) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <span className="text-blue-500">💡</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 状态指示器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOptimized ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>优化状态: {isOptimized ? '已启用' : '未启用'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span>自动刷新: {autoRefresh ? '开启' : '关闭'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};