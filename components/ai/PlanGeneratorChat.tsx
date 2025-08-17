/**
 * Plan Generator Chat - 计划生成聊天界面
 * 零门槛的自然语言交易助手
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Send, Zap, TrendingUp, MessageCircle, Sparkles, Bell, RotateCcw } from 'lucide-react';
import { tradingPlanGenerator } from '../../services/TradingPlanGenerator';
import { TradingPlanCard, TradingPlan } from './TradingPlanCard';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'plan';
  content: string;
  plan?: TradingPlan;
  timestamp: number;
}

interface PlanGeneratorChatProps {
  onExecutePlan?: (plan: TradingPlan) => void;
  onSimulatePlan?: (plan: TradingPlan) => void;
  accountBalance?: number;
  className?: string;
}

export const PlanGeneratorChat: React.FC<PlanGeneratorChatProps> = ({
  onExecutePlan,
  onSimulatePlan,
  accountBalance = 10000,
  className = ""
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [radarOpportunities, setRadarOpportunities] = useState<TradingPlan[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 预设快速问题
  const quickQuestions = [
    "今天适合买BTC吗？",
    "ETH现在能入场吗？", 
    "帮我看看SOL的机会",
    "现在市场怎么样？"
  ];

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化机会雷达
  useEffect(() => {
    loadOpportunityRadar();
  }, []);

  // 加载机会雷达
  const loadOpportunityRadar = async () => {
    try {
      const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
      const opportunities = await tradingPlanGenerator.generateOpportunityRadar(symbols);
      setRadarOpportunities(opportunities);
    } catch (error) {
      console.error('加载机会雷达失败:', error);
    }
  };

  // 处理用户输入
  const handleSendMessage = async (question?: string) => {
    const query = question || inputValue.trim();
    if (!query) return;

    setInputValue('');
    setIsGenerating(true);

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // 生成交易计划
      const plan = await tradingPlanGenerator.generatePlan(query, accountBalance);
      
      // 添加计划消息
      const planMessage: ChatMessage = {
        id: `plan_${Date.now()}`,
        type: 'plan',
        content: `为您生成了 ${plan.symbol} 的交易计划`,
        plan,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, planMessage]);
      
      toast.success('计划生成成功！');
      
    } catch (error) {
      console.error('生成计划失败:', error);
      
      // 添加错误消息
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: '抱歉，生成计划时出现了问题。请稍后再试。',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error('生成计划失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 处理计划执行
  const handleExecutePlan = (plan: TradingPlan) => {
    onExecutePlan?.(plan);
    toast.success(`正在执行 ${plan.symbol} ${plan.direction === 'long' ? '买入' : '卖出'} 计划`);
  };

  // 处理计划模拟
  const handleSimulatePlan = (plan: TradingPlan) => {
    onSimulatePlan?.(plan);
    toast.success(`开始模拟 ${plan.symbol} 交易计划`);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 机会雷达 */}
      {radarOpportunities.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-medium text-gray-200">
              <Bell className="w-4 h-4 mr-2 text-yellow-400" />
              机会雷达 ({radarOpportunities.length}个机会)
              <Button
                onClick={loadOpportunityRadar}
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-gray-400 hover:text-gray-200"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                刷新
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 md:grid-cols-3">
              {radarOpportunities.map((opportunity) => (
                <div key={opportunity.id} className="relative">
                  <TradingPlanCard
                    plan={opportunity}
                    onExecute={handleExecutePlan}
                    onSimulate={handleSimulatePlan}
                    className="h-full"
                  />
                  <Badge className="absolute -top-2 -right-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    机会
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主聊天界面 */}
      <Card className="bg-slate-900/80 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-semibold text-gray-200">
            <Sparkles className="w-5 h-5 mr-2 text-blue-400" />
            AI交易助手
            <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              零门槛问答
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 快速问题 */}
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 text-center">
                💬 像和朋友聊天一样问一问，立刻得到可执行的交易计划
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    onClick={() => handleSendMessage(question)}
                    variant="outline"
                    className="text-xs text-gray-300 border-slate-600 hover:border-blue-500/50 hover:bg-blue-500/10"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          {messages.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  {message.type === 'user' && (
                    <div className="flex justify-end">
                      <div className="bg-blue-600/80 text-white rounded-lg px-3 py-2 max-w-xs text-sm">
                        {message.content}
                      </div>
                    </div>
                  )}
                  
                  {message.type === 'assistant' && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800/80 text-gray-200 rounded-lg px-3 py-2 max-w-xs text-sm">
                        {message.content}
                      </div>
                    </div>
                  )}
                  
                  {message.type === 'plan' && message.plan && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="bg-green-600/20 text-green-300 rounded-lg px-3 py-2 max-w-xs text-sm border border-green-500/30">
                          <Zap className="w-3 h-3 inline mr-1" />
                          {message.content}
                        </div>
                      </div>
                      <TradingPlanCard
                        plan={message.plan}
                        onExecute={handleExecutePlan}
                        onSimulate={handleSimulatePlan}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/80 text-gray-200 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                      <span>正在分析市场并生成计划...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 输入区域 */}
          <div className="flex space-x-2 pt-3 border-t border-slate-700/30">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isGenerating && handleSendMessage()}
              placeholder="问我任何交易问题... 比如：今天适合买BTC吗？"
              className="flex-1 bg-slate-800/50 border-slate-600 text-white placeholder-gray-400"
              disabled={isGenerating}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={isGenerating || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* 使用提示 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 <strong>示例问法：</strong></p>
            <p>• "今天适合买BTC吗？" → 获得完整交易计划</p>
            <p>• "ETH现在什么价位入场好？" → 包含入场/止损/目标</p>
            <p>• "帮我看看SOL的机会" → 自动计算仓位和风险</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanGeneratorChat;