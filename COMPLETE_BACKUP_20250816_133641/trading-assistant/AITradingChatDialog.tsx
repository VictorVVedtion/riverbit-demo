'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  X,
  Maximize2,
  Minimize2,
  PinIcon,
  ExternalLink,
  Wallet,
  Shield,
  ArrowUpRight,
  Brain,
  Expand,
  SidebarClose,
  SidebarOpen
} from 'lucide-react';

// Import existing components and styles
import TradingAssistantChat from './TradingAssistantChat';
import { TradingPlan } from './types';
import '../../styles/ai-trading-professional.css';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AITradingChatDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Function to handle dialog open/close */
  onOpenChange: (open: boolean) => void;
  /** Display mode: 'sidebar' for side panel, 'modal' for dialog modal */
  mode?: 'sidebar' | 'modal';
  /** Whether to show fullscreen option */
  allowFullscreen?: boolean;
  /** Trading context data */
  tradingContext?: {
    selectedPair: string;
    currentPrice?: number;
    accountBalance?: number;
    positions?: any[];
  };
  /** Wallet connection state */
  walletState?: {
    isConnected: boolean;
    address?: string;
    chainId?: number;
  };
  /** Event handlers */
  onPlanExecute?: (plan: TradingPlan) => Promise<void>;
  onPlanBookmark?: (planId: string) => void;
  onPlanShare?: (plan: TradingPlan) => void;
  /** Custom styling */
  className?: string;
}

// ============================================================================
// AI TRADING CHAT DIALOG COMPONENT
// ============================================================================

