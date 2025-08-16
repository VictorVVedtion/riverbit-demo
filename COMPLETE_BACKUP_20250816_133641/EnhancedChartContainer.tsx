import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Settings, 
  Maximize2,
  Minimize2,
  Volume2,
  Activity,
  Eye,
  Layers,
  Crosshair,
  MoreHorizontal,
  Zap,
  Target,
  AlertTriangle,
  DollarSign,
  Clock,
  RefreshCw,
  FullScreen,
  PictureInPicture,
  Bookmark,
  Share2,
  Download,
  Camera,
  MousePointer
} from 'lucide-react';
import ReliableTradingView from './ReliableTradingView';
import '../styles/riverbit-colors.css';

interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingLevel {
  id: string;
  price: number;
  type: 'support' | 'resistance' | 'entry' | 'tp' | 'sl';
  label: string;
  color: string;
  isActive: boolean;
}

interface ChartIndicator {
  id: string;
  name: string;
  type: 'trend' | 'momentum' | 'volume' | 'volatility';
  enabled: boolean;
  settings: Record<string, any>;
}

interface EnhancedChartContainerProps {
  symbol: string;
  interval: string;
  theme?: 'light' | 'dark';
  onIntervalChange: (interval: string) => void;
  currentPrice: number;
  positions?: Array<{
    entryPrice: number;
    side: 'long' | 'short';
    size: number;
  }>;
  orders?: Array<{
    price: number;
    side: 'buy' | 'sell';
    type: string;
  }>;
  className?: string;
}

