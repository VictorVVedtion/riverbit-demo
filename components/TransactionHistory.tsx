import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  transactionHistory, 
  TransactionRecord, 
  getTransactionExplorerUrl, 
  formatTimestamp 
} from '../utils/transactionHistory';
import { formatNumber } from '../utils/web3Utils';
import { 
  History, 
  ExternalLink, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  Clock,
  Info,
  Trash2
} from 'lucide-react';

interface TransactionHistoryProps {
  userAddress?: string;
  isConnected: boolean;
  chainId?: number;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  userAddress,
  isConnected,
  chainId = 421614
}) => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载交易历史
  const loadTransactions = () => {
    if (!userAddress) return;
    
    setIsLoading(true);
    try {
      const userTransactions = transactionHistory.getUserTransactions(userAddress);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除历史记录
  const clearHistory = () => {
    if (!userAddress) return;
    
    transactionHistory.clearUserTransactions(userAddress);
    setTransactions([]);
  };

  // 初始化和刷新
  useEffect(() => {
    if (isConnected && userAddress) {
      loadTransactions();
    } else {
      setTransactions([]);
    }
  }, [isConnected, userAddress]);

  // 获取交易状态图标
  const getStatusIcon = (status: TransactionRecord['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600 animate-pulse" />;
      default:
        return <Info className="h-4 w-4 text-gray-300" />;
    }
  };

  // 获取交易类型图标
  const getTypeIcon = (type: TransactionRecord['type']) => {
    switch (type) {
      case 'pool_deposit':
      case 'deposit':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'pool_withdraw':
      case 'withdraw':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
    }
  };

  // 获取统计信息
  const stats = userAddress ? transactionHistory.getUserStats(userAddress) : null;

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            View your recent transactions and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to view transaction history
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Your recent transactions and activity
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadTransactions}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          {transactions.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearHistory}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Total Transactions</p>
              <p className="text-xl font-bold">{stats.totalTransactions}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Success Rate</p>
              <p className="text-xl font-bold text-green-600">
                {stats.totalTransactions > 0 
                  ? Math.round((stats.successfulTransactions / stats.totalTransactions) * 100)
                  : 0}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Total Deposited</p>
              <p className="text-xl font-bold text-blue-600">
                ${formatNumber(stats.totalDeposited)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-300">Total Withdrawn</p>
              <p className="text-xl font-bold text-orange-600">
                ${formatNumber(stats.totalWithdrawn)}
              </p>
            </div>
          </div>
        )}

        {/* 交易列表 */}
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-300 font-medium mb-2">No transactions found</p>
              <p className="text-sm text-gray-300 font-medium">
                Your transaction history will appear here after you start trading
              </p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(tx.type)}
                    {getStatusIcon(tx.status)}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {transactionHistory.constructor.formatTransactionType(tx.type)}
                      </span>
                      <Badge 
                        variant={tx.status === 'success' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {transactionHistory.constructor.formatTransactionStatus(tx.status).text}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-300 space-x-4">
                      <span>{formatTimestamp(tx.timestamp)}</span>
                      {tx.amount && (
                        <span>
                          Amount: ${formatNumber(tx.amount)}
                        </span>
                      )}
                      {tx.shares && (
                        <span>
                          Shares: {formatNumber(tx.shares)} rLP
                        </span>
                      )}
                    </div>
                    
                    {tx.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {tx.error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={getTransactionExplorerUrl(tx.hash, chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页信息 */}
        {transactions.length > 0 && (
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-300 font-medium">
              Showing {transactions.length} recent transactions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;