import React, { useEffect, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Keyboard,
  Zap,
  Target,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Maximize2,
  Volume2,
  VolumeX,
  Settings,
  HelpCircle,
  Command
} from 'lucide-react';

interface ShortcutAction {
  id: string;
  keys: string[];
  description: string;
  category: 'trading' | 'navigation' | 'interface' | 'global';
  action: () => void;
  enabled: boolean;
  context?: string; // Which page/context this shortcut is active
}

interface ProfessionalShortcutsProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onToggleOrderSide?: () => void;
  onQuickBuy?: () => void;
  onQuickSell?: () => void;
  onCancelOrders?: () => void;
  onClosePositions?: () => void;
  isWalletConnected: boolean;
  tradingFormRef?: React.RefObject<HTMLDivElement>;
}

const ProfessionalShortcuts: React.FC<ProfessionalShortcutsProps> = ({
  currentPage,
  onNavigate,
  onToggleOrderSide,
  onQuickBuy,
  onQuickSell,
  onCancelOrders,
  onClosePositions,
  isWalletConnected,
  tradingFormRef
}) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio feedback for actions
  const playFeedback = useCallback((type: 'success' | 'warning' | 'info') => {
    if (!audioEnabled) return;
    
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    const frequencies = {
      success: 800,
      warning: 400,
      info: 600
    };
    
    oscillator.frequency.setValueAtTime(frequencies[type], context.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  }, [audioEnabled]);

  // Define shortcuts
  const shortcuts: ShortcutAction[] = [
    // Trading shortcuts
    {
      id: 'toggle-order-side',
      keys: ['Space'],
      description: '切换做多/做空',
      category: 'trading',
      action: () => {
        if (onToggleOrderSide && currentPage === 'trading') {
          onToggleOrderSide();
          playFeedback('info');
          toast.success('已切换订单方向');
        }
      },
      enabled: isWalletConnected,
      context: 'trading'
    },
    {
      id: 'quick-buy',
      keys: ['Ctrl', 'B'],
      description: '快速买入',
      category: 'trading',
      action: () => {
        if (onQuickBuy && currentPage === 'trading' && isWalletConnected) {
          onQuickBuy();
          playFeedback('success');
          toast.success('执行快速买入');
        } else if (!isWalletConnected) {
          toast.warning('请先连接钱包');
        }
      },
      enabled: isWalletConnected,
      context: 'trading'
    },
    {
      id: 'quick-sell',
      keys: ['Ctrl', 'S'],
      description: '快速卖出',
      category: 'trading',
      action: () => {
        if (onQuickSell && currentPage === 'trading' && isWalletConnected) {
          onQuickSell();
          playFeedback('warning');
          toast.success('执行快速卖出');
        } else if (!isWalletConnected) {
          toast.warning('请先连接钱包');
        }
      },
      enabled: isWalletConnected,
      context: 'trading'
    },
    {
      id: 'cancel-orders',
      keys: ['Ctrl', 'X'],
      description: '取消所有订单',
      category: 'trading',
      action: () => {
        if (onCancelOrders && currentPage === 'trading' && isWalletConnected) {
          onCancelOrders();
          playFeedback('warning');
          toast.success('已取消所有订单');
        } else if (!isWalletConnected) {
          toast.warning('请先连接钱包');
        }
      },
      enabled: isWalletConnected,
      context: 'trading'
    },
    {
      id: 'close-positions',
      keys: ['Ctrl', 'Shift', 'X'],
      description: '平仓所有持仓',
      category: 'trading',
      action: () => {
        if (onClosePositions && currentPage === 'trading' && isWalletConnected) {
          onClosePositions();
          playFeedback('warning');
          toast.success('已平仓所有持仓');
        } else if (!isWalletConnected) {
          toast.warning('请先连接钱包');
        }
      },
      enabled: isWalletConnected,
      context: 'trading'
    },

    // Navigation shortcuts
    {
      id: 'goto-trading',
      keys: ['Ctrl', '1'],
      description: '跳转到交易页面',
      category: 'navigation',
      action: () => {
        onNavigate('trading');
        playFeedback('info');
      },
      enabled: true
    },
    {
      id: 'goto-riverpool',
      keys: ['Ctrl', '2'],
      description: '跳转到RiverPool',
      category: 'navigation',
      action: () => {
        onNavigate('riverpool');
        playFeedback('info');
      },
      enabled: true
    },
    {
      id: 'goto-assets',
      keys: ['Ctrl', '3'],
      description: '跳转到资产页面',
      category: 'navigation',
      action: () => {
        onNavigate('assets');
        playFeedback('info');
      },
      enabled: true
    },
    {
      id: 'goto-personal',
      keys: ['Ctrl', '4'],
      description: '跳转到个人中心',
      category: 'navigation',
      action: () => {
        onNavigate('personal');
        playFeedback('info');
      },
      enabled: true
    },

    // Interface shortcuts
    {
      id: 'toggle-fullscreen',
      keys: ['F11'],
      description: '切换全屏模式',
      category: 'interface',
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          document.exitFullscreen();
          setIsFullscreen(false);
        }
        playFeedback('info');
      },
      enabled: true
    },
    {
      id: 'focus-trading-form',
      keys: ['Ctrl', 'F'],
      description: '聚焦交易表单',
      category: 'interface',
      action: () => {
        if (currentPage === 'trading' && tradingFormRef?.current) {
          const firstInput = tradingFormRef.current.querySelector('input') as HTMLInputElement;
          if (firstInput) {
            firstInput.focus();
            playFeedback('info');
          }
        }
      },
      enabled: true,
      context: 'trading'
    },
    {
      id: 'refresh-data',
      keys: ['Ctrl', 'R'],
      description: '刷新数据',
      category: 'interface',
      action: () => {
        // Prevent default browser refresh
        window.location.reload();
      },
      enabled: true
    },

    // Global shortcuts
    {
      id: 'show-help',
      keys: ['?'],
      description: '显示快捷键帮助',
      category: 'global',
      action: () => {
        setShowHelp(true);
        playFeedback('info');
      },
      enabled: true
    },
    {
      id: 'toggle-audio',
      keys: ['Ctrl', 'M'],
      description: '切换音效',
      category: 'global',
      action: () => {
        setAudioEnabled(!audioEnabled);
        playFeedback('info');
        toast.success(audioEnabled ? '音效已关闭' : '音效已开启');
      },
      enabled: true
    }
  ];

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;
    
    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Allow only global shortcuts in input fields
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setShowHelp(true);
      }
      return;
    }

    // Check for matching shortcuts
    for (const shortcut of shortcuts) {
      if (!shortcut.enabled) continue;
      if (shortcut.context && shortcut.context !== currentPage) continue;

      const keys = shortcut.keys;
      let matches = true;

      // Check modifier keys
      if (keys.includes('Ctrl') && !event.ctrlKey) matches = false;
      if (keys.includes('Shift') && !event.shiftKey) matches = false;
      if (keys.includes('Alt') && !event.altKey) matches = false;
      if (keys.includes('Meta') && !event.metaKey) matches = false;

      // Check main key
      const mainKey = keys.find(key => !['Ctrl', 'Shift', 'Alt', 'Meta'].includes(key));
      if (mainKey && event.key !== mainKey && event.code !== `Key${mainKey}`) matches = false;

      if (matches) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [isEnabled, currentPage, shortcuts]);

  // Register keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutAction[]>);

  const categoryIcons = {
    trading: <Target className="w-4 h-4" />,
    navigation: <Command className="w-4 h-4" />,
    interface: <Settings className="w-4 h-4" />,
    global: <Keyboard className="w-4 h-4" />
  };

  const categoryNames = {
    trading: '交易快捷键',
    navigation: '导航快捷键',
    interface: '界面快捷键',
    global: '全局快捷键'
  };

  return (
    <>
      {/* Status indicator */}
      <div className="fixed top-4 right-4 z-30">
        <div className="flex items-center space-x-2">
          {isFullscreen && (
            <Badge variant="outline" className="bg-surface-1/90 backdrop-blur-sm">
              <Maximize2 className="w-3 h-3 mr-1" />
              全屏
            </Badge>
          )}
          
          <Badge 
            variant={isEnabled ? "default" : "secondary"} 
            className="bg-surface-1/90 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsEnabled(!isEnabled)}
          >
            <Zap className="w-3 h-3 mr-1" />
            快捷键 {isEnabled ? '开启' : '关闭'}
          </Badge>

          <Badge 
            variant="outline" 
            className="bg-surface-1/90 backdrop-blur-sm cursor-pointer"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? (
              <Volume2 className="w-3 h-3 mr-1" />
            ) : (
              <VolumeX className="w-3 h-3 mr-1" />
            )}
            音效
          </Badge>
        </div>
      </div>

      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Keyboard className="w-5 h-5" />
              <span>专业快捷键</span>
            </DialogTitle>
            <DialogDescription>
              提高交易效率的专业快捷键系统。适用于专业交易者和高频用户。
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-96">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    {categoryIcons[category as keyof typeof categoryIcons]}
                    <span>{categoryNames[category as keyof typeof categoryNames]}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryShortcuts.map(shortcut => (
                    <div key={shortcut.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{shortcut.description}</p>
                        {shortcut.context && (
                          <p className="text-xs text-secondary">
                            适用于: {shortcut.context}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {shortcut.keys.map((key, index) => (
                          <React.Fragment key={index}>
                            <Badge variant="outline" className="text-xs px-2 py-1">
                              {key}
                            </Badge>
                            {index < shortcut.keys.length - 1 && (
                              <span className="text-xs text-secondary">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEnabled(!isEnabled)}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {isEnabled ? '禁用快捷键' : '启用快捷键'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? (
                    <VolumeX className="w-4 h-4 mr-2" />
                  ) : (
                    <Volume2 className="w-4 h-4 mr-2" />
                  )}
                  {audioEnabled ? '关闭音效' : '开启音效'}
                </Button>
              </div>
              
              <Button onClick={() => setShowHelp(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfessionalShortcuts;