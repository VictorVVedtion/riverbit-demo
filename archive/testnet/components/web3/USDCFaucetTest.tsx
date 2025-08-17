import React, { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { DollarSign, Loader2, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { CONTRACT_CONFIG, USDC_FAUCET_ABI } from '../../utils/contractConfig'

export default function USDCFaucetTest() {
  const { address, isConnected, chain } = useAccount()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Contract configuration
  const usdcAddress = CONTRACT_CONFIG.ARBITRUM_SEPOLIA.contracts.USDC
  const isValidNetwork = chain?.id === CONTRACT_CONFIG.ARBITRUM_SEPOLIA.chainId

  // Read USDC balance
  const { 
    data: balance, 
    error: balanceError,
    refetch: refetchBalance 
  } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_FAUCET_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isValidNetwork,
      refetchInterval: 3000
    }
  })

  // Write contract hook for minting
  const { 
    writeContract, 
    data: hash, 
    error: writeError,
    isPending,
    reset
  } = useWriteContract()

  // Wait for transaction receipt
  const { 
    isLoading: isConfirming, 
    isSuccess,
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash,
  })

  // Format balance
  const formattedBalance = balance ? parseFloat(formatUnits(balance, 6)) : 0

  // Test mint 1000 USDC
  const testMint = async () => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isValidNetwork) {
      toast.error('Please switch to Arbitrum Sepolia network')
      return
    }

    try {
      const amount = parseUnits('1000', 6) // 1000 USDC
      
      await writeContract({
        address: usdcAddress as `0x${string}`,
        abi: USDC_FAUCET_ABI,
        functionName: 'faucetMint',
        args: [amount]
      })
      
      toast.success('Mint transaction submitted!')
      
    } catch (error: any) {
      console.error('Mint error:', error)
      toast.error('Failed to mint USDC: ' + (error.message || 'Unknown error'))
    }
  }

  // Refresh balance
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetchBalance()
      toast.success('Balance refreshed')
    } catch (error) {
      toast.error('Failed to refresh balance')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle success
  React.useEffect(() => {
    if (isSuccess) {
      toast.success('USDC minted successfully!')
      refetchBalance()
      reset()
    }
  }, [isSuccess, refetchBalance, reset])

  return (
    <Card className="w-full max-w-md mx-auto bg-slate-900/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <DollarSign className="w-6 h-6 mr-3 text-green-400" />
          USDC Faucet Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Network Status */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isValidNetwork ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-sm text-gray-400">
            {isValidNetwork ? 'Arbitrum Sepolia' : 'Wrong Network'}
          </span>
        </div>

        {/* Network Warning */}
        {!isValidNetwork && isConnected && (
          <div className="p-3 bg-orange-900/20 rounded-lg border border-orange-500/30">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 text-sm">Switch to Arbitrum Sepolia</span>
            </div>
          </div>
        )}

        {/* Balance Display */}
        <div className="text-center p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-2xl font-bold text-white mb-1">
            {isConnected ? formattedBalance.toLocaleString('en-US', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 6 
            }) : '---'}
          </div>
          <div className="text-gray-400">USDC Balance</div>
          {balanceError && (
            <div className="text-red-400 text-xs mt-1">
              Error loading balance
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={testMint}
            disabled={!isConnected || !isValidNetwork || isPending || isConfirming}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isPending ? 'Submitting...' : 'Confirming...'}
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Test Mint 1000 USDC
              </>
            )}
          </Button>

          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || !isConnected}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Balance
          </Button>
        </div>

        {/* Transaction Status */}
        {hash && (
          <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-600/40">
            <div className="flex items-center space-x-2 text-blue-400 text-sm">
              {isConfirming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSuccess ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-blue-400" />
              )}
              <span>
                {isConfirming ? 'Confirming...' : isSuccess ? 'Success!' : 'Pending...'}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1 font-mono">
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </div>
          </div>
        )}

        {/* Contract Info */}
        <div className="text-xs text-gray-400 space-y-1">
          <div>Contract: {usdcAddress.slice(0, 8)}...{usdcAddress.slice(-6)}</div>
          <div>Network: Arbitrum Sepolia (421614)</div>
        </div>

        {/* Error Messages */}
        {writeError && (
          <div className="p-3 bg-red-900/20 rounded-lg border border-red-600/40">
            <div className="text-red-400 text-sm">
              Error: {writeError.message}
            </div>
          </div>
        )}

        {receiptError && (
          <div className="p-3 bg-red-900/20 rounded-lg border border-red-600/40">
            <div className="text-red-400 text-sm">
              Receipt Error: {receiptError.message}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}