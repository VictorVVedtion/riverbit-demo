import { arbitrum, arbitrumSepolia } from 'viem/chains'
import { createConfig, http } from 'wagmi'
import { metaMask, walletConnect, injected } from 'wagmi/connectors'

// 1. Demo projectId - 简化配置避免外部API调用
export const projectId = 'demo-riverbit-trading-platform'

// 2. Development environment detection
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'
const currentPort = typeof window !== 'undefined' ? window.location.port : '5175'
const baseUrl = isDevelopment ? `http://localhost:${currentPort}` : 'https://riverbit-demo.vercel.app'

// 3. Create simplified wagmi config without external dependencies
export const config = createConfig({
  chains: [arbitrumSepolia, arbitrum],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: 'demo',
      metadata: {
        name: 'RiverBit Demo',
        description: 'Demo Trading Platform',
        url: baseUrl,
        icons: []
      },
      showQrModal: false // 禁用QR模态框避免API调用
    })
  ],
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc')
  }
})

// 3. Create modal placeholder (for compatibility)
export const modal = {
  open: () => console.log('Demo mode: Wallet connection'),
  close: () => console.log('Demo mode: Wallet disconnection')
}

// 5. Export types for type safety
export type Config = typeof config
export type Chain = typeof arbitrumSepolia | typeof arbitrum

// 6. Network configuration for RiverBit contracts
export const NETWORK_CONFIG = {
  [arbitrumSepolia.id]: {
    name: 'Arbitrum Sepolia',
    shortName: 'arbsep',
    chainId: arbitrumSepolia.id,
    rpcUrl: 'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
    blockExplorer: 'https://sepolia.arbiscan.io',
    contracts: {
      riverbitCoreV2: '0xA12BdBf28af28EC5C5A3d9DDA65F637d8B683a5a', // Latest deployed address
      usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' // Arbitrum Sepolia USDC
    }
  },
  [arbitrum.id]: {
    name: 'Arbitrum One',
    shortName: 'arb',
    chainId: arbitrum.id,
    rpcUrl: 'https://arbitrum.blockpi.network/v1/rpc/public',
    blockExplorer: 'https://arbiscan.io',
    contracts: {
      riverbitCoreV2: '0x0000000000000000000000000000000000000000', // To be deployed
      usdc: '0xA0b86a33E6417FA891A4F0A7fD9F6CdDFbC65Ea' // Arbitrum One USDC
    }
  }
}