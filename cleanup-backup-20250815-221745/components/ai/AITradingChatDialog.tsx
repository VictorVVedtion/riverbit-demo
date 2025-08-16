import React, { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, Brain, Send, Mic, MicOff, Settings, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import TradingAssistantChat from '../trading-assistant/TradingAssistantChat';

interface AITradingChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  userAddress?: string;
  isConnected?: boolean;
  currentSymbol?: string;
  currentPrice?: number;
  className?: string;
}

const AITradingChatDialog: React.FC<AITradingChatDialogProps> = ({
  isOpen,
  onClose,
  onMinimize,
  userAddress,
  isConnected = false,
  currentSymbol = 'BTC/USDT',
  currentPrice = 67000,
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // 处理语音输入
  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // TODO: 集成语音转文字功能
  };

  // 处理消息发送
  const handleSendMessage = () => {
    if (message.trim()) {
      // TODO: 发送消息到AI
      setMessage('');
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* AI对话框 */}
      <div
        ref={dialogRef}
        className={`
          fixed right-4 top-20 z-50 transition-all duration-300 ease-out
          ${isFullscreen 
            ? 'inset-4 top-20' 
            : isMinimized 
              ? 'w-80 h-16'
              : 'w-96 h-[calc(100vh-120px)] max-h-[600px]'
          }
          ${className}
        `}
      >
        <div className="h-full bg-slate-950/95 backdrop-blur-xl border border-purple-400/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
          
          {/* 对话框头部 */}
          <div className="flex items-center justify-between p-4 border-b border-purple-400/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">AI Trading Chat</h3>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-400/30 text-xs">
                    {isConnected ? 'Online' : 'Offline'}
                  </Badge>
                  <span className="text-xs text-gray-400">{currentSymbol}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 hover:bg-purple-400/20 rounded-lg transition-colors"
                title="最小化"
              >
                <Minimize2 className="w-3 h-3 text-gray-400" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-6 w-6 p-0 hover:bg-purple-400/20 rounded-lg transition-colors"
                title="全屏"
              >
                <Maximize2 className="w-3 h-3 text-gray-400" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-6 w-6 p-0 hover:bg-purple-400/20 rounded-lg transition-colors"
                title="关闭 (Esc)"
              >
                <X className="w-3 h-3 text-gray-400" />
              </Button>
            </div>
          </div>

          {/* 最小化状态 */}
          {isMinimized ? (
            <div 
              className="flex items-center justify-center h-full cursor-pointer hover:bg-purple-400/10"
              onClick={() => setIsMinimized(false)}
            >
              <div className="flex items-center space-x-2 text-purple-400">
                <Brain className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-medium">点击展开AI助手</span>
              </div>
            </div>
          ) : (
            <>
              {/* 聊天内容区域 */}
              <div className="flex-1 h-[calc(100%-120px)]">
                <TradingAssistantChat
                  userAddress={userAddress}
                  isConnected={isConnected}
                  accountBalance={125340.56}
                  className="h-full border-0 bg-transparent"
                  selectedTradingPair={currentSymbol}
                  currentPrice={currentPrice}
                  onPlanExecute={async (plan) => {
                    console.log('执行交易计划:', plan);
                  }}
                  onPlanBookmark={(planId) => {
                    console.log('收藏计划:', planId);
                  }}
                  onPlanShare={(plan) => {
                    console.log('分享计划:', plan);
                  }}
                />
              </div>

              {/* 输入区域 */}
              <div className="p-4 border-t border-purple-400/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`询问关于 ${currentSymbol} 的任何问题...`}
                      className="pr-12 bg-slate-800/50 border-purple-400/30 text-white placeholder-gray-400 focus:border-purple-400"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleVoiceInput}
                      className={`absolute right-1 top-1 h-6 w-6 p-0 transition-colors ${
                        isListening 
                          ? 'text-red-400 hover:text-red-300' 
                          : 'text-gray-400 hover:text-purple-400'
                      }`}
                      title="语音输入"
                    >
                      {isListening ? (
                        <MicOff className="w-3 h-3" />
                      ) : (
                        <Mic className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="h-8 w-8 p-0 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    title="发送 (Enter)"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* 快捷操作 */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {[
                    '市场分析',
                    '风险评估', 
                    '交易建议',
                    '技术指标'
                  ].map((action) => (
                    <Button
                      key={action}
                      variant="outline"
                      size="sm"
                      onClick={() => setMessage(action)}
                      className="h-6 text-xs bg-purple-900/20 border-purple-400/50 text-purple-300 hover:bg-purple-800/30"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AITradingChatDialog;