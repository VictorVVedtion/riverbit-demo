import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { web3Manager, shortenAddress, formatNumber } from '../utils/web3Utils';
import { Wallet, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';

interface Web3ConnectionProps {
  onConnectionChange?: (connected: boolean, address?: string) => void;
}

interface WalletState {
  isConnected: boolean;
  address: string;
  chainId: number | null;
  usdcBalance: number;
  usdcAllowance: number;
  ethBalance: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

const Web3Connection: React.FC<Web3ConnectionProps> = ({ onConnectionChange }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: '',
    chainId: null,
    usdcBalance: 0,
    usdcAllowance: 0,
    ethBalance: 0,
    isLoading: false,
    error: null,
    lastUpdated: 0
  });

  // 检查钱包连接状态
  useEffect(() => {
    checkConnection();
  }, []);

  // 检查现有连接
  const checkConnection = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await connectWallet();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setWalletState(prev => ({ ...prev, error: 'Failed to check wallet connection' }));
    }
  };

  // 连接钱包
  const connectWallet = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { address, chainId } = await web3Manager.connectWallet();
      
      // 检查是否为支持的网络
      if (!isSupportedNetwork(chainId)) {
        setWalletState({
          isConnected: true,
          address,
          chainId,
          usdcBalance: 0,
          usdcAllowance: 0,
          ethBalance: 0,
          isLoading: false,
          error: 'Please switch to Arbitrum Sepolia to use RiverBit',
          lastUpdated: Date.now()
        });
        onConnectionChange?.(true, address);
        return;
      }
      
      // 获取余额信息
      let usdcBalance = 0;
      let usdcAllowance = 0;
      let ethBalance = 0;
      
      try {
        const [usdc, allowance, eth] = await Promise.all([
          web3Manager.getUSDCBalance(address),
          web3Manager.checkUSDCAllowance(address),
          web3Manager.contracts.riverbit?.provider?.getBalance(address) || BigInt(0)
        ]);
        
        usdcBalance = usdc;
        usdcAllowance = allowance;
        ethBalance = Number(eth) / 1e18; // Convert from wei to ETH
      } catch (error) {
        console.warn('Failed to get balance information:', error);
        setWalletState(prev => ({ 
          ...prev, 
          error: 'Connected but failed to load balance information' 
        }));
      }

      setWalletState({
        isConnected: true,
        address,
        chainId,
        usdcBalance,
        usdcAllowance,
        ethBalance,
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      });

      onConnectionChange?.(true, address);

    } catch (error: any) {
      let errorMessage = 'Failed to connect wallet';
      
      if (error.code === 4001) {
        errorMessage = 'User rejected the request';
      } else if (error.code === -32002) {
        errorMessage = 'Request already pending. Please check MetaMask.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setWalletState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      onConnectionChange?.(false);
    }
  };

  // 断开钱包
  const disconnectWallet = () => {
    web3Manager.disconnectWallet();
    setWalletState({
      isConnected: false,
      address: '',
      chainId: null,
      usdcBalance: 0,
      usdcAllowance: 0,
      ethBalance: 0,
      isLoading: false,
      error: null,
      lastUpdated: 0
    });
    onConnectionChange?.(false);
  };

  // 切换到Arbitrum测试网
  const switchToArbitrum = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await web3Manager.switchToArbitrumSepolia();
      // 重新连接获取新的链信息
      await connectWallet();
    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to switch network'
      }));
    }
  };

  // 刷新余额和数据
  const refreshBalance = async () => {
    if (!walletState.isConnected || !isSupportedNetwork(walletState.chainId)) return;

    setWalletState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const [usdcBalance, usdcAllowance, ethBalanceBig] = await Promise.all([
        web3Manager.getUSDCBalance(walletState.address),
        web3Manager.checkUSDCAllowance(walletState.address),
        web3Manager.contracts.riverbit ? 
          (await web3Manager.contracts.riverbit.provider?.getBalance(walletState.address) || BigInt(0)) :
          BigInt(0)
      ]);
      
      const ethBalance = Number(ethBalanceBig) / 1e18;
      
      setWalletState(prev => ({ 
        ...prev, 
        usdcBalance,
        usdcAllowance,
        ethBalance,
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      setWalletState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Failed to refresh balance' 
      }));
    }
  };

  // 获取网络名称
  const getNetworkName = (chainId: number | null): string => {
    switch (chainId) {
      case 421614:
        return 'Arbitrum Sepolia';
      case 31337:
        return 'Localhost';
      case 1:
        return 'Ethereum Mainnet';
      case 42161:
        return 'Arbitrum One';
      default:
        return `Chain ${chainId}`;
    }
  };

  // 检查是否为支持的网络
  const isSupportedNetwork = (chainId: number | null): boolean => {
    return chainId === 421614 || chainId === 31337; // Arbitrum Sepolia 或 Localhost
  };

  // 如果没有MetaMask
  if (typeof window !== 'undefined' && !window.ethereum) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Web3 Wallet
          </CardTitle>
          <CardDescription>
            Connect your wallet to use RiverBit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              MetaMask is required to use this application. 
              <a 
                href="https://metamask.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline ml-1"
              >
                Install MetaMask
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Web3 Wallet
          {walletState.isConnected && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your wallet to start trading
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 错误信息 */}
        {walletState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{walletState.error}</AlertDescription>
          </Alert>
        )}

        {/* 未连接状态 */}
        {!walletState.isConnected && (
          <Button 
            onClick={connectWallet} 
            disabled={walletState.isLoading}
            className="w-full"
            size="lg"
          >
            {walletState.isLoading ? (
              <Loader className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wallet className="h-4 w-4 mr-2" />
            )}
            Connect Wallet
          </Button>
        )}

        {/* 已连接状态 */}
        {walletState.isConnected && (
          <div className="space-y-3">
            {/* 账户信息 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Account:</span>
                <code className="text-sm font-mono">
                  {shortenAddress(walletState.address)}
                </code>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Network:</span>
                <Badge 
                  variant={isSupportedNetwork(walletState.chainId) ? "default" : "destructive"}
                >
                  {getNetworkName(walletState.chainId)}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">USDC Balance:</span>
                <span className="font-semibold">
                  ${formatNumber(walletState.usdcBalance)} USDC
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">ETH Balance:</span>
                <span className="font-semibold">
                  {walletState.ethBalance.toFixed(4)} ETH
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">USDC Allowance:</span>
                <span className="font-semibold text-blue-600">
                  ${formatNumber(walletState.usdcAllowance)}
                </span>
              </div>
            </div>

            {/* 网络切换提示 */}
            {!isSupportedNetwork(walletState.chainId) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Unsupported network detected!</p>
                    <p className="text-sm">Please switch to Arbitrum Sepolia to use RiverBit features.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 操作按钮 */}
            <div className="grid grid-cols-2 gap-2">
              {!isSupportedNetwork(walletState.chainId) ? (
                <Button 
                  onClick={switchToArbitrum}
                  disabled={walletState.isLoading}
                  className="col-span-2"
                  variant="outline"
                >
                  {walletState.isLoading ? (
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Switch to Arbitrum
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={refreshBalance}
                    variant="outline"
                    size="sm"
                    disabled={walletState.isLoading}
                  >
                    {walletState.isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                  <Button 
                    onClick={disconnectWallet}
                    variant="outline"
                    size="sm"
                  >
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 连接状态显示 */}
        <div className="pt-2 border-t">
          {walletState.isConnected && isSupportedNetwork(walletState.chainId) && (
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-green-600 font-medium">
                  Ready to trade on RiverBit!
                </p>
              </div>
              <p className="text-xs text-gray-300 font-medium">
                Contract: {getNetworkName(walletState.chainId)}
              </p>
              <p className="text-xs text-gray-300 font-medium">
                Last updated: {new Date(walletState.lastUpdated).toLocaleTimeString()}
              </p>
            </div>
          )}
          
          {walletState.isConnected && !isSupportedNetwork(walletState.chainId) && (
            <div className="text-center">
              <p className="text-xs text-orange-600 font-medium">
                Network switch required
              </p>
            </div>
          )}
          
          {!walletState.isConnected && (
            <div className="text-center">
              <p className="text-xs text-gray-300 font-medium">
                Connect wallet to start trading
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Web3Connection;