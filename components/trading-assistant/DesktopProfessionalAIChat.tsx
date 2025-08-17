/**
 * Desktop Professional AI Chat - World-class trading AI interface
 * Optimized for desktop/laptop screens with professional trading features
 * Version: 3.0 Desktop Edition
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Mic, Send, Sparkles, TrendingUp, AlertTriangle, 
  Target, DollarSign, Clock, Star, Zap, BarChart3,
  Brain, Settings, Play, Bookmark, Share, Eye,
  ChevronDown, ChevronUp, Users, Shield, MessageSquare,
  Activity, LineChart, PieChart, Globe, Lightbulb
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// Enhanced desktop-focused styling
import '../../styles/ai-trading-professional.css';

// Types
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tradingPlan?: TradingPlan;
  marketInsight?: MarketInsight;
  category?: 'analysis' | 'entry' | 'exit' | 'general' | 'insight';
  confidence?: number;
  streaming?: boolean;
}

interface TradingPlan {
  symbol: string;
  signal: 'long' | 'short';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  positionSize: number;
  reasoning: string;
  timeframe: string;
  marketContext: string;
}

interface MarketInsight {
  title: string;
  impact: 'high' | 'medium' | 'low';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  category: 'technical' | 'fundamental' | 'sentiment' | 'flow';
  description: string;
}

interface DesktopProfessionalAIChatProps {
  userAddress?: string;
  isConnected?: boolean;
  accountBalance?: number;
  className?: string;
  selectedTradingPair?: string;
  currentPrice?: number;
  onPlanExecute?: (plan: TradingPlan) => Promise<void>;
  onPlanBookmark?: (planId: string) => void;
  onPlanShare?: (plan: TradingPlan) => void;
}

// Desktop-optimized quick actions with professional trading focus
const DESKTOP_QUICK_ACTIONS = [
  {
    id: 'market-analysis',
    title: 'Market Analysis',
    description: 'Comprehensive technical and fundamental analysis',
    icon: <BarChart3 className="w-4 h-4" />,
    category: 'analysis' as const,
    prompt: 'Provide a comprehensive market analysis for the current trading pair including technical indicators, market structure, and potential opportunities.',
    color: 'blue'
  },
  {
    id: 'position-sizing',
    title: 'Position Sizing',
    description: 'Optimal position size calculation',
    icon: <Target className="w-4 h-4" />,
    category: 'entry' as const,
    prompt: 'Calculate optimal position sizing for a new trade considering my portfolio balance and risk management parameters.',
    color: 'green'
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    description: 'Portfolio risk evaluation and hedging strategies',
    icon: <Shield className="w-4 h-4" />,
    category: 'general' as const,
    prompt: 'Analyze my current portfolio risk exposure and suggest appropriate hedging strategies or position adjustments.',
    color: 'orange'
  },
  {
    id: 'exit-strategy',
    title: 'Exit Strategy',
    description: 'Smart exit planning and profit optimization',
    icon: <TrendingUp className="w-4 h-4" />,
    category: 'exit' as const,
    prompt: 'Help me develop an optimal exit strategy for my current positions considering market conditions and profit targets.',
    color: 'purple'
  }
];

// Professional AI responses with desktop-optimized formatting
const AI_RESPONSES = {
  'market-analysis': {
    content: `📊 **Comprehensive Market Analysis - BTC/USDT**

**Technical Overview:**
• **Trend**: Strong uptrend with higher highs and higher lows
• **Support**: $66,800 (previous resistance now support)
• **Resistance**: $68,500 (psychological level)
• **RSI**: 62.3 (momentum strength without overbought conditions)

**Key Indicators:**
• 20 EMA above 50 EMA (bullish crossover confirmed)
• Volume profile shows strong institutional accumulation
• MACD showing positive momentum divergence

**Market Structure:**
The market is currently in a healthy uptrend with good risk/reward opportunities on pullbacks to the $67,000 support zone.

**Recommendation:** Look for long entries on any dip to $67,000-$67,200 range with tight stops below $66,800.`,
    confidence: 87,
    tradingPlan: {
      symbol: 'BTC/USDT',
      signal: 'long' as const,
      confidence: 87,
      entryPrice: 67100,
      stopLoss: 66750,
      takeProfit: 68400,
      riskReward: 4.86,
      positionSize: 0.1,
      reasoning: 'Technical breakout with strong momentum and institutional support',
      timeframe: '4H',
      marketContext: 'Bullish trend continuation with healthy pullback entry'
    }
  },
  'position-sizing': {
    content: `🎯 **Optimal Position Sizing Analysis**

**Account Balance:** $125,340.56
**Risk Per Trade:** 2% ($2,506.81)
**Current Price:** $67,425

**Recommended Position:**
• **Size**: 0.037 BTC (~$2,495)
• **Stop Distance**: $350 (0.52%)
• **Position Value**: $2,495 (1.99% of account)

**Risk Metrics:**
• **Max Loss**: $2,506.81 (2.00% of account)
• **Leverage**: 1.2x (conservative approach)
• **Margin Required**: $2,079

**Kelly Criterion Suggestion:** Based on historical win rate of 68% and avg R:R of 2.3:1, optimal size is 0.035-0.04 BTC.`,
    confidence: 94
  },
  'risk-assessment': {
    content: `🛡️ **Portfolio Risk Assessment**

**Current Exposure:**
• **Total Portfolio**: $125,340.56
• **Open Positions**: 3 active trades
• **Risk Allocation**: 6.2% of portfolio at risk
• **Correlation Risk**: Medium (2 BTC-correlated positions)

**Risk Metrics:**
• **VaR (1-day, 95%)**: $2,847 (2.27% of portfolio)
• **Max Drawdown Potential**: 8.3%
• **Sharpe Ratio**: 1.47 (last 30 days)

**Recommendations:**
• ✅ Diversify into uncorrelated assets (SOL, AVAX)
• ⚠️ Reduce position sizes if volatility increases above 65%
• 📈 Consider adding portfolio hedges via put options

**Hedging Strategy:**
Consider purchasing BTC 64000 puts (1-week expiry) as portfolio insurance.`,
    confidence: 91
  },
  'exit-strategy': {
    content: `🎯 **Smart Exit Strategy Analysis**

**Current Positions Review:**
• **BTC Long**: +$1,234.56 (24.7% unrealized gain)
• **ETH Short**: -$234.78 (-9.4% unrealized loss)
• **SOL Long**: +$567.89 (47.3% unrealized gain)

**Exit Recommendations:**

**BTC Position:**
• **Immediate**: Take 30% profit at current levels
• **Target 1**: Take 40% at $68,500 (+$1,650 total)
• **Runner**: Let 30% run to $70,000 with trailing stop

**SOL Position:**
• **Action**: Take 50% profit immediately (excellent gain)
• **Reason**: Approaching overbought on weekly timeframe

**ETH Position:**
• **Strategy**: Hold with tight stop at -15% max loss
• **Rationale**: Short-term bearish momentum may continue

**Overall Strategy**: Secure profits on winners, manage losers tightly.`,
    confidence: 89
  }
};

const DesktopProfessionalAIChat: React.FC<DesktopProfessionalAIChatProps> = ({
  userAddress,
  isConnected = false,
  accountBalance = 0,
  className = '',
  selectedTradingPair = 'BTC/USDT',
  currentPrice = 67425,
  onPlanExecute,
  onPlanBookmark,
  onPlanShare
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: `👋 **Welcome to RiverBit AI Trading Assistant**

I'm your professional trading companion, ready to help with:
• **Technical Analysis** - Chart patterns, indicators, market structure
• **Risk Management** - Position sizing, portfolio optimization
• **Market Intelligence** - Real-time insights and opportunities
• **Trade Execution** - Smart entry/exit strategies

Currently monitoring **${selectedTradingPair}** at **$${currentPrice.toLocaleString()}**

What would you like to analyze today?`,
      timestamp: new Date(),
      category: 'general',
      confidence: 100
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [activeInsights, setActiveInsights] = useState<MarketInsight[]>([
    {
      title: 'Strong Institutional Flow Detected',
      impact: 'high',
      sentiment: 'bullish',
      confidence: 94,
      category: 'flow',
      description: 'Large BTC accumulation from institutional wallets in the last 4 hours'
    },
    {
      title: 'Technical Breakout Confirmed',
      impact: 'medium',
      sentiment: 'bullish',
      confidence: 87,
      category: 'technical',
      description: 'BTC broke above key resistance with strong volume confirmation'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Enhanced streaming text effect for professional feel
  const simulateAIResponse = useCallback(async (prompt: string) => {
    setIsTyping(true);
    setStreamingMessage('');

    // Determine response based on prompt
    let response = AI_RESPONSES['market-analysis']; // default
    if (prompt.toLowerCase().includes('position') || prompt.toLowerCase().includes('size')) {
      response = AI_RESPONSES['position-sizing'];
    } else if (prompt.toLowerCase().includes('risk') || prompt.toLowerCase().includes('hedge')) {
      response = AI_RESPONSES['risk-assessment'];
    } else if (prompt.toLowerCase().includes('exit') || prompt.toLowerCase().includes('profit')) {
      response = AI_RESPONSES['exit-strategy'];
    }

    const words = response.content.split(' ');
    let currentText = '';

    // Professional typing speed (45 WPM)
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setStreamingMessage(currentText);
      await new Promise(resolve => setTimeout(resolve, 80)); // Smooth professional pace
    }

    // Convert streaming message to final message
    const finalMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'assistant',
      content: response.content,
      timestamp: new Date(),
      category: 'analysis',
      confidence: response.confidence,
      ...(response.tradingPlan && { tradingPlan: response.tradingPlan })
    };

    setMessages(prev => [...prev, finalMessage]);
    setStreamingMessage('');
    setIsTyping(false);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      category: 'general'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');

    // Simulate AI response
    await simulateAIResponse(currentInput);
  }, [inputValue, simulateAIResponse]);

  const handleQuickAction = useCallback(async (action: typeof DESKTOP_QUICK_ACTIONS[0]) => {
    await simulateAIResponse(action.prompt);
  }, [simulateAIResponse]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className={`desktop-ai-trading-professional ${className}`}>
      {/* Professional Header with Market Context */}
      <div className="desktop-ai-header">
        <div className="flex items-center space-x-3">
          <div className="ai-brain-icon">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Trading Assistant</h3>
            <div className="text-xs text-gray-400">
              Professional • {selectedTradingPair} • ${currentPrice.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />
            Live Analysis
          </Badge>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Main Content Area - Two Column Layout for Desktop */}
      <div className="desktop-ai-content">
        {/* Left Column: Chat Messages */}
        <div className="desktop-chat-column">
          <div className="desktop-messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`desktop-message ${message.type === 'user' ? 'user-message' : 'ai-message'}`}
              >
                {message.type === 'assistant' && (
                  <div className="ai-message-header">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-400">RiverBit AI</span>
                    {message.confidence && (
                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                        {message.confidence}% confidence
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="message-content">
                  {message.content.split('\n').map((line, index) => {
                    if (line.startsWith('•')) {
                      return (
                        <div key={index} className="bullet-point">
                          <span className="bullet">•</span>
                          <span>{line.substring(1).trim()}</span>
                        </div>
                      );
                    } else if (line.startsWith('**') && line.endsWith('**')) {
                      return (
                        <div key={index} className="section-header">
                          {line.replace(/\*\*/g, '')}
                        </div>
                      );
                    } else if (line.includes('📊') || line.includes('🎯') || line.includes('🛡️')) {
                      return (
                        <div key={index} className="analysis-title">
                          {line}
                        </div>
                      );
                    }
                    return <div key={index} className="text-line">{line}</div>;
                  })}
                </div>

                {/* Trading Plan Card */}
                {message.tradingPlan && (
                  <Card className="trading-plan-card mt-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>🎯 Trading Plan</span>
                        <Badge className={`${message.tradingPlan.signal === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {message.tradingPlan.signal.toUpperCase()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400">Entry:</span>
                          <span className="text-white ml-2">${message.tradingPlan.entryPrice.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Stop:</span>
                          <span className="text-red-400 ml-2">${message.tradingPlan.stopLoss.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Target:</span>
                          <span className="text-green-400 ml-2">${message.tradingPlan.takeProfit.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">R:R:</span>
                          <span className="text-blue-400 ml-2">{message.tradingPlan.riskReward.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => onPlanExecute?.(message.tradingPlan!)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Execute
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onPlanBookmark?.(message.id)}>
                          <Bookmark className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onPlanShare?.(message.tradingPlan!)}>
                          <Share className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="message-timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {isTyping && streamingMessage && (
              <div className="desktop-message ai-message streaming">
                <div className="ai-message-header">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-400">RiverBit AI</span>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className="message-content">
                  {streamingMessage.split('\n').map((line, index) => (
                    <div key={index} className="text-line">{line}</div>
                  ))}
                  <span className="cursor">|</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Input Area */}
          <div className="desktop-input-area">
            <div className="input-container">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about market analysis, risk management, or trading strategies..."
                className="desktop-ai-input"
                disabled={isTyping}
              />
              <div className="input-actions">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Mic className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="h-8 bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Insights */}
        <div className="desktop-sidebar-column">
          {/* Quick Actions */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-2">
                {DESKTOP_QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant="ghost"
                    size="sm"
                    className="justify-start h-auto p-3 text-left"
                    onClick={() => handleQuickAction(action)}
                    disabled={isTyping}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <div className={`quick-action-icon ${action.color}`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-white">{action.title}</div>
                        <div className="text-xs text-gray-400">{action.description}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Market Insights */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Eye className="w-4 h-4 mr-2 text-blue-400" />
                Live Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {activeInsights.map((insight, index) => (
                  <div key={index} className="insight-card">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-white">{insight.title}</span>
                      <Badge 
                        className={`text-xs ${
                          insight.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                          insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {insight.confidence}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{insight.description}</p>
                    <div className="flex items-center mt-2">
                      <Badge className={`text-xs mr-2 ${
                        insight.sentiment === 'bullish' ? 'bg-green-500/20 text-green-400' :
                        insight.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {insight.sentiment}
                      </Badge>
                      <span className="text-xs text-gray-500">{insight.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Professional Styling */}
      <style jsx>{`
        .desktop-ai-trading-professional {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.90));
          backdrop-filter: blur(32px) saturate(1.5);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          overflow: hidden;
        }

        .desktop-ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(59, 130, 246, 0.1);
          background: rgba(15, 23, 42, 0.8);
        }

        .ai-brain-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
          border-radius: 8px;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .desktop-ai-content {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .desktop-chat-column {
          flex: 2;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(59, 130, 246, 0.1);
        }

        .desktop-sidebar-column {
          flex: 1;
          padding: 16px;
          background: rgba(15, 23, 42, 0.5);
          max-width: 320px;
        }

        .desktop-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          scroll-behavior: smooth;
        }

        .desktop-message {
          margin-bottom: 20px;
          animation: fadeInUp 0.3s ease-out;
        }

        .desktop-message.user-message {
          margin-left: 60px;
        }

        .desktop-message.ai-message {
          margin-right: 60px;
        }

        .ai-message-header {
          display: flex;
          align-items: center;
          space-x: 8px;
          margin-bottom: 8px;
        }

        .message-content {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.5;
        }

        .user-message .message-content {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
          border-color: rgba(59, 130, 246, 0.3);
          margin-left: auto;
          max-width: 80%;
        }

        .bullet-point {
          display: flex;
          align-items: flex-start;
          margin: 4px 0;
        }

        .bullet {
          color: rgba(59, 130, 246, 0.8);
          margin-right: 8px;
          flex-shrink: 0;
        }

        .section-header {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin: 8px 0 4px 0;
        }

        .analysis-title {
          font-size: 16px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin: 12px 0 8px 0;
        }

        .text-line {
          margin: 2px 0;
        }

        .trading-plan-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .message-timestamp {
          font-size: 11px;
          color: rgba(156, 163, 175, 0.6);
          margin-top: 4px;
          text-align: right;
        }

        .streaming .message-content {
          border-color: rgba(139, 92, 246, 0.4);
        }

        .cursor {
          animation: blink 1s infinite;
          color: rgba(139, 92, 246, 0.8);
        }

        .typing-indicator {
          display: flex;
          space-x: 2px;
        }

        .typing-indicator span {
          height: 4px;
          width: 4px;
          background: rgba(139, 92, 246, 0.6);
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        .desktop-input-area {
          padding: 16px 20px;
          border-top: 1px solid rgba(59, 130, 246, 0.1);
          background: rgba(15, 23, 42, 0.8);
        }

        .input-container {
          display: flex;
          align-items: center;
          space-x: 8px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          padding: 8px;
        }

        .desktop-ai-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          placeholder-color: rgba(156, 163, 175, 0.6);
        }

        .input-actions {
          display: flex;
          align-items: center;
          space-x: 4px;
        }

        .quick-action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
        }

        .quick-action-icon.blue { background: rgba(59, 130, 246, 0.2); }
        .quick-action-icon.green { background: rgba(34, 197, 94, 0.2); }
        .quick-action-icon.orange { background: rgba(251, 146, 60, 0.2); }
        .quick-action-icon.purple { background: rgba(139, 92, 246, 0.2); }

        .insight-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 8px;
          padding: 12px;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default DesktopProfessionalAIChat;