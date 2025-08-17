/**
 * Simplified Wagmi Configuration for Frontend Demo
 * Designed to work without backend dependencies and external API calls
 */

import { createConfig, http } from 'wagmi'
import { arbitrum, arbitrumSepolia } from 'wagmi/chains'

// Mock configuration for frontend demo mode
export const projectId = 'riverbit-frontend-demo'

// Demo-only configuration that doesn't actually connect to Web3
export const config = createConfig({
  chains: [arbitrum, arbitrumSepolia],
  transports: {
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
})

// Mock modal for demo mode
export const modal = {
  open: () => {
    console.log('🎭 Demo Mode: Wallet connection UI would open here')
    return Promise.resolve()
  },
  close: () => {
    console.log('🎭 Demo Mode: Wallet connection UI would close here')
    return Promise.resolve()
  }
}

// Network configuration for contracts (demo addresses)
export const NETWORK_CONFIG = {
  [421614]: { // Arbitrum Sepolia
    name: 'Arbitrum Sepolia',
    shortName: 'arbsep',
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    contracts: {
      riverbitCoreV2: '0xA12BdBf28af28EC5C5A3d9DDA65F637d8B683a5a',
      usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
    }
  },
  [42161]: { // Arbitrum One
    name: 'Arbitrum One',
    shortName: 'arb',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    contracts: {
      riverbitCoreV2: '0x0000000000000000000000000000000000000000',
      usdc: '0xA0b86a33E6417FA891A4F0A7fD9F6CdDFbC65Ea'
    }
  }
}

// Export types for compatibility
export type Config = typeof config
export type Chain = typeof chains[0]

// Demo mode utilities
export const isDemoMode = true
export const isWeb3Enabled = false

console.log('🎭 RiverBit Demo Mode: wagmi configuration loaded (frontend-only)')