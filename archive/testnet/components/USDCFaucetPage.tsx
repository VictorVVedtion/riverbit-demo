import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Zap,
  AlertTriangle,
  ExternalLink,
  Wallet,
  RefreshCw,
  Loader2,
  Settings,
  History,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import UnlimitedUSDCMint from '../web3/UnlimitedUSDCMint';
import USDCFaucetHelper from '../web3/USDCFaucetHelper';
import { CONTRACT_CONFIG, USDC_FAUCET_ABI } from '../../utils/contractConfig';

export default function USDCFaucetPage() {
  const { chain, isConnected } = useAccount();
  const isValidNetwork = chain?.id === CONTRACT_CONFIG.ARBITRUM_SEPOLIA.chainId;

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

        {/* Main Faucet Components */}
        <div className="space-y-6">
          {/* Unlimited USDC Mint Component */}
          <UnlimitedUSDCMint />
          
          {/* Alternative Faucet Helper */}
          <USDCFaucetHelper />
        </div>
      </div>
    </div>
  );
}