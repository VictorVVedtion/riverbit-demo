import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Mic, MicOff, X, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Badge } from '../ui/badge';

interface MobileOptimizedChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  isLoading?: boolean;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tradingPlan?: any;
}

export const MobileOptimizedChat: React.FC<MobileOptimizedChatProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  messages,
  isLoading
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 语音识别设置
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      setShowQuickActions(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
      }
    }
  };

  const quickActions = [
    { text: "Should I buy BTC?", icon: "📈" },
    { text: "Market analysis for ETH", icon: "🔍" },
    { text: "Exit strategy help", icon: "🎯" },
    { text: "Portfolio review", icon: "📊" }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] p-0 bg-slate-950 border-slate-700/50"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-gray-100">AI Trading Assistant</SheetTitle>
                <p className="text-xs text-gray-300 font-medium">Ask me anything about trading</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ChevronUp className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && showQuickActions && (
            <div className="space-y-4">
              {/* Welcome message */}
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Ready to help you trade smarter</h3>
                <p className="text-sm text-gray-300 font-medium">Ask me about market conditions, trading strategies, or get instant analysis</p>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <p className="text-xs text-gray-300 font-medium font-medium">Quick Questions:</p>
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full h-12 justify-start bg-slate-800/50 border-slate-600 text-gray-300 hover:bg-slate-700/50"
                    onClick={() => {
                      setInputValue(action.text);
                      setShowQuickActions(false);
                    }}
                  >
                    <span className="mr-3 text-lg">{action.icon}</span>
                    <span>{action.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 border border-slate-600 text-gray-100'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                
                {/* Trading plan card for assistant messages */}
                {message.tradingPlan && (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {message.tradingPlan.action.toUpperCase()} {message.tradingPlan.symbol}
                      </Badge>
                      <span className="text-xs text-gray-300 font-medium">
                        {message.tradingPlan.confidence}% confidence
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-300 font-medium">Entry:</span>
                        <span className="ml-1 font-semibold">${message.tradingPlan.entry}</span>
                      </div>
                      <div>
                        <span className="text-gray-300 font-medium">Target:</span>
                        <span className="ml-1 font-semibold text-green-400">${message.tradingPlan.target}</span>
                      </div>
                      <div>
                        <span className="text-gray-300 font-medium">Stop:</span>
                        <span className="ml-1 font-semibold text-red-400">${message.tradingPlan.stopLoss}</span>
                      </div>
                      <div>
                        <span className="text-gray-300 font-medium">R:R:</span>
                        <span className="ml-1 font-semibold">{message.tradingPlan.riskReward}</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3 bg-green-600 hover:bg-green-700">
                      Execute Plan
                    </Button>
                  </div>
                )}
                
                <p className="text-xs opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-600 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-sm text-gray-300 font-medium">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isRecording ? "Listening..." : "Ask about trading..."}
                className="pr-12 bg-slate-800 border-slate-600 text-gray-100 placeholder-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={isRecording}
              />
              
              {/* Voice button */}
              {recognitionRef.current && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`absolute right-1 top-1 w-8 h-8 p-0 ${
                    isRecording ? 'text-red-400 animate-pulse' : 'text-gray-300 font-medium'
                  }`}
                  onClick={handleVoiceToggle}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || isRecording}
              className="w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="mt-2 flex items-center justify-center text-xs text-red-400">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-2" />
              Recording... Tap mic to stop
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Floating Action Button for mobile
export const MobileAIFAB: React.FC<{
  onClick: () => void;
  hasNotifications?: boolean;
}> = ({ onClick, hasNotifications }) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <div className="relative">
        <Bot className="w-6 h-6 text-white" />
        
        {hasNotifications && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    </Button>
  );
};