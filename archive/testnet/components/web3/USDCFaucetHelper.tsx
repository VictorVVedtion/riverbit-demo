import React, { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ExternalLink, DollarSign, Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { CONTRACT_CONFIG, USDC_FAUCET_ABI, UNLIMITED_USDC_FAUCET_ABI } from '../../utils/contractConfig'

// USDC Faucet addresses
const ORIGINAL_USDC_ADDRESS = CONTRACT_CONFIG.ARBITRUM_SEPOLIA.contracts.USDC as const
const SIMPLE_USDC_ADDRESS = CONTRACT_CONFIG.ARBITRUM_SEPOLIA.contracts.SIMPLE_USDC as const
const UNLIMITED_USDC_ADDRESS = CONTRACT_CONFIG.ARBITRUM_SEPOLIA.contracts.UNLIMITED_USDC as const

// Use the complete USDC Faucet ABI from config
const MINTABLE_USDC_ABI = USDC_FAUCET_ABI
const UNLIMITED_USDC_ABI = UNLIMITED_USDC_FAUCET_ABI

interface USDCFaucetHelperProps {
  onSuccess?: () => void
}

export default function USDCFaucetHelper({ onSuccess }: USDCFaucetHelperProps) {
  const { address } = useAccount()
  const [isMinting, setIsMinting] = useState(false)
  const [selectedFaucet, setSelectedFaucet] = useState<'unlimited' | 'simple' | 'original'>('unlimited')
  
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
      
      let contractAddress: string
      let abi: any
      
      if (selectedFaucet === 'unlimited') {
        contractAddress = UNLIMITED_USDC_ADDRESS
        abi = UNLIMITED_USDC_ABI
      } else {
        contractAddress = selectedFaucet === 'simple' ? SIMPLE_USDC_ADDRESS : ORIGINAL_USDC_ADDRESS
        abi = MINTABLE_USDC_ABI
      }
      
      // Try to mint test USDC using the faucet method with explicit gas
      await writeContract({
        address: contractAddress,
        abi: abi,
        functionName: 'faucetMint',
        args: [parseUnits(amount.toString(), 6)],
        gas: 300000n, // Explicit gas limit for reliability
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

  const mintQuickAmount = async (functionName: string) => {
    if (!address) {
      toast.error('Please connect your wallet first')
      return
    }

    if (selectedFaucet !== 'unlimited') {
      toast.error('Quick mint is only available for Unlimited USDC Faucet')
      return
    }

    try {
      setIsMinting(true)
      
      // Use quick mint functions for unlimited faucet
      await writeContract({
        address: UNLIMITED_USDC_ADDRESS,
        abi: UNLIMITED_USDC_ABI,
        functionName: functionName,
        args: [],
        gas: 300000n,
      })
      
    } catch (error: any) {
      console.error('Quick mint error:', error)
      toast.error('Failed to mint USDC: ' + (error.message || 'Unknown error'))
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
        
        {/* Faucet Selection */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">Select USDC Faucet</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Button
              onClick={() => setSelectedFaucet('unlimited')}
              variant={selectedFaucet === 'unlimited' ? 'default' : 'outline'}
              className={`p-4 h-auto justify-start ${
                selectedFaucet === 'unlimited' 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="text-left">
                <div className="font-medium">无限制 Faucet (最新推荐)</div>
                <div className="text-xs opacity-80">无限制 • 随便mint • 测试专用</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedFaucet('simple')}
              variant={selectedFaucet === 'simple' ? 'default' : 'outline'}
              className={`p-4 h-auto justify-start ${
                selectedFaucet === 'simple' 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="text-left">
                <div className="font-medium">Simple Faucet</div>
                <div className="text-xs opacity-80">5分钟冷却 • 无每日限制</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedFaucet('original')}
              variant={selectedFaucet === 'original' ? 'default' : 'outline'}
              className={`p-4 h-auto justify-start ${
                selectedFaucet === 'original' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="text-left">
                <div className="font-medium">Original Faucet</div>
                <div className="text-xs opacity-80">1小时冷却 • 500K每日限制</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Contract Mint Option */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-2">
            {selectedFaucet === 'unlimited' ? '无限制 USDC Faucet' 
             : selectedFaucet === 'simple' ? 'Simple USDC Faucet' 
             : 'Original USDC Faucet'} (推荐)
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            {selectedFaucet === 'unlimited' 
              ? '完全无限制faucet，任何人可以无限次mint任意数量，无冷却时间，测试网专用'
              : selectedFaucet === 'simple' 
                ? '简化版faucet，5分钟冷却时间，更适合测试使用'
                : '原版faucet，1小时冷却时间，有每日限制'
            }
          </p>
          
          {selectedFaucet === 'unlimited' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {[1000, 10000, 100000, 1000000].map(amount => (
                  <Button
                    key={amount}
                    onClick={() => mintTestUSDC(amount)}
                    disabled={!address || isPending || isConfirming || isMinting}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isPending || isConfirming || isMinting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <DollarSign className="w-4 h-4 mr-2" />
                    )}
                    Mint {amount.toLocaleString()} USDC
                  </Button>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => mintQuickAmount('mintMillion')}
                  disabled={!address || isPending || isConfirming || isMinting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isPending || isConfirming || isMinting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  快速Mint 100万 USDC
                </Button>
                <Button
                  onClick={() => mintQuickAmount('mintTenMillion')}
                  disabled={!address || isPending || isConfirming || isMinting}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isPending || isConfirming || isMinting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  快速Mint 1000万 USDC
                </Button>
              </div>
            </div>
          ) : (
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
          )}
          
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
              <span className="text-gray-400">Selected Faucet:</span>
              <span className="text-white">
                {selectedFaucet === 'unlimited' ? '无限制 USDC Faucet' 
                 : selectedFaucet === 'simple' ? 'Simple USDC Faucet' 
                 : 'Original USDC Faucet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Contract Address:</span>
              <div className="flex items-center">
                <span className="text-white font-mono">
                  {(() => {
                    const addr = selectedFaucet === 'unlimited' ? UNLIMITED_USDC_ADDRESS 
                                : selectedFaucet === 'simple' ? SIMPLE_USDC_ADDRESS 
                                : ORIGINAL_USDC_ADDRESS
                    return `${addr.slice(0, 10)}...${addr.slice(-8)}`
                  })()}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const addr = selectedFaucet === 'unlimited' ? UNLIMITED_USDC_ADDRESS 
                                : selectedFaucet === 'simple' ? SIMPLE_USDC_ADDRESS 
                                : ORIGINAL_USDC_ADDRESS
                    copyToClipboard(addr)
                  }}
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
              <span className="text-gray-400">Cooldown:</span>
              <span className="text-white">
                {selectedFaucet === 'unlimited' ? '无冷却 (无限制)' 
                 : selectedFaucet === 'simple' ? '5 minutes' 
                 : '1 hour'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Limits:</span>
              <span className="text-white">
                {selectedFaucet === 'unlimited' ? '无任何限制' 
                 : selectedFaucet === 'simple' ? '无每日限制' 
                 : '500K USDC/day'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Block Explorer:</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  const addr = selectedFaucet === 'unlimited' ? UNLIMITED_USDC_ADDRESS 
                              : selectedFaucet === 'simple' ? SIMPLE_USDC_ADDRESS 
                              : ORIGINAL_USDC_ADDRESS
                  window.open(`https://sepolia.arbiscan.io/address/${addr}`, '_blank')
                }}
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
          {selectedFaucet === 'unlimited' ? (
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li><strong>推荐：</strong>选择"无限制 USDC Faucet"（已选择）</li>
              <li>点击任意金额按钮或使用快速mint功能</li>
              <li>确认钱包交易（Gas费很低）</li>
              <li>等待交易确认（通常30秒-2分钟）</li>
              <li>无冷却时间，可以立即再次mint任意数量</li>
              <li>建议mint 100万+ USDC 用于充分测试交易功能</li>
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Try the direct mint option first (fastest if contract supports it)</li>
              <li>If mint fails, use the Circle USDC Faucet (most reliable)</li>
              <li>Connect your wallet to the faucet and request test USDC</li>
              <li>Wait for the transaction to confirm (usually 1-2 minutes)</li>
              <li>Refresh this page to see your new USDC balance</li>
              <li>You need at least 100 USDC to test trading features</li>
            </ol>
          )}
          
          {selectedFaucet === 'unlimited' && (
            <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-600/40">
              <p className="text-purple-200 text-sm font-medium">
                🎉 无限制 USDC Faucet 特性：
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-purple-300">
                <li>完全无限制，任何人可以无限次mint</li>
                <li>无冷却时间，可以连续mint</li>
                <li>无单次或每日限额</li>
                <li>支持快速mint 100万或1000万 USDC</li>
                <li>专为测试网环境设计</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}