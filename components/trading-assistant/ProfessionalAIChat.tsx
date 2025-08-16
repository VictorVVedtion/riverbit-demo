import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Avatar } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Send,
  Bot,
  User,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  MessageSquare,
  Settings,
  BookmarkPlus,
  History,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Copy,
  Share2,
  MoreHorizontal,
  Mic,
  MicOff,
  RefreshCw,
  Activity,
  Lightbulb,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Shield,
  BarChart3,
  Brain,
  Waves,
  Droplets
} from 'lucide-react';

// Import trading assistant utilities
import { processNaturalLanguageQuery, type TradingQuery } from '../../utils/tradingAssistant/nlqProcessor';
import { strategyEngine } from '../../utils/tradingAssistant/strategyEngine';

// Import trading plan components
import { TradingPlan } from './types';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  query?: TradingQuery;
  tradingPlan?: TradingPlan;
  metadata?: {
    processingTime?: number;
    confidence?: number;
    symbol?: string;
    intent?: string;
  };
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
  category: 'analysis' | 'entry' | 'exit' | 'general';
  gradient: string;
}

export interface ProfessionalAIChatProps {
  userAddress?: string;
  isConnected: boolean;
  accountBalance?: number;
  className?: string;
  onPlanExecute?: (plan: TradingPlan) => Promise<void>;
  onPlanBookmark?: (planId: string) => void;
  onPlanShare?: (plan: TradingPlan) => void;
}

// ============================================================================
// QUICK ACTIONS CONFIGURATION
// ============================================================================

const PROFESSIONAL_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'market-pulse',
    label: 'Market Pulse',
    prompt: 'Give me the current market pulse and key levels to watch across major assets',
    icon: <Activity className="h-4 w-4" />,
    category: 'analysis',
    gradient: 'from-cyan-500 to-blue-500'
  },
  {
    id: 'btc-deep-dive',
    label: 'BTC Deep Analysis',
    prompt: 'Provide a comprehensive Bitcoin analysis with institutional flow insights',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'analysis',
    gradient: 'from-orange-500 to-amber-500'
  },
  {
    id: 'eth-strategy',
    label: 'ETH Strategy',
    prompt: 'Generate an optimal Ethereum trading strategy based on current DeFi metrics',
    icon: <Target className="h-4 w-4" />,
    category: 'entry',
    gradient: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'risk-matrix',
    label: 'Risk Matrix',
    prompt: 'Analyze my portfolio risk exposure and suggest optimization strategies',
    icon: <Shield className="h-4 w-4" />,
    category: 'general',
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'alpha-scanner',
    label: 'Alpha Scanner',
    prompt: 'Scan for emerging alpha opportunities across DeFi and traditional markets',
    icon: <Brain className="h-4 w-4" />,
    category: 'analysis',
    gradient: 'from-violet-500 to-purple-500'
  },
  {
    id: 'exit-optimizer',
    label: 'Exit Optimizer',
    prompt: 'Optimize my current positions with intelligent exit strategies and profit-taking',
    icon: <TrendingDown className="h-4 w-4" />,
    category: 'exit',
    gradient: 'from-rose-500 to-pink-500'
  }
];

// ============================================================================
// SUGGESTED PROMPTS
// ============================================================================

const PROFESSIONAL_PROMPTS = [
  "What's the optimal Bitcoin entry based on whale flows?",
  "Analyze Ethereum's Layer 2 impact on price action",
  "Generate a risk-parity portfolio strategy",
  "Scan for DeFi yield farming opportunities",
  "Provide sentiment analysis across social channels",
  "Optimize my position sizing for current volatility",
  "What are the key macro catalysts this week?",
  "Analyze correlation breakdowns in crypto markets"
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProfessionalAIChat: React.FC<ProfessionalAIChatProps> = ({
  userAddress,
  isConnected,
  accountBalance = 0,
  className = '',
  onPlanExecute,
  onPlanBookmark,
  onPlanShare
}) => {
  // ========== STATE MANAGEMENT ==========
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: `🌊 **Welcome to RiverBit Professional AI Trading Assistant**

I'm your institutional-grade AI trading companion, powered by real-time market intelligence and advanced quantitative analysis.

**🎯 Professional Capabilities:**
• **Market Intelligence** - Institutional order flow & whale movement analysis
• **Advanced Strategies** - Quantitative signal generation with risk-adjusted returns
• **Portfolio Optimization** - Dynamic position sizing & correlation analysis  
• **Alpha Discovery** - Cross-market opportunity identification
• **Risk Management** - Real-time exposure monitoring & drawdown protection

**⚡ Getting Started:**
• Request deep analysis: "Analyze BTC whale accumulation patterns"
• Generate strategies: "Create a risk-parity DeFi portfolio"  
• Optimize positions: "Rebalance my portfolio for current market regime"
• Discover alpha: "Find emerging narrative plays with strong fundamentals"

Ready to deploy professional-grade trading intelligence. What's your objective?`,
      timestamp: new Date()
    }
  ]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTab, setCurrentTab] = useState('chat');
  const [bookmarkedPlans, setBookmarkedPlans] = useState<TradingPlan[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // ========== EFFECTS ==========
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // ========== HELPER FUNCTIONS ==========

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // ========== MESSAGE PROCESSING ==========

  const processUserMessage = async (userInput: string): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'user',
        content: userInput,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);

      // Add typing indicator
      const typingMessage: ChatMessage = {
        id: 'typing',
        type: 'assistant',
        content: '🧠 Analyzing market data & generating professional insights...',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, typingMessage]);

      // Process with NLQ engine
      const tradingQuery = await processNaturalLanguageQuery(userInput);
      const processingTime = Date.now() - startTime;

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      // Generate trading plan if this is a trading-related query
      let tradingPlan: TradingPlan | null = null;
      if (tradingQuery.symbol && ['buy', 'entry', 'analyze'].includes(tradingQuery.intent)) {
        try {
          tradingPlan = await strategyEngine.generateTradingPlan(
            tradingQuery.symbol,
            accountBalance
          );
        } catch (error) {
          console.warn('Failed to generate trading plan:', error);
        }
      }

      // Generate assistant response
      const assistantContent = formatProfessionalResponse(tradingQuery, tradingPlan);

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        query: tradingQuery,
        tradingPlan: tradingPlan || undefined,
        metadata: {
          processingTime,
          confidence: tradingQuery.confidence === 'high' ? 95 : tradingQuery.confidence === 'medium' ? 80 : 65,
          symbol: tradingQuery.symbol || undefined,
          intent: tradingQuery.intent
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save to history
      setChatHistory(prev => [...prev, userMessage, assistantMessage]);

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      // Add error message
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: `⚠️ **Analysis Error Encountered**

I encountered an issue processing your request. This could be due to:

**🔍 Common Issues:**
• Market data feed temporarily unavailable
• Invalid asset symbol or identifier  
• Network connectivity disruption
• API rate limit exceeded

**💡 Suggested Actions:**
• Verify asset symbols (use BTC, ETH, SOL format)
• Try rephrasing your question with more context
• Check your internet connection
• Wait a moment and retry

**🆘 Quick Recovery:**
• Ask about major cryptocurrencies (BTC, ETH, SOL)
• Use specific, clear trading questions
• Request general market analysis instead

I'm ready to assist once the issue is resolved.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const formatProfessionalResponse = (query: TradingQuery, plan?: TradingPlan | null): string => {
    const lines: string[] = [];

    // Professional Header
    if (query.symbol) {
      lines.push(`📊 **${query.symbol} Professional Analysis**`);
      lines.push(`${'='.repeat(50)}`);
    } else {
      lines.push(`🎯 **Market Intelligence Report**`);
      lines.push(`${'='.repeat(50)}`);
    }
    lines.push('');

    // Market Data Section
    if (query.context.currentPrice && query.symbol) {
      lines.push(`💰 **Current Market Data**`);
      lines.push(`├─ Price: $${query.context.currentPrice.toLocaleString()}`);
      
      if (query.context.priceData?.change24h !== undefined) {
        const changeEmoji = query.context.priceData.change24h >= 0 ? '📈' : '📉';
        const direction = query.context.priceData.change24h >= 0 ? 'BULLISH' : 'BEARISH';
        lines.push(`├─ 24h Change: ${changeEmoji} ${query.context.priceData.change24h > 0 ? '+' : ''}${query.context.priceData.change24h.toFixed(2)}% (${direction})`);
      }
      
      lines.push(`└─ Market Status: ${query.context.marketStatus?.toUpperCase() || 'ACTIVE'}`);
      lines.push('');
    }

    // AI Intelligence Summary
    lines.push(`🧠 **AI Intelligence Matrix**`);
    lines.push(`├─ Intent Classification: ${query.intent.toUpperCase()}`);
    lines.push(`├─ Confidence Level: ${query.confidence.toUpperCase()} (${query.confidence === 'high' ? '95%' : query.confidence === 'medium' ? '80%' : '65%'})`);
    lines.push(`├─ Market Sentiment: ${query.sentiment?.toUpperCase() || 'NEUTRAL'}`);
    lines.push(`├─ Urgency Assessment: ${query.urgency.toUpperCase()}`);
    lines.push(`└─ Processing Time: ${Date.now() - query.timestamp}ms`);
    lines.push('');

    // Position Analysis
    if (query.context.hasPosition) {
      lines.push(`💼 **Current Position Analysis**`);
      if (query.context.positionSize) {
        lines.push(`├─ Position Size: ${query.context.positionSize}`);
      }
      if (query.context.positionPnL !== undefined) {
        const pnlEmoji = query.context.positionPnL >= 0 ? '💚' : '🔴';
        const pnlStatus = query.context.positionPnL >= 0 ? 'PROFITABLE' : 'UNDERWATER';
        lines.push(`└─ ${pnlEmoji} P&L: $${query.context.positionPnL.toLocaleString()} (${pnlStatus})`);
      }
      lines.push('');
    }

    // Trading Plan Section
    if (plan) {
      lines.push(`🎯 **Professional Trading Plan**`);
      lines.push(`├─ Strategy: ${plan.strategy}`);
      lines.push(`├─ Direction: ${plan.signal.direction.toUpperCase()} ${plan.signal.direction === 'long' ? '📈' : '📉'}`);
      lines.push(`├─ Entry Zone: $${plan.entry.price.toLocaleString()}`);
      lines.push(`├─ Stop Loss: $${plan.stopLoss.price.toLocaleString()}`);
      lines.push(`├─ Take Profit: $${plan.takeProfit.price.toLocaleString()}`);
      lines.push(`├─ Risk/Reward: 1:${plan.riskReward.toFixed(1)} ⭐`);
      lines.push(`├─ Confidence: ${plan.confidence.toFixed(1)}% 🎯`);
      lines.push(`├─ Timeframe: ${plan.timeframe}`);
      lines.push(`└─ Max Risk: ${((plan.stopLoss.price - plan.entry.price) / plan.entry.price * 100).toFixed(2)}%`);
      lines.push('');
    }

    // Actionable Intelligence
    if (query.suggestedActions.length > 0) {
      lines.push(`⚡ **Actionable Intelligence**`);
      query.suggestedActions.forEach((action, i) => {
        const prefix = i === query.suggestedActions.length - 1 ? '└─' : '├─';
        lines.push(`${prefix} ${action}`);
      });
      lines.push('');
    }

    // Risk Assessment Matrix
    if (query.riskFactors.length > 0) {
      lines.push(`🛡️ **Risk Assessment Matrix**`);
      query.riskFactors.forEach((risk, i) => {
        const prefix = i === query.riskFactors.length - 1 ? '└─' : '├─';
        lines.push(`${prefix} ⚠️ ${risk}`);
      });
      lines.push('');
    }

    // Professional Guidance
    lines.push(`📋 **Professional Execution Framework**`);
    
    switch (query.intent) {
      case 'buy':
      case 'entry':
        lines.push(`🎯 **Entry Protocol:**`);
        lines.push(`├─ Confirm signal confluence across multiple timeframes`);
        lines.push(`├─ Size position according to Kelly Criterion (1-2% account risk)`);
        lines.push(`├─ Set stop-loss immediately upon entry execution`);
        lines.push(`├─ Consider dollar-cost averaging for larger allocations`);
        lines.push(`└─ Monitor for entry confirmation or signal invalidation`);
        break;
        
      case 'sell':
      case 'exit':
        lines.push(`🚪 **Exit Protocol:**`);
        lines.push(`├─ Review original thesis and target achievement`);
        lines.push(`├─ Consider partial profit-taking at key resistance levels`);
        lines.push(`├─ Implement trailing stops to protect unrealized gains`);
        lines.push(`├─ Avoid emotional decision-making in volatile conditions`);
        lines.push(`└─ Document trade outcome for strategy refinement`);
        break;
        
      case 'analyze':
        lines.push(`📈 **Analysis Framework:**`);
        lines.push(`├─ Multi-timeframe confirmation analysis required`);
        lines.push(`├─ Volume profile and institutional flow verification`);
        lines.push(`├─ Cross-asset correlation and macro factor assessment`);
        lines.push(`├─ Sentiment analysis and positioning data review`);
        lines.push(`└─ Risk-adjusted return expectation calibration`);
        break;
        
      default:
        lines.push(`🎪 **General Guidance:**`);
        lines.push(`├─ Maintain disciplined risk management protocols`);
        lines.push(`├─ Focus on high-probability, asymmetric opportunities`);
        lines.push(`├─ Regular portfolio rebalancing and performance review`);
        lines.push(`└─ Continuous education and strategy refinement`);
    }

    lines.push('');
    lines.push(`🔔 **Next Steps & Recommendations**`);
    
    if (plan) {
      lines.push(`• Execute plan if market structure aligns with analysis`);
      lines.push(`• Adjust position sizing based on current volatility regime`);
      lines.push(`• Set alerts for key technical and fundamental levels`);
      lines.push(`• Monitor execution quality and slippage metrics`);
    } else {
      lines.push(`• Await higher-probability setup development`);
      lines.push(`• Continue monitoring for signal confluence`);
      lines.push(`• Consider alternative assets or strategies`);
      lines.push(`• Maintain position sizing discipline`);
    }

    lines.push('');
    lines.push(`⚡ **Performance Metrics**`);
    lines.push(`├─ Analysis Generation: ${Date.now() - query.timestamp}ms`);
    lines.push(`├─ Data Sources: Real-time market feeds`);
    lines.push(`└─ Confidence Calibration: ${query.confidence === 'high' ? 'High' : query.confidence === 'medium' ? 'Medium' : 'Conservative'}`);
    
    lines.push('');
    lines.push(`📜 **Professional Disclaimer**`);
    lines.push(`This analysis is generated by AI for educational and informational purposes. Past performance does not guarantee future results. Always conduct independent research and consider your risk tolerance before making investment decisions. Professional AI analysis should complement, not replace, human judgment and due diligence.`);

    return lines.join('\n');
  };

  // ========== EVENT HANDLERS ==========

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();
    setInput('');
    setIsProcessing(true);

    try {
      await processUserMessage(userInput);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (isProcessing) return;
    setInput(action.prompt);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSpeechToText = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([messages[0]]); // Keep welcome message
  };

  // ========== RENDER FUNCTIONS ==========

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <div key={message.id} className={`ai-message-container ${isUser ? 'ai-message-user' : ''}`}>
        {/* Avatar */}
        <div className={`ai-message-avatar ${isUser ? '' : 'ai-message-avatar-bot'}`}>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : isSystem ? (
            <Activity className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>

        {/* Message Content */}
        <div className="ai-message-content">
          <div className="ai-message-bubble">
            {/* Message text */}
            <div className="ai-message-text">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed overflow-hidden">
                {message.content}
              </pre>
            </div>

            {/* Trading Plan Card */}
            {message.tradingPlan && (
              <div className="ai-trading-plan-card">
                <div className="ai-plan-header">
                  <div className="ai-plan-title">
                    <Target className="h-5 w-5" />
                    <span className={message.tradingPlan.signal.direction === 'long' ? 'ai-plan-direction-long' : 'ai-plan-direction-short'}>
                      {message.tradingPlan.signal.direction.toUpperCase()} {message.tradingPlan.symbol}
                    </span>
                  </div>
                  <Badge className="ai-confidence-badge ai-confidence-high">
                    {message.tradingPlan.confidence.toFixed(1)}% Confidence
                  </Badge>
                </div>

                <div className="ai-plan-metrics">
                  <div className="ai-plan-metric ai-plan-metric-entry">
                    <div className="ai-plan-metric-label">Entry</div>
                    <div className="ai-plan-metric-value">${message.tradingPlan.entry.price.toLocaleString()}</div>
                  </div>
                  <div className="ai-plan-metric ai-plan-metric-stop">
                    <div className="ai-plan-metric-label">Stop Loss</div>
                    <div className="ai-plan-metric-value">${message.tradingPlan.stopLoss.price.toLocaleString()}</div>
                  </div>
                  <div className="ai-plan-metric ai-plan-metric-exit">
                    <div className="ai-plan-metric-label">Take Profit</div>
                    <div className="ai-plan-metric-value">${message.tradingPlan.takeProfit.price.toLocaleString()}</div>
                  </div>
                  <div className="ai-plan-metric">
                    <div className="ai-plan-metric-label">R:R Ratio</div>
                    <div className="ai-plan-metric-value">1:{message.tradingPlan.riskReward.toFixed(1)}</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {onPlanExecute && (
                    <Button 
                      onClick={() => onPlanExecute(message.tradingPlan!)}
                      className="ai-send-button flex-1"
                      size="sm"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Execute Plan
                    </Button>
                  )}
                  {onPlanBookmark && (
                    <Button 
                      onClick={() => onPlanBookmark(message.tradingPlan!.id)}
                      variant="outline"
                      size="sm"
                      className="glass-panel-secondary"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Message metadata */}
          <div className="ai-message-metadata">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(message.timestamp)}</span>
            
            {message.metadata?.confidence && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <Badge className={`ai-confidence-badge ${
                  message.metadata.confidence >= 90 ? 'ai-confidence-high' : 
                  message.metadata.confidence >= 75 ? 'ai-confidence-medium' : 
                  'ai-confidence-low'
                }`}>
                  {message.metadata.confidence}% confidence
                </Badge>
              </>
            )}
            
            {message.metadata?.symbol && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <Badge variant="outline" className="text-xs border-river-flow-400 text-river-flow-400">
                  {message.metadata.symbol}
                </Badge>
              </>
            )}

            {/* Message actions */}
            {!isUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-2 hover:bg-glass-secondary">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 glass-panel-secondary border-border-glass">
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Analysis
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Insights
                  </DropdownMenuItem>
                  {message.tradingPlan && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onPlanBookmark?.(message.tradingPlan!.id)}>
                        <BookmarkPlus className="h-4 w-4 mr-2" />
                        Save Plan
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderQuickActions = () => (
    <div className="ai-quick-actions">
      {PROFESSIONAL_QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => handleQuickAction(action)}
          disabled={isProcessing}
          className="ai-quick-action"
        >
          <div className={`ai-quick-action-icon bg-gradient-to-r ${action.gradient} text-white rounded-lg p-2`}>
            {action.icon}
          </div>
          <div>
            <div className="ai-quick-action-label">{action.label}</div>
            <div className="text-xs text-platinum-60 capitalize">{action.category}</div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderSuggestedPrompts = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {PROFESSIONAL_PROMPTS.slice(0, 4).map((prompt, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={() => setInput(prompt)}
          disabled={isProcessing}
          className="text-xs h-8 px-3 glass-panel-secondary border-border-glass hover:bg-glass-tertiary text-platinum-80"
        >
          {prompt}
        </Button>
      ))}
    </div>
  );

  // ========== MAIN RENDER ==========

  return (
    <div className={`ai-interface-container h-full flex flex-col ${className}`}>
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="h-full flex flex-col">
        <TabsList className="w-full grid grid-cols-3 glass-panel-primary border-border-river">
          <TabsTrigger value="chat" className="flex items-center gap-2 text-platinum-80 data-[state=active]:text-platinum-100 data-[state=active]:bg-river-flow-500/20">
            <MessageSquare className="h-4 w-4" />
            Intelligence Hub
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2 text-platinum-80 data-[state=active]:text-platinum-100 data-[state=active]:bg-river-flow-500/20">
            <Target className="h-4 w-4" />
            Strategy Vault
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 text-platinum-80 data-[state=active]:text-platinum-100 data-[state=active]:bg-river-flow-500/20">
            <History className="h-4 w-4" />
            Analysis Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
          <Card className="flex-1 flex flex-col glass-panel-primary border-border-glass">
            {/* Chat Header */}
            <CardHeader className="ai-chat-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="relative p-3 glass-panel-floating border-border-accent rounded-xl">
                      <Waves className="h-6 w-6 text-crystal-cyan-400" />
                      <div className="absolute inset-0 bg-gradient-to-r from-crystal-cyan-500/20 to-river-flow-400/20 rounded-xl animate-pulse"></div>
                    </div>
                    <div>
                      <h1 className="ai-chat-title">RiverBit AI Intelligence</h1>
                      <p className="text-sm text-platinum-60">
                        {isConnected ? 'Professional Trading Intelligence • Live Data' : 'Limited Mode • Connect Wallet for Full Features'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`ai-status-indicator ${isProcessing ? 'ai-status-processing' : 'ai-status-online'}`}>
                    <Activity className="h-3 w-3" />
                    {isProcessing ? 'Analyzing' : 'Ready'}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="glass-panel-secondary border-border-glass hover:bg-glass-tertiary">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-panel-secondary border-border-glass">
                      <DropdownMenuItem onClick={clearChat}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Clear Session
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Preferences
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            {/* Chat Messages */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full p-6">
                <div className="space-y-6">
                  {/* Quick Actions */}
                  {messages.length === 1 && renderQuickActions()}
                  
                  {/* Messages */}
                  {messages.map(renderMessage)}
                  
                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="ai-message-container">
                      <div className="ai-message-avatar ai-message-avatar-bot">
                        <Brain className="h-4 w-4" />
                      </div>
                      <div className="ai-message-content">
                        <div className="ai-message-bubble">
                          <div className="flex items-center gap-3">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-crystal-cyan-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-crystal-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-crystal-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-sm text-platinum-70">
                              Analyzing market data & generating professional insights...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Chat Input */}
            <div className="ai-input-container">
              {/* Suggested prompts (show when input is empty) */}
              {!input && messages.length > 1 && renderSuggestedPrompts()}
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="ai-input-wrapper">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask for professional trading intelligence... (e.g., 'Analyze BTC whale accumulation patterns')"
                      disabled={isProcessing}
                      className="ai-input-field pr-12 resize-none"
                      rows={1}
                      style={{
                        minHeight: '44px',
                        maxHeight: '120px',
                        overflow: 'auto'
                      }}
                    />
                    
                    {/* Voice input button */}
                    {recognitionRef.current && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleSpeechToText}
                        disabled={isProcessing}
                        className={`absolute right-3 top-3 h-7 w-7 p-0 glass-panel-tertiary border-border-glass ${isListening ? 'text-alert-red-400' : 'text-platinum-60'} hover:bg-glass-secondary`}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="ai-send-button"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline ml-2">
                      {isProcessing ? 'Analyzing' : 'Send'}
                    </span>
                  </Button>
                </div>

                {/* Connection status */}
                {!isConnected && (
                  <Alert className="glass-panel-secondary border-border-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-platinum-80">
                      Connect your wallet to access personalized portfolio analysis, trade execution, and advanced features.
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="flex-1 mt-0">
          <Card className="h-full glass-panel-primary border-border-glass">
            <CardHeader className="ai-chat-header">
              <h2 className="ai-chat-title">Strategy Vault</h2>
              <p className="text-sm text-platinum-60">Your saved trading strategies and plans</p>
            </CardHeader>
            <CardContent className="p-6">
              {bookmarkedPlans.length === 0 ? (
                <div className="text-center py-12 text-platinum-60">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No strategies saved yet</p>
                  <p className="text-sm">Bookmark trading plans from your conversations to build your strategy vault</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bookmarkedPlans.map((plan) => (
                    <div key={plan.id} className="ai-trading-plan-card">
                      {/* Plan content would go here */}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-0">
          <Card className="h-full glass-panel-primary border-border-glass">
            <CardHeader className="ai-chat-header">
              <h2 className="ai-chat-title">Analysis Log</h2>
              <p className="text-sm text-platinum-60">Your conversation history and analysis archive</p>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-full">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-12 text-platinum-60">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No analysis history yet</p>
                    <p className="text-sm">Your professional trading conversations will be archived here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {chatHistory.map(renderMessage)}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfessionalAIChat;