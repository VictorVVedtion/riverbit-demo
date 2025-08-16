import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { web3Manager, formatNumber, TransactionStatus, shortenAddress } from '../utils/web3Utils';
import { DEFAULT_PARAMS } from '../utils/contractConfig';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Loader, 
  AlertCircle,
  CheckCircle,
  Info,
  BarChart3,
  Activity,
  Zap,
  Eye,
  TrendingDown as TrendingDownIcon
} from 'lucide-react';

interface SOTATradingInterfaceProps {
  userAddress?: string;
  isConnected: boolean;
}

interface Position {
  symbol: string;
  size: number;
  notional: number;
  pnl: number;
  margin: number;
}

interface UserAccount {
  balance: number;
  totalMargin: number;
  availableMargin: number;
}

interface TransactionState {
  isLoading: boolean;
  hash: string | null;
  status: TransactionStatus;
  error: string | null;
}

const SOTATradingInterface: React.FC<SOTATradingInterfaceProps> = ({
  userAddress,
  isConnected
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [tradeSize, setTradeSize] = useState('');
  const [leverage, setLeverage] = useState('10');
  const [positions, setPositions] = useState<Position[]>([]);
  const [userAccount, setUserAccount] = useState<UserAccount>({
    balance: 0,
    totalMargin: 0,
    availableMargin: 0
  });
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>({});
  const [transaction, setTransaction] = useState<TransactionState>({
    isLoading: false,
    hash: null,
    status: TransactionStatus.PENDING,
    error: null
  });

  // Mock price changes for demo
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});

  // Existing functions (fetchUserAccount, fetchPositions, etc. - same as original)
  const fetchUserAccount = async () => {
    if (!isConnected || !userAddress) return;

    try {
      const accountInfo = await web3Manager.getAccountInfo(userAddress);
      setUserAccount({
        balance: accountInfo.balance,
        totalMargin: accountInfo.totalMargin,
        availableMargin: accountInfo.balance - accountInfo.totalMargin
      });
    } catch (error) {
      console.error('Failed to fetch user account:', error);
    }
  };

  const fetchPositions = async () => {
    if (!isConnected || !userAddress) return;

    try {
      const positionPromises = DEFAULT_PARAMS.supportedSymbols.map(async (symbol) => {
        const size = await web3Manager.getPosition(userAddress, symbol);
        const price = await web3Manager.getAssetPrice(symbol);
        
        if (size !== 0) {
          const notional = Math.abs(size) * price;
          const margin = notional / 10;
          const pnl = size * price * 0.01;
          
          return {
            symbol,
            size,
            notional,
            pnl,
            margin
          };
        }
        return null;
      });

      const results = await Promise.all(positionPromises);
      const validPositions = results.filter((p): p is Position => p !== null);
      setPositions(validPositions);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  };

  const fetchAssetPrices = async () => {
    try {
      const pricePromises = DEFAULT_PARAMS.supportedSymbols.map(async (symbol) => {
        const price = await web3Manager.getAssetPrice(symbol);
        return { symbol, price };
      });

      const results = await Promise.all(pricePromises);
      const priceMap: Record<string, number> = {};
      results.forEach(({ symbol, price }) => {
        priceMap[symbol] = price;
      });
      setAssetPrices(priceMap);
    } catch (error) {
      console.error('Failed to fetch asset prices:', error);
    }
  };

  const refreshData = async () => {
    await Promise.all([
      fetchUserAccount(),
      fetchPositions(),
      fetchAssetPrices()
    ]);
  };

  useEffect(() => {
    if (isConnected) {
      refreshData();
      const interval = setInterval(refreshData, 15000);
      return () => clearInterval(interval);
    }
  }, [isConnected, userAddress]);

  const openPosition = async (isLong: boolean) => {
    if (!tradeSize || isNaN(Number(tradeSize))) return;
    
    const size = Number(tradeSize);
    const leverageNum = Number(leverage);
    const finalSize = isLong ? size : -size;

    setTransaction({ isLoading: true, hash: null, status: TransactionStatus.PENDING, error: null });

    try {
      const tx = await web3Manager.openPosition(selectedSymbol, finalSize, leverageNum);
      setTransaction({ 
        isLoading: true, 
        hash: tx.hash, 
        status: TransactionStatus.PENDING, 
        error: null 
      });

      await tx.wait();
      setTransaction({ 
        isLoading: false, 
        hash: tx.hash, 
        status: TransactionStatus.SUCCESS, 
        error: null 
      });

      await refreshData();
      setTradeSize('');

    } catch (error: any) {
      setTransaction({ 
        isLoading: false, 
        hash: null, 
        status: TransactionStatus.FAILED, 
        error: error.message || 'Trade failed' 
      });
    }
  };

  const closePosition = async (position: Position) => {
    setTransaction({ isLoading: true, hash: null, status: TransactionStatus.PENDING, error: null });

    try {
      const tx = await web3Manager.closePosition(position.symbol, position.size);
      setTransaction({ 
        isLoading: true, 
        hash: tx.hash, 
        status: TransactionStatus.PENDING, 
        error: null 
      });

      await tx.wait();
      setTransaction({ 
        isLoading: false, 
        hash: tx.hash, 
        status: TransactionStatus.SUCCESS, 
        error: null 
      });

      await refreshData();

    } catch (error: any) {
      setTransaction({ 
        isLoading: false, 
        hash: null, 
        status: TransactionStatus.FAILED, 
        error: error.message || 'Close position failed' 
      });
    }
  };

  const calculateRequiredMargin = (): number => {
    if (!tradeSize || isNaN(Number(tradeSize)) || !assetPrices[selectedSymbol]) return 0;
    
    const size = Number(tradeSize);
    const price = assetPrices[selectedSymbol];
    const leverageNum = Number(leverage);
    
    return (size * price) / leverageNum;
  };

  const getMaxLeverage = (symbol: string): number => {
    return symbol.startsWith('x') ? DEFAULT_PARAMS.maxLeverage.xStock : DEFAULT_PARAMS.maxLeverage.crypto;
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Card className="w-full max-w-md glass-riverbit shadow-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-river-blue animate-pulse-subtle-enhanced" />
              Professional Trading
            </CardTitle>
            <CardDescription>
              Connect to access SOTA trading experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-river-blue-500/10 border-river-blue-400/30">
              <Info className="h-4 w-4 text-river-blue" />
              <AlertDescription className="text-river-blue font-medium">
                Please connect your wallet to access professional trading features
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-0 relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/2 via-transparent to-digital-green-500/2 animate-river-flow opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-precision-orange-500/1 via-transparent to-river-blue-500/1 animate-liquid-flow"></div>
      
      {/* SOTA Professional Header */}
      <div className="flex-shrink-0 border-b border-default/20 bg-surface-1/95 backdrop-blur-xl relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-river-blue-500/5 to-digital-green-500/5"></div>
        <div className="relative z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-river-blue animate-pulse-subtle-enhanced" />
              <h1 className="text-xl font-bold text-primary bg-gradient-to-r from-river-blue-400 to-digital-green-400 bg-clip-text text-transparent">
                RiverBit SOTA Trading
              </h1>
            </div>
            <Badge variant="outline" className="text-profit border-profit/50 bg-profit/10 shadow-glow-profit animate-pulse-subtle-enhanced">
              <div className="w-2 h-2 bg-profit rounded-full mr-2 animate-pulse"></div>
              Live Market
            </Badge>
            <Badge variant="outline" className="text-river-blue border-river-blue/50 bg-river-blue/10">
              <Zap className="w-3 h-3 mr-1" />
              0.3s Execution
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-secondary flex items-center space-x-2">
              <Eye className="h-4 w-4 text-river-blue" />
              <span>Connected: {shortenAddress(userAddress || '')}</span>
            </div>
            <div className="w-2 h-2 bg-digital-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* SOTA Three-Column Professional Layout - Right-Handed Optimized */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div className="h-full grid grid-cols-1 xl:grid-cols-[350px_1fr_300px] 2xl:grid-cols-[400px_1fr_350px] gap-0">
          
          {/* Left Panel: Portfolio & Positions */}
          <div className="bg-surface-1/95 backdrop-blur-xl border-r border-default/15 p-5 overflow-y-auto relative group">
            {/* Panel Glassmorphism Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/8 to-digital-green-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative z-10 space-y-6">
              {/* Positions Overview Card */}
              <Card className="bg-surface-2/25 backdrop-blur-lg border-default/10 shadow-depth-3 relative overflow-hidden">
                {/* Card Ambient Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/12 via-transparent to-digital-green-500/8 opacity-60"></div>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-river-blue-400/50 to-transparent"></div>
                
                <div className="relative z-10">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-primary">
                      <BarChart3 className="h-6 w-6 text-river-blue animate-pulse-subtle-enhanced" />
                      <span className="bg-gradient-to-r from-digital-green-400 to-precision-orange-400 bg-clip-text text-transparent font-bold">
                        Live Positions
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <div className="w-2 h-2 bg-digital-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-digital-green-500 font-medium">Real-time</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {positions.length === 0 ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="relative">
                          <BarChart3 className="h-16 w-16 mx-auto text-river-blue/30 animate-pulse-subtle-enhanced" />
                          <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/20 to-digital-green-500/20 rounded-full blur-xl"></div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-primary">No Active Positions</p>
                          <p className="text-sm text-secondary">Execute your first trade to see real-time position data</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {positions.map((position, index) => (
                          <div 
                            key={index} 
                            className="p-4 bg-surface-3/20 backdrop-blur-sm rounded-xl border border-default/20 space-y-4 card-hover-lift-enhanced animate-fade-in-up-enhanced"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-xl text-primary">{position.symbol}</span>
                                <Badge 
                                  variant={position.size > 0 ? "default" : "destructive"}
                                  className={`text-sm font-bold shadow-sm ${
                                    position.size > 0 
                                      ? 'bg-digital-green-500/20 text-digital-green-500 border-digital-green-500/50' 
                                      : 'bg-precision-orange-500/20 text-precision-orange-500 border-precision-orange-500/50'
                                  }`}
                                >
                                  {position.size > 0 ? 'LONG' : 'SHORT'}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => closePosition(position)}
                                disabled={transaction.isLoading}
                                className="bg-critical-red-500/10 border-critical-red-500/30 text-critical-red-500 hover:bg-critical-red-500/20 font-medium btn-hover-lift-enhanced"
                              >
                                Close
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-surface-2/20 rounded-lg border border-default/10">
                                <div className="text-xs text-secondary mb-1 font-medium">Size</div>
                                <div className="font-bold text-primary text-sm">{formatNumber(Math.abs(position.size))}</div>
                              </div>
                              <div className="text-center p-3 bg-surface-2/20 rounded-lg border border-default/10">
                                <div className="text-xs text-secondary mb-1 font-medium">Notional</div>
                                <div className="font-bold text-primary text-sm">${formatNumber(position.notional)}</div>
                              </div>
                              <div className="text-center p-3 bg-surface-2/20 rounded-lg border border-default/10">
                                <div className="text-xs text-secondary mb-1 font-medium">PnL</div>
                                <div className={`font-bold text-lg ${
                                  position.pnl >= 0 ? 'text-digital-green-500' : 'text-precision-orange-500'
                                }`}>
                                  {position.pnl >= 0 ? '+' : ''}${formatNumber(position.pnl)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>

              {/* Account Balance Card */}
              <Card className="bg-surface-2/30 backdrop-blur-lg border-default/15 shadow-professional relative overflow-hidden card-hover-lift-enhanced">
                {/* Card Ambient Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/12 via-transparent to-digital-green-500/8 opacity-60"></div>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-river-blue-400/50 to-transparent"></div>
                
                <div className="relative z-10">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base text-primary">
                      <DollarSign className="h-5 w-5 text-river-blue animate-pulse-glow-enhanced" />
                      Portfolio Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-surface-3/20 rounded-lg border border-default/10">
                        <span className="text-sm text-secondary font-medium">Total Balance</span>
                        <span className="font-bold text-primary text-lg">${formatNumber(userAccount.balance)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-surface-3/20 rounded-lg border border-default/10">
                        <span className="text-sm text-secondary font-medium">Used Margin</span>
                        <span className="font-bold text-precision-orange-500 text-lg">
                          ${formatNumber(userAccount.totalMargin)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-surface-3/20 rounded-lg border border-default/10">
                        <span className="text-sm text-secondary font-medium">Available</span>
                        <span className="font-bold text-digital-green-500 text-lg">
                          ${formatNumber(userAccount.availableMargin)}
                        </span>
                      </div>
                    </div>
                  
                    <div className="pt-3 border-t border-default/20">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-secondary font-medium">Active Positions</span>
                        <Badge variant="outline" className="bg-river-blue/15 text-river-blue border-river-blue/30 animate-pulse-subtle-enhanced">
                          {positions.length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Risk Metrics */}
              <Card className="bg-surface-2/25 backdrop-blur-lg border-default/15 shadow-depth-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-precision-orange-500/8 to-critical-red-500/5 opacity-40"></div>
                <div className="relative z-10">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-primary">
                      <Target className="h-5 w-5 text-precision-orange-500" />
                      Risk Monitor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-secondary">Margin Ratio</span>
                        <span className="text-digital-green-500 font-bold">
                          {userAccount.totalMargin > 0 ? ((userAccount.availableMargin / userAccount.totalMargin) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                      <div className="w-full bg-surface-3/30 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-digital-green-500 to-river-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: userAccount.totalMargin > 0 
                              ? `${Math.min(100, (userAccount.availableMargin / userAccount.totalMargin) * 100)}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>

          {/* Center Panel: Market Data & Chart */}
          <div className="bg-surface-0/98 backdrop-blur-xl border-r border-default/15 p-6 overflow-y-auto relative">
            {/* Trading Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-river-blue-500/4 via-transparent to-digital-green-500/4 animate-river-flow"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-river-blue-500/2 to-transparent animate-liquid-flow"></div>
            
            <div className="relative z-10">
              <Card className="bg-surface-2/25 backdrop-blur-lg border-default/10 shadow-trading relative overflow-hidden">
                {/* Market Data Indicator */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-digital-green-500 via-river-blue-500 to-precision-orange-500 animate-liquid-flow"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-river-blue-400/10 to-digital-green-400/10 animate-pulse-subtle-enhanced"></div>
                
                <div className="relative z-10">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg text-primary">
                      <BarChart3 className="h-6 w-6 text-river-blue animate-pulse-glow-enhanced" />
                      <span className="bg-gradient-to-r from-river-blue-400 to-digital-green-400 bg-clip-text text-transparent font-bold">
                        Market Overview
                      </span>
                      <Badge variant="outline" className="ml-auto text-digital-green-500 border-digital-green-500/50 bg-digital-green-500/10">
                        <Activity className="w-3 h-3 mr-1 animate-pulse" />
                        Live
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Market Data Display - Chart Placeholder */}
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-primary flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-river-blue" />
                        Market Data
                      </label>
                      
                      {/* Price Display */}
                      {assetPrices[selectedSymbol] && (
                        <div className="p-4 bg-gradient-to-r from-river-blue/10 to-digital-green/10 rounded-xl border border-river-blue/20 backdrop-blur-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-primary">{selectedSymbol}/USDT</span>
                            <span className="text-2xl font-bold text-river-blue">
                              ${formatNumber(assetPrices[selectedSymbol])}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Chart Area Placeholder */}
                      <div className="bg-surface-3/20 rounded-xl p-8 border border-default/20 min-h-[400px] flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <BarChart3 className="h-16 w-16 mx-auto text-river-blue/50 animate-pulse" />
                          <div className="space-y-2">
                            <p className="text-lg font-semibold text-primary">TradingView Chart</p>
                            <p className="text-sm text-secondary">Advanced charting and technical analysis</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Market Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-surface-2/20 rounded-lg border border-default/10">
                          <div className="text-xs text-secondary mb-1 font-medium">24h Volume</div>
                          <div className="font-bold text-primary text-sm">$1.2B</div>
                        </div>
                        <div className="text-center p-3 bg-surface-2/20 rounded-lg border border-default/10">
                          <div className="text-xs text-secondary mb-1 font-medium">24h Change</div>
                          <div className="font-bold text-digital-green-500 text-sm">+2.34%</div>
                        </div>
                        <div className="text-center p-3 bg-surface-2/20 rounded-lg border border-default/10">
                          <div className="text-xs text-secondary mb-1 font-medium">24h High</div>
                          <div className="font-bold text-primary text-sm">${formatNumber((assetPrices[selectedSymbol] || 45000) * 1.05)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Panel: Trading Execution - Optimized for Right-Handed Users */}
          <div className="bg-surface-1/95 backdrop-blur-xl p-5 overflow-y-auto relative group">
            {/* Trading Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/8 to-digital-green-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative z-10">
              <Card className="bg-surface-2/25 backdrop-blur-lg border-default/10 shadow-trading relative overflow-hidden">
                {/* High-Performance Trading Indicator */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-digital-green-500 via-river-blue-500 to-precision-orange-500 animate-liquid-flow"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-river-blue-400/10 to-digital-green-400/10 animate-pulse-subtle-enhanced"></div>
                
                <div className="relative z-10">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg text-primary">
                      <Target className="h-6 w-6 text-river-blue animate-pulse-glow-enhanced" />
                      <span className="bg-gradient-to-r from-river-blue-400 to-digital-green-400 bg-clip-text text-transparent font-bold">
                        Professional Execution
                      </span>
                      <Badge variant="outline" className="ml-auto text-digital-green-500 border-digital-green-500/50 bg-digital-green-500/10">
                        <Activity className="w-3 h-3 mr-1 animate-pulse" />
                        Live
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Asset Selection with Enhanced UI */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-primary flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-river-blue" />
                        Trading Pair
                      </label>
                      <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                        <SelectTrigger className="bg-surface-3/30 backdrop-blur-sm border-default/30 text-primary h-12 font-medium rounded-xl hover:border-river-blue/50 transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-2/95 backdrop-blur-xl border-default/30 rounded-xl">
                          <SelectItem value="BTC" className="font-medium">BTC/USDT</SelectItem>
                          <SelectItem value="ETH" className="font-medium">ETH/USDT</SelectItem>
                          <SelectItem value="SOL" className="font-medium">SOL/USDT</SelectItem>
                          <SelectItem value="xAAPL" className="font-medium">AAPL (xStock)</SelectItem>
                          <SelectItem value="xTSLA" className="font-medium">TSLA (xStock)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Enhanced Position Size Input */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-primary flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-digital-green-500" />
                        Position Size (USDT)
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={tradeSize}
                        onChange={(e) => setTradeSize(e.target.value)}
                        disabled={transaction.isLoading}
                        className="bg-surface-3/30 backdrop-blur-sm border-default/30 text-primary font-mono text-lg h-14 rounded-xl focus:border-river-blue/50 focus:ring-2 focus:ring-river-blue/20 transition-all duration-200"
                      />
                      {/* Quick Size Buttons */}
                      <div className="grid grid-cols-4 gap-2">
                        {['25%', '50%', '75%', 'Max'].map((percentage) => (
                          <Button
                            key={percentage}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const maxSize = userAccount.availableMargin * Number(leverage);
                              const sizeMultiplier = percentage === 'Max' ? 1 : parseInt(percentage) / 100;
                              setTradeSize((maxSize * sizeMultiplier).toString());
                            }}
                            className="text-xs bg-surface-3/20 border-default/30 hover:border-river-blue/50 hover:bg-river-blue/10 transition-all duration-200"
                          >
                            {percentage}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Enhanced Leverage Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Zap className="h-4 w-4 text-precision-orange-500" />
                        Leverage
                      </label>
                      <Select value={leverage} onValueChange={setLeverage}>
                        <SelectTrigger className="bg-surface-3/30 backdrop-blur-sm border-default/30 text-primary h-12 font-medium rounded-xl hover:border-precision-orange/50 transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-2/95 backdrop-blur-xl border-default/30 rounded-xl">
                          {Array.from({ length: getMaxLeverage(selectedSymbol) }, (_, i) => i + 1).map(lev => (
                            <SelectItem key={lev} value={lev.toString()} className="font-medium">
                              {lev}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Enhanced Margin Display */}
                    {tradeSize && (
                      <div className="p-4 bg-gradient-to-br from-river-blue/15 to-digital-green/10 rounded-xl border border-river-blue/20 backdrop-blur-sm shadow-glow-river">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-secondary font-semibold flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Required Margin
                          </span>
                          <span className="font-bold text-river-blue text-xl">
                            ${formatNumber(calculateRequiredMargin())}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* SOTA Professional Trading Buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <Button 
                        onClick={() => openPosition(true)}
                        disabled={
                          !tradeSize || 
                          isNaN(Number(tradeSize)) || 
                          calculateRequiredMargin() > userAccount.availableMargin ||
                          transaction.isLoading
                        }
                        className="group relative bg-gradient-to-r from-digital-green-500 to-digital-green-600 hover:from-digital-green-400 hover:to-digital-green-500 h-16 text-base font-extrabold rounded-xl shadow-glow-profit border border-digital-green-400/50 transition-all duration-300 overflow-hidden btn-hover-lift-enhanced animate-fade-in-scale-enhanced"
                      >
                        {/* Professional Glassmorphism Layer */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Hyperliquid-Style Ripple Effect */}
                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                        </div>
                        
                        <div className="relative z-10 flex items-center justify-center">
                          {transaction.isLoading ? (
                            <Loader className="h-6 w-6 animate-spin mr-3 text-white" />
                          ) : (
                            <TrendingUp className="h-6 w-6 mr-3 text-white group-hover:scale-110 transition-transform duration-200" />
                          )}
                          <span className="text-white font-extrabold tracking-wide">LONG</span>
                        </div>
                      </Button>
                      
                      <Button 
                        onClick={() => openPosition(false)}
                        disabled={
                          !tradeSize || 
                          isNaN(Number(tradeSize)) || 
                          calculateRequiredMargin() > userAccount.availableMargin ||
                          transaction.isLoading
                        }
                        className="group relative bg-gradient-to-r from-precision-orange-500 to-precision-orange-600 hover:from-precision-orange-400 hover:to-precision-orange-500 h-16 text-base font-extrabold rounded-xl shadow-glow-loss border border-precision-orange-400/50 transition-all duration-300 overflow-hidden btn-hover-lift-enhanced animate-fade-in-scale-enhanced"
                      >
                        {/* Professional Glassmorphism Layer */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* OKX-Style Ripple Effect */}
                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                        </div>
                        
                        <div className="relative z-10 flex items-center justify-center">
                          {transaction.isLoading ? (
                            <Loader className="h-6 w-6 animate-spin mr-3 text-white" />
                          ) : (
                            <TrendingDownIcon className="h-6 w-6 mr-3 text-white group-hover:scale-110 transition-transform duration-200" />
                          )}
                          <span className="text-white font-extrabold tracking-wide">SHORT</span>
                        </div>
                      </Button>
                    </div>

                    {/* Enhanced Status Alerts */}
                    <div className="space-y-3">
                      {tradeSize && calculateRequiredMargin() > userAccount.availableMargin && (
                        <Alert variant="destructive" className="bg-critical-red-500/10 border-critical-red-500/30 animate-fade-in-up-enhanced">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-critical-red-500 font-medium">
                            Insufficient margin. Need ${formatNumber(calculateRequiredMargin() - userAccount.availableMargin)} more.
                          </AlertDescription>
                        </Alert>
                      )}

                      {transaction.error && (
                        <Alert variant="destructive" className="bg-critical-red-500/10 border-critical-red-500/30 animate-fade-in-up-enhanced">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-critical-red-500 font-medium">{transaction.error}</AlertDescription>
                        </Alert>
                      )}

                      {transaction.hash && transaction.status === TransactionStatus.SUCCESS && (
                        <Alert className="bg-digital-green-500/10 border-digital-green-500/30 animate-order-success-enhanced">
                          <CheckCircle className="h-4 w-4 text-digital-green-500" />
                          <AlertDescription className="text-digital-green-500 font-medium">
                            Trade executed successfully! 
                            <a 
                              href={`https://sepolia.arbiscan.io/tx/${transaction.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-river-blue hover:underline ml-2 font-bold"
                            >
                              View Transaction
                            </a>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOTATradingInterface;