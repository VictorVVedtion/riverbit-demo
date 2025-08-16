import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Wallet, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  Shield,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { web3Manager, formatNumber, shortenAddress } from '../utils/web3Utils';
import { useRiverBitWeb3 } from '../providers/RiverBitWeb3Provider';
import { formatUSDC, parseUSDC } from '../utils/contractConfig';
import { TradeData, TradeCompleteCallback, TradeErrorCallback } from '../types/trading';
import { handleTradingError, handleWeb3Error, logError } from '../utils/errorHandling';
import { type OrderType, type MarginMode } from '../constants/contractConstants';
import { toast } from 'sonner';

interface RealTradingExecutorProps {
  symbol: string;
  side: 'buy' | 'sell'; // buy = long, sell = short
  type: 'market' | 'limit';
  amount: string;
  price?: string;
  leverage: number;
  marginMode: 'cross' | 'isolated';
  onTradeComplete?: TradeCompleteCallback;
  onError?: TradeErrorCallback;
}

interface TradeState {
  isConnected: boolean;
  address: string;
  chainId: number | null;
  usdcBalance: number;
  usdcAllowance: number;
  accountInfo: {
    balance: number;
    poolShares: number;
    totalMargin: number;
    lastActivityTime: number;
  } | null;
  currentPosition: number;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  txStatus: 'pending' | 'success' | 'failed' | null;
}

