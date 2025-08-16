import React, { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ExternalLink, DollarSign, Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react'
import { toast } from 'sonner'

// Test USDC contract that allows minting (common pattern for testnet)
const TEST_USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const

// Mintable USDC ABI
const MINTABLE_USDC_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

interface USDCFaucetHelperProps {
  onSuccess?: () => void
}

export default function USDCFaucetHelper({ onSuccess }: USDCFaucetHelperProps) {
  const { address } = useAccount()
  const [isMinting, setIsMinting] = useState(false)
  
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

  const mintTestUSDC = async (amount: number) => {
    if (!address) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setIsMinting(true)
      
      // Try to mint test USDC
      await writeContract({
        address: TEST_USDC_ADDRESS,
        abi: MINTABLE_USDC_ABI,
        functionName: 'mint',
        args: [address, parseUnits(amount.toString(), 6)]
      })
      
    } catch (error: any) {
      console.error('Mint error:', error)
      if (error.message?.includes('execution reverted')) {
        toast.error('This USDC contract doesn\'t support minting. Please use alternative methods.')
      } else {
        toast.error('Failed to mint USDC: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setIsMinting(false)
    }
  }

  // Handle success
  React.useEffect(() => {
    if (isSuccess) {
      toast.success('USDC minted successfully!')
      onSuccess?.()
    }
  }, [isSuccess, onSuccess])

  // Handle errors
  React.useEffect(() => {
    if (writeError) {
      toast.error('Transaction failed: ' + writeError.message)
    }
    if (receiptError) {
      toast.error('Transaction receipt error: ' + receiptError.message)
    }
  }, [writeError, receiptError])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const faucetOptions = [
    {
      name: 'Circle USDC Faucet',
      url: 'https://faucet.circle.com/',
      description: 'Official Circle faucet for test USDC',
      amount: '1000 USDC',
      recommended: true
    },
    {
      name: 'Chainlink Faucet',
      url: 'https://faucets.chain.link/',
      description: 'Multi-token faucet including USDC',
      amount: 'Various amounts',
      recommended: false
    },
    {
      name: 'Arbitrum Sepolia Bridge',
      url: 'https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia&sourceChain=sepolia',
      description: 'Bridge USDC from Ethereum Sepolia',
      amount: 'Your amount',
      recommended: false
    }
  ]

  return (
    <Card className="bg-black/30 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <DollarSign className="w-6 h-6 mr-3 text-green-400" />
          Get Test USDC for Trading
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Contract Mint Option */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-2">Direct Mint (If Available)</h3>
          <p className="text-gray-400 text-sm mb-4">
            Try to mint test USDC directly from the contract
          </p>
          
          <div className="flex flex-wrap gap-3">
            {[100, 500, 1000, 5000].map(amount => (
              <Button
                key={amount}
                onClick={() => mintTestUSDC(amount)}
                disabled={!address || isPending || isConfirming || isMinting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isPending || isConfirming || isMinting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-2" />
                )}
                Mint {amount} USDC
              </Button>
            ))}
          </div>
          
          {hash && (
            <div className="mt-4 p-3 bg-blue-900/30 rounded-lg">
              <div className="flex items-center text-blue-400 text-sm">
                {isConfirming ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isSuccess ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(hash)}
                  className="ml-2 p-1 h-auto"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Faucet Options */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Alternative Faucet Options</h3>
          <div className="space-y-3">
            {faucetOptions.map((faucet, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border transition-colors ${
                  faucet.recommended 
                    ? 'bg-green-900/20 border-green-600/40' 
                    : 'bg-gray-800/50 border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <h4 className="font-semibold text-white">{faucet.name}</h4>
                      {faucet.recommended && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{faucet.description}</p>
                    <p className="text-green-400 text-sm">Amount: {faucet.amount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(faucet.url, '_blank')}
                    className="border-gray-600 text-white hover:bg-gray-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Information */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-2">Contract Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Test USDC Address:</span>
              <div className="flex items-center">
                <span className="text-white font-mono">{TEST_USDC_ADDRESS.slice(0, 10)}...{TEST_USDC_ADDRESS.slice(-8)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(TEST_USDC_ADDRESS)}
                  className="ml-2 p-1 h-auto"
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
              <span className="text-gray-400">Block Explorer:</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => window.open(`https://sepolia.arbiscan.io/address/${TEST_USDC_ADDRESS}`, '_blank')}
                className="text-blue-400 hover:text-blue-300 p-0 h-auto"
              >
                View on Arbiscan <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-600/40">
          <h3 className="text-lg font-semibold text-white mb-2">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>Try the direct mint option first (fastest if contract supports it)</li>
            <li>If mint fails, use the Circle USDC Faucet (most reliable)</li>
            <li>Connect your wallet to the faucet and request test USDC</li>
            <li>Wait for the transaction to confirm (usually 1-2 minutes)</li>
            <li>Refresh this page to see your new USDC balance</li>
            <li>You need at least 100 USDC to test trading features</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}