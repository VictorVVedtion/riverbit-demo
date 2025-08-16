import { TransactionStatus } from './web3Utils';

export interface TransactionRecord {
  id: string;
  hash: string;
  type: 'deposit' | 'withdraw' | 'pool_deposit' | 'pool_withdraw' | 'approve_usdc';
  status: TransactionStatus;
  amount?: number;
  shares?: number;
  timestamp: number;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  userAddress: string;
}

class TransactionHistoryManager {
  private storageKey = 'riverbit_transaction_history';
  private maxRecords = 100; // 最多保存100条记录

  // 获取用户的交易历史
  getUserTransactions(userAddress: string): TransactionRecord[] {
    const allTransactions = this.getAllTransactions();
    return allTransactions
      .filter(tx => tx.userAddress.toLowerCase() === userAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp); // 最新的在前面
  }

  // 添加新的交易记录
  addTransaction(transaction: Omit<TransactionRecord, 'id'>): string {
    const id = this.generateTransactionId();
    const newTransaction: TransactionRecord = {
      ...transaction,
      id
    };

    const allTransactions = this.getAllTransactions();
    allTransactions.unshift(newTransaction); // 添加到开头

    // 限制记录数量
    if (allTransactions.length > this.maxRecords) {
      allTransactions.splice(this.maxRecords);
    }

    this.saveTransactions(allTransactions);
    return id;
  }

  // 更新交易状态
  updateTransaction(id: string, updates: Partial<TransactionRecord>): boolean {
    const allTransactions = this.getAllTransactions();
    const index = allTransactions.findIndex(tx => tx.id === id);
    
    if (index === -1) return false;

    allTransactions[index] = { ...allTransactions[index], ...updates };
    this.saveTransactions(allTransactions);
    return true;
  }

  // 根据hash查找交易
  findTransactionByHash(hash: string): TransactionRecord | null {
    const allTransactions = this.getAllTransactions();
    return allTransactions.find(tx => tx.hash === hash) || null;
  }

  // 清除用户的交易历史
  clearUserTransactions(userAddress: string): void {
    const allTransactions = this.getAllTransactions();
    const filteredTransactions = allTransactions.filter(
      tx => tx.userAddress.toLowerCase() !== userAddress.toLowerCase()
    );
    this.saveTransactions(filteredTransactions);
  }

  // 获取所有交易记录
  private getAllTransactions(): TransactionRecord[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      // TODO: Implement proper error handling and logging service
      // For production, use a proper logging service like Sentry
      return [];
    }
  }

  // 保存交易记录
  private saveTransactions(transactions: TransactionRecord[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(transactions));
    } catch (error) {
      // TODO: Implement proper error handling
      // Consider showing user notification about storage issues
    }
  }

  // 生成交易ID
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 格式化交易类型显示
  static formatTransactionType(type: TransactionRecord['type']): string {
    switch (type) {
      case 'deposit':
        return 'Account Deposit';
      case 'withdraw':
        return 'Account Withdraw';
      case 'pool_deposit':
        return 'Pool Deposit';
      case 'pool_withdraw':
        return 'Pool Withdraw';
      case 'approve_usdc':
        return 'USDC Approval';
      default:
        return 'Unknown';
    }
  }

  // 格式化交易状态显示
  static formatTransactionStatus(status: TransactionStatus): { text: string; color: string } {
    switch (status) {
      case TransactionStatus.PENDING:
        return { text: 'Pending', color: 'text-orange-600' };
      case TransactionStatus.SUCCESS:
        return { text: 'Success', color: 'text-green-600' };
      case TransactionStatus.FAILED:
        return { text: 'Failed', color: 'text-red-600' };
      default:
        return { text: 'Unknown', color: 'text-gray-600' };
    }
  }

  // 获取统计信息
  getUserStats(userAddress: string): {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    totalDeposited: number;
    totalWithdrawn: number;
  } {
    const transactions = this.getUserTransactions(userAddress);
    
    const stats = {
      totalTransactions: transactions.length,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      totalDeposited: 0,
      totalWithdrawn: 0
    };

    transactions.forEach(tx => {
      switch (tx.status) {
        case TransactionStatus.SUCCESS:
          stats.successfulTransactions++;
          if (tx.type === 'pool_deposit' && tx.amount) {
            stats.totalDeposited += tx.amount;
          } else if (tx.type === 'pool_withdraw' && tx.amount) {
            stats.totalWithdrawn += tx.amount;
          }
          break;
        case TransactionStatus.FAILED:
          stats.failedTransactions++;
          break;
        case TransactionStatus.PENDING:
          stats.pendingTransactions++;
          break;
      }
    });

    return stats;
  }
}

// 全局实例
export const transactionHistory = new TransactionHistoryManager();

// 工具函数
export function getTransactionExplorerUrl(hash: string, chainId: number = 421614): string {
  switch (chainId) {
    case 421614:
      return `https://sepolia.arbiscan.io/tx/${hash}`;
    case 42161:
      return `https://arbiscan.io/tx/${hash}`;
    case 1:
      return `https://etherscan.io/tx/${hash}`;
    default:
      return `https://sepolia.arbiscan.io/tx/${hash}`;
  }
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}