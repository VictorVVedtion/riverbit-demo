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
  BarChart3
} from 'lucide-react';

interface TradingInterfaceProps {
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

const TradingInterface: React.FC<TradingInterfaceProps> = ({
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

  // 获取用户账户信息
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

  // 获取持仓信息
  const fetchPositions = async () => {
    if (!isConnected || !userAddress) return;

    try {
      const positionPromises = DEFAULT_PARAMS.supportedSymbols.map(async (symbol) => {
        const size = await web3Manager.getPosition(userAddress, symbol);
        const price = await web3Manager.getAssetPrice(symbol);
        
        if (size !== 0) {
          const notional = Math.abs(size) * price;
          const margin = notional / 10; // 假设10倍杠杆
          const pnl = size * price * 0.01; // 简化PnL计算
          
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

  // 获取资产价格
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

  // 刷新所有数据
  const refreshData = async () => {
    await Promise.all([
      fetchUserAccount(),
      fetchPositions(),
      fetchAssetPrices()
    ]);
  };

  // 初始化数据
  useEffect(() => {
    if (isConnected) {
      refreshData();
      const interval = setInterval(refreshData, 15000); // 15秒刷新
      return () => clearInterval(interval);
    }
  }, [isConnected, userAddress]);

  // 开仓
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

      // 刷新数据
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

  // 平仓
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

      // 刷新数据
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

  // 计算所需保证金
  const calculateRequiredMargin = (): number => {
    if (!tradeSize || isNaN(Number(tradeSize)) || !assetPrices[selectedSymbol]) return 0;
    
    const size = Number(tradeSize);
    const price = assetPrices[selectedSymbol];
    const leverageNum = Number(leverage);
    
    return (size * price) / leverageNum;
  };

  // 获取最大杠杆
  const getMaxLeverage = (symbol: string): number => {
    return symbol.startsWith('x') ? DEFAULT_PARAMS.maxLeverage.xStock : DEFAULT_PARAMS.maxLeverage.crypto;
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trading
            </CardTitle>
            <CardDescription>
              Trade perpetual contracts with leverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to start trading
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Professional Header */}
      <div className="flex-shrink-0 border-b border-default/30 bg-surface-1/95 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-primary">Trading Dashboard</h1>
            <Badge variant="outline" className="text-profit border-profit/50 bg-profit/10">
              <div className="w-2 h-2 bg-profit rounded-full mr-2 animate-pulse"></div>
              Live
            </Badge>
          </div>
          <div className="text-sm text-secondary">
            Connected: {shortenAddress(userAddress || '')}
          </div>
        </div>
      </div>

      {/* SOTA Professional Trading Grid - Hyperliquid/OKX Style */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 xl:grid-cols-[280px_1fr_320px] 2xl:grid-cols-[320px_1fr_380px] gap-0 relative">
          
          {/* SOTA Account Information Panel - Compact & Dense */}
          <div className="bg-surface-1/95 backdrop-blur-xl border-r border-default/20 p-4 overflow-y-auto relative group">
            {/* Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/5 to-digital-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
            <Card className="bg-surface-2/40 backdrop-blur-md border-default/20 shadow-professional relative overflow-hidden">
              {/* Professional Ambient Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/10 via-transparent to-digital-green-500/5 opacity-50"></div>
              <div className="relative z-10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <DollarSign className="h-5 w-5 text-river-blue animate-pulse-subtle-enhanced" />
                  Account Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-surface-3/30 rounded-lg">
                    <span className="text-sm text-secondary font-medium">Balance</span>
                    <span className="font-bold text-primary text-lg">${formatNumber(userAccount.balance)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-3/30 rounded-lg">
                    <span className="text-sm text-secondary font-medium">Used Margin</span>
                    <span className="font-bold text-loss text-lg">
                      ${formatNumber(userAccount.totalMargin)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-3/30 rounded-lg">
                    <span className="text-sm text-secondary font-medium">Available</span>
                    <span className="font-bold text-profit text-lg">
                      ${formatNumber(userAccount.availableMargin)}
                    </span>
                  </div>
                </div>
              
                <div className="pt-4 border-t border-default/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary font-medium">Open Positions</span>
                    <Badge variant="outline" className="bg-river-blue/10 text-river-blue border-river-blue/30">
                      {positions.length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trading Form Panel */}
          <div className="bg-surface-1 border-r border-default/30 p-6 overflow-y-auto">
            <Card className="bg-surface-2/50 border-default/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <Target className="h-5 w-5 text-river-blue" />
                  Execute Trade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Asset Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-secondary">Trading Asset</label>
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                    <SelectTrigger className="bg-surface-3/50 border-default/50 text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-2 border-default">
                      <SelectItem value="BTC">BTC/USDT</SelectItem>
                      <SelectItem value="ETH">ETH/USDT</SelectItem>
                      <SelectItem value="SOL">SOL/USDT</SelectItem>
                      <SelectItem value="xAAPL">AAPL (xStock)</SelectItem>
                      <SelectItem value="xTSLA">TSLA (xStock)</SelectItem>
                    </SelectContent>
                  </Select>
                  {assetPrices[selectedSymbol] && (
                    <div className="p-2 bg-surface-3/30 rounded-lg">
                      <p className="text-sm font-bold text-river-blue">
                        Current Price: ${formatNumber(assetPrices[selectedSymbol])}
                      </p>
                    </div>
                  )}
                </div>

                {/* Size Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-secondary">Position Size (USDT)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={tradeSize}
                    onChange={(e) => setTradeSize(e.target.value)}
                    disabled={transaction.isLoading}
                    className="bg-surface-3/50 border-default/50 text-primary font-mono text-lg h-12"
                  />
                </div>

                {/* Leverage */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-secondary">Leverage</label>
                  <Select value={leverage} onValueChange={setLeverage}>
                    <SelectTrigger className="bg-surface-3/50 border-default/50 text-primary h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-2 border-default">
                      {Array.from({ length: getMaxLeverage(selectedSymbol) }, (_, i) => i + 1).map(lev => (
                        <SelectItem key={lev} value={lev.toString()}>
                          {lev}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Margin Display */}
                {tradeSize && (
                  <div className="p-4 bg-surface-3/30 rounded-lg border border-river-blue/20">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary font-medium">Required Margin</span>
                      <span className="font-bold text-river-blue text-lg">
                        ${formatNumber(calculateRequiredMargin())}
                      </span>
                    </div>
                  </div>
                )}

                {/* SOTA One-Click Trading Buttons - Hyperliquid Style */}
                <div className="grid grid-cols-2 gap-3 pt-6">
                  <Button 
                    onClick={() => openPosition(true)}
                    disabled={
                      !tradeSize || 
                      isNaN(Number(tradeSize)) || 
                      calculateRequiredMargin() > userAccount.availableMargin ||
                      transaction.isLoading
                    }
                    className="group relative bg-gradient-to-r from-digital-green-500 to-digital-green-600 hover:from-digital-green-400 hover:to-digital-green-500 h-16 text-base font-bold rounded-xl shadow-glow-profit border border-digital-green-400/50 transition-all duration-300 overflow-hidden btn-hover-lift-enhanced"
                  >
                    {/* Button Glassmorphism Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Ripple Effect Container */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
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
                    className="group relative bg-gradient-to-r from-precision-orange-500 to-precision-orange-600 hover:from-precision-orange-400 hover:to-precision-orange-500 h-16 text-base font-bold rounded-xl shadow-glow-loss border border-precision-orange-400/50 transition-all duration-300 overflow-hidden btn-hover-lift-enhanced"
                  >
                    {/* Button Glassmorphism Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Ripple Effect Container */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                    </div>
                    
                    <div className="relative z-10 flex items-center justify-center">
                      {transaction.isLoading ? (
                        <Loader className="h-6 w-6 animate-spin mr-3 text-white" />
                      ) : (
                        <TrendingDown className="h-6 w-6 mr-3 text-white group-hover:scale-110 transition-transform duration-200" />
                      )}
                      <span className="text-white font-extrabold tracking-wide">SHORT</span>
                    </div>
                  </Button>
                </div>

                {/* Status Alerts */}
                <div className="space-y-3">
                  {tradeSize && calculateRequiredMargin() > userAccount.availableMargin && (
                    <Alert variant="destructive" className="bg-danger/10 border-danger/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-danger font-medium">
                        Insufficient margin. Need ${formatNumber(calculateRequiredMargin() - userAccount.availableMargin)} more.
                      </AlertDescription>
                    </Alert>
                  )}

                  {transaction.error && (
                    <Alert variant="destructive" className="bg-danger/10 border-danger/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-danger font-medium">{transaction.error}</AlertDescription>
                    </Alert>
                  )}

                  {transaction.hash && transaction.status === TransactionStatus.SUCCESS && (
                    <Alert className="bg-profit/10 border-profit/30">
                      <CheckCircle className="h-4 w-4 text-profit" />
                      <AlertDescription className="text-profit font-medium">
                        Trade successful! 
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
            </Card>
          </div>

          {/* Positions Panel */}
          <div className="bg-surface-1 p-6 overflow-y-auto">
            <Card className="bg-surface-2/50 border-default/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <BarChart3 className="h-5 w-5 text-river-blue" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {positions.length === 0 ? (
                  <div className="text-center py-12 text-secondary">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-river-blue/50" />
                    <p className="text-base font-medium mb-2">No open positions</p>
                    <p className="text-sm text-muted">Execute your first trade to see positions here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {positions.map((position, index) => (
                      <div key={index} className="p-4 bg-surface-3/30 rounded-lg border border-default/30 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-primary">{position.symbol}</span>
                            <Badge 
                              variant={position.size > 0 ? "default" : "destructive"}
                              className={`text-sm font-bold ${
                                position.size > 0 
                                  ? 'bg-profit/20 text-profit border-profit/50' 
                                  : 'bg-loss/20 text-loss border-loss/50'
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
                            className="bg-danger/10 border-danger/30 text-danger hover:bg-danger/20 font-medium"
                          >
                            Close Position
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-2 bg-surface-2/30 rounded">
                            <div className="text-xs text-secondary mb-1">Size</div>
                            <div className="font-bold text-primary">{formatNumber(Math.abs(position.size))}</div>
                          </div>
                          <div className="text-center p-2 bg-surface-2/30 rounded">
                            <div className="text-xs text-secondary mb-1">Notional</div>
                            <div className="font-bold text-primary">${formatNumber(position.notional)}</div>
                          </div>
                          <div className="text-center p-2 bg-surface-2/30 rounded">
                            <div className="text-xs text-secondary mb-1">PnL</div>
                            <div className={`font-bold text-lg ${
                              position.pnl >= 0 ? 'text-profit' : 'text-loss'
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
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingInterface;