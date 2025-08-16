import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Droplets, 
  ArrowUpCircle, 
  ArrowDownCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Shield,
  Target
} from 'lucide-react';
import { useRiverBitWeb3 } from '../../providers/RiverBitWeb3Provider';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { NETWORK_CONFIG } from '../../constants/contractConstants';
import { toast } from 'sonner';

interface PoolManagerProps {
  className?: string;
}

interface PoolStats {
  totalValueLocked: string;
  totalShares: string;
  sharePrice: string;
  apy: string;
  userShares: string;
  userValue: string;
  pendingRewards: string;
}

export default function EnhancedPoolManager({ className }: PoolManagerProps) {
  // Web3 state
  const {
    isConnected,
    address,
    chainId,
    isValidNetwork,
    usdcBalance,
    allowance,
    hasInfiniteAllowance,
    approveUSDC,
    refreshData
  } = useRiverBitWeb3();

  // Local state
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [poolStats, setPoolStats] = useState<PoolStats>({
    totalValueLocked: '0',
    totalShares: '0', 
    sharePrice: '1.00',
    apy: '12.5',
    userShares: '0',
    userValue: '0',
    pendingRewards: '0'
  });

  // Contract interactions
  const { writeContract: writeContractAction } = useWriteContract();
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash as `0x${string}` | undefined,
  });

  // Get contract address
  const contractAddresses = chainId ? NETWORK_CONFIG[chainId]?.contracts : null;

  // Load pool data
  useEffect(() => {
    if (isConnected && address && isValidNetwork) {
      loadPoolData();
    }
  }, [isConnected, address, isValidNetwork]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && pendingTxHash) {
      toast.success('Transaction confirmed!');
      setAmount('');
      setPendingTxHash(null);
      setIsLoading(false);
      refreshData();
      loadPoolData();
    }
  }, [isConfirmed, pendingTxHash]);

  const loadPoolData = async () => {
    try {
      // Mock pool data for now - replace with real contract calls
      setPoolStats({
        totalValueLocked: '1,250,000',
        totalShares: '1,200,000',
        sharePrice: '1.042',
        apy: '15.8',
        userShares: '5,250',
        userValue: '5,470.50',
        pendingRewards: '125.75'
      });
    } catch (error) {
      console.error('Failed to load pool data:', error);
    }
  };

  const handlePercentageClick = (percentage: number) => {
    if (activeTab === 'deposit') {
      const maxAmount = parseFloat(usdcBalance) || 0;
      const targetAmount = (maxAmount * percentage) / 100;
      setAmount(targetAmount.toFixed(2));
    } else {
      const maxShares = parseFloat(poolStats.userShares.replace(/,/g, '')) || 0;
      const targetShares = (maxShares * percentage) / 100;
      setAmount(targetShares.toFixed(2));
    }
  };

  const validateAmount = () => {
    const numAmount = parseFloat(amount);
    
    if (!amount || numAmount <= 0) {
      return { valid: false, error: 'Please enter a valid amount' };
    }

    if (activeTab === 'deposit') {
      const usdcBal = parseFloat(usdcBalance);
      if (numAmount > usdcBal) {
        return { valid: false, error: `Insufficient USDC balance. Available: $${usdcBal.toFixed(2)}` };
      }
      
      if (!hasInfiniteAllowance && numAmount > parseFloat(allowance)) {
        return { valid: false, error: 'Insufficient allowance. Please approve USDC first.' };
      }
    } else {
      const userShares = parseFloat(poolStats.userShares.replace(/,/g, ''));
      if (numAmount > userShares) {
        return { valid: false, error: `Insufficient shares. Available: ${userShares.toFixed(2)}` };
      }
    }

    return { valid: true, error: null };
  };

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      const approveAmount = Math.max(parseFloat(amount) * 2, 10000); // Approve 2x or 10,000 USDC minimum
      await approveUSDC(approveAmount.toString());
      toast.success('USDC approval successful!');
    } catch (error: any) {
      toast.error(`Approval failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    const validation = validateAmount();
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }

    if (!contractAddresses?.lpBucketManager) {
      toast.error('LP Bucket Manager contract not found');
      return;
    }

    try {
      setIsLoading(true);
      const amountWei = parseUnits(amount, 6); // USDC has 6 decimals

      const txHash = await writeContractAction({
        address: contractAddresses.lpBucketManager,
        abi: [
          {
            "inputs": [{"name": "amount", "type": "uint256"}],
            "name": "deposit",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'deposit',
        args: [amountWei],
      });

      setPendingTxHash(txHash);
      toast.success('Deposit transaction submitted!');
      
    } catch (error: any) {
      setIsLoading(false);
      console.error('Deposit failed:', error);
      toast.error(`Deposit failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleWithdraw = async () => {
    const validation = validateAmount();
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }

    if (!contractAddresses?.lpBucketManager) {
      toast.error('LP Bucket Manager contract not found');
      return;
    }

    try {
      setIsLoading(true);
      const sharesWei = parseUnits(amount, 6); // Shares also use 6 decimals

      const txHash = await writeContractAction({
        address: contractAddresses.lpBucketManager,
        abi: [
          {
            "inputs": [{"name": "shares", "type": "uint256"}],
            "name": "withdraw", 
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'withdraw',
        args: [sharesWei],
      });

      setPendingTxHash(txHash);
      toast.success('Withdraw transaction submitted!');
      
    } catch (error: any) {
      setIsLoading(false);
      console.error('Withdraw failed:', error);
      toast.error(`Withdraw failed: ${error.message || 'Unknown error'}`);
    }
  };

  const validation = validateAmount();
  const needsApproval = activeTab === 'deposit' && !hasInfiniteAllowance && parseFloat(amount) > parseFloat(allowance);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Pool Statistics */}
      <Card className="bg-gradient-to-br from-surface-1 to-surface-2 border-default/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Droplets className="w-5 h-5 text-river-blue" />
              <span>RiverPool Analytics</span>
            </div>
            <Button variant="ghost" size="sm" onClick={loadPoolData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <div className="text-xs text-secondary mb-1">Total Value Locked</div>
              <div className="text-lg font-bold text-river-blue">${poolStats.totalValueLocked}</div>
            </div>
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <div className="text-xs text-secondary mb-1">Share Price</div>
              <div className="text-lg font-bold text-profit">${poolStats.sharePrice}</div>
            </div>
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <div className="text-xs text-secondary mb-1">APY</div>
              <div className="text-lg font-bold text-loss">{poolStats.apy}%</div>
            </div>
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <div className="text-xs text-secondary mb-1">Your Value</div>
              <div className="text-lg font-bold text-primary">${poolStats.userValue}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Selector */}
      <div className="flex bg-surface-2 rounded-lg p-1 border border-default/30">
        <Button
          variant="ghost"
          className={`flex-1 ${activeTab === 'deposit' 
            ? 'bg-river-blue text-white shadow-md' 
            : 'text-secondary hover:text-primary'
          }`}
          onClick={() => setActiveTab('deposit')}
        >
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Deposit
        </Button>
        <Button
          variant="ghost"
          className={`flex-1 ${activeTab === 'withdraw' 
            ? 'bg-river-blue text-white shadow-md' 
            : 'text-secondary hover:text-primary'
          }`}
          onClick={() => setActiveTab('withdraw')}
        >
          <ArrowDownCircle className="w-4 h-4 mr-2" />
          Withdraw
        </Button>
      </div>

      {/* Main Interface */}
      <Card className="bg-gradient-to-br from-surface-1 to-surface-2 border-default/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {activeTab === 'deposit' ? (
              <>
                <TrendingUp className="w-5 h-5 text-profit" />
                <span>Deposit to RiverPool</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-5 h-5 text-loss" />
                <span>Withdraw from RiverPool</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          {!isConnected && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to access RiverPool
              </AlertDescription>
            </Alert>
          )}

          {isConnected && !isValidNetwork && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please switch to Arbitrum Sepolia network
              </AlertDescription>
            </Alert>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">
                {activeTab === 'deposit' ? 'Deposit Amount (USDC)' : 'Withdraw Shares'}
              </label>
              <span className="text-xs text-secondary">
                Available: {activeTab === 'deposit' 
                  ? `$${parseFloat(usdcBalance).toFixed(2)}` 
                  : `${poolStats.userShares} shares`
                }
              </span>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-12 text-lg bg-surface-3 border-default/50 focus:border-river-blue"
            />
            
            {/* Percentage buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((percentage) => (
                <Button
                  key={percentage}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePercentageClick(percentage)}
                  className="h-8 text-xs"
                >
                  {percentage}%
                </Button>
              ))}
            </div>
          </div>

          {/* Transaction Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-surface-3/50 rounded-lg p-3 space-y-2 text-sm">
              <h4 className="font-medium">Transaction Preview</h4>
              {activeTab === 'deposit' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-secondary">Deposit Amount:</span>
                    <span className="font-bold">${parseFloat(amount).toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Estimated Shares:</span>
                    <span className="font-bold text-river-blue">
                      {(parseFloat(amount) / parseFloat(poolStats.sharePrice)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Share Price:</span>
                    <span className="font-bold">${poolStats.sharePrice}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-secondary">Withdraw Shares:</span>
                    <span className="font-bold">{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Estimated USDC:</span>
                    <span className="font-bold text-river-blue">
                      ${(parseFloat(amount) * parseFloat(poolStats.sharePrice)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Share Price:</span>
                    <span className="font-bold">${poolStats.sharePrice}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error Display */}
          {!validation.valid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validation.error}</AlertDescription>
            </Alert>
          )}

          {/* Transaction Status */}
          {pendingTxHash && (
            <Alert>
              <div className="flex items-center space-x-2">
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <AlertDescription>
                  Transaction {isConfirming ? 'confirming...' : 'confirmed!'}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-1"
                    onClick={() => window.open(`https://sepolia.arbiscan.io/tx/${pendingTxHash}`, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {needsApproval && (
              <Button
                onClick={handleApprove}
                disabled={isLoading || !isConnected || !isValidNetwork}
                className="w-full bg-river-blue hover:bg-river-blue-light"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Approve USDC
              </Button>
            )}

            <Button
              onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={
                isLoading || 
                !isConnected || 
                !isValidNetwork || 
                !validation.valid || 
                needsApproval ||
                isConfirming
              }
              className={`w-full ${
                activeTab === 'deposit' 
                  ? 'bg-profit hover:bg-profit/90' 
                  : 'bg-loss hover:bg-loss/90'
              }`}
              size="lg"
            >
              {isLoading || isConfirming ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : activeTab === 'deposit' ? (
                <ArrowUpCircle className="w-4 h-4 mr-2" />
              ) : (
                <ArrowDownCircle className="w-4 h-4 mr-2" />
              )}
              
              {isLoading || isConfirming
                ? 'Processing...'
                : `${activeTab === 'deposit' ? 'Deposit' : 'Withdraw'} ${
                    amount ? (activeTab === 'deposit' ? `$${amount}` : `${amount} shares`) : ''
                  }`
              }
            </Button>
          </div>

          {/* Risk Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Risk Notice:</strong> RiverPool involves smart contract risks and impermanent loss. 
              Past performance does not guarantee future results. Please understand the risks before participating.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}