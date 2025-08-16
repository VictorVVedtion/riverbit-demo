import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
  ArrowRight
} from 'lucide-react';

// Import trading assistant utilities
import { processNaturalLanguageQuery, type TradingQuery } from '../../utils/tradingAssistant/nlqProcessor';
import { strategyEngine } from '../../utils/tradingAssistant/strategyEngine';
import { web3Manager } from '../../utils/web3Utils';

// Import trading plan components
import TradingPlanCard from './TradingPlanCard';
import { TradingPlan, TradingPlanCardProps } from './types';

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
}

export interface TradingAssistantChatProps {
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

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'btc-analysis',
    label: 'BTC Analysis',
    prompt: 'Give me a detailed analysis of Bitcoin right now',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'analysis'
  },
  {
    id: 'eth-entry',
    label: 'ETH Entry',
    prompt: 'Should I buy Ethereum? What are the best entry points?',
    icon: <Target className="h-4 w-4" />,
    category: 'entry'
  },
  {
    id: 'portfolio-review',
    label: 'Portfolio Review',
    prompt: 'Review my current positions and suggest optimizations',
    icon: <Activity className="h-4 w-4" />,
    category: 'analysis'
  },
  {
    id: 'market-sentiment',
    label: 'Market Sentiment',
    prompt: 'What is the current market sentiment and key levels to watch?',
    icon: <Sparkles className="h-4 w-4" />,
    category: 'general'
  },
  {
    id: 'risk-management',
    label: 'Risk Management',
    prompt: 'Help me optimize my risk management and position sizing',
    icon: <AlertTriangle className="h-4 w-4" />,
    category: 'general'
  },
  {
    id: 'exit-strategy',
    label: 'Exit Strategy',
    prompt: 'When should I exit my current positions? Give me an exit strategy',
    icon: <TrendingDown className="h-4 w-4" />,
    category: 'exit'
  }
];

// ============================================================================
// SUGGESTED PROMPTS
// ============================================================================

const SUGGESTED_PROMPTS = [
  "Should I buy BTC right now?",
  "How's ETH looking today?",
  "Give me a trading plan for SOL",
  "Exit strategy for my positions",
  "Analyze AAPL technical indicators",
  "Best entry point for Tesla?",
  "Risk assessment for my portfolio",
  "Market outlook for this week"
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TradingAssistantChat: React.FC<TradingAssistantChatProps> = ({
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
      content: `🚀 Welcome to RiverBit Trading Assistant!

I'm your AI-powered trading companion, ready to help you make informed decisions. Here's what I can do:

📊 **Market Analysis** - Real-time price analysis and technical indicators
🎯 **Trading Plans** - AI-generated strategies with entry/exit points  
⚡ **Risk Management** - Position sizing and risk assessment
🔍 **Portfolio Review** - Optimize your current positions

**Quick Start:**
• Ask about any crypto or stock (BTC, ETH, AAPL, TSLA)
• Request trading plans with specific risk levels
• Get real-time market insights and recommendations

Try asking: "Should I buy BTC?" or "Give me a trading plan for ETH"`,
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
  const inputRef = useRef<HTMLInputElement>(null);
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
        content: '💭 Analyzing your request...',
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
      const assistantContent = formatAdvancedAssistantResponse(tradingQuery, tradingPlan);

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        query: tradingQuery,
        tradingPlan: tradingPlan || undefined,
        metadata: {
          processingTime,
          confidence: tradingQuery.confidence === 'high' ? 90 : tradingQuery.confidence === 'medium' ? 70 : 50,
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
        content: `❌ I encountered an error processing your request. Please try again or rephrase your question.

**Common issues:**
• Network connectivity problems
• Invalid symbol or asset name
• Market data temporarily unavailable

**Tips:**
• Try asking about major cryptocurrencies (BTC, ETH, SOL)
• Use clear, specific questions
• Check your internet connection`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const formatAdvancedAssistantResponse = (query: TradingQuery, plan?: TradingPlan | null): string => {
    const lines: string[] = [];

    // Header
    if (query.symbol) {
      lines.push(`🎯 ${query.symbol} Trading Analysis`);
      lines.push(`═══════════════════════════════`);
    } else {
      lines.push(`📊 Market Analysis`);
      lines.push(`═══════════════════════════════`);
    }
    lines.push('');

    // Current market data
    if (query.context.currentPrice && query.symbol) {
      lines.push(`💰 **Current Price:** $${query.context.currentPrice.toLocaleString()}`);
      
      if (query.context.priceData?.change24h !== undefined) {
        const changeEmoji = query.context.priceData.change24h >= 0 ? '📈' : '📉';
        const changeColor = query.context.priceData.change24h >= 0 ? 'green' : 'red';
        lines.push(`${changeEmoji} **24h Change:** ${query.context.priceData.change24h > 0 ? '+' : ''}${query.context.priceData.change24h.toFixed(2)}%`);
      }
      
      lines.push(`🕐 **Market Status:** ${query.context.marketStatus}`);
      lines.push('');
    }

    // AI Analysis Summary
    lines.push(`🤖 **AI Analysis Summary**`);
    lines.push(`├─ Intent: ${query.intent.toUpperCase()}`);
    lines.push(`├─ Confidence: ${query.confidence.toUpperCase()}`);
    lines.push(`├─ Sentiment: ${query.sentiment}`);
    lines.push(`└─ Urgency: ${query.urgency.toUpperCase()}`);
    lines.push('');

    // Position context
    if (query.context.hasPosition) {
      lines.push(`💼 **Current Position**`);
      if (query.context.positionSize) {
        lines.push(`├─ Size: ${query.context.positionSize}`);
      }
      if (query.context.positionPnL !== undefined) {
        const pnlEmoji = query.context.positionPnL >= 0 ? '💚' : '❤️';
        lines.push(`└─ ${pnlEmoji} PnL: $${query.context.positionPnL.toLocaleString()}`);
      }
      lines.push('');
    }

    // Trading plan summary
    if (plan) {
      lines.push(`🎯 **AI-Generated Trading Plan**`);
      lines.push(`├─ Direction: ${plan.signal.direction.toUpperCase()}`);
      lines.push(`├─ Entry: $${plan.entry.price.toLocaleString()}`);
      lines.push(`├─ Stop Loss: $${plan.stopLoss.price.toLocaleString()}`);
      lines.push(`├─ Take Profit: $${plan.takeProfit.price.toLocaleString()}`);
      lines.push(`├─ Risk/Reward: 1:${plan.riskReward.toFixed(1)}`);
      lines.push(`└─ Confidence: ${plan.confidence.toFixed(1)}%`);
      lines.push('');
      lines.push(`📋 **Strategy:** ${plan.strategy}`);
      lines.push(`🔄 **Timeframe:** ${plan.timeframe}`);
      lines.push('');
    }

    // Actionable recommendations
    if (query.suggestedActions.length > 0) {
      lines.push(`💡 **Recommended Actions**`);
      query.suggestedActions.forEach((action, i) => {
        const prefix = i === query.suggestedActions.length - 1 ? '└─' : '├─';
        lines.push(`${prefix} ${action}`);
      });
      lines.push('');
    }

    // Risk assessment
    if (query.riskFactors.length > 0) {
      lines.push(`⚠️ **Risk Assessment**`);
      query.riskFactors.forEach((risk, i) => {
        const prefix = i === query.riskFactors.length - 1 ? '└─' : '├─';
        lines.push(`${prefix} ${risk}`);
      });
      lines.push('');
    }

    // Intent-specific guidance
    switch (query.intent) {
      case 'buy':
      case 'entry':
        lines.push(`🎯 **Entry Strategy Guidelines**`);
        lines.push(`├─ Wait for confirmation signals before entering`);
        lines.push(`├─ Use proper position sizing (1-2% account risk)`);
        lines.push(`├─ Set stop-loss orders immediately after entry`);
        lines.push(`└─ Consider dollar-cost averaging for large positions`);
        break;
        
      case 'sell':
      case 'exit':
        lines.push(`🚪 **Exit Strategy Guidelines**`);
        lines.push(`├─ Review your original trading plan and targets`);
        lines.push(`├─ Consider taking partial profits at key resistance`);
        lines.push(`├─ Use trailing stops to protect unrealized gains`);
        lines.push(`└─ Don't let emotions drive your exit decisions`);
        break;
        
      case 'analyze':
        lines.push(`📈 **Analysis Framework**`);
        lines.push(`├─ Review multiple timeframes for confirmation`);
        lines.push(`├─ Check volume patterns and momentum indicators`);
        lines.push(`├─ Consider broader market correlation and trends`);
        lines.push(`└─ Factor in fundamental news and market events`);
        break;
    }

    lines.push('');
    lines.push(`🔔 **Next Steps**`);
    
    if (plan) {
      lines.push(`• Review the generated trading plan carefully`);
      lines.push(`• Adjust position size based on your risk tolerance`);
      lines.push(`• Execute the plan if market conditions align`);
    } else {
      lines.push(`• Monitor the market for confirmation signals`);
      lines.push(`• Wait for better risk/reward opportunities`);
      lines.push(`• Consider asking for a specific trading plan`);
    }

    lines.push('');
    lines.push(`⚡ Generated in ${Date.now() - query.timestamp}ms`);
    lines.push(`🔍 **Disclaimer:** This is AI-generated analysis for educational purposes. Always conduct your own research and consider your risk tolerance before making investment decisions.`);

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

  const handlePlanExecute = async (plan: TradingPlan) => {
    if (!onPlanExecute) return;
    
    try {
      await onPlanExecute(plan);
      
      // Add success message
      const successMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'system',
        content: `✅ Trading plan executed successfully! Your ${plan.signal.direction} position for ${plan.symbol} has been opened.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Plan execution failed:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'system',
        content: `❌ Failed to execute trading plan. Please try again or execute manually through the trading interface.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handlePlanBookmark = (planId: string) => {
    onPlanBookmark?.(planId);
    // Add bookmark confirmation
    const bookmarkMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'system',
      content: `🔖 Trading plan bookmarked! You can find it in your saved plans.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, bookmarkMessage]);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const clearChat = () => {
    setMessages([messages[0]]); // Keep welcome message
  };

  // ========== RENDER FUNCTIONS ==========

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <div key={message.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}>
        {/* Avatar */}
        <Avatar className={`h-8 w-8 ${isUser ? 'order-2' : 'order-1'}`}>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : isSystem ? (
            <Activity className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </Avatar>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'order-1' : 'order-2'} max-w-[80%]`}>
          <div
            className={`
              p-4 rounded-2xl backdrop-blur-sm transition-all duration-200
              ${isUser 
                ? 'bg-primary/90 text-primary-foreground ml-auto' 
                : isSystem
                ? 'bg-accent/50 text-accent-foreground border border-border/50'
                : 'glass-card border border-border/30'
              }
            `}
          >
            {/* Message text */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed overflow-hidden">
                {message.content}
              </pre>
            </div>

            {/* Trading Plan Card */}
            {message.tradingPlan && (
              <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border/50">
                <TradingPlanCard
                  plan={message.tradingPlan}
                  onExecute={handlePlanExecute}
                  onBookmark={handlePlanBookmark}
                  onShare={onPlanShare}
                  compact={true}
                  className="bg-transparent border-0 shadow-none"
                />
              </div>
            )}
          </div>

          {/* Message metadata */}
          <div className={`flex items-center gap-2 mt-2 text-xs text-muted-foreground ${isUser ? 'justify-end' : 'justify-start'}`}>
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(message.timestamp)}</span>
            
            {message.metadata?.confidence && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <Badge variant="outline" className="text-xs">
                  {message.metadata.confidence}% confidence
                </Badge>
              </>
            )}
            
            {message.metadata?.symbol && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <Badge variant="outline" className="text-xs">
                  {message.metadata.symbol}
                </Badge>
              </>
            )}

            {/* Message actions */}
            {!isUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-2">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => handleCopyMessage(message.content)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Message
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Analysis
                  </DropdownMenuItem>
                  {message.tradingPlan && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handlePlanBookmark(message.tradingPlan!.id)}>
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => handleQuickAction(action)}
          disabled={isProcessing}
          className="glass-card hover:bg-primary/10 text-left justify-start h-auto p-3"
        >
          <div className="flex items-center gap-2 w-full">
            {action.icon}
            <span className="text-xs font-medium truncate">{action.label}</span>
          </div>
        </Button>
      ))}
    </div>
  );

  const renderSuggestedPrompts = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {SUGGESTED_PROMPTS.map((prompt, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={() => setInput(prompt)}
          disabled={isProcessing}
          className="text-xs h-8 px-3 border border-border/50 hover:bg-accent/50"
        >
          {prompt}
        </Button>
      ))}
    </div>
  );

  // ========== MAIN RENDER ==========

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="h-full flex flex-col">
        <TabsList className="w-full grid grid-cols-3 glass-nav">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
          <Card className="flex-1 flex flex-col glass-card">
            {/* Chat Header */}
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">RiverBit AI Trading Assistant</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {isConnected ? 'Connected • Real-time data' : 'Disconnected • Limited features'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={isProcessing ? "default" : "secondary"} className="gap-1">
                    <Activity className="h-3 w-3" />
                    {isProcessing ? 'Analyzing...' : 'Ready'}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={clearChat}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Clear Chat
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            {/* Chat Messages */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {/* Quick Actions */}
                  {messages.length === 1 && renderQuickActions()}
                  
                  {/* Messages */}
                  {messages.map(renderMessage)}
                  
                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="flex items-center gap-3 mb-6">
                      <Avatar className="h-8 w-8">
                        <Bot className="h-4 w-4" />
                      </Avatar>
                      <div className="flex-1">
                        <div className="glass-card p-4 rounded-2xl border border-border/30">
                          <div className="flex items-center gap-2">
                            <div className="loading-spinner h-4 w-4" />
                            <span className="text-sm text-muted-foreground">
                              Analyzing market data and generating insights...
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
            <div className="p-4 border-t border-border/50">
              {/* Suggested prompts (show when input is empty) */}
              {!input && messages.length > 1 && renderSuggestedPrompts()}
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me anything about trading... (e.g., 'Should I buy BTC?')"
                      disabled={isProcessing}
                      className="pr-12 input-modern"
                    />
                    
                    {/* Voice input button */}
                    {recognitionRef.current && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleSpeechToText}
                        disabled={isProcessing}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 ${isListening ? 'text-red-500' : ''}`}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="btn-modern px-6"
                  >
                    {isProcessing ? (
                      <div className="loading-spinner h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Connection status */}
                {!isConnected && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Connect your wallet for personalized trading insights and plan execution.
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="flex-1 mt-0">
          <Card className="h-full glass-card">
            <CardHeader>
              <CardTitle>Saved Trading Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {bookmarkedPlans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved trading plans yet</p>
                  <p className="text-sm">Bookmark plans from chat to see them here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bookmarkedPlans.map((plan) => (
                    <TradingPlanCard
                      key={plan.id}
                      plan={plan}
                      onExecute={handlePlanExecute}
                      onShare={onPlanShare}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-0">
          <Card className="h-full glass-card">
            <CardHeader>
              <CardTitle>Chat History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-full">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No chat history yet</p>
                    <p className="text-sm">Your conversations will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
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

export default TradingAssistantChat;