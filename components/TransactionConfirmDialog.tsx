import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { formatNumber, formatPercentage } from '../utils/web3Utils';
import { 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Clock
} from 'lucide-react';

interface TransactionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type: 'deposit' | 'withdraw' | 'approve';
  amount?: number;
  shares?: number;
  expectedShares?: number;
  expectedAmount?: number;
  currentBalance?: number;
  currentShares?: number;
  usdcAllowance?: number;
  ethBalance?: number;
  gasEstimate?: string;
  isLoading?: boolean;
}

const TransactionConfirmDialog: React.FC<TransactionConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  type,
  amount,
  shares,
  expectedShares,
  expectedAmount,
  currentBalance,
  currentShares,
  usdcAllowance,
  ethBalance,
  gasEstimate,
  isLoading = false
}) => {

  const getTransactionIcon = () => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="h-6 w-6 text-green-600" />;
      case 'withdraw':
        return <TrendingDown className="h-6 w-6 text-red-600" />;
      case 'approve':
        return <Zap className="h-6 w-6 text-blue-600" />;
      default:
        return <DollarSign className="h-6 w-6 text-gray-300" />;
    }
  };

  const getTransactionTitle = () => {
    switch (type) {
      case 'deposit':
        return 'Confirm Pool Deposit';
      case 'withdraw':
        return 'Confirm Pool Withdrawal';
      case 'approve':
        return 'Confirm USDC Approval';
      default:
        return 'Confirm Transaction';
    }
  };

  const getTransactionDescription = () => {
    switch (type) {
      case 'deposit':
        return 'You are about to deposit USDC into the RiverPool liquidity pool.';
      case 'withdraw':
        return 'You are about to withdraw your shares from the RiverPool liquidity pool.';
      case 'approve':
        return 'You need to approve USDC spending for the RiverBit contract.';
      default:
        return 'Please review your transaction details before confirming.';
    }
  };

  const hasWarnings = () => {
    const warnings = [];
    
    if (ethBalance !== undefined && ethBalance < 0.01) {
      warnings.push('Low ETH balance for gas fees');
    }
    
    if (type === 'deposit' && amount && currentBalance && amount > currentBalance * 0.9) {
      warnings.push('Using more than 90% of your USDC balance');
    }
    
    if (type === 'withdraw' && shares && currentShares && shares > currentShares * 0.9) {
      warnings.push('Withdrawing more than 90% of your pool shares');
    }
    
    return warnings;
  };

  const warnings = hasWarnings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getTransactionIcon()}
            {getTransactionTitle()}
          </DialogTitle>
          <DialogDescription>
            {getTransactionDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 交易详情 */}
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">Transaction Details</h4>
            
            {type === 'deposit' && amount && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-300">Deposit Amount:</span>
                  <span className="font-medium">${formatNumber(amount)} USDC</span>
                </div>
                {expectedShares && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Expected rLP Shares:</span>
                    <span className="font-medium text-green-600">
                      ~{formatNumber(expectedShares)} rLP
                    </span>
                  </div>
                )}
              </div>
            )}

            {type === 'withdraw' && shares && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-300">Withdraw Shares:</span>
                  <span className="font-medium">{formatNumber(shares)} rLP</span>
                </div>
                {expectedAmount && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Expected USDC:</span>
                    <span className="font-medium text-green-600">
                      ~${formatNumber(expectedAmount)} USDC
                    </span>
                  </div>
                )}
              </div>
            )}

            {type === 'approve' && amount && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-300">Approval Amount:</span>
                  <span className="font-medium">${formatNumber(amount)} USDC</span>
                </div>
                {usdcAllowance !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">Current Allowance:</span>
                    <span className="font-medium">${formatNumber(usdcAllowance)} USDC</span>
                  </div>
                )}
              </div>
            )}

            {gasEstimate && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-gray-300">Estimated Gas:</span>
                <span className="font-medium text-blue-600">{gasEstimate} ETH</span>
              </div>
            )}
          </div>

          {/* 余额信息 */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-blue-900">Your Balances</h4>
            {currentBalance !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">USDC Balance:</span>
                <span className="font-medium text-blue-900">
                  ${formatNumber(currentBalance)} USDC
                </span>
              </div>
            )}
            {currentShares !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">Pool Shares:</span>
                <span className="font-medium text-blue-900">
                  {formatNumber(currentShares)} rLP
                </span>
              </div>
            )}
            {ethBalance !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">ETH Balance:</span>
                <span className="font-medium text-blue-900">
                  {ethBalance.toFixed(4)} ETH
                </span>
              </div>
            )}
          </div>

          {/* 警告信息 */}
          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Please note:</p>
                  {warnings.map((warning, index) => (
                    <p key={index} className="text-sm">• {warning}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <Clock className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isLoading ? 'Confirming...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionConfirmDialog;