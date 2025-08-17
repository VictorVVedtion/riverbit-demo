'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Send, Sparkles, TrendingUp, AlertTriangle, 
  Target, DollarSign, Clock, Star, Zap, BarChart3,
  Brain, Settings, Play, Bookmark, Share, Eye,
  ChevronDown, ChevronUp, Users, Shield
} from 'lucide-react';

// Import professional AI styling
import '../../styles/ai-trading-professional.css';
import '../../styles/ai-trading-professional-enhanced.css';

// Types
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tradingPlan?: TradingPlan;
  category?: 'analysis' | 'entry' | 'exit' | 'general';
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

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'analysis' | 'entry' | 'exit' | 'general';
  prompt: string;
}

// Context-aware prompts based on market conditions
const CONTEXT_PROMPTS = {
  volatile: [
    { id: '1', title: 'High Volatility Strategy', description: 'Risk management for volatile markets', icon: <AlertTriangle className="w-5 h-5" />, category: 'analysis' as const, prompt: 'Analyze high volatility trading strategies for current market conditions' },
    { id: '2', title: 'Quick Scalp Setup', description: 'Short-term opportunities', icon: <Zap className="w-5 h-5" />, category: 'entry' as const, prompt: 'Find quick scalping opportunities in this volatile market' },
    { id: '3', title: 'Risk Control', description: 'Position protection', icon: <Shield className="w-5 h-5" />, category: 'exit' as const, prompt: 'How to protect positions during high volatility?' },
    { id: '4', title: 'Market Analysis', description: 'Current market state', icon: <BarChart3 className="w-5 h-5" />, category: 'general' as const, prompt: 'Analyze current market volatility and implications' }
  ],
  trending: [
    { id: '5', title: 'Momentum Trading', description: 'Ride the trend effectively', icon: <TrendingUp className="w-5 h-5" />, category: 'entry' as const, prompt: 'Find momentum trading opportunities in trending markets' },
    { id: '6', title: 'Trend Continuation', description: 'Identify continuation patterns', icon: <Target className="w-5 h-5" />, category: 'analysis' as const, prompt: 'Analyze trend continuation patterns and entry points' },
    { id: '7', title: 'Breakout Plays', description: 'Capture breakout moves', icon: <Star className="w-5 h-5" />, category: 'entry' as const, prompt: 'Identify potential breakout opportunities' },
    { id: '8', title: 'Profit Taking', description: 'Optimize exit timing', icon: <DollarSign className="w-5 h-5" />, category: 'exit' as const, prompt: 'When should I take profits in this trending market?' }
  ],
  consolidation: [
    { id: '9', title: 'Range Trading', description: 'Profit from consolidation', icon: <BarChart3 className="w-5 h-5" />, category: 'entry' as const, prompt: 'Show me range trading strategies for consolidating markets' },
    { id: '10', title: 'Breakout Setup', description: 'Prepare for range breaks', icon: <Target className="w-5 h-5" />, category: 'analysis' as const, prompt: 'Analyze potential breakout setups from current consolidation' },
    { id: '11', title: 'Support/Resistance', description: 'Key levels analysis', icon: <Brain className="w-5 h-5" />, category: 'analysis' as const, prompt: 'Identify key support and resistance levels' },
    { id: '12', title: 'Patience Strategy', description: 'Wait for clear signals', icon: <Clock className="w-5 h-5" />, category: 'general' as const, prompt: 'Best practices for trading in consolidating markets' }
  ]
};

interface ProfessionalAIChatProps {
  userAddress?: string;
  isConnected?: boolean;
  accountBalance?: number;
  className?: string;
  selectedTradingPair?: string;
  currentPrice?: number;
  onPlanExecute?: (plan: any) => Promise<void>;
  onPlanBookmark?: (planId: string) => void;
  onPlanShare?: (plan: any) => void;
}

