import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Minus, RefreshCw, AlertTriangle, DollarSign, TrendingDown, Shield, Zap, Target, Activity, Loader2, CheckCircle, ExternalLink, Droplets } from 'lucide-react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import RiverBentoGrid from '../ui/RiverBentoGrid';
import { poolData, userData } from '../../data/riverPoolData';
import { useRiverBitWeb3 } from '../../providers/RiverBitWeb3Provider';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { NETWORK_CONFIG } from '../../constants/contractConstants';
import { toast } from 'sonner';

interface WithdrawTabProps {
  withdrawAmount: string;
  setWithdrawAmount: (value: string) => void;
  isWithdrawing: boolean;
  onWithdraw: () => void;
  riskStatus: { drawdown: string };
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

export const WithdrawTab: React.FC<WithdrawTabProps> = ({
  withdrawAmount,
  setWithdrawAmount,
  isWithdrawing,
  onWithdraw,
  riskStatus
}) => {
  // Web3 state
  const {
    isConnected,
    address,
    chainId,
    isValidNetwork,
    usdcBalance,
    refreshData
  } = useRiverBitWeb3();

  // Local state for Web3 operations
  const [isLoadingWeb3, setIsLoadingWeb3] = useState(false);
  const [poolStats, setPoolStats] = useState<PoolStats>({
    totalValueLocked: '1,250,000',
    totalShares: '1,200,000',
    sharePrice: '1.042',
    apy: '15.8',
    userShares: '5,250',
    userValue: '5,470.50',
    pendingRewards: '125.75'
  });

  // Contract interactions
  const { writeContract: writeContractAction } = useWriteContract();
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash as `0x${string}` | undefined,
  });

  // Get contract address
  const contractAddresses = chainId ? NETWORK_CONFIG[chainId]?.contracts : null;

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && pendingTxHash) {
      toast.success('Withdraw transaction confirmed!');
      setWithdrawAmount('');
      setPendingTxHash(null);
      setIsLoadingWeb3(false);
      refreshData();
      loadPoolData();
    }
  }, [isConfirmed, pendingTxHash]);

  // Load pool data
  const loadPoolData = async () => {
    if (isConnected && address && isValidNetwork) {
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
    }
  };

  useEffect(() => {
    if (isConnected && address && isValidNetwork) {
      loadPoolData();
    }
  }, [isConnected, address, isValidNetwork]);

  // Calculate withdraw metrics
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const withdrawAmountInShares = withdrawAmountNum / parseFloat(poolStats.sharePrice);
  const exitFee = (riskStatus.drawdown === 'danger') ? withdrawAmountNum * 0.01 : 0;
  const netWithdraw = withdrawAmountNum - exitFee;
  const isRiskRestricted = riskStatus.drawdown === 'danger';
  
  // Use real user shares when connected, fallback to mock data
  const availableShares = isConnected ? parseFloat(poolStats.userShares.replace(/,/g, '')) : userData.rLPHolding;
  const maxWithdrawValue = availableShares * parseFloat(poolStats.sharePrice);
  const hasValidAmount = withdrawAmountNum > 0 && withdrawAmountNum <= maxWithdrawValue;
  
  // Web3 validation
  const canWithdraw = isConnected && isValidNetwork && hasValidAmount;

  // Web3 withdraw handler
  const handleWeb3Withdraw = async () => {
    if (!contractAddresses?.lpBucketManager) {
      toast.error('LP Bucket Manager contract not found');
      return;
    }

    if (!hasValidAmount) {
      toast.error('Invalid withdraw amount');
      return;
    }

    try {
      setIsLoadingWeb3(true);
      const sharesWei = parseUnits(withdrawAmountInShares.toString(), 6); // Shares use 6 decimals

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
      setIsLoadingWeb3(false);
      console.error('Withdraw failed:', error);
      toast.error(`Withdraw failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* River Withdraw Header - Professional Design */}
      <LiquidGlassCard 
        variant="intense" 
        className="p-6 border border-river-warning/30 bg-gradient-to-r from-river-depth/80 to-river-warning/10 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-river-warning to-river-glow rounded-xl flex items-center justify-center shadow-lg shadow-river-warning/30">
              <Minus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Withdraw USDC</h2>
              <p className="text-river-warning/80 text-sm font-medium">智能做市池流動性提取 • Liquidity Withdrawal</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-white">
              Your Value: ${isConnected ? poolStats.userValue : '0.00'}
            </div>
            <div className="text-sm text-river-warning font-semibold flex items-center justify-end gap-2">
              <TrendingDown className="w-4 h-4" />
              Current APY: {poolStats.apy}%
            </div>
          </div>
        </div>
        
        {/* River Quick Withdraw Buttons - Professional Mobile-First */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0.25, 0.5, 0.75, 1].map((percentage, index) => {
            const amount = maxWithdrawValue * percentage;
            return (
              <button
                key={index}
                onClick={() => setWithdrawAmount(amount.toString())}
                className="p-4 bg-river-surface/10 hover:bg-river-warning/15 rounded-xl border border-river-surface/20 hover:border-river-warning/40 transition-all duration-300 group shadow-lg hover:shadow-river-warning/20"
              >
                <div className="text-sm text-river-surface/70 mb-2 font-medium">
                  {percentage === 1 ? 'Max Amount' : `${Math.round(percentage * 100)}% Withdraw`}
                </div>
                <div className="text-white font-bold group-hover:text-river-warning transition-colors number-animate text-lg">
                  ${amount.toLocaleString()}
                </div>
                {percentage === 1 && (
                  <div className="text-xs text-gray-400 mt-1">All shares</div>
                )}
              </button>
            );
          })}
        </div>
      </LiquidGlassCard>

      {/* Professional Withdraw Interface */}
      <RiverBentoGrid columns={12} spacing="normal">
        {/* Withdraw Input Panel */}
        <div className="lg:col-span-7 col-span-12">
          <LiquidGlassCard 
            variant="trading" 
            className="p-6 h-full"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-river-warning to-river-glow rounded-xl flex items-center justify-center shadow-lg shadow-river-warning/25">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Withdraw Amount</h3>
                <p className="text-sm text-river-warning/60">Enter USDC value to withdraw</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-river-warning font-semibold mb-3 block text-sm">Withdraw Amount (USDC)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-river-depth/60 border border-river-surface/30 text-white text-xl font-mono pl-4 pr-16 py-4 rounded-xl focus:border-river-warning focus:ring-2 focus:ring-river-warning/20 transition-all duration-300 backdrop-blur-sm"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-river-surface/70 font-semibold">
                    USDC
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-400">
                    Your Shares: <span className="font-mono text-white font-semibold">{isConnected ? poolStats.userShares : '0'}</span>
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setWithdrawAmount(maxWithdrawValue.toString())}
                    className="text-river-warning border-river-warning/50 hover:bg-river-warning/10 hover:border-river-warning transition-all duration-300 font-semibold"
                  >
                    Use Max
                  </Button>
                </div>
              </div>

              {/* River Enhanced Calculation Preview */}
              {hasValidAmount && (
                <div className="p-4 bg-gradient-to-r from-river-warning/10 to-river-glow/10 rounded-xl border border-river-warning/30 space-y-3 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-river-surface/80 font-medium">Shares to Burn</span>
                    <div className="text-right">
                      <div className="font-bold text-river-warning font-mono text-lg">
                        {withdrawAmountInShares.toFixed(6)} shares
                      </div>
                      <div className="text-xs text-gray-400">
                        @ ${poolStats.sharePrice}/share
                      </div>
                    </div>
                  </div>
                  
                  {isRiskRestricted && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-river-surface/80 font-medium">Exit Fee (1%)</span>
                      <span className="text-river-loss font-mono font-semibold">
                        -${exitFee.toFixed(2)} USDC
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-river-surface/80 font-medium">Net Withdrawal</span>
                    <span className="text-white font-bold font-mono">
                      ${netWithdraw.toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              )}

              {/* Web3 Connection Status */}
              {!isConnected && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please connect your wallet to access real pool withdrawals
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

              {/* River Professional Action Button */}
              <Button 
                onClick={isConnected ? handleWeb3Withdraw : onWithdraw}
                disabled={
                  isWithdrawing || 
                  isLoadingWeb3 || 
                  isConfirming ||
                  !hasValidAmount || 
                  (isConnected && !isValidNetwork)
                }
                className={`w-full h-14 text-lg font-bold tracking-wide transition-all duration-300 rounded-xl border-0 bg-gradient-to-r from-river-warning to-river-glow hover:from-river-glow hover:to-river-warning shadow-lg shadow-river-warning/30 hover:shadow-river-warning/50`}
              >
                {isWithdrawing || isLoadingWeb3 || isConfirming ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Processing Withdrawal...'}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-3" />
                    {isConnected ? 'Withdraw from Pool' : 'Demo Withdraw'}
                  </>
                )}
              </Button>

              {/* River Risk Warning */}
              {isRiskRestricted && (
                <LiquidGlassCard 
                  variant="subtle" 
                  className="p-4 border border-river-loss/50 bg-river-loss/10 shadow-lg shadow-river-loss/20"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-river-loss/20 text-river-loss">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1 text-river-loss">High Risk Alert</h4>
                      <p className="text-gray-300 text-sm">
                        1% exit fee applied due to high pool drawdown.
                      </p>
                    </div>
                  </div>
                </LiquidGlassCard>
              )}
            </div>
          </LiquidGlassCard>
        </div>

        {/* Pool Statistics & User Metrics */}
        <div className="lg:col-span-5 col-span-12 space-y-4">
          {/* User Position */}
          <LiquidGlassCard 
            variant="trading" 
            className="p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-river-glow to-river-flow rounded-xl flex items-center justify-center shadow-lg shadow-river-glow/25">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Your Position</h3>
                <p className="text-sm text-river-glow/60">Current holdings</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-river-profit/5 rounded-lg">
                <span className="text-gray-400 font-medium">Total Value</span>
                <span className="text-river-profit font-bold">${isConnected ? poolStats.userValue : '0.00'}</span>
              </div>
              <div className="flex justify-between p-2 bg-river-surface/5 rounded-lg">
                <span className="text-gray-400 font-medium">Your Shares</span>
                <span className="text-white font-mono">{isConnected ? poolStats.userShares : '0'}</span>
              </div>
              <div className="flex justify-between p-2 bg-river-glow/5 rounded-lg">
                <span className="text-gray-400 font-medium">Pending Rewards</span>
                <span className="text-white font-mono">${isConnected ? poolStats.pendingRewards : '0.00'}</span>
              </div>
              <div className="flex justify-between p-2 bg-river-flow/5 rounded-lg">
                <span className="text-gray-400 font-medium">Share Price</span>
                <span className="text-river-flow font-mono">${poolStats.sharePrice}</span>
              </div>
            </div>
          </LiquidGlassCard>

          {/* Withdrawal Impact */}
          <LiquidGlassCard 
            variant="trading" 
            className="p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-river-warning to-river-flow rounded-xl flex items-center justify-center shadow-lg shadow-river-warning/25">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Withdrawal Impact</h3>
                <p className="text-sm text-river-warning/60">Transaction effects</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-river-warning/5 rounded-lg">
                <span className="text-gray-400 font-medium">Remaining Value</span>
                <span className="text-white font-mono">
                  ${isConnected ? (parseFloat(poolStats.userValue.replace(/,/g, '')) - withdrawAmountNum).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-river-surface/5 rounded-lg">
                <span className="text-gray-400 font-medium">Network</span>
                <span className={`font-mono flex items-center gap-2 ${
                  isConnected && isValidNetwork ? 'text-river-profit' : 'text-river-warning'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected && isValidNetwork ? 'bg-river-profit' : 'bg-river-warning'
                  } animate-pulse`}></div>
                  {isConnected && isValidNetwork ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-river-loss/5 rounded-lg">
                <span className="text-gray-400 font-medium">Exit Fee</span>
                <span className={`font-bold ${
                  isRiskRestricted ? 'text-river-loss' : 'text-river-profit'
                }`}>
                  {isRiskRestricted ? '1%' : '0%'}
                </span>
              </div>
            </div>
          </LiquidGlassCard>

          {/* Market Status */}
          <LiquidGlassCard 
            variant="trading" 
            className="p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-river-flow to-river-glow rounded-xl flex items-center justify-center shadow-lg shadow-river-flow/25">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Pool Status</h3>
                <p className="text-sm text-river-flow/60">Real-time conditions</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-river-profit/5 rounded-lg">
                <span className="text-gray-400 font-medium">Total Locked</span>
                <span className="text-white font-mono">${poolStats.totalValueLocked}</span>
              </div>
              <div className="flex justify-between p-2 bg-river-surface/5 rounded-lg">
                <span className="text-gray-400 font-medium">Wallet</span>
                <span className={`flex items-center gap-2 ${
                  isConnected ? 'text-river-profit' : 'text-river-warning'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-river-profit' : 'bg-river-warning'
                  } animate-pulse`}></div>
                  <span className="font-medium">
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </span>
              </div>
              <div className="flex justify-between p-2 bg-river-glow/5 rounded-lg">
                <span className="text-gray-400 font-medium">Pool APY</span>
                <span className="text-river-glow font-mono">{poolStats.apy}%</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      </RiverBentoGrid>
    </div>
  );
};