const AITradingChatDialog: React.FC<AITradingChatDialogProps> = ({
  isOpen,
  onOpenChange,
  mode = 'sidebar',
  allowFullscreen = true,
  tradingContext,
  walletState,
  onPlanExecute,
  onPlanBookmark,
  onPlanShare,
  className = ''
}) => {
  // ========== STATE MANAGEMENT ==========
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // ========== DRAG AND DROP FUNCTIONALITY ==========
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPinned || !dragHandleRef.current) return;
    
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  }, [isPinned]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isPinned) return;
    
    setChatPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }, [isDragging, dragOffset, isPinned]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ========== EFFECTS ==========
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ========== EVENT HANDLERS ==========
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setIsPinned(false);
      setIsMinimized(false);
    }
  };

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
    if (!isPinned) {
      setIsMinimized(false);
    }
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setIsFullscreen(false);
    setIsPinned(false);
    setIsMinimized(false);
    onOpenChange(false);
  };

  // ========== RENDER FUNCTIONS ==========

  const renderChatHeader = () => (
    <div 
      ref={dragHandleRef}
      className={`ai-trading-header ${
        isPinned ? 'cursor-move' : ''
      }`}
      onMouseDown={handleMouseDown}
      style={{
        background: 'linear-gradient(135deg, var(--river-glass-elevated) 0%, var(--river-glass-base) 100%)',
        borderBottom: '1px solid var(--river-glass-border)',
        backdropFilter: 'blur(16px)'
      }}
    >
      <div className="ai-header-brand">
        <div className="ai-brand-icon">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="ai-brand-text">
          <h1 className="ai-brand-title">RiverBit AI</h1>
          <p className="ai-brand-subtitle">
            {walletState?.isConnected ? 'Live Trading Intelligence' : 'Demo Mode'}
          </p>
        </div>
        
        {/* Trading Context Status */}
        {tradingContext?.selectedPair && (
          <div className="ai-status-indicator" style={{
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--river-success)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <Activity className="w-4 h-4" />
            <span>{tradingContext.selectedPair}</span>
          </div>
        )}
      </div>

      <div className="ai-header-status">
        <div className="ai-status-indicator ai-status-online">
          <div className="ai-status-dot"></div>
          <span>Connected</span>
        </div>
        
        {/* Professional Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {allowFullscreen && !isFullscreen && (
            <button
              onClick={handleTogglePin}
              className="ai-control-button"
              style={{
                background: isPinned ? 'var(--river-brand-primary)' : 'var(--river-glass-base)',
                color: isPinned ? 'white' : 'var(--river-text-muted)',
                border: `1px solid ${isPinned ? 'var(--river-brand-primary)' : 'var(--river-glass-border)'}`,
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={isPinned ? "Unpin window" : "Pin window"}
            >
              <PinIcon className="w-4 h-4" />
            </button>
          )}

          {isPinned && !isFullscreen && (
            <button
              onClick={handleToggleMinimize}
              className="ai-control-button"
              style={{
                background: 'var(--river-glass-base)',
                color: 'var(--river-text-muted)',
                border: '1px solid var(--river-glass-border)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={isMinimized ? "Restore window" : "Minimize window"}
            >
              {isMinimized ? <Expand className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}

          {allowFullscreen && (
            <button
              onClick={handleToggleFullscreen}
              className="ai-control-button"
              style={{
                background: 'var(--river-glass-base)',
                color: 'var(--river-text-muted)',
                border: '1px solid var(--river-glass-border)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={handleClose}
            className="ai-control-button"
            style={{
              background: 'var(--river-glass-base)',
              color: 'var(--river-text-muted)',
              border: '1px solid var(--river-glass-border)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--river-danger)';
              e.currentTarget.style.borderColor = 'var(--river-danger)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--river-text-muted)';
              e.currentTarget.style.borderColor = 'var(--river-glass-border)';
            }}
            title="Close AI Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderChatContent = () => (
    <div 
      className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ease-in-out ${
        isMinimized ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        transform: isMinimized ? 'translateY(-10px)' : 'translateY(0)',
        display: isMinimized ? 'none' : 'flex'
      }}
    >
      <TradingAssistantChat
        userAddress={walletState?.address}
        isConnected={walletState?.isConnected || false}
        accountBalance={tradingContext?.accountBalance}
        onPlanExecute={onPlanExecute}
        onPlanBookmark={onPlanBookmark}
        onPlanShare={onPlanShare}
        className="h-full border-0 bg-transparent"
      />
    </div>
  );

  // ========== FULLSCREEN MODE ==========
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div 
          className="ai-trading-professional w-full max-w-7xl h-[90vh] transition-all duration-300 ease-out"
          style={{
            background: 'var(--river-glass-base)',
            backdropFilter: 'blur(24px) saturate(1.4) brightness(1.1)',
            border: '1px solid var(--river-glass-border)',
            borderRadius: '20px',
            overflow: 'hidden',
            transform: 'translateZ(0)',
            willChange: 'transform, backdrop-filter'
          }}
        >
          {renderChatHeader()}
          {renderChatContent()}
        </div>
      </div>
    );
  }

  // ========== PINNED FLOATING MODE ==========
  if (isPinned) {
    return (
      <div
        ref={dialogRef}
        className={`ai-trading-professional fixed z-50 w-96 transition-all duration-300 ease-out ${
          isMinimized ? 'h-16' : 'h-[600px]'
        }`}
        style={{
          left: chatPosition.x || '50%',
          top: chatPosition.y || '50%',
          transform: chatPosition.x ? 'none' : 'translate(-50%, -50%)',
          background: 'var(--river-glass-base)',
          backdropFilter: 'blur(24px) saturate(1.4) brightness(1.1)',
          border: '1px solid var(--river-glass-border)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 212, 255, 0.15)'
        }}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {renderChatHeader()}
          {renderChatContent()}
        </div>
      </div>
    );
  }

  // ========== SIDEBAR MODE ==========
  if (mode === 'sidebar') {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => onOpenChange(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          fixed top-0 right-0 z-50 h-full w-[400px] sm:w-[500px] 
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div 
            className="ai-trading-professional h-full"
            style={{
              background: 'var(--river-glass-base)',
              backdropFilter: 'blur(24px) saturate(1.4) brightness(1.1)',
              border: '1px solid var(--river-glass-border)',
              borderRight: 'none',
              borderTopRightRadius: '0',
              borderBottomRightRadius: '0',
              borderTopLeftRadius: '20px',
              borderBottomLeftRadius: '20px'
            }}
          >
            {renderChatHeader()}
            {renderChatContent()}
          </div>
        </div>
      </>
    );
  }

  // ========== MODAL MODE ==========
  return (
    <>
      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="ai-trading-professional w-full max-w-2xl h-[80vh] transition-all duration-300 ease-out"
            style={{
              background: 'var(--river-glass-base)',
              backdropFilter: 'blur(24px) saturate(1.4) brightness(1.1)',
              border: '1px solid var(--river-glass-border)',
              borderRadius: '20px',
              overflow: 'hidden',
              transform: 'translateZ(0)',
              willChange: 'transform, backdrop-filter',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 212, 255, 0.15)'
            }}
          >
            {renderChatHeader()}
            {renderChatContent()}
          </div>
        </div>
      )}
    </>
  );
};

export default AITradingChatDialog;