const ProfessionalAIChat: React.FC<ProfessionalAIChatProps> = ({
  userAddress,
  isConnected = false,
  accountBalance = 0,
  className = '',
  selectedTradingPair = 'BTC/USDT',
  currentPrice = 67000,
  onPlanExecute,
  onPlanBookmark,
  onPlanShare
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Welcome to RiverBit AI Trading Intelligence! I'm your professional trading assistant specializing in ${selectedTradingPair} analysis. I'm connected to real-time market data and ready to provide expert insights.`,
      timestamp: new Date(),
      category: 'general'
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [marketContext, setMarketContext] = useState<'volatile' | 'trending' | 'consolidation'>('trending');
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [savedPlans, setSavedPlans] = useState<Set<string>>(new Set());
  const [typingText, setTypingText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing effect utility
  const typeMessage = async (text: string, callback: (fullMessage: ChatMessage) => void, tradingPlan?: TradingPlan) => {
    setIsTyping(true);
    setTypingText('');
    
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setTypingText(currentText);
      
      // Realistic typing speed with variation
      const delay = Math.random() * 80 + 30; // 30-110ms per word
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Create final message
    const finalMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: text,
      timestamp: new Date(),
      tradingPlan,
      category: tradingPlan ? 'analysis' : 'general'
    };
    
    setIsTyping(false);
    setTypingText('');
    callback(finalMessage);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsProcessing(true);

    // Simulate AI processing with context-aware responses
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate contextual response based on input and current market data
    const isAboutTradingPlan = currentInput.toLowerCase().includes('trade') || 
                              currentInput.toLowerCase().includes('buy') || 
                              currentInput.toLowerCase().includes('sell') ||
                              currentInput.toLowerCase().includes('strategy');

    if (isAboutTradingPlan) {
      const responseText = `Analyzing ${selectedTradingPair} at current price $${currentPrice.toLocaleString()}. Based on technical indicators and market momentum, here's my professional assessment:`;
      
      const mockTradingPlan: TradingPlan = {
        symbol: selectedTradingPair,
        signal: Math.random() > 0.5 ? 'long' : 'short',
        confidence: Math.floor(Math.random() * 20) + 75, // 75-95%
        entryPrice: currentPrice + (Math.random() - 0.5) * (currentPrice * 0.02),
        stopLoss: currentPrice - (Math.random() * currentPrice * 0.03),
        takeProfit: currentPrice + (Math.random() * currentPrice * 0.05),
        riskReward: Math.random() * 2 + 1.5, // 1.5-3.5
        positionSize: isConnected ? Math.random() * 0.1 + 0.05 : 0.1,
        reasoning: `Strong technical setup on ${selectedTradingPair} with confluence of indicators. Current market structure suggests ${Math.random() > 0.5 ? 'bullish' : 'bearish'} momentum.`,
        timeframe: ['1H', '4H', '1D'][Math.floor(Math.random() * 3)],
        marketContext: `${selectedTradingPair} showing ${Math.random() > 0.5 ? 'strength' : 'consolidation'} with good volume profile`
      };

      await typeMessage(responseText, (message) => {
        setMessages(prev => [...prev, message]);
        setIsProcessing(false);
        
        // Execute plan callback if provided
        if (onPlanExecute && message.tradingPlan) {
          // Auto-suggest plan execution after a delay
          setTimeout(() => {
            // Could trigger auto-suggestion UI here
          }, 2000);
        }
      }, mockTradingPlan);
    } else {
      // General market analysis response
      const responses = [
        `The ${selectedTradingPair} market is currently showing interesting dynamics. Price action at $${currentPrice.toLocaleString()} suggests several key levels to watch.`,
        `Based on current market structure, ${selectedTradingPair} is exhibiting classic patterns that professional traders monitor closely.`,
        `Market analysis for ${selectedTradingPair}: Current price levels offer both opportunities and risks that require careful consideration.`,
        `Technical analysis indicates ${selectedTradingPair} is at a critical juncture. Let me break down the key factors affecting price action.`
      ];
      
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      
      await typeMessage(responseText, (message) => {
        setMessages(prev => [...prev, message]);
        setIsProcessing(false);
      });
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInputValue(action.prompt);
    inputRef.current?.focus();
  };

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    // Voice recording implementation would go here
  };

  const togglePlanExpansion = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const togglePlanSaved = (planId: string) => {
    const newSaved = new Set(savedPlans);
    if (newSaved.has(planId)) {
      newSaved.delete(planId);
    } else {
      newSaved.add(planId);
    }
    setSavedPlans(newSaved);
  };

  const renderTradingPlan = (plan: TradingPlan, messageId: string) => {
    const isExpanded = expandedPlans.has(messageId);
    const isSaved = savedPlans.has(messageId);

    return (
      <div className="ai-trading-plan-container">
        <div className="ai-plan-header">
          <div className="ai-plan-title-section">
            <div className={`ai-plan-signal-indicator ${plan.signal === 'long' ? 'ai-signal-long' : 'ai-signal-short'}`}>
              {plan.signal.toUpperCase()}
            </div>
            <h4 className="ai-plan-symbol">{plan.symbol}</h4>
          </div>
          <div className="ai-plan-confidence">
            {plan.confidence}% Confidence
          </div>
        </div>

        <div className="ai-plan-metrics">
          <div className="ai-plan-metric ai-metric-entry">
            <div className="ai-metric-label">Entry</div>
            <div className="ai-metric-value">${plan.entryPrice.toLocaleString()}</div>
          </div>
          <div className="ai-plan-metric ai-metric-stop">
            <div className="ai-metric-label">Stop Loss</div>
            <div className="ai-metric-value">${plan.stopLoss.toLocaleString()}</div>
          </div>
          <div className="ai-plan-metric ai-metric-target">
            <div className="ai-metric-label">Take Profit</div>
            <div className="ai-metric-value">${plan.takeProfit.toLocaleString()}</div>
          </div>
          <div className="ai-plan-metric">
            <div className="ai-metric-label">Risk/Reward</div>
            <div className="ai-metric-value">1:{plan.riskReward}</div>
          </div>
        </div>

        {isExpanded && (
          <div className="ai-plan-details" style={{ padding: '20px', background: 'var(--river-glass-subtle)', borderTop: '1px solid var(--river-glass-border)' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--river-text-muted)', marginBottom: '4px' }}>Position Size</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--river-text-primary)' }}>{plan.positionSize} BTC</div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--river-text-muted)', marginBottom: '4px' }}>Timeframe</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--river-text-primary)' }}>{plan.timeframe}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--river-text-muted)', marginBottom: '4px' }}>Analysis</div>
              <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--river-text-secondary)' }}>{plan.reasoning}</div>
            </div>
          </div>
        )}

        <div className="ai-plan-actions">
          <button className="ai-plan-btn-primary">
            <Play className="w-4 h-4" />
            Execute Trade
          </button>
          <button 
            className="ai-plan-btn-secondary"
            onClick={() => togglePlanExpansion(messageId)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isExpanded ? 'Less' : 'Details'}
          </button>
          <button 
            className="ai-plan-btn-secondary"
            onClick={() => togglePlanSaved(messageId)}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button className="ai-plan-btn-secondary">
            <Share className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';

    return (
      <div className={`ai-message-item ${isUser ? 'ai-message-user' : ''}`} key={message.id}>
        <div className="ai-message-container">
          <div className={`ai-message-avatar ${isUser ? 'ai-avatar-user' : 'ai-avatar-assistant'}`}>
            {isUser ? (
              <Users className="w-5 h-5 text-white" />
            ) : (
              <Brain className="w-5 h-5 text-white" />
            )}
          </div>
          
          <div className="ai-message-content">
            <div className="ai-message-bubble">
              <div className="ai-message-text">{message.content}</div>
              {message.tradingPlan && renderTradingPlan(message.tradingPlan, message.id)}
            </div>
            
            <div className="ai-message-metadata">
              <Clock className="w-3 h-3" />
              <span>{message.timestamp.toLocaleTimeString()}</span>
              {message.category && (
                <span className={`ai-category-${message.category}`}>•</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentPrompts = CONTEXT_PROMPTS[marketContext];

  return (
    <div className={`ai-trading-professional enhanced ${isFullscreen ? 'fullscreen' : ''} ${className}`}>
      {/* Professional Header */}
      <div className="ai-trading-header">
        <div className="ai-header-brand">
          <div className="ai-brand-icon">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="ai-brand-text">
            <h1 className="ai-brand-title">RiverBit AI</h1>
            <p className="ai-brand-subtitle">Trading Intelligence</p>
          </div>
        </div>
        
        <div className="ai-header-status">
          <div className="ai-status-indicator ai-status-online">
            <div className="ai-status-dot"></div>
            <span>Connected</span>
          </div>
          <div className="ai-status-indicator">
            <Brain className="w-4 h-4" />
            <span>GPT-4</span>
          </div>
        </div>
      </div>

      {/* Smart Quick Actions */}
      <div className="ai-quick-actions-container">
        <div className="ai-quick-actions-grid">
          {currentPrompts.map((action) => (
            <div
              key={action.id}
              className="ai-quick-action-card"
              onClick={() => handleQuickAction(action)}
            >
              <div className="ai-quick-action-header">
                <div className="ai-quick-action-icon">
                  {action.icon}
                </div>
                <h3 className="ai-quick-action-title">{action.title}</h3>
              </div>
              <p className="ai-quick-action-description">{action.description}</p>
              <div className={`ai-quick-action-category ai-category-${action.category}`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Professional Message Flow */}
      <div className="ai-message-flow">
        {messages.map(renderMessage)}
        
        {(isProcessing || isTyping) && (
          <div className="ai-processing-indicator">
            <div className="ai-processing-avatar">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="ai-processing-content">
              {isTyping ? (
                <div className="ai-typing-container">
                  <div className="ai-typing-text">{typingText}<span className="ai-typing-cursor">|</span></div>
                </div>
              ) : (
                <>
                  <div className="ai-processing-dots">
                    <div className="ai-processing-dot"></div>
                    <div className="ai-processing-dot"></div>
                    <div className="ai-processing-dot"></div>
                  </div>
                  <p className="ai-processing-text">Analyzing market conditions...</p>
                </>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Input Area */}
      <div className="ai-input-container">
        <div className="ai-suggested-prompts">
          <div className="ai-suggested-prompt" onClick={() => setInputValue('Analyze BTC price action')}>
            Analyze BTC
          </div>
          <div className="ai-suggested-prompt" onClick={() => setInputValue('Show me ETH trading opportunities')}>
            ETH Opportunities
          </div>
          <div className="ai-suggested-prompt" onClick={() => setInputValue('Risk management strategies')}>
            Risk Management
          </div>
          <div className="ai-suggested-prompt" onClick={() => setInputValue('Portfolio optimization')}>
            Portfolio Tips
          </div>
        </div>

        <div className="ai-input-wrapper">
          <div className="ai-input-field-container">
            <textarea
              ref={inputRef}
              className="ai-input-field"
              placeholder="Ask about trading strategies, market analysis, or specific assets..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              style={{ resize: 'none' }}
            />
            <button
              className={`ai-voice-button ${isRecording ? 'recording' : ''}`}
              onClick={handleVoiceToggle}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          
          <button
            className="ai-send-button"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalAIChat;