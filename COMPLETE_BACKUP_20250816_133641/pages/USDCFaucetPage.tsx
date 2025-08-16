import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  DollarSign, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  Wallet, 
  RefreshCw,
  History,
  Settings,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { CONTRACT_CONFIG, USDC_ABI, USDC_FAUCET_ABI } from '../../utils/contractConfig';
import USDCFaucetHelper from '../web3/USDCFaucetHelper';

// Use the enhanced faucet ABI from config

interface MintHistory {
  txHash: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
}

export default function USDCFaucetPage() {
  const { address, isConnected, chain } = useAccount();
  const [customAmount, setCustomAmount] = useState('1000');
  const [mintHistory, setMintHistory] = useState<MintHistory[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Contract configuration
  const usdcAddress = CONTRACT_CONFIG.ARBITRUM_SEPOLIA.contracts.USDC;
  const isValidNetwork = chain?.id === CONTRACT_CONFIG.ARBITRUM_SEPOLIA.chainId;

  // Read USDC balance
  const { 
    data: balance, 
    error: balanceError,
    refetch: refetchBalance 
  } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isValidNetwork,
      refetchInterval: 5000
    }
  });

  // Read USDC decimals
  const { data: decimals } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_FAUCET_ABI,
    functionName: 'decimals',
    query: {
      enabled: isValidNetwork
    }
  });

  // Write contract hook for minting
  const { 
    writeContract, 
    data: hash, 
    error: writeError,
    isPending: isWritePending,
    reset: resetWrite
  } = useWriteContract();

  // Wait for transaction receipt
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Format balance
  const formattedBalance = balance && decimals 
    ? parseFloat(formatUnits(balance, decimals))
    : 0;

  // Handle mint success
  useEffect(() => {
    if (isConfirmed && hash) {
      toast.success('USDC minted successfully!');
      refetchBalance();
      
      // Update mint history
      setMintHistory(prev => prev.map(item => 
        item.txHash === hash ? { ...item, status: 'success' as const } : item
      ));
      
      // Reset form
      resetWrite();
    }
  }, [isConfirmed, hash, refetchBalance, resetWrite]);

  // Handle errors
  useEffect(() => {
    if (writeError) {
      toast.error('Transaction failed: ' + writeError.message);
      if (hash) {
        setMintHistory(prev => prev.map(item => 
          item.txHash === hash ? { ...item, status: 'failed' as const } : item
        ));
      }
    }
    if (receiptError) {
      toast.error('Transaction receipt error: ' + receiptError.message);
    }
  }, [writeError, receiptError, hash]);

  // Mint USDC function
  const mintUSDC = async (amount: number) => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isValidNetwork) {
      toast.error('Please switch to Arbitrum Sepolia network');
      return;
    }

    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      const decimalsValue = decimals || 6;
      const amountInWei = parseUnits(amount.toString(), decimalsValue);
      
      // Try multiple mint methods
      let success = false;
      const methods = [
        { name: 'faucetMint', args: [amountInWei] },
        { name: 'mint', args: [address, amountInWei] }
      ];

      for (const method of methods) {
        try {
          await writeContract({
            address: usdcAddress as `0x${string}`,
            abi: USDC_FAUCET_ABI,
            functionName: method.name as any,
            args: method.args as any
          });
          success = true;
          break;
        } catch (error: any) {
          console.log(`Method ${method.name} failed:`, error.message);
          continue;
        }
      }

      if (!success) {
        throw new Error('All mint methods failed. This contract may not support minting.');
      }

      // Add to mint history
      const newHistoryItem: MintHistory = {
        txHash: hash || '',
        amount,
        timestamp: Date.now(),
        status: 'pending'
      };
      setMintHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);

      toast.success('Mint transaction submitted!');
      
    } catch (error: any) {
      console.error('Mint error:', error);
      if (error.message?.includes('execution reverted')) {
        toast.error('This USDC contract doesn\'t support direct minting. Please use external faucets.');
      } else {
        toast.error('Failed to mint USDC: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // Quick mint amounts
  const quickAmounts = [100, 500, 1000, 5000, 10000];

  // Refresh balance
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchBalance();
      toast.success('Balance refreshed');
    } catch (error) {
      toast.error('Failed to refresh balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Transaction status component
  const TransactionStatus = ({ tx }: { tx: MintHistory }) => {
    const getStatusColor = () => {
      switch (tx.status) {
        case 'pending': return 'text-yellow-400';
        case 'success': return 'text-green-400';
        case 'failed': return 'text-red-400';
        default: return 'text-gray-400';
      }
    };

    const getStatusIcon = () => {
      switch (tx.status) {
        case 'pending': return <Loader2 className="w-4 h-4 animate-spin" />;
        case 'success': return <CheckCircle className="w-4 h-4" />;
        case 'failed': return <AlertCircle className="w-4 h-4" />;
        default: return null;
      }
    };

    return (
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center space-x-3">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <div>
            <div className="text-white text-sm font-medium">
              {tx.amount.toLocaleString()} USDC
            </div>
            <div className="text-gray-400 text-xs">
              {new Date(tx.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={tx.status === 'success' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}>
            {tx.status}
          </Badge>
          {tx.txHash && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`${CONTRACT_CONFIG.ARBITRUM_SEPOLIA.blockExplorer}/tx/${tx.txHash}`, '_blank')}
              className="p-1 h-auto text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-green-600/20 rounded-xl border border-green-500/30">
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">USDC Faucet</h1>
              <p className="text-gray-400">Get test USDC for trading on Arbitrum Sepolia</p>
            </div>
          </div>
          
          {/* Network Status */}
          <div className="flex items-center justify-center space-x-4">
            <Badge variant={isValidNetwork ? 'default' : 'destructive'} className="px-4 py-2">
              <div className={`w-2 h-2 rounded-full mr-2 ${isValidNetwork ? 'bg-green-400' : 'bg-red-400'}`}></div>
              {isValidNetwork ? 'Arbitrum Sepolia' : 'Wrong Network'}
            </Badge>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="px-4 py-2">
              <Wallet className="w-4 h-4 mr-2" />
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </div>

        {/* Network Warning */}
        {!isValidNetwork && isConnected && (
          <Card className="bg-orange-900/20 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <div>
                  <h3 className="text-orange-400 font-semibold">Wrong Network</h3>
                  <p className="text-orange-300 text-sm">Please switch to Arbitrum Sepolia to use the faucet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Balance and Quick Actions */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center">
                  <Wallet className="w-5 h-5 mr-3 text-blue-400" />
                  Your USDC Balance
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={isRefreshing || !isConnected}
                  className="text-gray-400 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Balance Display */}
              <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-4xl font-bold text-white mb-2">
                  {isConnected ? formattedBalance.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 6 
                  }) : '---'}
                </div>
                <div className="text-gray-400 text-lg">USDC</div>
                {balanceError && (
                  <div className="text-red-400 text-sm mt-2">
                    Error loading balance
                  </div>
                )}
              </div>

              {/* Quick Mint Buttons */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                  Quick Mint
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickAmounts.map(amount => (
                    <Button
                      key={amount}
                      onClick={() => mintUSDC(amount)}
                      disabled={!isConnected || !isValidNetwork || isWritePending || isConfirming}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                    >
                      {isWritePending || isConfirming ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-2" />
                      )}
                      {amount.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Settings className="w-4 h-4 mr-2 text-gray-400" />
                  Custom Amount
                </h3>
                <div className="flex space-x-3">
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white"
                    disabled={!isConnected || !isValidNetwork}
                  />
                  <Button
                    onClick={() => mintUSDC(parseFloat(customAmount))}
                    disabled={!isConnected || !isValidNetwork || isWritePending || isConfirming || !customAmount || parseFloat(customAmount) <= 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    {isWritePending || isConfirming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Mint'
                    )}
                  </Button>
                </div>
              </div>

              {/* Transaction Progress */}
              {(isWritePending || isConfirming) && (
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-600/40">
                  <div className="flex items-center space-x-3 mb-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-blue-400 font-medium">
                      {isWritePending ? 'Submitting transaction...' : 'Confirming transaction...'}
                    </span>
                  </div>
                  <Progress value={isWritePending ? 33 : 66} className="h-2" />
                </div>
              )}

              {/* Transaction Hash */}
              {hash && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">Transaction Hash:</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono text-sm">
                        {hash.slice(0, 10)}...{hash.slice(-8)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(hash)}
                        className="p-1 h-auto"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`${CONTRACT_CONFIG.ARBITRUM_SEPOLIA.blockExplorer}/tx/${hash}`, '_blank')}
                        className="p-1 h-auto text-blue-400"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mint History and Info */}
          <div className="space-y-6">
            
            {/* Mint History */}
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <History className="w-5 h-5 mr-3 text-purple-400" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mintHistory.length > 0 ? (
                  <div className="space-y-3">
                    {mintHistory.slice(0, 5).map((tx, index) => (
                      <TransactionStatus key={index} tx={tx} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Your mint history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contract Information */}
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="w-5 h-5 mr-3 text-gray-400" />
                  Contract Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">USDC Contract:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono">
                        {usdcAddress.slice(0, 8)}...{usdcAddress.slice(-6)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(usdcAddress)}
                        className="p-1 h-auto"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-white">Arbitrum Sepolia</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Chain ID:</span>
                    <span className="text-white">{CONTRACT_CONFIG.ARBITRUM_SEPOLIA.chainId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Block Explorer:</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => window.open(`${CONTRACT_CONFIG.ARBITRUM_SEPOLIA.blockExplorer}/address/${usdcAddress}`, '_blank')}
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                    >
                      View Contract <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Instructions */}
            <Card className="bg-blue-900/20 border-blue-600/40">
              <CardHeader>
                <CardTitle className="text-blue-400">How to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-300">
                  <li>Ensure your wallet is connected to Arbitrum Sepolia</li>
                  <li>Click a quick mint button or enter a custom amount</li>
                  <li>Confirm the transaction in your wallet</li>
                  <li>Wait for the transaction to be confirmed</li>
                  <li>Your USDC balance will update automatically</li>
                  <li>Use the USDC for testing trading features</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alternative Faucets */}
        <USDCFaucetHelper onSuccess={() => refetchBalance()} />
      </div>
    </div>
  );
}