const EnhancedChartContainer: React.FC<EnhancedChartContainerProps> = ({
  symbol,
  interval,
  theme = 'dark',
  onIntervalChange,
  currentPrice,
  positions = [],
  orders = [],
  className = ''
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'crosshair' | 'line' | 'fib' | 'rect'>('crosshair');
  const [showOrderBook, setShowOrderBook] = useState(false);
  const [showDepth, setShowDepth] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['MA', 'Volume']);
  const [tradingLevels, setTradingLevels] = useState<TradingLevel[]>([]);
  const [chartStyle, setChartStyle] = useState<'candles' | 'line' | 'area' | 'bars'>('candles');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Available timeframes
  const timeframes = [
    { value: '1m', label: '1m', category: 'short' },
    { value: '5m', label: '5m', category: 'short' },
    { value: '15m', label: '15m', category: 'short' },
    { value: '30m', label: '30m', category: 'short' },
    { value: '1h', label: '1h', category: 'medium' },
    { value: '4h', label: '4h', category: 'medium' },
    { value: '12h', label: '12h', category: 'medium' },
    { value: '1d', label: '1D', category: 'long' },
    { value: '3d', label: '3D', category: 'long' },
    { value: '1w', label: '1W', category: 'long' },
    { value: '1M', label: '1M', category: 'long' }
  ];

  // Available indicators
  const availableIndicators: ChartIndicator[] = [
    { id: 'MA', name: 'Moving Average', type: 'trend', enabled: true, settings: { period: 20 } },
    { id: 'EMA', name: 'Exponential MA', type: 'trend', enabled: false, settings: { period: 12 } },
    { id: 'RSI', name: 'RSI', type: 'momentum', enabled: false, settings: { period: 14 } },
    { id: 'MACD', name: 'MACD', type: 'momentum', enabled: false, settings: { fast: 12, slow: 26, signal: 9 } },
    { id: 'BB', name: 'Bollinger Bands', type: 'volatility', enabled: false, settings: { period: 20, std: 2 } },
    { id: 'Volume', name: 'Volume', type: 'volume', enabled: true, settings: {} },
    { id: 'VWAP', name: 'VWAP', type: 'volume', enabled: false, settings: {} },
    { id: 'Stoch', name: 'Stochastic', type: 'momentum', enabled: false, settings: { k: 14, d: 3 } }
  ];

  // Chart settings based on timeframe
  const chartSettings = useMemo(() => {
    const isShortTerm = ['1m', '5m', '15m'].includes(interval);
    const isMediumTerm = ['30m', '1h', '4h'].includes(interval);
    
    return {
      showVolume: true,
      showWatermark: false,
      enableCrosshair: true,
      enableZoom: true,
      enablePan: true,
      enableDrawing: true,
      precision: isShortTerm ? 2 : isMediumTerm ? 1 : 0,
      gridColor: theme === 'dark' ? '#2a2a3a' : '#f0f0f0',
      textColor: theme === 'dark' ? '#ffffff' : '#000000'
    };
  }, [interval, theme]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'f':
            event.preventDefault();
            toggleFullscreen();
            break;
          case 's':
            event.preventDefault();
            // Save chart screenshot
            break;
          case 'r':
            event.preventDefault();
            // Refresh chart data
            break;
        }
      }
      
      // Drawing tool shortcuts
      switch (event.key) {
        case 'c':
          setSelectedTool('crosshair');
          break;
        case 'l':
          setSelectedTool('line');
          break;
        case 'f':
          if (!event.ctrlKey && !event.metaKey) {
            setSelectedTool('fib');
          }
          break;
        case 'r':
          if (!event.ctrlKey && !event.metaKey) {
            setSelectedTool('rect');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      // Trigger chart refresh
      console.log('Auto-refreshing chart data');
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval]);

  // Generate trading levels from positions and orders
  useEffect(() => {
    const levels: TradingLevel[] = [];
    
    // Add position entry levels
    positions.forEach((position, index) => {
      levels.push({
        id: `pos-${index}`,
        price: position.entryPrice,
        type: 'entry',
        label: `${position.side.toUpperCase()} Entry (${position.size})`,
        color: position.side === 'long' ? '#10b981' : '#ef4444',
        isActive: true
      });
    });
    
    // Add order levels
    orders.forEach((order, index) => {
      levels.push({
        id: `order-${index}`,
        price: order.price,
        type: order.side === 'buy' ? 'support' : 'resistance',
        label: `${order.type.toUpperCase()} ${order.side.toUpperCase()}`,
        color: order.side === 'buy' ? '#3b82f6' : '#f59e0b',
        isActive: true
      });
    });
    
    setTradingLevels(levels);
  }, [positions, orders]);

  return (
    <Card 
      ref={chartContainerRef}
      className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''} bg-gradient-to-br from-surface-1 to-surface-2 border border-default/30 shadow-professional`}
    >
      {/* Enhanced Chart Header */}
      <div className="flex items-center justify-between p-4 border-b border-default/30 bg-surface-2/50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-river-blue" />
            <h3 className="font-bold text-primary">{symbol}</h3>
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 bg-profit rounded-full mr-1 animate-pulse" />
              Real-time
            </Badge>
          </div>
          
          {/* Current Price Display */}
          <div className="hidden md:flex items-center space-x-3 bg-surface-1/50 px-3 py-1 rounded-lg">
            <span className="text-2xl font-black font-mono text-primary">
              ${currentPrice.toLocaleString()}
            </span>
            <Badge variant="outline" className="bg-profit/10 border-profit/30 text-profit">
              <TrendingUp className="w-3 h-3 mr-1" />
              +2.34%
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Chart Style Selector */}
          <Select value={chartStyle} onValueChange={(value) => setChartStyle(value as any)}>
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="candles">Candles</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="bars">Bars</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Indicator Toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowOverlays(!showOverlays)}
            className="h-8 px-2"
          >
            <Layers className="w-4 h-4" />
          </Button>
          
          {/* Drawing Tools */}
          <div className="flex bg-surface-3/60 rounded-lg p-0.5">
            {[
              { tool: 'crosshair', icon: MousePointer },
              { tool: 'line', icon: Activity },
              { tool: 'fib', icon: Target },
              { tool: 'rect', icon: BarChart3 }
            ].map(({ tool, icon: Icon }) => (
              <Button
                key={tool}
                size="sm"
                variant={selectedTool === tool ? 'default' : 'ghost'}
                onClick={() => setSelectedTool(tool as any)}
                className="h-6 w-6 p-0"
                title={tool}
              >
                <Icon className="w-3 h-3" />
              </Button>
            ))}
          </div>
          
          {/* Settings */}
          <Button size="sm" variant="outline" className="h-8 w-8 p-0">
            <Settings className="w-4 h-4" />
          </Button>
          
          {/* Fullscreen */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-default/20 bg-surface-1/30">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              size="sm"
              variant={interval === tf.value ? 'default' : 'ghost'}
              onClick={() => onIntervalChange(tf.value)}
              className={`h-7 px-2 text-xs font-medium transition-all ${
                interval === tf.value 
                  ? 'bg-river-blue text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface-2'
              }`}
            >
              {tf.label}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Auto-refresh toggle */}
          <div className="flex items-center space-x-1">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="scale-75"
            />
            <span className="text-xs text-secondary">Auto</span>
          </div>
          
          {/* Refresh interval */}
          {autoRefresh && (
            <Select 
              value={refreshInterval.toString()} 
              onValueChange={(value) => setRefreshInterval(parseInt(value))}
            >
              <SelectTrigger className="w-16 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1s</SelectItem>
                <SelectItem value="5000">5s</SelectItem>
                <SelectItem value="10000">10s</SelectItem>
                <SelectItem value="30000">30s</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {/* Manual refresh */}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Chart Container with Overlays */}
      <div className="relative flex-1 min-h-0">
        {/* TradingView Chart */}
        <div className="absolute inset-0">
          <ReliableTradingView
            symbol={symbol}
            interval={interval}
            theme={theme}
            width="100%"
            height="100%"
            {...chartSettings}
          />
        </div>
        
        {/* Real-time Data Overlay */}
        {showOverlays && (
          <div className="absolute top-4 left-4 z-20 space-y-2">
            {/* Price Action Info */}
            <div className="bg-surface-1/90 backdrop-blur-md rounded-lg p-3 border border-default/30 shadow-lg">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-secondary">O:</span>
                  <span className="font-mono font-bold ml-1 text-primary">${currentPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-secondary">H:</span>
                  <span className="font-mono font-bold ml-1 text-profit">${(currentPrice * 1.02).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-secondary">L:</span>
                  <span className="font-mono font-bold ml-1 text-loss">${(currentPrice * 0.98).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-secondary">C:</span>
                  <span className="font-mono font-bold ml-1 text-primary">${currentPrice.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-default/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">Volume:</span>
                  <span className="font-mono font-bold text-river-blue">2.34M</span>
                </div>
              </div>
            </div>
            
            {/* Trading Levels */}
            {tradingLevels.length > 0 && (
              <div className="bg-surface-1/90 backdrop-blur-md rounded-lg p-3 border border-default/30 shadow-lg max-h-32 overflow-y-auto">
                <div className="text-xs font-semibold text-secondary mb-2">Trading Levels</div>
                {tradingLevels.map((level) => (
                  <div key={level.id} className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center space-x-1">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: level.color }}
                      />
                      <span className="text-secondary">{level.label}</span>
                    </div>
                    <span className="font-mono font-bold" style={{ color: level.color }}>
                      ${level.price.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Chart Tools Overlay */}
        {showOverlays && (
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-surface-1/90 backdrop-blur-md rounded-lg p-2 border border-default/30 shadow-lg">
              <div className="text-xs font-semibold text-secondary mb-2">Chart Tools</div>
              <div className="grid grid-cols-2 gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                  <Camera className="w-3 h-3 mr-1" />
                  Screenshot
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                  <Share2 className="w-3 h-3 mr-1" />
                  Share
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                  <Bookmark className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Status Bar */}
        {showOverlays && (
          <div className="absolute bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-sm border-t border-default/30 px-4 py-2 z-20">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-profit rounded-full animate-pulse" />
                  <span className="text-secondary">Real-time data active</span>
                </div>
                <div className="text-secondary">
                  Last update: {new Date().toLocaleTimeString()}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-secondary">
                  Timeframe: <span className="font-mono text-primary">{interval}</span>
                </div>
                <div className="text-secondary">
                  Style: <span className="text-primary capitalize">{chartStyle}</span>
                </div>
                <div className="text-secondary">
                  Tool: <span className="text-primary capitalize">{selectedTool}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Indicators Panel */}
      {showOverlays && (
        <div className="border-t border-default/30 bg-surface-2/30 p-3">
          <Tabs defaultValue="indicators" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="indicators" className="text-xs">Indicators</TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs">Analysis</TabsTrigger>
            </TabsList>
            
            <TabsContent value="indicators" className="mt-2">
              <div className="grid grid-cols-4 gap-2">
                {availableIndicators.map((indicator) => (
                  <Button
                    key={indicator.id}
                    size="sm"
                    variant={activeIndicators.includes(indicator.id) ? 'default' : 'outline'}
                    onClick={() => {
                      if (activeIndicators.includes(indicator.id)) {
                        setActiveIndicators(prev => prev.filter(id => id !== indicator.id));
                      } else {
                        setActiveIndicators(prev => [...prev, indicator.id]);
                      }
                    }}
                    className="h-8 text-xs font-medium"
                  >
                    {indicator.id}
                  </Button>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="alerts" className="mt-2">
              <div className="text-center text-sm text-muted">
                Price alerts and notifications will appear here
              </div>
            </TabsContent>
            
            <TabsContent value="analysis" className="mt-2">
              <div className="text-center text-sm text-muted">
                Technical analysis summary will appear here
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Card>
  );
};

export default EnhancedChartContainer;