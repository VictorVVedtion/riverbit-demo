# Arbitrum Sepolia 网络设置指南

## 🌐 MetaMask网络配置

如果您的钱包还没有Arbitrum Sepolia网络，请添加以下配置：

### 网络详细信息
- **网络名称**: Arbitrum Sepolia
- **RPC URL**: https://sepolia-rollup.arbitrum.io/rpc
- **链ID**: 421614
- **货币符号**: ETH
- **区块浏览器**: https://sepolia.arbiscan.io

### 快速添加方法
访问 [chainlist.org](https://chainlist.org/?search=arbitrum+sepolia) 一键添加

## 💰 获取测试网USDC

### 方法1：Circle官方水龙头（推荐）
1. 访问：https://faucet.circle.com/
2. 连接钱包到Arbitrum Sepolia
3. 每小时领取10 USDC
4. 无需注册，即时到账

### 方法2：合约直接mint
如果水龙头不可用，可以直接调用测试合约：
- 合约地址：0x8be869a56eda7d5a09995b2cbc0d4d37d9d484b3
- 函数：mint(address, amount)

### 确认USDC合约地址
我们的系统使用的官方USDC地址：
`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`

## 🧪 测试准备
获取USDC后，您可以：
1. 在我们的demo中测试存取功能
2. 测试RiverPool流动性功能
3. 测试永续合约交易功能