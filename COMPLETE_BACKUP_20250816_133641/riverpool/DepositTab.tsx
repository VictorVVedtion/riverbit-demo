import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Plus, RefreshCw, AlertTriangle, DollarSign, TrendingUp, Shield, Zap, Target, Activity, Loader2, CheckCircle, ExternalLink, Droplets } from 'lucide-react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import RiverBentoGrid from '../ui/RiverBentoGrid';
import { poolData, userData } from '../../data/riverPoolData';
import { useRiverBitWeb3 } from '../../providers/RiverBitWeb3Provider';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { NETWORK_CONFIG } from '../../constants/contractConstants';
import { toast } from 'sonner';

interface DepositTabProps {
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  isDepositing: boolean;
  onDeposit: () => void;
  riskStatus: { drawdown: string };
  marketStatus: { weekend: boolean; isMarketOpen?: boolean };
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

export const DepositTab: React.FC<DepositTabProps> = ({
  depositAmount,
  setDepositAmount,
  isDepositing,
  onDeposit,
  riskStatus,
  marketStatus
}) => {
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
      toast.success('Deposit transaction confirmed!');
      setDepositAmount('');
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

  // Web3 deposit handler
  const handleWeb3Deposit = async () => {
    if (!contractAddresses?.lpBucketManager) {
      toast.error('LP Bucket Manager contract not found');
      return;
    }

    if (!hasValidAmount) {
      toast.error('Invalid deposit amount');
      return;
    }

    try {
      setIsLoadingWeb3(true);
      const amountWei = parseUnits(depositAmount, 6); // USDC has 6 decimals

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
      setIsLoadingWeb3(false);
      console.error('Deposit failed:', error);
      toast.error(`Deposit failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Approval handler
  const handleApprove = async () => {
    try {
      setIsLoadingWeb3(true);
      const approveAmount = Math.max(parseFloat(depositAmount) * 2, 10000); // Approve 2x or 10,000 USDC minimum
      await approveUSDC(approveAmount.toString());
      toast.success('USDC approval successful!');
    } catch (error: any) {
      toast.error(`Approval failed: ${error.message}`);
    } finally {
      setIsLoadingWeb3(false);
    }
  };

  // Calculate enhanced metrics
  const depositAmountNum = parseFloat(depositAmount) || 0;
  const expectedRLP = depositAmountNum > 0 ? depositAmountNum / parseFloat(poolStats.sharePrice) : 0;
  const insuranceFee = depositAmountNum * 0.01;
  const netDeposit = depositAmountNum - insuranceFee;
  const estimatedDailyReturn = depositAmountNum * (parseFloat(poolStats.apy) / 365 / 100);
  const isRiskRestricted = riskStatus.drawdown === 'danger';
  
  // Use real USDC balance when connected, fallback to mock data
  const availableBalance = isConnected ? parseFloat(usdcBalance) : userData.balance;
  const hasValidAmount = depositAmountNum > 0 && depositAmountNum <= availableBalance;
  
  // Web3 validation
  const needsApproval = isConnected && !hasInfiniteAllowance && depositAmountNum > parseFloat(allowance);
  const canDeposit = isConnected && isValidNetwork && hasValidAmount && !isRiskRestricted && !needsApproval;

  return (
    <div className="space-y-6">
      {/* River Deposit Header - Professional Design */}
      <LiquidGlassCard 
        variant="intense" 
        className="p-6 border border-river-profit/30 bg-gradient-to-r from-river-depth/80 to-river-profit/10 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-river-profit to-river-glow rounded-xl flex items-center justify-center shadow-lg shadow-river-profit/30">
              <Plus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Deposit USDC</h2>
              <p className="text-river-profit/80 text-sm font-medium">智能做市池流動性提供 • Liquidity Provision</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-white">
              Available: ${availableBalance.toLocaleString()}
            </div>
            <div className="text-sm text-river-profit font-semibold flex items-center justify-end gap-2">
              <TrendingUp className="w-4 h-4" />
              Current APY: {poolStats.apy}%
            </div>
          </div>
        </div>
        
        {/* River Quick Deposit Buttons - Professional Mobile-First */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1000, 5000, 10000, availableBalance].map((amount, index) => (
            <button
              key={index}
              onClick={() => setDepositAmount(amount.toString())}
              className="p-4 bg-river-surface/10 hover:bg-river-profit/15 rounded-xl border border-river-surface/20 hover:border-river-profit/40 transition-all duration-300 group shadow-lg hover:shadow-river-profit/20"
            >
              <div className="text-sm text-river-surface/70 mb-2 font-medium">
                {index === 3 ? 'Max Amount' : `Quick Deposit`}
              </div>
              <div className="text-white font-bold group-hover:text-river-profit transition-colors number-animate text-lg">
                ${amount.toLocaleString()}
              </div>
              {index === 3 && (
                <div className="text-xs text-gray-400 mt-1">Full balance</div>
              )}
            </button>
          ))}
        </div>
      </LiquidGlassCard>

      {/* Professional Deposit Interface */}
      <RiverBentoGrid columns={12} spacing="normal">
        {/* Deposit Input Panel */}
        <div className="lg:col-span-7 col-span-12">
          <LiquidGlassCard 
            variant="trading" 
            className="p-6 h-full"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-river-surface to-river-glow rounded-xl flex items-center justify-center shadow-lg shadow-river-surface/25">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Deposit Amount</h3>
                <p className="text-sm text-river-surface/60">Enter USDC amount to deposit</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-river-surface font-semibold mb-3 block text-sm">Deposit Amount (USDC)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-river-depth/60 border border-river-surface/30 text-white text-xl font-mono pl-4 pr-16 py-4 rounded-xl focus:border-river-profit focus:ring-2 focus:ring-river-profit/20 transition-all duration-300 backdrop-blur-sm"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-river-surface/70 font-semibold">
                    USDC
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-400">
                    Available Balance: <span className="font-mono text-white font-semibold">${availableBalance.toLocaleString()}</span>
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setDepositAmount(availableBalance.toString())}
                    className="text-river-profit border-river-profit/50 hover:bg-river-profit/10 hover:border-river-profit transition-all duration-300 font-semibold"
                  >
                    Use Max
                  </Button>
                </div>
              </div>

              {/* River Enhanced Calculation Preview */}
              {hasValidAmount && (
                <div className="p-4 bg-gradient-to-r from-river-profit/10 to-river-glow/10 rounded-xl border border-river-profit/30 space-y-3 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-river-surface/80 font-medium">Expected Pool Shares</span>
                    <div className="text-right">
                      <div className="font-bold text-river-profit font-mono text-lg">
                        {expectedRLP.toFixed(6)} shares
                      </div>
                      <div className="text-xs text-gray-400">
                        @ ${poolStats.sharePrice}/share
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-river-surface/80 font-medium">Insurance Fee (1%)</span>
                    <span className="text-river-warning font-mono font-semibold">
                      -${insuranceFee.toFixed(2)} USDC
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-river-surface/80 font-medium">Net Deposit</span>
                    <span className="text-white font-bold font-mono">
                      ${netDeposit.toFixed(2)} USDC
                    </span>
                  </div>
                  
                  <div className="border-t border-river-surface/20 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-river-surface/80 font-medium">Estimated Daily Return</span>
                      <span className="text-river-profit font-bold font-mono">
                        +${estimatedDailyReturn.toFixed(2)}/day
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Web3 Connection Status */}
              {!isConnected && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please connect your wallet to access real pool deposits
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

              {/* Approval Button */}
              {needsApproval && (
                <Button
                  onClick={handleApprove}
                  disabled={isLoadingWeb3 || !isConnected || !isValidNetwork}
                  className="w-full h-14 text-lg font-bold tracking-wide transition-all duration-300 rounded-xl border-0 bg-river-surface hover:bg-river-surface/90 shadow-lg shadow-river-surface/30 hover:shadow-river-surface/50"
                >
                  {isLoadingWeb3 ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Approving USDC...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-3" />
                      Approve USDC
                    </>
                  )}
                </Button>
              )}

              {/* River Professional Action Button */}
              <Button 
                onClick={isConnected ? handleWeb3Deposit : onDeposit}
                disabled={
                  isDepositing || 
                  isLoadingWeb3 || 
                  isConfirming ||
                  !hasValidAmount || 
                  isRiskRestricted || 
                  (isConnected && (!isValidNetwork || needsApproval))
                }
                className={`w-full h-14 text-lg font-bold tracking-wide transition-all duration-300 rounded-xl border-0 ${
                  isRiskRestricted 
                    ? 'bg-river-loss hover:bg-river-loss/80 cursor-not-allowed shadow-lg shadow-river-loss/20' 
                    : 'bg-gradient-to-r from-river-profit to-river-glow hover:from-river-glow hover:to-river-profit shadow-lg shadow-river-profit/30 hover:shadow-river-profit/50'
                }`}
              >
                {isDepositing || isLoadingWeb3 || isConfirming ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Processing Deposit...'}
                  </>
                ) : isRiskRestricted ? (
                  <>
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    Deposits Suspended
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-3" />
                    {isConnected ? 'Deposit to Pool' : 'Demo Deposit'}
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
                      <h4 className="font-semibold mb-1 text-river-loss">Critical Risk Alert</h4>
                      <p className="text-gray-300 text-sm">
                        New deposits are temporarily suspended due to high pool drawdown.
                      </p>
                    </div>
                  </div>
                </LiquidGlassCard>
              )}
            </div>
          </LiquidGlassCard>
        </div>

        {/* Pool Statistics & Risk Metrics */}
        <div className="lg:col-span-5 col-span-12 space-y-4">
          {/* Pool Performance */}
          <LiquidGlassCard 
            variant="trading" 
            className="p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-river-glow to-river-flow rounded-xl flex items-center justify-center shadow-lg shadow-river-glow/25">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Pool Performance</h3>
                <p className="text-sm text-river-glow/60">30-day metrics</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-river-profit/5 rounded-lg">
                <span className="text-gray-400 font-medium">APY</span>
                <span className="text-river-profit font-bold">{poolStats.apy}%</span>
              </div>
              <div className="flex justify-between p-2 bg-river-surface/5 rounded-lg">
                <span className="text-gray-400 font-medium">Total Locked</span>
                <span className="text-white font-mono">${poolStats.totalValueLocked}</span>
              </div>
              <div className="flex justify-between p-2 bg-river-glow/5 rounded-lg">
                <span className="text-gray-400 font-medium">Share Price</span>
                <span className="text-white font-mono">${poolStats.sharePrice}</span>
              </div>
              <div className="flex justify-between p-2 bg-river-flow/5 rounded-lg">
                <span className="text-gray-400 font-medium">Your Value</span>
                <span className="text-river-flow font-mono">${isConnected ? poolStats.userValue : '0.00'}</span>
              </div>
            </div>
          </LiquidGlassCard>

          {/* Risk Metrics */}
          <LiquidGlassCard 
            variant="trading" 
            className="p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-river-warning to-river-flow rounded-xl flex items-center justify-center shadow-lg shadow-river-warning/25">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Risk Metrics</h3>
                <p className="text-sm text-river-warning/60">Current pool health</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-river-loss/5 rounded-lg">
                <span className="text-gray-400 font-medium">Max Drawdown</span>
                <span className={`font-bold ${
                  poolData.drawdown24h > 15 ? 'text-river-loss' : 
                  poolData.drawdown24h > 10 ? 'text-river-warning' : 'text-river-profit'
                }`}>
                  -{poolData.drawdown24h}%
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
              <div className="flex justify-between p-2 bg-river-warning/5 rounded-lg">
                <span className="text-gray-400 font-medium">Risk Level</span>
                <span className={`font-bold px-3 py-1.5 rounded-lg text-xs border transition-all duration-300 ${
                  riskStatus.drawdown === 'safe' ? 'bg-river-profit/20 text-river-profit border-river-profit/30' :
                  riskStatus.drawdown === 'warning' ? 'bg-river-warning/20 text-river-warning border-river-warning/30' :
                  'bg-river-loss/20 text-river-loss border-river-loss/30'
                }`}>
                  {riskStatus.drawdown === 'safe' ? 'Normal' : 
                   riskStatus.drawdown === 'warning' ? 'Warning' : 'High Risk'}
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
                <h3 className="font-semibold text-white">Market Status</h3>
                <p className="text-sm text-river-flow/60">Real-time conditions</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-river-profit/5 rounded-lg">
                <span className="text-gray-400 font-medium">Market</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    marketStatus.isMarketOpen ? 'bg-river-profit' : 'bg-river-warning'
                  } animate-pulse`}></div>
                  <span className="text-white font-medium">
                    {marketStatus.isMarketOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
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
                <span className="text-gray-400 font-medium">Your Shares</span>
                <span className="text-river-glow font-mono">{isConnected ? poolStats.userShares : '0'}</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      </RiverBentoGrid>
    </div>
  );
};