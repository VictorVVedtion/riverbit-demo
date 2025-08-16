import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { CONTRACT_CONFIG, USDC_FAUCET_ABI } from '../utils/contractConfig';

interface FaucetStats {
  enabled: boolean;
  totalMinted: bigint;
  maxMintAmount: bigint;
  dailyLimit: bigint;
  cooldownPeriod: bigint;
}

interface UserFaucetInfo {
  remainingDailyLimit: bigint;
  remainingCooldown: bigint;
  canMint: boolean;
  canMintReason: string;
}

export function useUSDCFaucet() {
  const { address, isConnected, chain } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  
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
    abi: USDC_FAUCET_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isValidNetwork,
      refetchInterval: 10000 // Refetch every 10 seconds
    }
  });

  // Read token decimals
  const { data: decimals } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_FAUCET_ABI,
    functionName: 'decimals',
    query: {
      enabled: isValidNetwork
    }
  });

  // Read faucet statistics
  const { data: faucetStats, refetch: refetchStats } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_FAUCET_ABI,
    functionName: 'getFaucetStats',
    query: {
      enabled: isValidNetwork
    }
  }) as { data: FaucetStats | undefined, refetch: () => void };

  // Read user-specific faucet info
  const { data: remainingDailyLimit } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_FAUCET_ABI,
    functionName: 'getRemainingDailyLimit',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isValidNetwork,
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  });

  const { data: remainingCooldown } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_FAUCET_ABI,
    functionName: 'getRemainingCooldown',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isValidNetwork,
      refetchInterval: 10000 // Refetch every 10 seconds
    }
  });

  // Write contract for minting
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

  // Check if user can mint a specific amount
  const checkCanMint = useCallback(async (amount: number): Promise<{ canMint: boolean; reason: string }> => {
    if (!address || !isValidNetwork) {
      return { canMint: false, reason: 'Wallet not connected or wrong network' };
    }

    try {
      const decimalsValue = decimals || 6;
      const amountInWei = parseUnits(amount.toString(), decimalsValue);
      
      const result = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'eth_call',
          params: [{
            to: usdcAddress,
            data: '0x...' // Encoded function call for canMint
          }, 'latest']
        })
      });

      // Fallback to basic checks if contract call fails
      if (faucetStats && !faucetStats.enabled) {
        return { canMint: false, reason: 'Faucet is disabled' };
      }

      if (remainingCooldown && remainingCooldown > 0n) {
        return { canMint: false, reason: `Cooldown active: ${remainingCooldown.toString()}s remaining` };
      }

      if (remainingDailyLimit && BigInt(Math.floor(amount * Math.pow(10, decimalsValue))) > remainingDailyLimit) {
        return { canMint: false, reason: 'Daily limit exceeded' };
      }

      return { canMint: true, reason: '' };
    } catch (error) {
      return { canMint: false, reason: 'Error checking mint eligibility' };
    }
  }, [address, isValidNetwork, decimals, faucetStats, remainingCooldown, remainingDailyLimit, usdcAddress]);

  // Mint function with multiple fallback methods
  const mint = useCallback(async (amount: number) => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    if (!isValidNetwork) {
      toast.error('Please switch to Arbitrum Sepolia network');
      return false;
    }

    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return false;
    }

    // Check if user can mint
    const { canMint, reason } = await checkCanMint(amount);
    if (!canMint) {
      toast.error(reason);
      return false;
    }

    setIsLoading(true);

    try {
      const decimalsValue = decimals || 6;
      const amountInWei = parseUnits(amount.toString(), decimalsValue);
      
      // Try faucetMint first (most likely to work)
      try {
        await writeContract({
          address: usdcAddress as `0x${string}`,
          abi: USDC_FAUCET_ABI,
          functionName: 'faucetMint',
          args: [amountInWei]
        });
        
        toast.success('Mint transaction submitted!');
        return true;
      } catch (error: any) {
        console.log('faucetMint failed, trying alternative methods:', error.message);
        
        // Try preset mint if amount matches preset values
        const presetAmounts = [100, 500, 1000, 5000, 10000];
        const presetIndex = presetAmounts.indexOf(amount);
        
        if (presetIndex !== -1) {
          try {
            await writeContract({
              address: usdcAddress as `0x${string}`,
              abi: USDC_FAUCET_ABI,
              functionName: 'mintPreset',
              args: [presetIndex]
            });
            
            toast.success('Preset mint transaction submitted!');
            return true;
          } catch (presetError: any) {
            console.log('mintPreset failed:', presetError.message);
          }
        }

        // If all methods fail, throw error
        throw new Error('All mint methods failed. This contract may not support minting.');
      }
    } catch (error: any) {
      console.error('Mint error:', error);
      
      if (error.message?.includes('execution reverted')) {
        toast.error('Transaction reverted. Please check your eligibility and try again.');
      } else if (error.message?.includes('user rejected')) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error('Failed to mint USDC: ' + (error.message || 'Unknown error'));
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, isValidNetwork, decimals, checkCanMint, writeContract, usdcAddress]);

  // Quick mint presets
  const mintPreset = useCallback(async (presetIndex: number) => {
    const presetAmounts = [100, 500, 1000, 5000, 10000];
    const amount = presetAmounts[presetIndex];
    
    if (amount) {
      return await mint(amount);
    } else {
      toast.error('Invalid preset selected');
      return false;
    }
  }, [mint]);

  // Refresh all data
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchBalance(),
        refetchStats()
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  }, [refetchBalance, refetchStats]);

  return {
    // State
    balance: formattedBalance,
    decimals: decimals || 6,
    isLoading: isLoading || isWritePending || isConfirming,
    isConnected: isConnected && isValidNetwork,
    
    // Faucet info
    faucetStats,
    remainingDailyLimit: remainingDailyLimit ? formatUnits(remainingDailyLimit, decimals || 6) : '0',
    remainingCooldown: remainingCooldown ? Number(remainingCooldown) : 0,
    
    // Transaction info
    hash,
    isConfirmed,
    writeError,
    receiptError,
    
    // Functions
    mint,
    mintPreset,
    checkCanMint,
    refresh,
    reset: resetWrite,
    
    // Contract info
    contractAddress: usdcAddress,
    networkValid: isValidNetwork
  };
}