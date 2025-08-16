import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { arbitrum, arbitrumSepolia } from 'viem/chains'
import { createConfig, http } from 'wagmi'

// 1. Demo projectId - 不使用外部API
export const projectId = '00000000000000000000000000000000' // Demo模式，不连接外部服务

// 2. Create wagmiAdapter with proper network configuration
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [arbitrumSepolia, arbitrum]
})

// 3. Create modal with minimal configuration
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [arbitrumSepolia, arbitrum],
  defaultNetwork: arbitrumSepolia,
  metadata: {
    name: 'RiverBit Demo',
    description: 'Demo Trading Platform',
    url: 'http://localhost:5173',
    icons: []
  },
  themeMode: 'dark',
  enableAnalytics: false,
  enableOnRamp: false,
  enableSwaps: false
})

// 4. Create wagmi config
export const config = wagmiAdapter.wagmiConfig

// 5. Export types for type safety
export type Config = typeof config
export type Chain = typeof arbitrumSepolia | typeof arbitrum

// 6. Network configuration for RiverBit contracts
export const NETWORK_CONFIG = {
  [arbitrumSepolia.id]: {
    name: 'Arbitrum Sepolia',
    shortName: 'arbsep',
    chainId: arbitrumSepolia.id,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    contracts: {
      riverbitCore: '0x43bf3e410fd22e4cD1081E60F31600BDdC15ea96', // Deployed!
      usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' // Arbitrum Sepolia USDC
    }
  },
  [arbitrum.id]: {
    name: 'Arbitrum One',
    shortName: 'arb',
    chainId: arbitrum.id,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    contracts: {
      riverbitCore: '0x0000000000000000000000000000000000000000', // To be deployed
      usdc: '0xA0b86a33E6417FA891A4F0A7fD9F6CdDFbC65Ea' // Arbitrum One USDC
    }
  }
}