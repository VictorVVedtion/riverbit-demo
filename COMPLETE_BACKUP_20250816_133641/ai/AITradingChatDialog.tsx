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

  // Advanced keyboard shortcuts and accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Global shortcuts
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Alt + M: Toggle minimized state
      if (event.altKey && event.key === 'm') {
        event.preventDefault();
        setIsMinimized(!isMinimized);
        return;
      }

      // Alt + F: Toggle fullscreen
      if (event.altKey && event.key === 'f') {
        event.preventDefault();
        setIsFullscreen(!isFullscreen);
        return;
      }

      // Ctrl + Enter: Send message (when input is focused)
      if (event.ctrlKey && event.key === 'Enter' && message.trim()) {
        event.preventDefault();
        handleSendMessage();
        return;
      }

      // Quick action shortcuts (1-4)
      if (event.altKey && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        const actions = [
          `Analyze ${currentSymbol} market conditions and price action`,
          `Assess current risk levels for ${currentSymbol} trading`,
          `Suggest optimal trading strategy for ${currentSymbol}`,
          `Review technical indicators for ${currentSymbol}`
        ];
        const index = parseInt(event.key) - 1;
        if (actions[index]) {
          setMessage(actions[index]);
        }
        return;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus management for accessibility
    if (isOpen && !isMinimized && dialogRef.current) {
      // Set focus to dialog when opened
      const firstFocusable = dialogRef.current.querySelector(
        'button, input, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, message, currentSymbol, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* AI对话框 */}
      <div
        ref={dialogRef}
        className={`
          professional-ai-dialog-container
          ${isFullscreen ? 'ai-dialog-fullscreen' : ''}
          ${isMinimized ? 'ai-dialog-minimized' : 'ai-dialog-normal'}
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-dialog-title"
        aria-describedby="ai-dialog-description"
      >
        <div className="ai-dialog-glass-container">
          
          {/* Professional Dialog Header */}
          <div className="ai-dialog-header">
            <div className="ai-dialog-header-content">
              <div className="ai-dialog-brand">
                <div className="ai-dialog-brand-icon">
                  <Brain className="ai-dialog-brain-icon" />
                  <div className="ai-dialog-brand-pulse" />
                </div>
                <div className="ai-dialog-brand-info">
                  <h3 id="ai-dialog-title" className="ai-dialog-title">AI Trading Intelligence</h3>
                  <div id="ai-dialog-description" className="ai-dialog-status-row">
                    <div className={`ai-dialog-status-badge ${isConnected ? 'status-online' : 'status-offline'}`}>
                      <div className="status-indicator-dot" />
                      <span className="status-text">{isConnected ? 'Live Trading' : 'Demo Mode'}</span>
                    </div>
                    <div className="ai-dialog-pair-indicator">
                      <span className="pair-symbol">{currentSymbol}</span>
                      <span className="pair-price">${currentPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="ai-dialog-controls">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="ai-dialog-control-btn"
                  title="Minimize dialog"
                  aria-label="Minimize"
                >
                  <Minimize2 className="control-icon" />
                </button>
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="ai-dialog-control-btn"
                  title="Toggle fullscreen"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="control-icon" />
                </button>
                <button 
                  onClick={onClose}
                  className="ai-dialog-control-btn close-btn"
                  title="Close dialog (Esc)"
                  aria-label="Close"
                >
                  <X className="control-icon" />
                </button>
              </div>
            </div>
            
            {/* Neural Network Effect */}
            <div className="ai-dialog-neural-bg">
              <div className="neural-node" style={{ '--delay': '0s' }} />
              <div className="neural-node" style={{ '--delay': '1s' }} />
              <div className="neural-node" style={{ '--delay': '2s' }} />
            </div>
          </div>

          {/* Minimized State */}
          {isMinimized ? (
            <div 
              className="ai-dialog-minimized-content"
              onClick={() => setIsMinimized(false)}
            >
              <div className="ai-dialog-minimized-indicator">
                <Brain className="minimized-brain-icon" />
                <div className="minimized-pulse-ring" />
              </div>
              <div className="ai-dialog-minimized-text">
                <span className="minimized-title">AI Assistant</span>
                <span className="minimized-subtitle">Click to expand</span>
              </div>
              <div className="ai-dialog-minimized-status">
                <div className={`minimized-status-dot ${isConnected ? 'online' : 'offline'}`} />
              </div>
            </div>
          ) : (
            <>
              {/* Enhanced Chat Content Area */}
              <div className="ai-dialog-content">
                <TradingAssistantChat
                  userAddress={userAddress}
                  isConnected={isConnected}
                  accountBalance={125340.56}
                  className="ai-dialog-chat-container"
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

              {/* Professional Input Area */}
              <div className="ai-dialog-input-area">
                <div className="ai-dialog-input-container">
                  <div className="ai-dialog-input-field-wrapper">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Ask about ${currentSymbol} analysis, trading strategies, or market insights...`}
                      className="ai-dialog-input-field"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="ai-dialog-input-controls">
                      <button
                        onClick={handleVoiceInput}
                        className={`ai-dialog-voice-btn ${isListening ? 'recording' : ''}`}
                        title="Voice input"
                        aria-label="Voice input"
                      >
                        {isListening ? (
                          <MicOff className="voice-icon" />
                        ) : (
                          <Mic className="voice-icon" />
                        )}
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        className="ai-dialog-send-btn"
                        title="Send message (Enter)"
                        aria-label="Send"
                      >
                        <Send className="send-icon" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Quick Actions */}
                <div className="ai-dialog-quick-actions">
                  {[
                    { label: 'Market Analysis', icon: '📊', prompt: `Analyze ${currentSymbol} market conditions and price action` },
                    { label: 'Risk Assessment', icon: '⚖️', prompt: `Assess current risk levels for ${currentSymbol} trading` },
                    { label: 'Trading Strategy', icon: '🎯', prompt: `Suggest optimal trading strategy for ${currentSymbol}` },
                    { label: 'Technical Indicators', icon: '📈', prompt: `Review technical indicators for ${currentSymbol}` }
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => setMessage(action.prompt)}
                      className="ai-dialog-quick-action-btn"
                      title={action.label}
                    >
                      <span className="action-icon">{action.icon}</span>
                      <span className="action-label">{action.label}</span>
                    </button>
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