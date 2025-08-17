/**
 * Compact Professional AI Chat - 紧凑型专业AI助手
 * 专为右侧小面板设计，保持专业交易功能的同时优化空间利用
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, Send, Sparkles, TrendingUp, AlertTriangle, 
  Target, DollarSign, Clock, Star, Zap, BarChart3,
  Brain, Play, Bookmark, Share, ChevronDown,
  Activity, LineChart, Shield, MessageSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

// Types
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tradingPlan?: TradingPlan;
  category?: 'analysis' | 'entry' | 'exit' | 'general';
  confidence?: number;
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
}

interface CompactProfessionalAIProps {
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

// 紧凑型快速操作
const COMPACT_ACTIONS = [
  { id: 'analyze', icon: <BarChart3 className="w-3 h-3" />, text: 'Analyze', color: 'blue' },
  { id: 'risk', icon: <Shield className="w-3 h-3" />, text: 'Risk', color: 'orange' },
  { id: 'entry', icon: <Target className="w-3 h-3" />, text: 'Entry', color: 'green' },
  { id: 'exit', icon: <TrendingUp className="w-3 h-3" />, text: 'Exit', color: 'purple' }
];

// 专业AI回复
const AI_RESPONSES = {
  'analyze': {
    content: `📊 **Quick Analysis - BTC/USDT**

**Technical**: Bullish trend, RSI 62.3
**Support**: $66,800 | **Resistance**: $68,500
**Momentum**: Strong upward with institutional backing

**Signal**: LONG on pullback to $67,000-$67,200`,
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
      reasoning: 'Technical breakout with strong momentum'
    }
  },
  'risk': {
    content: `🛡️ **Risk Assessment**

**Portfolio Risk**: 6.2% exposure
**VaR (1-day)**: $2,847 (2.27%)
**Correlation**: Medium risk (2 BTC positions)

**Recommendation**: Reduce size if volatility >65%`,
    confidence: 91
  },
  'entry': {
    content: `🎯 **Entry Strategy**

**Optimal Size**: 0.037 BTC (~$2,495)
**Risk**: 2% of account ($2,507)
**Entry Zone**: $67,000-$67,200
**Stop**: $66,750

**Kelly Optimal**: 0.035-0.04 BTC`,
    confidence: 94
  },
  'exit': {
    content: `📈 **Exit Strategy**

**BTC Long**: Take 30% profit now
**Target 1**: 40% at $68,500
**Runner**: 30% to $70,000 w/ trailing stop

**SOL**: Take 50% profit (47.3% gain)`,
    confidence: 89
  }
};

const CompactProfessionalAI: React.FC<CompactProfessionalAIProps> = ({
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
      content: `👋 **RiverBit AI Assistant**

Ready to help with trading analysis, risk management, and market insights.

Monitoring **${selectedTradingPair}** at **$${currentPrice.toLocaleString()}**`,
      timestamp: new Date(),
      category: 'general',
      confidence: 100
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // 紧凑型流式响应
  const simulateAIResponse = useCallback(async (actionId: string) => {
    setIsTyping(true);
    setStreamingMessage('');

    const response = AI_RESPONSES[actionId as keyof typeof AI_RESPONSES] || AI_RESPONSES.analyze;
    const words = response.content.split(' ');
    let currentText = '';

    // 快速打字效果 (适合小面板)
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setStreamingMessage(currentText);
      await new Promise(resolve => setTimeout(resolve, 60)); // 稍快的速度
    }

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
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      category: 'general'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // 简单的关键词匹配
    let actionId = 'analyze';
    if (inputValue.toLowerCase().includes('risk')) actionId = 'risk';
    else if (inputValue.toLowerCase().includes('entry') || inputValue.toLowerCase().includes('buy')) actionId = 'entry';
    else if (inputValue.toLowerCase().includes('exit') || inputValue.toLowerCase().includes('sell')) actionId = 'exit';

    await simulateAIResponse(actionId);
  }, [inputValue, isTyping, simulateAIResponse]);

  const handleQuickAction = useCallback(async (actionId: string) => {
    if (isTyping) return;
    await simulateAIResponse(actionId);
  }, [isTyping, simulateAIResponse]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className={`compact-professional-ai ${className}`}>
      {/* 紧凑型快速操作栏 */}
      <div className="compact-actions-bar">
        {COMPACT_ACTIONS.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant="ghost"
            onClick={() => handleQuickAction(action.id)}
            disabled={isTyping}
            className={`compact-action-btn ${action.color}`}
            title={`Quick ${action.text} Analysis`}
          >
            {action.icon}
            <span className="ml-1 text-xs">{action.text}</span>
          </Button>
        ))}
      </div>

      {/* 消息区域 - 紧凑型滚动 */}
      <ScrollArea className="compact-messages-area">
        <div className="compact-messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`compact-message ${message.type === 'user' ? 'user' : 'ai'}`}
            >
              {message.type === 'assistant' && (
                <div className="ai-header">
                  <Brain className="w-3 h-3 text-purple-400" />
                  {message.confidence && (
                    <Badge className="confidence-badge">
                      {message.confidence}%
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="message-content">
                {message.content.split('\n').map((line, index) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <div key={index} className="content-header">
                        {line.replace(/\*\*/g, '')}
                      </div>
                    );
                  } else if (line.includes('📊') || line.includes('🎯') || line.includes('🛡️') || line.includes('📈')) {
                    return (
                      <div key={index} className="content-title">
                        {line}
                      </div>
                    );
                  }
                  return line ? <div key={index} className="content-line">{line}</div> : null;
                })}
              </div>

              {/* 紧凑型交易计划 */}
              {message.tradingPlan && (
                <div className="compact-trading-plan">
                  <div className="plan-header">
                    <span className="plan-title">Trading Plan</span>
                    <Badge className={`plan-signal ${message.tradingPlan.signal}`}>
                      {message.tradingPlan.signal.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="plan-details">
                    <div className="plan-row">
                      <span>Entry:</span>
                      <span>${message.tradingPlan.entryPrice.toLocaleString()}</span>
                    </div>
                    <div className="plan-row">
                      <span>Stop:</span>
                      <span className="text-red-400">${message.tradingPlan.stopLoss.toLocaleString()}</span>
                    </div>
                    <div className="plan-row">
                      <span>Target:</span>
                      <span className="text-green-400">${message.tradingPlan.takeProfit.toLocaleString()}</span>
                    </div>
                    <div className="plan-row">
                      <span>R:R:</span>
                      <span className="text-blue-400">{message.tradingPlan.riskReward.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="plan-actions">
                    <Button 
                      size="sm" 
                      className="execute-btn"
                      onClick={() => onPlanExecute?.(message.tradingPlan!)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Execute
                    </Button>
                    <div className="plan-secondary-actions">
                      <Button size="sm" variant="ghost" onClick={() => onPlanBookmark?.(message.id)}>
                        <Bookmark className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onPlanShare?.(message.tradingPlan!)}>
                        <Share className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          ))}

          {/* 流式消息 */}
          {isTyping && streamingMessage && (
            <div className="compact-message ai streaming">
              <div className="ai-header">
                <Brain className="w-3 h-3 text-purple-400" />
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
              <div className="message-content">
                {streamingMessage}
                <span className="cursor">|</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 紧凑型输入区域 */}
      <div className="compact-input-area">
        <div className="input-wrapper">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask AI about trading..."
            className="compact-input"
            disabled={isTyping}
          />
          <div className="input-actions">
            <Button 
              size="sm" 
              variant="ghost" 
              className="mic-btn"
              disabled={isTyping}
            >
              <Mic className="w-3 h-3" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="send-btn"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* 紧凑型专业样式 */}
      <style jsx>{`
        .compact-professional-ai {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.90));
          border-radius: 12px;
          overflow: hidden;
        }

        .compact-actions-bar {
          display: flex;
          gap: 4px;
          padding: 8px;
          border-bottom: 1px solid rgba(59, 130, 246, 0.1);
          background: rgba(15, 23, 42, 0.8);
        }

        .compact-action-btn {
          flex: 1;
          height: 28px;
          padding: 0 6px;
          font-size: 10px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .compact-action-btn.blue:hover { background: rgba(59, 130, 246, 0.2); }
        .compact-action-btn.orange:hover { background: rgba(251, 146, 60, 0.2); }
        .compact-action-btn.green:hover { background: rgba(34, 197, 94, 0.2); }
        .compact-action-btn.purple:hover { background: rgba(139, 92, 246, 0.2); }

        .compact-messages-area {
          flex: 1;
          min-height: 0;
        }

        .compact-messages-container {
          padding: 8px;
          space-y: 8px;
        }

        .compact-message {
          margin-bottom: 12px;
          font-size: 11px;
          line-height: 1.4;
        }

        .compact-message.user {
          margin-left: 20px;
        }

        .compact-message.ai {
          margin-right: 20px;
        }

        .ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .confidence-badge {
          font-size: 9px;
          padding: 1px 4px;
          height: 16px;
          background: rgba(59, 130, 246, 0.2);
          color: rgba(59, 130, 246, 0.9);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .message-content {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          padding: 8px;
          color: rgba(255, 255, 255, 0.9);
        }

        .compact-message.user .message-content {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
          border-color: rgba(59, 130, 246, 0.3);
        }

        .content-header {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin: 4px 0 2px 0;
          font-size: 10px;
        }

        .content-title {
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin: 6px 0 4px 0;
          font-size: 11px;
        }

        .content-line {
          margin: 1px 0;
          font-size: 10px;
        }

        .compact-trading-plan {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 6px;
          padding: 8px;
          margin-top: 6px;
          font-size: 10px;
        }

        .plan-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .plan-title {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          font-size: 10px;
        }

        .plan-signal.long {
          background: rgba(34, 197, 94, 0.2);
          color: rgba(34, 197, 94, 0.9);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .plan-signal.short {
          background: rgba(239, 68, 68, 0.2);
          color: rgba(239, 68, 68, 0.9);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .plan-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-bottom: 8px;
        }

        .plan-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
        }

        .plan-row span:first-child {
          color: rgba(156, 163, 175, 0.8);
        }

        .plan-row span:last-child {
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        .plan-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .execute-btn {
          background: rgba(34, 197, 94, 0.8);
          color: white;
          border: none;
          height: 24px;
          font-size: 9px;
          padding: 0 8px;
        }

        .execute-btn:hover {
          background: rgba(34, 197, 94, 0.9);
        }

        .plan-secondary-actions {
          display: flex;
          gap: 2px;
        }

        .plan-secondary-actions button {
          height: 20px;
          width: 20px;
          padding: 0;
        }

        .message-time {
          font-size: 9px;
          color: rgba(156, 163, 175, 0.6);
          text-align: right;
          margin-top: 2px;
        }

        .streaming .message-content {
          border-color: rgba(139, 92, 246, 0.4);
        }

        .cursor {
          animation: blink 1s infinite;
          color: rgba(139, 92, 246, 0.8);
        }

        .typing-dots {
          display: flex;
          gap: 2px;
        }

        .typing-dots span {
          width: 3px;
          height: 3px;
          background: rgba(139, 92, 246, 0.6);
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

        .compact-input-area {
          padding: 8px;
          border-top: 1px solid rgba(59, 130, 246, 0.1);
          background: rgba(15, 23, 42, 0.8);
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          padding: 4px;
        }

        .compact-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 11px;
          padding: 4px 6px;
        }

        .compact-input::placeholder {
          color: rgba(156, 163, 175, 0.6);
        }

        .input-actions {
          display: flex;
          gap: 2px;
        }

        .mic-btn, .send-btn {
          height: 24px;
          width: 24px;
          padding: 0;
        }

        .send-btn {
          background: rgba(139, 92, 246, 0.8);
          color: white;
        }

        .send-btn:hover {
          background: rgba(139, 92, 246, 0.9);
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

export default CompactProfessionalAI;