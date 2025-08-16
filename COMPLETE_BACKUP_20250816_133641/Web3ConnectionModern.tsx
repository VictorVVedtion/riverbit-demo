import React from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Wallet, 
  Check, 
  AlertCircle, 
  ExternalLink,
  ChevronDown,
  Copy,
  LogOut
} from 'lucide-react'
import { arbitrumSepolia, arbitrum } from 'viem/chains'
import { NETWORK_CONFIG } from '../config/wagmi'
import { modal } from '../config/wagmi'

interface ModernWeb3ConnectionProps {
  onConnectionChange?: (connected: boolean, address?: string, chainId?: number) => void
  variant?: 'card' | 'inline'
}

export default function ModernWeb3Connection({ onConnectionChange, variant = 'card' }: ModernWeb3ConnectionProps) {
  const { address, isConnected, isConnecting, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  // Notify parent of connection changes
  React.useEffect(() => {
    onConnectionChange?.(isConnected, address, chainId)
  }, [isConnected, address, chainId, onConnectionChange])

  // Check if we're on the right network
  const isCorrectNetwork = chainId === arbitrumSepolia.id || chainId === arbitrum.id
  const networkConfig = NETWORK_CONFIG[chainId]

  // Open wallet connection modal
  const openConnectModal = () => modal.open()

  // Copy address to clipboard
  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
    }
  }

  // Switch to Arbitrum Sepolia (testnet)
  const switchToArbitrumSepolia = () => {
    switchChain({ chainId: arbitrumSepolia.id })
  }

  // Inline compact variant for headers/toolbars
  if (variant === 'inline') {
    if (!isConnected) {
      return (
        <Button onClick={openConnectModal} size="sm" variant="outline" className="h-8">
          <Wallet className="h-3.5 w-3.5 mr-2" />
          Connect
        </Button>
      )
    }
    return (
      <Button size="sm" variant="outline" className="h-8" onClick={() => disconnect()}>
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </Button>
    )
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            连接钱包
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Button 
              onClick={openConnectModal}
              disabled={isConnecting || isPending}
              className="w-full"
              size="lg"
            >
              {isConnecting || isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  连接中...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  连接钱包
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            钱包已连接
          </div>
          <Button variant="ghost" size="sm" onClick={() => disconnect()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">钱包地址</p>
              <p className="text-xs font-mono text-gray-300">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copyAddress}>
                <Copy className="h-4 w-4" />
              </Button>
              {networkConfig && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.open(`${networkConfig.blockExplorer}/address/${address}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}