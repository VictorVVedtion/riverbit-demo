import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { CONTRACT_CONFIG, USDC_FAUCET_ABI } from '../../utils/contractConfig';

const UNLIMITED_USDC_ADDRESS = '0x56bbaEb426980c930dd1b8476aF9fA4F0B983e33'; // 无限制USDC合约地址

export default function UnlimitedUSDCMint() {
  const { address, isConnected } = useAccount();
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string>('');

  // 读取用户余额
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: UNLIMITED_USDC_ADDRESS,
    abi: USDC_FAUCET_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // 读取总供应量统计
  const { data: faucetStats } = useReadContract({
    address: UNLIMITED_USDC_ADDRESS,
    abi: USDC_FAUCET_ABI,
    functionName: 'getFaucetStats',
  });

  // 写入合约方法
  const { writeContract, data: hash, error, isPending } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 交易成功后刷新余额
  useEffect(() => {
    if (isSuccess) {
      refetchBalance();
      setIsLoading(false);
      if (hash) {
        setLastTxHash(hash);
      }
    }
  }, [isSuccess, refetchBalance, hash]);

  // 快速mint函数
  const quickMint = async (preset: number) => {
    if (!isConnected) return;
    
    try {
      setIsLoading(true);
      await writeContract({
        address: UNLIMITED_USDC_ADDRESS,
        abi: USDC_FAUCET_ABI,
        functionName: 'mintPreset',
        args: [preset],
      });
    } catch (error) {
      console.error('Mint failed:', error);
      setIsLoading(false);
    }
  };

  // 自定义金额mint
  const customMint = async () => {
    if (!isConnected || !customAmount) return;
    
    try {
      setIsLoading(true);
      const amount = parseUnits(customAmount, 6); // USDC has 6 decimals
      await writeContract({
        address: UNLIMITED_USDC_ADDRESS,
        abi: USDC_FAUCET_ABI,
        functionName: 'faucetMint',
        args: [amount],
      });
    } catch (error) {
      console.error('Custom mint failed:', error);
      setIsLoading(false);
    }
  };

  // 百万USDC快速mint
  const mintMillion = async () => {
    if (!isConnected) return;
    
    try {
      setIsLoading(true);
      await writeContract({
        address: UNLIMITED_USDC_ADDRESS,
        abi: USDC_FAUCET_ABI,
        functionName: 'mintMillion',
      });
    } catch (error) {
      console.error('Million mint failed:', error);
      setIsLoading(false);
    }
  };

  // 千万USDC快速mint
  const mintTenMillion = async () => {
    if (!isConnected) return;
    
    try {
      setIsLoading(true);
      await writeContract({
        address: UNLIMITED_USDC_ADDRESS,
        abi: USDC_FAUCET_ABI,
        functionName: 'mintTenMillion',
      });
    } catch (error) {
      console.error('Ten million mint failed:', error);
      setIsLoading(false);
    }
  };

  const formatUSDC = (amount: bigint) => {
    return formatUnits(amount, 6);
  };

  if (!isConnected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>无限制USDC Faucet</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              请先连接钱包以使用USDC faucet
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>无限制USDC Faucet</span>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            无任何限制
          </Badge>
        </CardTitle>
        <div className="text-sm text-gray-600">
          <p>测试网随便mint - 无冷却时间，无每日限额，无单次限额</p>
          <p className="text-xs">合约地址: {UNLIMITED_USDC_ADDRESS}</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 余额显示 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">当前USDC余额:</span>
            <span className="text-xl font-bold">
              {balance ? formatUSDC(balance) : '0'} USDC
            </span>
          </div>
          {faucetStats && (
            <div className="mt-2 text-xs text-gray-500">
              总mint量: {formatUSDC(faucetStats[0])} USDC | 
              总供应量: {formatUSDC(faucetStats[1])} USDC
            </div>
          )}
        </div>

        {/* 快速mint按钮 */}
        <div className="space-y-4">
          <h3 className="font-medium">快速mint常用金额:</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => quickMint(0)}
              disabled={isLoading || isPending || isConfirming}
              variant="outline"
            >
              1,000 USDC
            </Button>
            <Button 
              onClick={() => quickMint(1)}
              disabled={isLoading || isPending || isConfirming}
              variant="outline"
            >
              10,000 USDC
            </Button>
            <Button 
              onClick={() => quickMint(2)}
              disabled={isLoading || isPending || isConfirming}
              variant="outline"
            >
              100,000 USDC
            </Button>
            <Button 
              onClick={() => quickMint(3)}
              disabled={isLoading || isPending || isConfirming}
              variant="outline"
            >
              1,000,000 USDC
            </Button>
          </div>

          {/* 超大金额快速mint */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={mintMillion}
              disabled={isLoading || isPending || isConfirming}
              className="bg-blue-600 hover:bg-blue-700"
            >
              快速mint 1百万
            </Button>
            <Button 
              onClick={mintTenMillion}
              disabled={isLoading || isPending || isConfirming}
              className="bg-purple-600 hover:bg-purple-700"
            >
              快速mint 1千万
            </Button>
          </div>
        </div>

        {/* 自定义金额mint */}
        <div className="space-y-3">
          <h3 className="font-medium">自定义金额mint:</h3>
          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="输入USDC数量"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={customMint}
              disabled={!customAmount || isLoading || isPending || isConfirming}
              className="bg-green-600 hover:bg-green-700"
            >
              Mint
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            提示: 可以输入任意金额，如 1000000 (一百万USDC)
          </p>
        </div>

        {/* 状态显示 */}
        {(isPending || isConfirming || isLoading) && (
          <Alert>
            <AlertDescription>
              {isPending && "确认交易中..."}
              {isConfirming && "等待交易确认..."}
              {isLoading && "处理中..."}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              交易失败: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {isSuccess && lastTxHash && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Mint成功! 
              <a 
                href={`https://sepolia.arbiscan.io/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 underline"
              >
                查看交易
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* 使用说明 */}
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <h4 className="font-medium text-blue-900 mb-2">使用说明:</h4>
          <ul className="text-blue-800 space-y-1">
            <li>• 完全无限制 - 任何地址都可以随时mint</li>
            <li>• 无冷却时间 - 可以连续mint</li>
            <li>• 无金额限制 - 支持大额mint (如100万USDC)</li>
            <li>• 立即可用 - mint后立即到账</li>
            <li>• 测试网专用 - 仅用于测试环境</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}