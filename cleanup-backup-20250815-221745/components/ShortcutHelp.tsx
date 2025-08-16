import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { 
  Command, 
  Search, 
  Zap, 
  BarChart3, 
  Settings, 
  HelpCircle,
  Keyboard,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface ShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ open, onOpenChange }) => {
  const shortcuts = [
    {
      category: 'Navigation',
      icon: <BarChart3 className="w-4 h-4" />,
      items: [
        { keys: ['Ctrl', 'K'], description: 'Open market search', mac: ['⌘', 'K'] },
        { keys: ['Ctrl', 'Shift', 'H'], description: 'Show this help', mac: ['⌘', '⇧', 'H'] },
        { keys: ['Escape'], description: 'Close dialogs/menus' },
        { keys: ['Tab'], description: 'Navigate between elements' },
      ]
    },
    {
      category: 'Market Search',
      icon: <Search className="w-4 h-4" />,
      items: [
        { keys: ['↑', '↓'], description: 'Navigate results', symbols: [<ArrowUp key="up" />, <ArrowDown key="down" />] },
        { keys: ['Enter'], description: 'Select market' },
        { keys: ['Escape'], description: 'Close search' },
        { keys: ['Ctrl', 'A'], description: 'Select all filters', mac: ['⌘', 'A'] },
      ]
    },
    {
      category: 'Trading',
      icon: <Zap className="w-4 h-4" />,
      items: [
        { keys: ['B'], description: 'Quick buy/long' },
        { keys: ['S'], description: 'Quick sell/short' },
        { keys: ['Ctrl', '1'], description: 'Set 25% position size', mac: ['⌘', '1'] },
        { keys: ['Ctrl', '2'], description: 'Set 50% position size', mac: ['⌘', '2'] },
        { keys: ['Ctrl', '3'], description: 'Set 75% position size', mac: ['⌘', '3'] },
        { keys: ['Ctrl', '4'], description: 'Set 100% position size', mac: ['⌘', '4'] },
      ]
    },
    {
      category: 'General',
      icon: <Settings className="w-4 h-4" />,
      items: [
        { keys: ['F11'], description: 'Toggle fullscreen' },
        { keys: ['Ctrl', 'R'], description: 'Refresh page', mac: ['⌘', 'R'] },
        { keys: ['Ctrl', 'Shift', 'I'], description: 'Open DevTools', mac: ['⌘', '⌥', 'I'] },
        { keys: ['?'], description: 'Show help' },
      ]
    }
  ];

  // Detect if user is on Mac
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

  const KeyBadge: React.FC<{ keys: string[], mac?: string[], symbols?: React.ReactNode[] }> = ({ keys, mac, symbols }) => {
    const displayKeys = isMac && mac ? mac : keys;
    const displaySymbols = symbols;

    return (
      <div className="flex items-center space-x-1">
        {displaySymbols ? (
          displaySymbols.map((symbol, index) => (
            <Badge key={index} variant="outline" className="text-xs px-2 py-1 font-mono">
              {symbol}
            </Badge>
          ))
        ) : (
          displayKeys.map((key, index) => (
            <Badge key={index} variant="outline" className="text-xs px-2 py-1 font-mono">
              {key}
            </Badge>
          ))
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Keyboard Shortcuts</DialogTitle>
              <p className="text-sm text-muted-foreground">Speed up your trading with these shortcuts</p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-5 h-5 text-primary">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-base">{category.category}</h3>
              </div>
              
              <div className="space-y-3">
                {category.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <span className="text-sm text-gray-700">{item.description}</span>
                    <KeyBadge keys={item.keys} mac={item.mac} symbols={item.symbols} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Pro Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use Ctrl+K to quickly switch between trading pairs</li>
                <li>• Combine shortcuts for faster execution (e.g., Ctrl+K → type "BTC" → Enter)</li>
                <li>• Most shortcuts work globally across all pages</li>
                <li>• Press ? anywhere to see context-specific shortcuts</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-gray-300 font-medium">
            Shortcuts detected for {isMac ? 'macOS' : 'Windows/Linux'} • 
            <span className="ml-1">Press Escape to close</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShortcutHelp;