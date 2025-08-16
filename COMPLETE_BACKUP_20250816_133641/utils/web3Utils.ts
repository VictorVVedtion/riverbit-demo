import { ethers } from 'ethers';
import { RIVERBIT_CORE_ABI, USDC_ABI, getNetworkConfig, formatUSDC, parseUSDC } from './contractConfig';

// Web3 Provider管理
export class Web3Manager {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private riverbitContract: ethers.Contract | null = null;
  private usdcContract: ethers.Contract | null = null;
  private chainId: number | null = null;

  // 连接钱包
  async connectWallet(): Promise<{ address: string; chainId: number }> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      // 请求连接
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);
      
      // 初始化合约
      this.initializeContracts();
      
      // 监听账户和网络变化
      this.setupEventListeners();
      
      return { address, chainId: this.chainId };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // 断开钱包
  disconnectWallet() {
    // 清除事件监听器
    this.removeContractEventListeners();
    
    this.provider = null;
    this.signer = null;
    this.riverbitContract = null;
    this.usdcContract = null;
    this.chainId = null;
  }

  // 初始化合约
  private initializeContracts() {
    if (!this.signer || !this.chainId) return;

    const config = getNetworkConfig(this.chainId);
    if (!config) {
      console.warn('Unsupported network:', this.chainId);
      return;
    }

    try {
      if (config.contracts.RIVERBIT_CORE) {
        this.riverbitContract = new ethers.Contract(
          config.contracts.RIVERBIT_CORE,
          RIVERBIT_CORE_ABI,
          this.signer
        );
      }

      if (config.contracts.USDC) {
        this.usdcContract = new ethers.Contract(
          config.contracts.USDC,
          USDC_ABI,
          this.signer
        );
      }
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
    }
  }

  // 设置事件监听
  private setupEventListeners() {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnectWallet();
        } else {
          window.location.reload(); // 简单处理，重新加载页面
        }
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        window.location.reload(); // 网络切换时重新加载
      });
    }
  }

  // 切换到Arbitrum测试网
  async switchToArbitrumSepolia() {
    if (!window.ethereum) throw new Error('MetaMask not available');

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x66eee' }], // 421614 in hex
      });
    } catch (error: any) {
      // 如果网络不存在，添加网络
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x66eee',
            chainName: 'Arbitrum Sepolia',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
            blockExplorerUrls: ['https://sepolia.arbiscan.io'],
          }],
        });
      } else {
        throw error;
      }
    }
  }

  // USDC相关操作
  async getUSDCBalance(address: string): Promise<number> {
    if (!this.usdcContract) throw new Error('USDC contract not initialized');
    const balance = await this.usdcContract.balanceOf(address);
    return formatUSDC(balance);
  }

  async approveUSDC(amount: number): Promise<ethers.ContractTransaction> {
    if (!this.usdcContract || !this.riverbitContract) {
      throw new Error('Contracts not initialized');
    }
    
    const amountWei = parseUSDC(amount);
    return await this.usdcContract.approve(
      await this.riverbitContract.getAddress(),
      amountWei
    );
  }

  async checkUSDCAllowance(userAddress: string): Promise<number> {
    if (!this.usdcContract || !this.riverbitContract) {
      throw new Error('Contracts not initialized');
    }
    
    const allowance = await this.usdcContract.allowance(
      userAddress,
      await this.riverbitContract.getAddress()
    );
    return formatUSDC(allowance);
  }

  // RiverBit合约操作
  async deposit(amount: number): Promise<ethers.ContractTransaction> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    const amountWei = parseUSDC(amount);
    return await this.riverbitContract.deposit(amountWei);
  }

  async withdraw(amount: number): Promise<ethers.ContractTransaction> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    const amountWei = parseUSDC(amount);
    return await this.riverbitContract.withdraw(amountWei);
  }

  async depositToPool(amount: number): Promise<ethers.ContractTransaction> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    const amountWei = parseUSDC(amount);
    return await this.riverbitContract.depositToPool(amountWei);
  }

  async withdrawFromPool(shares: number): Promise<ethers.ContractTransaction> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    const sharesWei = parseUSDC(shares); // shares也用USDC的精度
    return await this.riverbitContract.withdrawFromPool(sharesWei);
  }

  async openPosition(
    symbol: string,
    size: number,
    leverage: number
  ): Promise<ethers.ContractTransaction> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    
    // size转换为合约格式 (按价格计算)
    const sizeWei = parseUSDC(Math.abs(size));
    const finalSize = size >= 0 ? sizeWei : -sizeWei;
    
    return await this.riverbitContract.openPosition(symbol, finalSize, leverage);
  }

  async closePosition(symbol: string, size: number): Promise<ethers.ContractTransaction> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    
    const sizeWei = parseUSDC(Math.abs(size));
    const finalSize = size >= 0 ? sizeWei : -sizeWei;
    
    return await this.riverbitContract.closePosition(symbol, finalSize);
  }

  // 查询函数
  async getAccountInfo(address: string) {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    
    const [balance, poolShares, totalMargin, lastActivityTime] = 
      await this.riverbitContract.getAccountInfo(address);
    
    return {
      balance: formatUSDC(balance),
      poolShares: formatUSDC(poolShares),
      totalMargin: formatUSDC(totalMargin),
      lastActivityTime: Number(lastActivityTime)
    };
  }

  async getPosition(address: string, symbol: string): Promise<number> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    
    const position = await this.riverbitContract.getPosition(address, symbol);
    return formatUSDC(position);
  }

  async getPoolState() {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    
    const [totalValueLocked, totalShares, netAssetValue, totalPnL, insuranceFund] = 
      await this.riverbitContract.getPoolState();
    
    return {
      totalValueLocked: formatUSDC(totalValueLocked),
      totalShares: formatUSDC(totalShares),
      netAssetValue: Number(netAssetValue) / 1e18, // NAV是18位精度
      totalPnL: formatUSDC(totalPnL),
      insuranceFund: formatUSDC(insuranceFund)
    };
  }

  async getUserPoolValue(address: string): Promise<number> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    
    const value = await this.riverbitContract.getUserPoolValue(address);
    return formatUSDC(value);
  }

  async getAssetPrice(symbol: string): Promise<number> {
    if (!this.riverbitContract) throw new Error('RiverBit contract not initialized');
    
    const price = await this.riverbitContract.assetPrices(symbol);
    return Number(price) / 1e8; // 价格是8位精度
  }

  // 监听合约事件
  setupContractEventListeners(callbacks: {
    onDeposit?: (user: string, amount: number, txHash: string) => void;
    onWithdraw?: (user: string, amount: number, txHash: string) => void;
    onPoolDeposit?: (user: string, amount: number, shares: number, txHash: string) => void;
    onPoolWithdraw?: (user: string, shares: number, amount: number, txHash: string) => void;
    onPositionOpened?: (user: string, symbol: string, size: number, price: number, txHash: string) => void;
    onPositionClosed?: (user: string, symbol: string, size: number, pnl: number, txHash: string) => void;
  }) {
    if (!this.riverbitContract) return;

    // 清除之前的监听器
    this.riverbitContract.removeAllListeners();

    if (callbacks.onDeposit) {
      this.riverbitContract.on('Deposit', (user, amount, event) => {
        callbacks.onDeposit!(user, formatUSDC(amount), event.log.transactionHash);
      });
    }

    if (callbacks.onWithdraw) {
      this.riverbitContract.on('Withdraw', (user, amount, event) => {
        callbacks.onWithdraw!(user, formatUSDC(amount), event.log.transactionHash);
      });
    }

    if (callbacks.onPoolDeposit) {
      this.riverbitContract.on('PoolDeposit', (user, amount, shares, event) => {
        callbacks.onPoolDeposit!(user, formatUSDC(amount), formatUSDC(shares), event.log.transactionHash);
      });
    }

    if (callbacks.onPoolWithdraw) {
      this.riverbitContract.on('PoolWithdraw', (user, shares, amount, event) => {
        callbacks.onPoolWithdraw!(user, formatUSDC(shares), formatUSDC(amount), event.log.transactionHash);
      });
    }

    if (callbacks.onPositionOpened) {
      this.riverbitContract.on('PositionOpened', (user, symbol, size, price, event) => {
        callbacks.onPositionOpened!(user, symbol, formatUSDC(size), Number(price) / 1e8, event.log.transactionHash);
      });
    }

    if (callbacks.onPositionClosed) {
      this.riverbitContract.on('PositionClosed', (user, symbol, size, pnl, event) => {
        callbacks.onPositionClosed!(user, symbol, formatUSDC(size), formatUSDC(pnl), event.log.transactionHash);
      });
    }
  }

  // 清除事件监听器
  removeContractEventListeners() {
    if (this.riverbitContract) {
      this.riverbitContract.removeAllListeners();
    }
  }

  // 获取历史事件
  async getHistoricalEvents(
    userAddress: string, 
    fromBlock: number = 0, 
    toBlock: number | string = 'latest'
  ) {
    if (!this.riverbitContract) throw new Error('Contract not initialized');

    try {
      const events = await Promise.all([
        this.riverbitContract.queryFilter(
          this.riverbitContract.filters.Deposit(userAddress),
          fromBlock,
          toBlock
        ),
        this.riverbitContract.queryFilter(
          this.riverbitContract.filters.Withdraw(userAddress),
          fromBlock,
          toBlock
        ),
        this.riverbitContract.queryFilter(
          this.riverbitContract.filters.PoolDeposit(userAddress),
          fromBlock,
          toBlock
        ),
        this.riverbitContract.queryFilter(
          this.riverbitContract.filters.PoolWithdraw(userAddress),
          fromBlock,
          toBlock
        )
      ]);

      // 合并并排序事件
      const allEvents = events.flat().sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return b.blockNumber - a.blockNumber; // 最新的在前
        }
        return b.transactionIndex - a.transactionIndex;
      });

      return allEvents.map(event => ({
        type: event.eventName,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: Date.now(), // 需要通过区块查询获取准确时间
        args: event.args
      }));
    } catch (error) {
      console.error('Failed to get historical events:', error);
      return [];
    }
  }

  // Getter方法
  get isConnected(): boolean {
    return !!this.signer;
  }

  get currentChainId(): number | null {
    return this.chainId;
  }

  get contracts() {
    return {
      riverbit: this.riverbitContract,
      usdc: this.usdcContract
    };
  }
}

// 全局Web3管理器实例
export const web3Manager = new Web3Manager();

// 工具函数
export function shortenAddress(address: string, startLength = 6, endLength = 4): string {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

export function formatNumber(num: number, decimals = 2): string {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`;
  } else {
    return num.toFixed(decimals);
  }
}

export function formatPercentage(num: number, decimals = 2): string {
  return `${(num * 100).toFixed(decimals)}%`;
}

// 交易状态枚举
export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed'
}

// 交易类型
export interface Transaction {
  hash: string;
  type: 'deposit' | 'withdraw' | 'pool_deposit' | 'pool_withdraw' | 'open_position' | 'close_position';
  status: TransactionStatus;
  timestamp: number;
  amount?: number;
  symbol?: string;
  error?: string;
}