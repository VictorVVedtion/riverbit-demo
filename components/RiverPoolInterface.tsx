import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { web3Manager, formatNumber, formatPercentage, TransactionStatus } from '../utils/web3Utils';
import { transactionHistory } from '../utils/transactionHistory';
import TransactionHistory from './TransactionHistory';
import TransactionConfirmDialog from './TransactionConfirmDialog';
import { 
  DollarSign, 
  TrendingUp, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader, 
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface RiverPoolInterfaceProps {
  userAddress?: string;
  isConnected: boolean;
}

interface PoolData {
  totalValueLocked: number;
  totalShares: number;
  netAssetValue: number;
  totalPnL: number;
  insuranceFund: number;
}

interface UserData {
  balance: number;
  poolShares: number;
  poolValue: number;
  totalMargin: number;
}

interface TransactionState {
  isLoading: boolean;
  hash: string | null;
  status: TransactionStatus;
  error: string | null;
}

const RiverPoolInterface: React.FC<RiverPoolInterfaceProps> = ({
  userAddress,
  isConnected
}) => {
  const [poolData, setPoolData] = useState<PoolData>({
    totalValueLocked: 0,
    totalShares: 0,
    netAssetValue: 1.0,
    totalPnL: 0,
    insuranceFund: 0
  });

  const [userData, setUserData] = useState<UserData>({
    balance: 0,
    poolShares: 0,
    poolValue: 0,
    totalMargin: 0
  });

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [usdcAllowance, setUsdcAllowance] = useState(0);
  const [transaction, setTransaction] = useState<TransactionState>({
    isLoading: false,
    hash: null,
    status: TransactionStatus.PENDING,
    error: null
  });

  const [refreshing, setRefreshing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'deposit' | 'withdraw' | 'approve';
    action: () => void;
  }>({ open: false, type: 'deposit', action: () => {} });

  // 获取池数据
  const fetchPoolData = async () => {
    if (!isConnected) return;

    try {
      const poolState = await web3Manager.getPoolState();
      setPoolData(poolState);
    } catch (error: any) {
      console.error('Failed to fetch pool data:', error);
      setTransaction(prev => ({ 
        ...prev, 
        error: 'Failed to load pool data. Please check your connection.' 
      }));
    }
  };

  // 获取用户数据
  const fetchUserData = async () => {
    if (!isConnected || !userAddress) return;

    try {
      const [accountInfo, poolValue] = await Promise.all([
        web3Manager.getAccountInfo(userAddress),
        web3Manager.getUserPoolValue(userAddress)
      ]);

      setUserData({
        balance: accountInfo.balance,
        poolShares: accountInfo.poolShares,
        poolValue: poolValue,
        totalMargin: accountInfo.totalMargin
      });

      // 检查USDC授权
      const allowance = await web3Manager.checkUSDCAllowance(userAddress);
      setUsdcAllowance(allowance);

    } catch (error: any) {
      console.error('Failed to fetch user data:', error);
      setTransaction(prev => ({ 
        ...prev, 
        error: 'Failed to load user data. Please refresh and try again.' 
      }));
    }
  };

  // 刷新所有数据
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchPoolData(), fetchUserData()]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 初始化和数据刷新
  useEffect(() => {
    if (isConnected) {
      refreshData();
      
      // 设置定时刷新
      const interval = setInterval(refreshData, 30000); // 30秒刷新一次
      
      // 设置合约事件监听
      if (userAddress) {
        web3Manager.setupContractEventListeners({
          onPoolDeposit: (user, amount, shares, txHash) => {
            if (user.toLowerCase() === userAddress.toLowerCase()) {
              console.log('Pool deposit detected:', { amount, shares, txHash });
              // 刷新数据
              setTimeout(refreshData, 2000); // 等待2秒再刷新，确保区块链数据更新
            }
          },
          onPoolWithdraw: (user, shares, amount, txHash) => {
            if (user.toLowerCase() === userAddress.toLowerCase()) {
              console.log('Pool withdraw detected:', { shares, amount, txHash });
              // 刷新数据
              setTimeout(refreshData, 2000);
            }
          },
          onDeposit: (user, amount, txHash) => {
            if (user.toLowerCase() === userAddress.toLowerCase()) {
              console.log('Account deposit detected:', { amount, txHash });
              setTimeout(refreshData, 2000);
            }
          },
          onWithdraw: (user, amount, txHash) => {
            if (user.toLowerCase() === userAddress.toLowerCase()) {
              console.log('Account withdraw detected:', { amount, txHash });
              setTimeout(refreshData, 2000);
            }
          }
        });
      }
      
      return () => {
        clearInterval(interval);
        web3Manager.removeContractEventListeners();
      };
    }
  }, [isConnected, userAddress]);

  // 授权USDC
  const approveUSDC = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || !userAddress) return;

    setTransaction({ isLoading: true, hash: null, status: TransactionStatus.PENDING, error: null });

    let transactionId: string | null = null;

    try {
      const amount = Number(depositAmount);
      
      // 检查输入有效性
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      if (amount > userData.balance) {
        throw new Error('Insufficient USDC balance');
      }

      const tx = await web3Manager.approveUSDC(amount);
      
      // 记录交易历史
      transactionId = transactionHistory.addTransaction({
        hash: tx.hash,
        type: 'approve_usdc',
        status: TransactionStatus.PENDING,
        amount: amount,
        timestamp: Date.now(),
        userAddress
      });
      
      setTransaction({ 
        isLoading: true, 
        hash: tx.hash, 
        status: TransactionStatus.PENDING, 
        error: null 
      });

      const receipt = await tx.wait();
      
      // 更新交易状态
      if (transactionId) {
        transactionHistory.updateTransaction(transactionId, {
          status: TransactionStatus.SUCCESS,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString()
        });
      }
      
      setTransaction({ 
        isLoading: false, 
        hash: tx.hash, 
        status: TransactionStatus.SUCCESS, 
        error: null 
      });

      // 刷新授权额度
      if (userAddress) {
        const newAllowance = await web3Manager.checkUSDCAllowance(userAddress);
        setUsdcAllowance(newAllowance);
      }

    } catch (error: any) {
      let errorMessage = 'Approval failed';
      
      if (error.code === 4001) {
        errorMessage = 'User rejected the transaction';
      } else if (error.code === -32603 && error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // 更新交易状态
      if (transactionId) {
        transactionHistory.updateTransaction(transactionId, {
          status: TransactionStatus.FAILED,
          error: errorMessage
        });
      }
      
      setTransaction({ 
        isLoading: false, 
        hash: null, 
        status: TransactionStatus.FAILED, 
        error: errorMessage 
      });
    }
  };

  // 显示存入确认对话框
  const showDepositConfirm = () => {
    setConfirmDialog({
      open: true,
      type: 'deposit',
      action: executeDeposit
    });
  };

  // 执行存入操作
  const executeDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || !userAddress) return;
    
    const amount = Number(depositAmount);
    if (amount <= 0 || amount > userData.balance) return;

    setTransaction({ isLoading: true, hash: null, status: TransactionStatus.PENDING, error: null });

    let transactionId: string | null = null;

    try {
      // 检查输入有效性
      if (amount < 1) {
        throw new Error('Minimum deposit amount is 1 USDC');
      }
      
      if (amount > userData.balance) {
        throw new Error('Insufficient USDC balance');
      }

      // 检查是否需要授权
      if (amount > usdcAllowance) {
        await approveUSDC();
        // 等待授权完成
        return;
      }

      const tx = await web3Manager.depositToPool(amount);
      
      // 记录交易历史
      transactionId = transactionHistory.addTransaction({
        hash: tx.hash,
        type: 'pool_deposit',
        status: TransactionStatus.PENDING,
        amount: amount,
        timestamp: Date.now(),
        userAddress
      });
      
      setTransaction({ 
        isLoading: true, 
        hash: tx.hash, 
        status: TransactionStatus.PENDING, 
        error: null 
      });

      const receipt = await tx.wait();
      
      // 更新交易状态
      if (transactionId) {
        transactionHistory.updateTransaction(transactionId, {
          status: TransactionStatus.SUCCESS,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString()
        });
      }
      
      setTransaction({ 
        isLoading: false, 
        hash: tx.hash, 
        status: TransactionStatus.SUCCESS, 
        error: null 
      });

      // 刷新数据
      await refreshData();
      setDepositAmount('');

    } catch (error: any) {
      let errorMessage = 'Deposit failed';
      
      if (error.code === 4001) {
        errorMessage = 'User rejected the transaction';
      } else if (error.code === -32603 && error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // 更新交易状态
      if (transactionId) {
        transactionHistory.updateTransaction(transactionId, {
          status: TransactionStatus.FAILED,
          error: errorMessage
        });
      }
      
      setTransaction({ 
        isLoading: false, 
        hash: null, 
        status: TransactionStatus.FAILED, 
        error: errorMessage 
      });
    }
  };

  // 显示提取确认对话框
  const showWithdrawConfirm = () => {
    setConfirmDialog({
      open: true,
      type: 'withdraw',
      action: executeWithdraw
    });
  };

  // 执行提取操作
  const executeWithdraw = async () => {
    if (!withdrawShares || isNaN(Number(withdrawShares)) || !userAddress) return;
    
    const shares = Number(withdrawShares);
    if (shares <= 0 || shares > userData.poolShares) return;

    setTransaction({ isLoading: true, hash: null, status: TransactionStatus.PENDING, error: null });

    let transactionId: string | null = null;

    try {
      // 检查输入有效性
      if (shares <= 0) {
        throw new Error('Withdrawal amount must be greater than 0');
      }
      
      if (shares > userData.poolShares) {
        throw new Error('Insufficient pool shares');
      }

      const expectedAmount = calculateExpectedAmount(shares);
      const tx = await web3Manager.withdrawFromPool(shares);
      
      // 记录交易历史
      transactionId = transactionHistory.addTransaction({
        hash: tx.hash,
        type: 'pool_withdraw',
        status: TransactionStatus.PENDING,
        amount: expectedAmount,
        shares: shares,
        timestamp: Date.now(),
        userAddress
      });
      
      setTransaction({ 
        isLoading: true, 
        hash: tx.hash, 
        status: TransactionStatus.PENDING, 
        error: null 
      });

      const receipt = await tx.wait();
      
      // 更新交易状态
      if (transactionId) {
        transactionHistory.updateTransaction(transactionId, {
          status: TransactionStatus.SUCCESS,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString()
        });
      }
      
      setTransaction({ 
        isLoading: false, 
        hash: tx.hash, 
        status: TransactionStatus.SUCCESS, 
        error: null 
      });

      // 刷新数据
      await refreshData();
      setWithdrawShares('');

    } catch (error: any) {
      let errorMessage = 'Withdrawal failed';
      
      if (error.code === 4001) {
        errorMessage = 'User rejected the transaction';
      } else if (error.code === -32603 && error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // 更新交易状态
      if (transactionId) {
        transactionHistory.updateTransaction(transactionId, {
          status: TransactionStatus.FAILED,
          error: errorMessage
        });
      }
      
      setTransaction({ 
        isLoading: false, 
        hash: null, 
        status: TransactionStatus.FAILED, 
        error: errorMessage 
      });
    }
  };

  // 计算预期份额
  const calculateExpectedShares = (amount: number): number => {
    if (poolData.totalShares === 0) return amount;
    return (amount * poolData.totalShares) / poolData.totalValueLocked;
  };

  // 计算预期提取金额
  const calculateExpectedAmount = (shares: number): number => {
    if (poolData.totalShares === 0) return 0;
    return (shares * poolData.totalValueLocked) / poolData.totalShares;
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            RiverPool
          </CardTitle>
          <CardDescription>
            Provide liquidity and earn rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to access RiverPool
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 池子统计 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Pool Overview
            </CardTitle>
            <CardDescription>
              RiverPool liquidity statistics
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Total Value Locked</p>
              <p className="text-2xl font-bold text-green-600">
                ${formatNumber(poolData.totalValueLocked)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">NAV per Share</p>
              <p className="text-2xl font-bold">
                ${poolData.netAssetValue.toFixed(4)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Total PnL</p>
              <p className={`text-lg font-semibold ${
                poolData.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {poolData.totalPnL >= 0 ? '+' : ''}${formatNumber(poolData.totalPnL)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Insurance Fund</p>
              <p className="text-lg font-semibold text-blue-600">
                ${formatNumber(poolData.insuranceFund)}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Total rLP Shares:</span>
              <span className="font-semibold">
                {formatNumber(poolData.totalShares)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Your Position
          </CardTitle>
          <CardDescription>
            Your account and pool positions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Available Balance</p>
              <p className="text-xl font-bold">
                ${formatNumber(userData.balance)} USDC
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Pool Shares</p>
              <p className="text-xl font-bold text-blue-600">
                {formatNumber(userData.poolShares)} rLP
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Pool Value</p>
              <p className="text-xl font-bold text-green-600">
                ${formatNumber(userData.poolValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Used Margin</p>
              <p className="text-xl font-bold text-orange-600">
                ${formatNumber(userData.totalMargin)}
              </p>
            </div>
          </div>

          {userData.poolShares > 0 && (
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Pool Share:</span>
                <Badge variant="outline">
                  {formatPercentage(userData.poolShares / poolData.totalShares)}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 存取操作 */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pool Operations
          </CardTitle>
          <CardDescription>
            Deposit to earn rewards or withdraw your shares
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deposit">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            </TabsList>

            {/* 存入 */}
            <TabsContent value="deposit" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Deposit Amount (USDC)</label>
                  <div className="mt-1 relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      disabled={transaction.isLoading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-1 top-1 h-8"
                      onClick={() => setDepositAmount(userData.balance.toString())}
                    >
                      Max
                    </Button>
                  </div>
                  {depositAmount && !isNaN(Number(depositAmount)) && (
                    <p className="text-xs text-gray-300 font-medium mt-1">
                      Expected rLP: ~{formatNumber(calculateExpectedShares(Number(depositAmount)))}
                    </p>
                  )}
                </div>

                {/* 输入验证和提示 */}
                {depositAmount && (
                  <div className="space-y-2">
                    {Number(depositAmount) > userData.balance && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Insufficient balance. Available: ${formatNumber(userData.balance)} USDC
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {Number(depositAmount) > 0 && Number(depositAmount) < 1 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Minimum deposit amount is 1 USDC
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {Number(depositAmount) > usdcAllowance && Number(depositAmount) <= userData.balance && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Need approval: ${formatNumber(Number(depositAmount) - usdcAllowance)} USDC
                          <br />Current allowance: ${formatNumber(usdcAllowance)} USDC
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <Button 
                  onClick={showDepositConfirm}
                  disabled={
                    !depositAmount || 
                    isNaN(Number(depositAmount)) || 
                    Number(depositAmount) <= 0 || 
                    Number(depositAmount) > userData.balance ||
                    transaction.isLoading
                  }
                  className="w-full"
                  size="lg"
                >
                  {transaction.isLoading ? (
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                  )}
                  {Number(depositAmount) > usdcAllowance ? 'Approve & Deposit' : 'Deposit to Pool'}
                </Button>
                
                {/* 存入提示 */}
                {depositAmount && Number(depositAmount) > 0 && Number(depositAmount) <= userData.balance && (
                  <div className="text-xs text-gray-300 font-medium space-y-1">
                    <div className="flex justify-between">
                      <span>Expected rLP Shares:</span>
                      <span className="font-medium">~{formatNumber(calculateExpectedShares(Number(depositAmount)))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pool Share After Deposit:</span>
                      <span className="font-medium">
                        ~{formatPercentage((userData.poolShares + calculateExpectedShares(Number(depositAmount))) / (poolData.totalShares + calculateExpectedShares(Number(depositAmount))))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 提取 */}
            <TabsContent value="withdraw" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Withdraw Shares (rLP)</label>
                  <div className="mt-1 relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={withdrawShares}
                      onChange={(e) => setWithdrawShares(e.target.value)}
                      disabled={transaction.isLoading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-1 top-1 h-8"
                      onClick={() => setWithdrawShares(userData.poolShares.toString())}
                    >
                      Max
                    </Button>
                  </div>
                  {withdrawShares && !isNaN(Number(withdrawShares)) && (
                    <p className="text-xs text-gray-300 font-medium mt-1">
                      Expected USDC: ~${formatNumber(calculateExpectedAmount(Number(withdrawShares)))}
                    </p>
                  )}
                </div>

                {/* 提取验证和提示 */}
                {withdrawShares && (
                  <div className="space-y-2">
                    {Number(withdrawShares) > userData.poolShares && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Insufficient shares. Available: {formatNumber(userData.poolShares)} rLP
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={showWithdrawConfirm}
                  disabled={
                    !withdrawShares || 
                    isNaN(Number(withdrawShares)) || 
                    Number(withdrawShares) <= 0 || 
                    Number(withdrawShares) > userData.poolShares ||
                    transaction.isLoading
                  }
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  {transaction.isLoading ? (
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 mr-2" />
                  )}
                  Withdraw from Pool
                </Button>
                
                {/* 提取提示 */}
                {withdrawShares && Number(withdrawShares) > 0 && Number(withdrawShares) <= userData.poolShares && (
                  <div className="text-xs text-gray-300 font-medium space-y-1">
                    <div className="flex justify-between">
                      <span>Expected USDC:</span>
                      <span className="font-medium">~${formatNumber(calculateExpectedAmount(Number(withdrawShares)))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pool Share After Withdrawal:</span>
                      <span className="font-medium">
                        ~{formatPercentage(Math.max(0, userData.poolShares - Number(withdrawShares)) / Math.max(1, poolData.totalShares - Number(withdrawShares)))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* 交易状态 */}
          {transaction.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{transaction.error}</AlertDescription>
            </Alert>
          )}

          {transaction.hash && transaction.status === TransactionStatus.SUCCESS && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Transaction successful! 
                <a 
                  href={`https://sepolia.arbiscan.io/tx/${transaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline ml-1"
                >
                  View on Explorer
                </a>
              </AlertDescription>
            </Alert>
          )}

          {transaction.isLoading && (
            <Alert className="mt-4">
              <Loader className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Transaction in progress...
                {transaction.hash && (
                  <a 
                    href={`https://sepolia.arbiscan.io/tx/${transaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline ml-1"
                  >
                    View on Explorer
                  </a>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      </div>
      
      {/* 交易历史 */}
      <TransactionHistory 
        userAddress={userAddress}
        isConnected={isConnected}
        chainId={web3Manager.currentChainId || 421614}
      />
      
      {/* 交易确认对话框 */}
      <TransactionConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={() => {
          setConfirmDialog(prev => ({ ...prev, open: false }));
          confirmDialog.action();
        }}
        type={confirmDialog.type}
        amount={confirmDialog.type === 'deposit' ? Number(depositAmount) : 
                confirmDialog.type === 'withdraw' ? calculateExpectedAmount(Number(withdrawShares)) : 
                Number(depositAmount)}
        shares={confirmDialog.type === 'withdraw' ? Number(withdrawShares) : undefined}
        expectedShares={confirmDialog.type === 'deposit' ? calculateExpectedShares(Number(depositAmount)) : undefined}
        expectedAmount={confirmDialog.type === 'withdraw' ? calculateExpectedAmount(Number(withdrawShares)) : undefined}
        currentBalance={userData.balance}
        currentShares={userData.poolShares}
        usdcAllowance={usdcAllowance}
        isLoading={transaction.isLoading}
      />
    </div>
  );
};

export default RiverPoolInterface;