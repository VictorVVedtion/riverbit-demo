require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      gasPrice: 20000000000,
      blockGasLimit: 12000000,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20,
      },
    },
    
    // Arbitrum Sepolia Testnet
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614,
      gas: 10000000,
      gasPrice: 100000000, // 0.1 gwei
      blockConfirmations: 1,
      timeout: 60000,
    },
    
    // Arbitrum Mainnet (for future deployment)
    arbitrumOne: {
      url: process.env.ARBITRUM_MAINNET_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161,
      gas: 10000000,
      gasPrice: 100000000, // 0.1 gwei
      blockConfirmations: 3,
      timeout: 120000,
    },
    
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      gas: 12000000,
      gasPrice: 20000000000,
    },
  },
  
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 0.1, // gwei
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  
  sourcify: {
    enabled: true,
  },
  
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  
  mocha: {
    timeout: 300000, // 5 minutes
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};