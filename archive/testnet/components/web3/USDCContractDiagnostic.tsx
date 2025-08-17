import React, { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { AlertCircle, CheckCircle, Clock, DollarSign, Shield, RefreshCw, Info } from 'lucide-react'
import { toast } from 'sonner'

import { CONTRACT_CONFIG, USDC_FAUCET_ABI } from '../../utils/contractConfig'

// Support both USDC contracts
const ORIGINAL_USDC_ADDRESS = CONTRACT_CONFIG.ARBITRUM_SEPOLIA.contracts.USDC as const
const SIMPLE_USDC_ADDRESS = CONTRACT_CONFIG.ARBITRUM_SEPOLIA.contracts.SIMPLE_USDC as const

interface DiagnosticResult {
  name: string
  status: 'success' | 'error' | 'warning' | 'loading'
  message: string
  value?: string | number | boolean
}

export default function USDCContractDiagnostic() {
  const { address, isConnected } = useAccount()
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedContract, setSelectedContract] = useState<'simple' | 'original'>('simple')

  const currentAddress = selectedContract === 'simple' ? SIMPLE_USDC_ADDRESS : ORIGINAL_USDC_ADDRESS

  // Contract read hooks for diagnostics
  const { data: tokenName } = useReadContract({
    address: currentAddress,
    abi: USDC_FAUCET_ABI,
    functionName: 'name',
  })

  const { data: tokenSymbol } = useReadContract({
    address: currentAddress,
    abi: USDC_FAUCET_ABI,
    functionName: 'symbol',
  })

  const { data: decimals } = useReadContract({
    address: currentAddress,
    abi: USDC_FAUCET_ABI,
    functionName: 'decimals',
  })

  const { data: faucetStats } = useReadContract({
    address: currentAddress,
    abi: USDC_FAUCET_ABI,
    functionName: 'getFaucetStats',
  })

  const { data: userBalance } = useReadContract({
    address: currentAddress,
    abi: USDC_FAUCET_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: remainingCooldown } = useReadContract({
    address: currentAddress,
    abi: USDC_FAUCET_ABI,
    functionName: 'getRemainingCooldown',
    args: address ? [address] : undefined,
  })

  const { data: remainingDailyLimit } = useReadContract({
    address: currentAddress,
    abi: USDC_FAUCET_ABI,
    functionName: 'getRemainingDailyLimit',
    args: address ? [address] : undefined,
  })

  const { data: canMintResult } = useReadContract({
    address: currentAddress,
    abi: USDC_FAUCET_ABI,
    functionName: 'canMint',
    args: address ? [address, parseUnits('100', 6)] : undefined,
  })

  // Write contract hook for testing mint
  const { 
    writeContract, 
    data: hash, 
    error: writeError,
    isPending 
  } = useWriteContract()

  const { 
    isLoading: isConfirming, 
    isSuccess,
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash,
  })

  const runDiagnostics = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsRunning(true)
    const results: DiagnosticResult[] = []

    try {
      // 1. Contract Address Verification
      results.push({
        name: 'Contract Address',
        status: 'success',
        message: `${selectedContract === 'simple' ? 'Simple' : 'Original'} USDC contract deployed`,
        value: currentAddress
      })

      // 2. Token Information
      results.push({
        name: 'Token Name',
        status: tokenName ? 'success' : 'error',
        message: tokenName ? `Token name: ${tokenName}` : 'Failed to read token name',
        value: tokenName as string
      })

      results.push({
        name: 'Token Symbol',
        status: tokenSymbol ? 'success' : 'error',
        message: tokenSymbol ? `Token symbol: ${tokenSymbol}` : 'Failed to read token symbol',
        value: tokenSymbol as string
      })

      results.push({
        name: 'Token Decimals',
        status: decimals !== undefined ? 'success' : 'error',
        message: decimals !== undefined ? `Decimals: ${decimals}` : 'Failed to read decimals',
        value: decimals as number
      })

      // 3. Faucet Status
      if (faucetStats) {
        const [enabled, totalMinted, maxMint, dailyLimit, cooldown] = faucetStats as [boolean, bigint, bigint, bigint, bigint]
        
        results.push({
          name: 'Faucet Status',
          status: enabled ? 'success' : 'error',
          message: enabled ? 'Faucet is enabled' : 'Faucet is disabled',
          value: enabled
        })

        results.push({
          name: 'Total Minted',
          status: 'success',
          message: `Total minted: ${formatUnits(totalMinted, 6)} USDC`,
          value: formatUnits(totalMinted, 6)
        })

        results.push({
          name: 'Max Mint Amount',
          status: 'success',
          message: `Max per mint: ${formatUnits(maxMint, 6)} USDC`,
          value: formatUnits(maxMint, 6)
        })

        results.push({
          name: 'Daily Limit',
          status: 'success',
          message: `Daily limit: ${formatUnits(dailyLimit, 6)} USDC`,
          value: formatUnits(dailyLimit, 6)
        })

        results.push({
          name: 'Cooldown Period',
          status: 'success',
          message: `Cooldown: ${Number(cooldown) / 3600} hours`,
          value: `${Number(cooldown) / 3600}h`
        })
      }

      // 4. User-specific checks
      if (address) {
        results.push({
          name: 'Current Balance',
          status: 'success',
          message: userBalance ? `Balance: ${formatUnits(userBalance as bigint, 6)} USDC` : 'Balance: 0 USDC',
          value: userBalance ? formatUnits(userBalance as bigint, 6) : '0'
        })

        if (remainingCooldown !== undefined) {
          const cooldownSeconds = Number(remainingCooldown)
          results.push({
            name: 'Cooldown Status',
            status: cooldownSeconds > 0 ? 'warning' : 'success',
            message: cooldownSeconds > 0 
              ? `Cooldown active: ${Math.ceil(cooldownSeconds / 60)} minutes remaining`
              : 'No cooldown - ready to mint',
            value: cooldownSeconds
          })
        }

        if (remainingDailyLimit !== undefined) {
          const remaining = formatUnits(remainingDailyLimit as bigint, 6)
          results.push({
            name: 'Daily Limit Remaining',
            status: Number(remaining) > 0 ? 'success' : 'warning',
            message: `Remaining today: ${remaining} USDC`,
            value: remaining
          })
        }

        if (canMintResult) {
          const [canMint, reason] = canMintResult as [boolean, string]
          results.push({
            name: 'Mint Eligibility',
            status: canMint ? 'success' : 'error',
            message: canMint ? 'Can mint 100 USDC' : `Cannot mint: ${reason}`,
            value: canMint
          })
        }
      }

    } catch (error: any) {
      results.push({
        name: 'Diagnostic Error',
        status: 'error',
        message: `Error running diagnostics: ${error.message}`,
      })
    }

    setDiagnostics(results)
    setIsRunning(false)
  }

  // Test mint function
  const testMint = async () => {
    if (!address) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      await writeContract({
        address: currentAddress,
        abi: USDC_FAUCET_ABI,
        functionName: 'faucetMint',
        args: [parseUnits('100', 6)], // 100 USDC
        gas: 300000n, // Explicit gas limit
      })
    } catch (error: any) {
      console.error('Test mint error:', error)
      toast.error('Test mint failed: ' + error.message)
    }
  }

  // Auto-run diagnostics when component mounts and wallet connects or contract changes
  useEffect(() => {
    if (isConnected && address) {
      runDiagnostics()
    }
  }, [isConnected, address, selectedContract, tokenName, faucetStats])

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-400" />
      case 'loading':
        return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
    }
  }

  return (
    <Card className="bg-black/30 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Shield className="w-6 h-6 mr-3 text-blue-400" />
          USDC Contract Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Contract Selection */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">Select Contract to Diagnose</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => setSelectedContract('simple')}
              variant={selectedContract === 'simple' ? 'default' : 'outline'}
              className={`p-4 h-auto justify-start ${
                selectedContract === 'simple' 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="text-left">
                <div className="font-medium">Simple USDC Faucet</div>
                <div className="text-xs opacity-80">5分钟冷却 • 简化版测试</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedContract('original')}
              variant={selectedContract === 'original' ? 'default' : 'outline'}
              className={`p-4 h-auto justify-start ${
                selectedContract === 'original' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="text-left">
                <div className="font-medium">Original USDC Faucet</div>
                <div className="text-xs opacity-80">1小时冷却 • 原版合约</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={runDiagnostics}
            disabled={!isConnected || isRunning}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Run Diagnostics
          </Button>

          <Button
            onClick={testMint}
            disabled={!isConnected || isPending || isConfirming}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending || isConfirming ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4 mr-2" />
            )}
            Test Mint 100 USDC
          </Button>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/40">
            <div className="flex items-center text-yellow-400">
              <Info className="w-4 h-4 mr-2" />
              Please connect your wallet to run diagnostics
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {hash && (
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-600/40">
            <div className="text-blue-400 text-sm">
              <div className="flex items-center mb-2">
                {isConfirming ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : isSuccess ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
              </div>
              {isConfirming && <div>Confirming transaction...</div>}
              {isSuccess && <div>Transaction confirmed successfully!</div>}
            </div>
          </div>
        )}

        {/* Error Display */}
        {(writeError || receiptError) && (
          <div className="p-4 bg-red-900/20 rounded-lg border border-red-600/40">
            <div className="text-red-400 text-sm">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                Transaction Error
              </div>
              <div className="text-xs">
                {writeError?.message || receiptError?.message}
              </div>
            </div>
          </div>
        )}

        {/* Diagnostic Results */}
        {diagnostics.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Diagnostic Results</h3>
            {diagnostics.map((result, index) => (
              <div 
                key={index}
                className="p-3 bg-gray-800/50 rounded-lg border border-gray-600 flex items-center justify-between"
              >
                <div className="flex items-center">
                  {getStatusIcon(result.status)}
                  <div className="ml-3">
                    <div className="text-white font-medium">{result.name}</div>
                    <div className="text-gray-400 text-sm">{result.message}</div>
                  </div>
                </div>
                {result.value !== undefined && (
                  <div className="text-blue-400 text-sm font-mono">
                    {String(result.value)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contract Information */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">Contract Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Selected Contract:</span>
              <span className="text-white">{selectedContract === 'simple' ? 'Simple USDC Faucet' : 'Original USDC Faucet'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Address:</span>
              <span className="text-white font-mono">{currentAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-white">Arbitrum Sepolia (Chain ID: 421614)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cooldown Period:</span>
              <span className="text-white">{selectedContract === 'simple' ? '5 minutes' : '1 hour'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expected Functions:</span>
              <span className="text-white">faucetMint, canMint, getFaucetStats</span>
            </div>
          </div>
        </div>

        {/* Troubleshooting Guide */}
        <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/40">
          <h3 className="text-lg font-semibold text-white mb-3">Common Issues & Solutions</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>• <strong>Cooldown Active:</strong> Wait for the cooldown period to expire (1 hour)</li>
            <li>• <strong>Daily Limit Exceeded:</strong> Try again tomorrow or mint smaller amounts</li>
            <li>• <strong>Faucet Disabled:</strong> Contact admin to re-enable the faucet</li>
            <li>• <strong>Gas Too Low:</strong> Increase gas limit to 300,000+ units</li>
            <li>• <strong>Network Issues:</strong> Check you're connected to Arbitrum Sepolia</li>
            <li>• <strong>Contract Not Found:</strong> Verify the contract address is correct</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}