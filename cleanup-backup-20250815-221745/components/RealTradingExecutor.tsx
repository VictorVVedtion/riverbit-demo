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
import { formatUSDC, parseUSDC } from '../utils/contractConfig';
import { TradeData, TradeCompleteCallback, TradeErrorCallback } from '../types/trading';
import { handleTradingError, handleWeb3Error, logError } from '../utils/errorHandling';

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
  const [tradeState, setTradeState] = useState<TradeState>({
    isConnected: false,
    address: '',
    chainId: null,
    usdcBalance: 0,
    usdcAllowance: 0,
    accountInfo: null,
    currentPosition: 0,
    isLoading: false,
    error: null,
    txHash: null,
    txStatus: null
  });

  // 初始化检查钱包连接和数据
  useEffect(() => {
    checkWalletAndLoadData();
  }, []);

  // 检查钱包连接并加载数据
  const checkWalletAndLoadData = async () => {
    setTradeState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!web3Manager.isConnected) {
        setTradeState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: 'Please connect your wallet first'
        }));
        return;
      }

      const chainId = web3Manager.currentChainId;
      if (chainId !== 421614) { // Arbitrum Sepolia
        setTradeState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: 'Please switch to Arbitrum Sepolia network'
        }));
        return;
      }

      // 获取账户信息
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      
      // 并行获取所有必要数据
      const [usdcBalance, usdcAllowance, accountInfo, currentPosition] = await Promise.all([
        web3Manager.getUSDCBalance(address),
        web3Manager.checkUSDCAllowance(address),
        web3Manager.getAccountInfo(address),
        web3Manager.getPosition(address, symbol)
      ]);

      setTradeState(prev => ({
        ...prev,
        isConnected: true,
        address,
        chainId,
        usdcBalance,
        usdcAllowance,
        accountInfo,
        currentPosition,
        isLoading: false,
        error: null
      }));

    } catch (error) {
      logError('Load Wallet Data', error);
      const errorMsg = handleWeb3Error(error);
      setTradeState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMsg
      }));
      onError?.(errorMsg);
    }
  };

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

    if (type === 'limit' && (!price || parseFloat(price) <= 0)) {
      return { valid: false, error: 'Invalid limit price' };
    }

    // 检查钱包连接
    if (!tradeState.isConnected) {
      return { valid: false, error: 'Wallet not connected' };
    }

    // 检查网络
    if (tradeState.chainId !== 421614) {
      return { valid: false, error: 'Wrong network - please switch to Arbitrum Sepolia' };
    }

    // 检查USDC余额 (对于存款)
    if (params.totalCost > tradeState.usdcBalance) {
      return { valid: false, error: `Insufficient USDC balance. Required: $${params.totalCost.toFixed(2)}, Available: $${tradeState.usdcBalance.toFixed(2)}` };
    }

    // 检查账户余额 (对于交易)
    if (tradeState.accountInfo && params.marginRequired > tradeState.accountInfo.balance) {
      return { valid: false, error: `Insufficient account balance. Required: $${params.marginRequired.toFixed(2)}, Available: $${tradeState.accountInfo.balance.toFixed(2)}` };
    }

    // 检查USDC授权额度
    if (params.totalCost > tradeState.usdcAllowance) {
      return { valid: false, error: 'Insufficient USDC allowance - please approve first' };
    }

    return { valid: true, error: null };
  };

  // 授权USDC
  const approveUSDC = async () => {
    setTradeState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = calculateTradeParams();
      const approveAmount = Math.max(params.totalCost * 2, 1000); // 授权2倍或最少1000 USDC
      
      const tx = await web3Manager.approveUSDC(approveAmount);
      setTradeState(prev => ({ ...prev, txHash: tx.hash, txStatus: 'pending' }));

      // 等待交易确认
      await tx.wait();
      
      // 重新获取授权额度
      const newAllowance = await web3Manager.checkUSDCAllowance(tradeState.address);
      setTradeState(prev => ({ 
        ...prev, 
        usdcAllowance: newAllowance,
        isLoading: false,
        txStatus: 'success',
        error: null
      }));

    } catch (error) {
      logError('USDC Approval', error);
      const errorMsg = handleWeb3Error(error);
      setTradeState(prev => ({ 
        ...prev, 
        isLoading: false, 
        txStatus: 'failed',
        error: errorMsg
      }));
      onError?.(errorMsg);
    }
  };

  // 执行交易
  const executeTrade = async () => {
    const validation = validateTrade();
    if (!validation.valid) {
      setTradeState(prev => ({ ...prev, error: validation.error }));
      onError?.(validation.error!);
      return;
    }

    setTradeState(prev => ({ ...prev, isLoading: true, error: null, txHash: null, txStatus: null }));

    try {
      const params = calculateTradeParams();
      
      // 首先确保有足够的账户余额
      if (tradeState.accountInfo && params.marginRequired > tradeState.accountInfo.balance) {
        // 需要先存款
        const depositAmount = params.totalCost;
        console.log(`Depositing ${depositAmount} USDC to account...`);
        
        const depositTx = await web3Manager.deposit(depositAmount);
        setTradeState(prev => ({ ...prev, txHash: depositTx.hash, txStatus: 'pending' }));
        
        await depositTx.wait();
        console.log('Deposit successful');
        
        // 重新获取账户信息
        const newAccountInfo = await web3Manager.getAccountInfo(tradeState.address);
        setTradeState(prev => ({ ...prev, accountInfo: newAccountInfo }));
      }

      // 执行开仓操作
      console.log(`Opening position: ${symbol}, size: ${params.sizeInContract}, leverage: ${leverage}`);
      
      const tradeTx = await web3Manager.openPosition(
        symbol,
        params.sizeInContract,
        leverage
      );

      setTradeState(prev => ({ ...prev, txHash: tradeTx.hash, txStatus: 'pending' }));

      // 等待交易确认
      const receipt = await tradeTx.wait();
      
      console.log('Trade executed successfully:', receipt);

      // 重新获取数据
      const [newAccountInfo, newPosition] = await Promise.all([
        web3Manager.getAccountInfo(tradeState.address),
        web3Manager.getPosition(tradeState.address, symbol)
      ]);

      setTradeState(prev => ({
        ...prev,
        accountInfo: newAccountInfo,
        currentPosition: newPosition,
        isLoading: false,
        txStatus: 'success',
        error: null
      }));

      // 通知成功
      const tradeData = {
        symbol,
        side,
        amount: params.tradeAmount,
        leverage,
        marginMode,
        txHash: tradeTx.hash,
        timestamp: Date.now()
      };

      onTradeComplete?.(tradeTx.hash, tradeData);

    } catch (error) {
      logError('Trade Execution', error);
      const errorMsg = handleTradingError(error);

      setTradeState(prev => ({ 
        ...prev, 
        isLoading: false, 
        txStatus: 'failed',
        error: errorMsg
      }));
      
      onError?.(errorMsg);
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
          
          {tradeState.isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={checkWalletAndLoadData}
              disabled={tradeState.isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${tradeState.isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 错误显示 */}
        {tradeState.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{tradeState.error}</AlertDescription>
          </Alert>
        )}

        {/* 钱包连接状态 */}
        {!tradeState.isConnected ? (
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
                  Connected: {shortenAddress(tradeState.address)}
                </span>
              </div>
              {tradeState.chainId === 421614 && (
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
        {tradeState.accountInfo && (
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Account Status</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-300">Account Balance:</span>
                <div className="font-bold">${formatNumber(tradeState.accountInfo.balance)}</div>
              </div>
              <div>
                <span className="text-gray-300">USDC Balance:</span>
                <div className="font-bold">${formatNumber(tradeState.usdcBalance)}</div>
              </div>
              <div>
                <span className="text-gray-300">Used Margin:</span>
                <div className="font-bold">${formatNumber(tradeState.accountInfo.totalMargin)}</div>
              </div>
              <div>
                <span className="text-gray-300">Current Position:</span>
                <div className="font-bold">${formatNumber(Math.abs(tradeState.currentPosition))}</div>
              </div>
            </div>
          </div>
        )}

        {/* 交易状态 */}
        {tradeState.txHash && (
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {tradeState.txStatus === 'pending' && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
                {tradeState.txStatus === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {tradeState.txStatus === 'failed' && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  Transaction {tradeState.txStatus || 'submitted'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://sepolia.arbiscan.io/tx/${tradeState.txHash}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs font-mono text-gray-300 mt-1">
              {shortenAddress(tradeState.txHash)}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-2">
          {/* USDC授权按钮 */}
          {tradeState.isConnected && validation.error?.includes('allowance') && (
            <Button
              onClick={approveUSDC}
              disabled={tradeState.isLoading}
              className="w-full"
              variant="outline"
            >
              {tradeState.isLoading ? (
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
            disabled={tradeState.isLoading || !validation.valid}
            className={`w-full h-12 font-bold ${
              side === 'buy' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            size="lg"
          >
            {tradeState.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : side === 'buy' ? (
              <TrendingUp className="w-4 h-4 mr-2" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-2" />
            )}
            
            {tradeState.isLoading 
              ? 'Processing...' 
              : `${side === 'buy' ? 'BUY' : 'SELL'} ${symbol} ${leverage}x`
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