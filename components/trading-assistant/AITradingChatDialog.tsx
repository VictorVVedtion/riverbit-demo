import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Avatar } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
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

// Import existing components
import TradingAssistantChat from './TradingAssistantChat';
import { TradingPlan } from './types';

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
      className={`flex items-center justify-between p-4 border-b border-border/50 bg-surface-1/95 backdrop-blur-sm ${
        isPinned ? 'cursor-move' : ''
      }`}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-river-blue-main/20 via-river-blue-light/20 to-river-accent/20 border border-river-blue/30">
            <Brain className="h-5 w-5 text-river-blue-main animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-river-blue-main via-river-blue-light to-river-accent bg-clip-text text-transparent">
              RiverBit AI
            </h3>
            <p className="text-xs text-muted-foreground">
              {walletState?.isConnected ? 'Live Trading Assistant' : 'Demo Mode'}
            </p>
          </div>
        </div>
        
        {/* Trading Context Badge */}
        {tradingContext?.selectedPair && (
          <Badge variant="outline" className="gap-1 bg-surface-2/50 border-river-blue/30">
            <Activity className="h-3 w-3" />
            {tradingContext.selectedPair}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Control Buttons */}
        {allowFullscreen && !isFullscreen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleTogglePin}
            className={`h-8 w-8 p-0 transition-all duration-200 ${
              isPinned 
                ? 'bg-river-blue/20 text-river-blue border border-river-blue/30' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={isPinned ? "Unpin window" : "Pin window"}
          >
            <PinIcon className="h-4 w-4" />
          </Button>
        )}

        {isPinned && !isFullscreen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleMinimize}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title={isMinimized ? "Restore window" : "Minimize window"}
          >
            {isMinimized ? <Expand className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
        )}

        {allowFullscreen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleFullscreen}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={handleClose}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
          title="Close AI Assistant"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderChatContent = () => (
    <div className={`flex-1 flex flex-col min-h-0 ${isMinimized ? 'hidden' : ''}`}>
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
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0 border-border/50 bg-surface-0/95 backdrop-blur-xl">
          <div className="h-full flex flex-col">
            {renderChatHeader()}
            {renderChatContent()}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ========== PINNED FLOATING MODE ==========
  if (isPinned) {
    return (
      <div
        ref={dialogRef}
        className={`fixed z-50 w-96 bg-surface-1/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[600px]'
        }`}
        style={{
          left: chatPosition.x || '50%',
          top: chatPosition.y || '50%',
          transform: chatPosition.x ? 'none' : 'translate(-50%, -50%)',
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
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-[400px] sm:w-[500px] p-0 border-border/50 bg-surface-0/95 backdrop-blur-xl"
        >
          <div className="h-full flex flex-col">
            {renderChatHeader()}
            {renderChatContent()}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ========== MODAL MODE ==========
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 gap-0 border-border/50 bg-surface-0/95 backdrop-blur-xl">
        <div className="h-full flex flex-col">
          {renderChatHeader()}
          {renderChatContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AITradingChatDialog;