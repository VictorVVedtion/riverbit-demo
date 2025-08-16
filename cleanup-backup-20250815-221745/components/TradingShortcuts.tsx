import React, { useEffect, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { 
  Keyboard, 
  Command, 
  Zap, 
  Target, 
  Settings, 
  BookOpen,
  MousePointer,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  X,
  HelpCircle,
  Calculator,
  Eye,
  Layers,
  BarChart3,
  Activity,
  Clock,
  RefreshCw,
  Download,
  Share2,
  Bookmark,
  Volume2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import '../styles/riverbit-colors.css';

interface ShortcutAction {
  id: string;
  key: string;
  combination?: string[];
  description: string;
  category: 'trading' | 'navigation' | 'chart' | 'general';
  action: () => void;
  enabled: boolean;
}

interface TradingShortcutsProps {
  onPlaceOrder?: (side: 'buy' | 'sell', type: 'market' | 'limit') => void;
  onCancelAllOrders?: () => void;
  onCloseAllPositions?: () => void;
  onToggleChart?: () => void;
  onToggleOrderBook?: () => void;
  onRefreshData?: () => void;
  onQuickSize?: (percentage: number) => void;
  onQuickLeverage?: (leverage: number) => void;
  className?: string;
}

const TradingShortcuts: React.FC<TradingShortcutsProps> = ({
  onPlaceOrder,
  onCancelAllOrders,
  onCloseAllPositions,
  onToggleChart,
  onToggleOrderBook,
  onRefreshData,
  onQuickSize,
  onQuickLeverage,
  className = ''
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>({});
  const [quickCommandMode, setQuickCommandMode] = useState(false);
  const [commandInput, setCommandInput] = useState('');

  // Define all available shortcuts
  const shortcuts: ShortcutAction[] = [
    // Trading Shortcuts
    {
      id: 'quick-buy-market',
      key: 'B',
      description: 'Quick market buy',
      category: 'trading',
      action: () => onPlaceOrder?.('buy', 'market'),
      enabled: true
    },
    {
      id: 'quick-sell-market',
      key: 'S',
      description: 'Quick market sell',
      category: 'trading',
      action: () => onPlaceOrder?.('sell', 'market'),
      enabled: true
    },
    {
      id: 'quick-buy-limit',
      key: 'Shift+B',
      combination: ['Shift', 'B'],
      description: 'Quick limit buy',
      category: 'trading',
      action: () => onPlaceOrder?.('buy', 'limit'),
      enabled: true
    },
    {
      id: 'quick-sell-limit',
      key: 'Shift+S',
      combination: ['Shift', 'S'],
      description: 'Quick limit sell',
      category: 'trading',
      action: () => onPlaceOrder?.('sell', 'limit'),
      enabled: true
    },
    {
      id: 'cancel-all-orders',
      key: 'Ctrl+X',
      combination: ['Ctrl', 'X'],
      description: 'Cancel all orders',
      category: 'trading',
      action: () => onCancelAllOrders?.(),
      enabled: true
    },
    {
      id: 'close-all-positions',
      key: 'Ctrl+Shift+X',
      combination: ['Ctrl', 'Shift', 'X'],
      description: 'Close all positions',
      category: 'trading',
      action: () => onCloseAllPositions?.(),
      enabled: true
    },
    
    // Quick Size Shortcuts
    {
      id: 'size-25',
      key: '1',
      description: 'Set 25% size',
      category: 'trading',
      action: () => onQuickSize?.(25),
      enabled: true
    },
    {
      id: 'size-50',
      key: '2',
      description: 'Set 50% size',
      category: 'trading',
      action: () => onQuickSize?.(50),
      enabled: true
    },
    {
      id: 'size-75',
      key: '3',
      description: 'Set 75% size',
      category: 'trading',
      action: () => onQuickSize?.(75),
      enabled: true
    },
    {
      id: 'size-100',
      key: '4',
      description: 'Set 100% size',
      category: 'trading',
      action: () => onQuickSize?.(100),
      enabled: true
    },
    
    // Quick Leverage Shortcuts
    {
      id: 'leverage-5x',
      key: 'Ctrl+1',
      combination: ['Ctrl', '1'],
      description: 'Set 5x leverage',
      category: 'trading',
      action: () => onQuickLeverage?.(5),
      enabled: true
    },
    {
      id: 'leverage-10x',
      key: 'Ctrl+2',
      combination: ['Ctrl', '2'],
      description: 'Set 10x leverage',
      category: 'trading',
      action: () => onQuickLeverage?.(10),
      enabled: true
    },
    {
      id: 'leverage-25x',
      key: 'Ctrl+3',
      combination: ['Ctrl', '3'],
      description: 'Set 25x leverage',
      category: 'trading',
      action: () => onQuickLeverage?.(25),
      enabled: true
    },
    {
      id: 'leverage-50x',
      key: 'Ctrl+4',
      combination: ['Ctrl', '4'],
      description: 'Set 50x leverage',
      category: 'trading',
      action: () => onQuickLeverage?.(50),
      enabled: true
    },
    
    // Navigation Shortcuts
    {
      id: 'toggle-orderbook',
      key: 'O',
      description: 'Toggle order book',
      category: 'navigation',
      action: () => onToggleOrderBook?.(),
      enabled: true
    },
    {
      id: 'toggle-chart',
      key: 'C',
      description: 'Toggle chart',
      category: 'navigation',
      action: () => onToggleChart?.(),
      enabled: true
    },
    {
      id: 'refresh-data',
      key: 'F5',
      description: 'Refresh all data',
      category: 'general',
      action: () => onRefreshData?.(),
      enabled: true
    },
    {
      id: 'quick-command',
      key: 'Ctrl+K',
      combination: ['Ctrl', 'K'],
      description: 'Open quick command',
      category: 'general',
      action: () => setQuickCommandMode(true),
      enabled: true
    },
    {
      id: 'help-shortcuts',
      key: '?',
      description: 'Show shortcuts help',
      category: 'general',
      action: () => setShowShortcuts(true),
      enabled: true
    }
  ];

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!shortcutsEnabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }
    
    // Don't trigger shortcuts when quick command is open
    if (quickCommandMode) return;
    
    // Check for shortcuts
    const pressedKey = event.key;
    const hasCtrl = event.ctrlKey || event.metaKey;
    const hasShift = event.shiftKey;
    const hasAlt = event.altKey;
    
    for (const shortcut of shortcuts) {
      if (!shortcut.enabled) continue;
      
      let matches = false;
      
      if (shortcut.combination) {
        // Complex combination
        const combo = shortcut.combination;
        matches = true;
        
        if (combo.includes('Ctrl') && !hasCtrl) matches = false;
        if (combo.includes('Shift') && !hasShift) matches = false;
        if (combo.includes('Alt') && !hasAlt) matches = false;
        
        const keyInCombo = combo.find(k => !['Ctrl', 'Shift', 'Alt'].includes(k));
        if (keyInCombo && pressedKey.toLowerCase() !== keyInCombo.toLowerCase()) matches = false;
      } else {
        // Simple key
        matches = pressedKey.toLowerCase() === shortcut.key.toLowerCase() && 
                 !hasCtrl && !hasShift && !hasAlt;
      }
      
      if (matches) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcutsEnabled, quickCommandMode, shortcuts]);

  // Quick command handler
  const handleQuickCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase().trim();
    
    const quickCommands: Record<string, () => void> = {
      'buy': () => onPlaceOrder?.('buy', 'market'),
      'sell': () => onPlaceOrder?.('sell', 'market'),
      'buy limit': () => onPlaceOrder?.('buy', 'limit'),
      'sell limit': () => onPlaceOrder?.('sell', 'limit'),
      'cancel all': () => onCancelAllOrders?.(),
      'close all': () => onCloseAllPositions?.(),
      'refresh': () => onRefreshData?.(),
      'chart': () => onToggleChart?.(),
      'orderbook': () => onToggleOrderBook?.(),
      'help': () => setShowShortcuts(true)
    };
    
    if (quickCommands[cmd]) {
      quickCommands[cmd]();
      setQuickCommandMode(false);
      setCommandInput('');
    }
  }, [onPlaceOrder, onCancelAllOrders, onCloseAllPositions, onRefreshData, onToggleChart, onToggleOrderBook]);

  // Escape handler for quick command
  const handleQuickCommandKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setQuickCommandMode(false);
      setCommandInput('');
    } else if (event.key === 'Enter') {
      handleQuickCommand(commandInput);
    }
  }, [commandInput, handleQuickCommand]);

  // Setup keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Group shortcuts by category
  const shortcutsByCategory = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutAction[]>);

  const categoryIcons = {
    trading: TrendingUp,
    navigation: MousePointer,
    chart: BarChart3,
    general: Settings
  };

  const categoryLabels = {
    trading: 'Trading',
    navigation: 'Navigation', 
    chart: 'Chart',
    general: 'General'
  };

  return (
    <>
      {/* Quick Command Modal */}
      {quickCommandMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32">
          <Card className="w-full max-w-md mx-4 bg-surface-1 border border-default/30 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Command className="w-5 h-5 text-river-blue" />
                <span>Quick Command</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                autoFocus
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleQuickCommandKeyDown}
                placeholder="Type a command (buy, sell, cancel all, etc.)"
                className="h-12 text-lg bg-surface-2/80 border-default/50"
              />
              <div className="mt-3 text-xs text-slate-300 font-medium">
                <div className="grid grid-cols-2 gap-2">
                  <div>• buy, sell</div>
                  <div>• buy limit, sell limit</div>
                  <div>• cancel all</div>
                  <div>• close all</div>
                  <div>• refresh</div>
                  <div>• chart, orderbook</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shortcuts Help Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-surface-1">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center space-x-2">
              <Keyboard className="w-6 h-6 text-river-blue" />
              <span>Trading Shortcuts</span>
              <Badge variant="outline" className="ml-2">
                {shortcuts.filter(s => s.enabled).length} shortcuts
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="shortcuts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>
            
            <TabsContent value="shortcuts" className="space-y-6">
              {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => {
                const IconComponent = categoryIcons[category as keyof typeof categoryIcons];
                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                      <IconComponent className="w-5 h-5 text-river-blue" />
                      <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryShortcuts.map((shortcut) => (
                        <div 
                          key={shortcut.id} 
                          className="flex items-center justify-between p-3 bg-surface-2/50 rounded-lg border border-default/30"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-primary">{shortcut.description}</div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {shortcut.combination ? (
                              shortcut.combination.map((key, index) => (
                                <React.Fragment key={key}>
                                  {index > 0 && <span className="text-xs text-muted">+</span>}
                                  <Badge variant="outline" className="text-xs font-mono px-2 py-1">
                                    {key}
                                  </Badge>
                                </React.Fragment>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs font-mono px-2 py-1">
                                {shortcut.key}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-2/50 rounded-lg">
                <div>
                  <div className="font-medium">Enable Shortcuts</div>
                  <div className="text-sm text-secondary">Allow keyboard shortcuts for trading</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={shortcutsEnabled}
                  onChange={(e) => setShortcutsEnabled(e.target.checked)}
                  className="toggle"
                />
              </div>
              
              <div className="p-4 bg-surface-2/50 rounded-lg">
                <h4 className="font-medium mb-3">Custom Shortcuts</h4>
                <div className="text-sm text-secondary mb-3">
                  Customize keyboard shortcuts for frequently used actions
                </div>
                <div className="space-y-2">
                  {shortcuts.slice(0, 5).map((shortcut) => (
                    <div key={shortcut.id} className="flex items-center space-x-3">
                      <div className="flex-1 text-sm">{shortcut.description}</div>
                      <Input
                        placeholder={shortcut.key}
                        value={customShortcuts[shortcut.id] || ''}
                        onChange={(e) => setCustomShortcuts(prev => ({
                          ...prev,
                          [shortcut.id]: e.target.value
                        }))}
                        className="w-24 h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="help" className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <h3 className="text-lg font-semibold mb-3">Getting Started</h3>
                <p className="text-slate-300 font-medium mb-4">
                  Trading shortcuts help you execute trades faster and more efficiently. Here are some tips to get started:
                </p>
                
                <div className="space-y-4">
                  <div className="p-4 bg-surface-2/50 rounded-lg">
                    <h4 className="font-medium flex items-center space-x-2 mb-2">
                      <Zap className="w-4 h-4 text-river-blue" />
                      <span>Quick Trading</span>
                    </h4>
                    <ul className="text-sm text-slate-300 font-medium space-y-1">
                      <li>• Press <Badge variant="outline" className="text-xs mx-1">B</Badge> for quick market buy</li>
                      <li>• Press <Badge variant="outline" className="text-xs mx-1">S</Badge> for quick market sell</li>
                      <li>• Hold <Badge variant="outline" className="text-xs mx-1">Shift</Badge> for limit orders</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-surface-2/50 rounded-lg">
                    <h4 className="font-medium flex items-center space-x-2 mb-2">
                      <Calculator className="w-4 h-4 text-river-blue" />
                      <span>Quick Sizing</span>
                    </h4>
                    <ul className="text-sm text-slate-300 font-medium space-y-1">
                      <li>• Press <Badge variant="outline" className="text-xs mx-1">1-4</Badge> for 25%, 50%, 75%, 100% size</li>
                      <li>• Press <Badge variant="outline" className="text-xs mx-1">Ctrl+1-4</Badge> for leverage presets</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-surface-2/50 rounded-lg">
                    <h4 className="font-medium flex items-center space-x-2 mb-2">
                      <Command className="w-4 h-4 text-river-blue" />
                      <span>Quick Commands</span>
                    </h4>
                    <ul className="text-sm text-slate-300 font-medium space-y-1">
                      <li>• Press <Badge variant="outline" className="text-xs mx-1">Ctrl+K</Badge> to open quick command</li>
                      <li>• Type commands like "buy", "sell", "cancel all"</li>
                      <li>• Press <Badge variant="outline" className="text-xs mx-1">Enter</Badge> to execute</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Floating Shortcuts Indicator */}
      <div className="fixed bottom-6 left-6 z-40">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowShortcuts(true)}
          className="bg-gradient-to-r from-surface-1/90 to-surface-2/80 backdrop-blur-sm border-river-blue/40 text-white font-semibold hover:bg-gradient-to-r hover:from-surface-2/90 hover:to-surface-3/80 hover:border-river-blue/60 transition-all duration-200 shadow-lg hover:shadow-river-blue/20"
        >
          <Keyboard className="w-4 h-4 mr-2 text-river-blue" />
          <span className="hidden sm:inline">Shortcuts</span>
          <Badge variant="outline" className="ml-2 text-xs border-river-blue/50 text-river-blue font-bold">
            ?
          </Badge>
        </Button>
      </div>

      {/* Status Indicator */}
      {shortcutsEnabled && (
        <div className="fixed top-20 right-6 z-30">
          <Badge 
            variant="outline" 
            className="bg-gradient-to-r from-profit/10 to-profit/5 backdrop-blur-sm border-profit/40 text-profit font-bold shadow-lg shadow-profit/10"
          >
            <div className="w-2 h-2 bg-profit rounded-full mr-2 animate-pulse"></div>
            Shortcuts Active
          </Badge>
        </div>
      )}
    </>
  );
};

export default TradingShortcuts;