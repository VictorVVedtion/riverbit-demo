"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";

// Import our interaction systems
import { AdvancedSlider } from "../ui/advanced-slider";
import { 
  LeverageSlider, 
  PriceRangeSlider, 
  SlippageSlider, 
  LiquidityRangeSlider 
} from "./TradingSliders";
import { SmartFloatingAssistant } from "./SmartFloatingAssistant";
import { GestureNavigation, GestureFeedback } from "./GestureNavigationSystem";
import { 
  ProgressiveTradingMetric,
  ProgressivePortfolioOverview,
  ProgressivePositionCard,
  InfoDisplayConfig
} from "./ProgressiveInfoDisplay";
import {
  AccessibilityProvider,
  useAccessibility,
  AccessibleButton,
  AccessibleInput,
  PerformanceOverlay,
  EnhancedInteractionWrapper
} from "./PerformanceAccessibilitySystem";

// Demo data
const mockUserProfile = {
  experienceLevel: 'intermediate' as const,
  preferredComplexity: 'standard' as const,
  visitCount: 15,
  focusAreas: ['trading', 'defi']
};

const mockDisplayContext = {
  screenSize: 'desktop' as const,
  currentPage: 'trading',
  userAttention: 'medium' as const,
  timeOnPage: 45000
};

// Main demo component
function InteractionSystemDemoContent() {
  const { settings, updateSettings } = useAccessibility();
  const [showPerformance, setShowPerformance] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("sliders");
  
  // Trading slider states
  const [leverage, setLeverage] = React.useState(10);
  const [priceRange, setPriceRange] = React.useState<[number, number]>([49000, 52000]);
  const [slippage, setSlippage] = React.useState(0.5);
  const [liquidityRange, setLiquidityRange] = React.useState<[number, number]>([48000, 53000]);
  
  // Basic slider states
  const [basicValue, setBasicValue] = React.useState(50);
  const [userProfile, setUserProfile] = React.useState(mockUserProfile);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">现代化交互元素系统</h1>
              <p className="text-muted-foreground mt-2">
                高级滑动块、智能助手、手势导航和渐进式信息展示
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                演示模式
              </Badge>
              
              <div className="flex items-center gap-2">
                <Switch 
                  checked={showPerformance}
                  onCheckedChange={setShowPerformance}
                />
                <span className="text-sm">性能监控</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sliders">滑动块系统</TabsTrigger>
            <TabsTrigger value="progressive">渐进式信息</TabsTrigger>
            <TabsTrigger value="gestures">手势导航</TabsTrigger>
            <TabsTrigger value="settings">设置与优化</TabsTrigger>
          </TabsList>

          {/* Sliders Demo */}
          <TabsContent value="sliders" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Advanced Slider */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">基础高级滑动块</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    支持键盘输入、滚轮控制、预设值、触觉反馈等功能
                  </p>
                </CardHeader>
                <CardContent>
                  <AdvancedSlider
                    value={basicValue}
                    onValueChange={setBasicValue}
                    min={0}
                    max={100}
                    step={1}
                    presets={[
                      { value: 0, label: '0%' },
                      { value: 25, label: '25%' },
                      { value: 50, label: '50%' },
                      { value: 75, label: '75%' },
                      { value: 100, label: '100%' }
                    ]}
                    formatValue={(v) => `${v}%`}
                    showInput={true}
                    showTooltip={true}
                    showPresets={true}
                    hapticFeedback={true}
                    trackGradient={true}
                    showMarkers={true}
                    markers={[0, 25, 50, 75, 100]}
                  />
                  
                  <div className="mt-4 text-sm text-muted-foreground">
                    当前值: {basicValue}%
                    <br />
                    尝试: 键盘方向键、滚轮、点击预设值
                  </div>
                </CardContent>
              </Card>

              {/* Leverage Slider */}
              <LeverageSlider
                value={leverage}
                onChange={setLeverage}
                maxLeverage={100}
                currentPrice={50000}
                positionSize={1000}
                accountBalance={10000}
              />

              {/* Price Range Slider */}
              <PriceRangeSlider
                value={priceRange}
                onChange={setPriceRange}
                currentPrice={50500}
                priceRange={[45000, 55000]}
                liquidityData={[
                  { price: 49000, volume: 100000 },
                  { price: 50000, volume: 200000 },
                  { price: 51000, volume: 150000 },
                  { price: 52000, volume: 120000 }
                ]}
              />

              {/* Slippage Slider */}
              <SlippageSlider
                value={slippage}
                onChange={setSlippage}
                tradeSize={10000}
                estimatedSlippage={0.3}
              />
            </div>

            {/* Liquidity Range Slider - Full Width */}
            <LiquidityRangeSlider
              value={liquidityRange}
              onChange={setLiquidityRange}
              currentPrice={50500}
              poolData={{
                totalLiquidity: 2500000,
                apr: 18.5,
                volume24h: 850000
              }}
            />
          </TabsContent>

          {/* Progressive Info Demo */}
          <TabsContent value="progressive" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProgressivePortfolioOverview
                userProfile={userProfile}
                context={mockDisplayContext}
              />

              <ProgressivePositionCard
                symbol="BTC"
                size={0.5}
                entryPrice={48000}
                currentPrice={50500}
                userProfile={userProfile}
                context={mockDisplayContext}
              />

              <InfoDisplayConfig
                userProfile={userProfile}
                onProfileUpdate={(updates) => 
                  setUserProfile(prev => ({ ...prev, ...updates }))
                }
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">信息分层演示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm">
                    <div className="font-medium text-green-600">第1层 - 核心信息</div>
                    <p className="text-muted-foreground">立即可见的关键数据</p>
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium text-yellow-600">第2层 - 详细信息</div>
                    <p className="text-muted-foreground">悬停或点击显示的补充数据</p>
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium text-red-600">第3层 - 高级数据</div>
                    <p className="text-muted-foreground">专家用户需要的深度分析</p>
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      信息显示会根据用户经验等级、屏幕尺寸和注意力状态自动调整
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gesture Navigation Demo */}
          <TabsContent value="gestures">
            <GestureNavigation pageType="trading">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">手势导航演示区域</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      在此区域尝试以下手势操作
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-medium">支持的手势:</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">触摸</Badge>
                            左滑 - 下一个交易对
                          </li>
                          <li className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">触摸</Badge>
                            右滑 - 上一个交易对
                          </li>
                          <li className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">触摸</Badge>
                            双击 - 快速交易
                          </li>
                          <li className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">触摸</Badge>
                            长按 - 快捷菜单
                          </li>
                          <li className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">键盘</Badge>
                            方向键 - 导航
                          </li>
                          <li className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">键盘</Badge>
                            Enter - 确认操作
                          </li>
                        </ul>
                      </div>
                      
                      <div className="h-64 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">👋</div>
                          <p className="text-sm text-muted-foreground">
                            在此区域尝试手势操作
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            操作反馈会在页面顶部显示
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">上下文感知手势</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-lg font-medium">交易页面</div>
                        <div className="text-sm text-muted-foreground mt-2">
                          交易对切换、快速下单
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-lg font-medium">资产页面</div>
                        <div className="text-sm text-muted-foreground mt-2">
                          页面导航、视图切换
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-lg font-medium">流动性页面</div>
                        <div className="text-sm text-muted-foreground mt-2">
                          池子选择、策略调整
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </GestureNavigation>
          </TabsContent>

          {/* Settings and Optimization */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Accessibility Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">无障碍设置</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    调整界面以适应不同的使用需求
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">减少动画</div>
                      <div className="text-sm text-muted-foreground">
                        减少或关闭动画效果
                      </div>
                    </div>
                    <Switch
                      checked={settings.reducedMotion}
                      onCheckedChange={(checked) => 
                        updateSettings({ reducedMotion: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">高对比度</div>
                      <div className="text-sm text-muted-foreground">
                        增强颜色对比度
                      </div>
                    </div>
                    <Switch
                      checked={settings.highContrast}
                      onCheckedChange={(checked) => 
                        updateSettings({ highContrast: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">大字体</div>
                      <div className="text-sm text-muted-foreground">
                        使用更大的字体尺寸
                      </div>
                    </div>
                    <Switch
                      checked={settings.largeText}
                      onCheckedChange={(checked) => 
                        updateSettings({ largeText: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">语音提示</div>
                      <div className="text-sm text-muted-foreground">
                        屏幕阅读器语音提示
                      </div>
                    </div>
                    <Switch
                      checked={settings.announceChanges}
                      onCheckedChange={(checked) => 
                        updateSettings({ announceChanges: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">性能指标</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    实时监控界面性能表现
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">目标指标</span>
                      <span className="text-sm text-muted-foreground">实际值</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">帧率 (FPS)</span>
                      <Badge variant="secondary">≥ 60</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">滑动响应</span>
                      <Badge variant="secondary">&lt; 16ms</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">手势识别</span>
                      <Badge variant="secondary">&lt; 100ms</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">内存占用</span>
                      <Badge variant="secondary">&lt; 50MB</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">优化特性</div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 虚拟化长列表渲染</li>
                      <li>• 防抖动画和交互</li>
                      <li>• 智能组件懒加载</li>
                      <li>• 手势事件优化</li>
                      <li>• Web Workers 计算</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Accessible Components Demo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">增强组件演示</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    具备完整无障碍支持的组件
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AccessibleInput
                    label="交易数量"
                    placeholder="输入交易数量"
                    description="请输入您要交易的数量"
                    required
                  />

                  <div className="flex gap-2">
                    <AccessibleButton>
                      普通按钮
                    </AccessibleButton>
                    <AccessibleButton loading loadingText="正在处理...">
                      加载按钮
                    </AccessibleButton>
                    <AccessibleButton disabled>
                      禁用按钮
                    </AccessibleButton>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    这些组件支持键盘导航、屏幕阅读器、高对比度等无障碍特性
                  </div>
                </CardContent>
              </Card>

              {/* Feature Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">系统特性总览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="font-medium">交互增强</div>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• 高级滑动块</li>
                        <li>• 手势导航</li>
                        <li>• 智能助手</li>
                        <li>• 渐进信息</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="font-medium">体验优化</div>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• 性能监控</li>
                        <li>• 无障碍支持</li>
                        <li>• 响应式设计</li>
                        <li>• 触觉反馈</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Smart floating assistant */}
      <SmartFloatingAssistant />

      {/* Performance overlay */}
      <PerformanceOverlay show={showPerformance} />
    </div>
  );
}

// Main component with providers
export function InteractionSystemDemo() {
  return (
    <AccessibilityProvider>
      <EnhancedInteractionWrapper showPerformanceOverlay={false}>
        <InteractionSystemDemoContent />
      </EnhancedInteractionWrapper>
    </AccessibilityProvider>
  );
}