const RealTradingExecutor: React.FC<RealTradingExecutorProps> = ({
  symbol,
  side,
  type,
  amount,
  price,
  leverage,
  marginMode,
  onTradeComplete,
  onError
}) => {
  // Use the Web3 provider hooks
  const {
    isConnected,
    address,
    chainId,
    isValidNetwork,
    usdcBalance,
    allowance,
    hasInfiniteAllowance,
    accountInfo,
    positions,
    placeOrder,
    approveUSDC,
    refreshData
  } = useRiverBitWeb3();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'failed' | null>(null);

  // Get current position for this symbol
  const currentPosition = positions.find(pos => pos.market === symbol);

  // Clear error when component remounts
  useEffect(() => {
    setError(null);
    setTxHash(null);
    setTxStatus(null);
  }, [symbol, side, type, amount, price, leverage]);

  // 计算交易参数
  const calculateTradeParams = () => {
    const tradeAmount = parseFloat(amount);
    const marginRequired = tradeAmount / leverage;
    const tradingFee = tradeAmount * 0.0006; // 0.06% trading fee
    const totalCost = marginRequired + tradingFee;

    return {
      tradeAmount,
      marginRequired,
      tradingFee,
      totalCost,
      isLong: side === 'buy',
      sizeInContract: side === 'buy' ? tradeAmount : -tradeAmount
    };
  };

  // 检查交易前置条件
  const validateTrade = () => {
    const params = calculateTradeParams();
    
    // 检查基本输入
    if (!amount || params.tradeAmount <= 0) {
      return { valid: false, error: 'Invalid trade amount' };
    }

    // 检查最小交易金额 - 10 USDT 起
    if (params.tradeAmount < 10) {
      return { valid: false, error: '⚠️ Minimum order: $10 USDT\nPlease increase your trade amount.' };
    }

    if (type === 'limit' && (!price || parseFloat(price) <= 0)) {
      return { valid: false, error: 'Invalid limit price' };
    }

    // 检查钱包连接
    if (!isConnected) {
      return { valid: false, error: '💳 Please connect your wallet\nClick "Connect Wallet" button to continue.' };
    }

    // 检查网络
    if (!isValidNetwork) {
      return { valid: false, error: '🔗 Wrong network detected\nPlease switch to Arbitrum Sepolia testnet.' };
    }

    // 检查USDC余额
    const usdcBal = parseFloat(usdcBalance);
    if (params.totalCost > usdcBal) {
      return { valid: false, error: `💰 Insufficient Balance\nNeed: $${params.totalCost.toFixed(2)} USDC\nHave: $${usdcBal.toFixed(2)} USDC\n\nGet testnet USDC from faucet!` };
    }

    // 检查账户余额 (对于交易)
    if (accountInfo && params.marginRequired > parseFloat(accountInfo.balance)) {
      return { valid: false, error: `💰 Not enough margin\nRequired: $${params.marginRequired.toFixed(2)}\nAvailable: $${accountInfo.balance}\n\nDeposit more USDC to continue.` };
    }

    // 检查USDC授权额度
    if (!hasInfiniteAllowance && params.totalCost > parseFloat(allowance)) {
      return { valid: false, error: '🔐 USDC Approval Needed\nClick "Approve USDC" below to authorize trading.' };
    }

    return { valid: true, error: null };
  };

  // 授权USDC
  const handleApproveUSDC = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = calculateTradeParams();
      const approveAmount = Math.max(params.totalCost * 2, 1000).toString(); // 授权2倍或最少1000 USDC
      
      await approveUSDC(approveAmount);
      setTxStatus('success');
      toast.success('USDC approval successful!');

    } catch (error: any) {
      const errorMsg = error.message || 'USDC approval failed';
      setError(errorMsg);
      setTxStatus('failed');
      onError?.(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 执行交易
  const executeTrade = async () => {
    const validation = validateTrade();
    if (!validation.valid) {
      setError(validation.error!);
      onError?.(validation.error!);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);
    setTxStatus(null);

    try {
      const params = calculateTradeParams();
      
      // 准备交易参数
      const tradeParams = {
        market: symbol,
        side: side,
        size: amount,
        price: type === 'limit' ? price : undefined,
        orderType: type as OrderType,
        marginMode: marginMode as MarginMode,
        leverage: leverage
      };

      console.log('Executing trade with params:', tradeParams);
      
      // 使用 Web3 provider 的 placeOrder 方法
      await placeOrder(tradeParams);
      
      setTxStatus('success');
      toast.success('Trade executed successfully!');

      // 通知成功
      const tradeData = {
        symbol,
        side,
        amount: params.tradeAmount,
        leverage,
        marginMode,
        txHash: 'pending', // Will be updated when transaction is confirmed
        timestamp: Date.now()
      };

      onTradeComplete?.('pending', tradeData);

      // 刷新数据
      refreshData();

    } catch (error: any) {
      console.error('Trade execution failed:', error);
      const errorMsg = error.message || 'Trade execution failed';

      setError(errorMsg);
      setTxStatus('failed');
      onError?.(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染组件
  const params = calculateTradeParams();
  const validation = validateTrade();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {side === 'buy' ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            <span>
              {side === 'buy' ? 'Long' : 'Short'} {symbol}
            </span>
            <Badge variant="outline" className="text-xs">
              {leverage}x
            </Badge>
          </div>
          
          {isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 错误显示 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 钱包连接状态 */}
        {!isConnected ? (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to execute trades
            </AlertDescription>
          </Alert>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Connected: {shortenAddress(address || '')}
                </span>
              </div>
              {isValidNetwork && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  Arbitrum Sepolia
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 交易参数预览 */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">Trade Parameters</h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-300">Trade Size:</span>
              <div className="font-bold">${formatNumber(params.tradeAmount)}</div>
            </div>
            
            <div>
              <span className="text-gray-300">Required Margin:</span>
              <div className="font-bold text-blue-600">${formatNumber(params.marginRequired)}</div>
            </div>
            
            <div>
              <span className="text-gray-300">Trading Fee:</span>
              <div className="font-bold text-yellow-600">${params.tradingFee.toFixed(2)}</div>
            </div>
            
            <div>
              <span className="text-gray-300">Total Cost:</span>
              <div className="font-bold text-purple-600">${formatNumber(params.totalCost)}</div>
            </div>
            
            <div>
              <span className="text-gray-300">Order Type:</span>
              <div className="font-bold">{type.toUpperCase()}</div>
            </div>
            
            <div>
              <span className="text-gray-300">Margin Mode:</span>
              <div className="font-bold capitalize">{marginMode}</div>
            </div>
          </div>

          {type === 'limit' && price && (
            <div className="pt-2 border-t">
              <span className="text-gray-300 text-sm">Limit Price:</span>
              <div className="font-bold text-lg">${formatNumber(parseFloat(price))}</div>
            </div>
          )}
        </div>

        {/* 账户信息 */}
        {accountInfo && (
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Account Status</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-300">Account Balance:</span>
                <div className="font-bold">${formatNumber(parseFloat(accountInfo.balance))}</div>
              </div>
              <div>
                <span className="text-gray-300">USDC Balance:</span>
                <div className="font-bold">${formatNumber(parseFloat(usdcBalance))}</div>
              </div>
              <div>
                <span className="text-gray-300">Used Margin:</span>
                <div className="font-bold">${formatNumber(parseFloat(accountInfo.usedMargin))}</div>
              </div>
              <div>
                <span className="text-gray-300">Current Position:</span>
                <div className="font-bold">
                  {currentPosition ? formatNumber(parseFloat(currentPosition.size)) : '0'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 交易状态 */}
        {txHash && (
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {txStatus === 'pending' && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
                {txStatus === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {txStatus === 'failed' && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  Transaction {txStatus || 'submitted'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs font-mono text-gray-300 mt-1">
              {shortenAddress(txHash)}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-2">
          {/* USDC授权按钮 */}
          {isConnected && validation.error?.includes('allowance') && (
            <Button
              onClick={handleApproveUSDC}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Approve USDC
            </Button>
          )}

          {/* 主交易按钮 */}
          <Button
            onClick={executeTrade}
            disabled={isLoading || !validation.valid}
            className={`w-full h-12 font-bold transition-all duration-200 ${
              isLoading || !validation.valid
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
                : side === 'buy' 
                  ? 'bg-green-600 hover:bg-green-700 hover:scale-105 text-white shadow-lg hover:shadow-green-500/50' 
                  : 'bg-red-600 hover:bg-red-700 hover:scale-105 text-white shadow-lg hover:shadow-red-500/50'
            }`}
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : !validation.valid ? (
              <AlertTriangle className="w-4 h-4 mr-2" />
            ) : side === 'buy' ? (
              <TrendingUp className="w-4 h-4 mr-2" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-2" />
            )}
            
            {isLoading 
              ? '⏳ Processing Trade...' 
              : !validation.valid
                ? '❌ Check Requirements'
                : `✅ ${side === 'buy' ? 'BUY' : 'SELL'} ${symbol} ${leverage}x`
            }
          </Button>
        </div>

        {/* 风险提示 */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Risk Warning:</strong> Trading with leverage carries significant risk. 
            You may lose more than your initial investment. Ensure you understand the risks 
            before proceeding.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default RealTradingExecutor;