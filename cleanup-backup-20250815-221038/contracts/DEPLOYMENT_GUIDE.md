# RiverBit合约部署指南

## 🎯 部署状态

✅ **本地测试**: 合约已在Hardhat网络成功部署测试  
⏳ **测试网部署**: 准备部署到Arbitrum Sepolia  
⭐ **环境配置**: 部署工具和脚本已就绪  

## 📋 部署前准备

### 1. 获取测试网ETH
- 访问 [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- 或者使用 [Chainlist Faucet](https://faucets.chain.link/) 
- 需要约 0.01 ETH 用于部署gas费用

### 2. 配置私钥
```bash
# 在 contracts/.env 文件中设置
PRIVATE_KEY=your_real_private_key_here
```

### 3. 可选：获取Arbiscan API Key
- 访问 [Arbiscan](https://arbiscan.io/apis)
- 注册并获取免费API Key
- 用于自动验证合约

## 🚀 部署命令

### 部署到Arbitrum Sepolia测试网
```bash
cd contracts
npx hardhat run scripts/deploy-core-only.js --network arbitrumSepolia
```

### 验证合约（如果有API Key）
```bash
npx hardhat verify --network arbitrumSepolia <合约地址> "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
```

## 📍 重要地址信息

### Arbitrum Sepolia网络
- **Chain ID**: 421614
- **RPC URL**: https://sepolia-rollup.arbitrum.io/rpc
- **Block Explorer**: https://sepolia.arbiscan.io
- **USDC合约**: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

## 🎛️ 部署后配置

### 1. 更新前端配置
部署成功后，需要更新前端配置文件中的合约地址：
- 文件位置: `/config/wagmi.ts`
- 更新 `NETWORK_CONFIG` 中的合约地址

### 2. 测试合约功能
- 向合约存入测试USDC
- 测试基本的存取功能
- 验证交易和池功能

### 3. 获取测试USDC
可以通过以下方式获取Arbitrum Sepolia上的测试USDC：
- 使用跨链桥从其他测试网转移
- 查找Arbitrum Sepolia USDC faucet
- 或联系相关社区获取

## 📄 部署输出

部署成功后会生成 `deployment-info.json` 文件，包含：
```json
{
  "network": "arbitrumSepolia",
  "timestamp": "2025-08-15T01:30:00.000Z",
  "deployer": "0x...",
  "contracts": {
    "riverbitCore": "0x...",
    "usdc": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  }
}
```

## 🔧 故障排除

### Gas费用不足
- 确保钱包有足够的测试网ETH
- 可以调整hardhat.config.js中的gas设置

### RPC连接问题
- 检查网络连接
- 尝试其他RPC节点
- 确认网络配置正确

### 合约验证失败
- 检查Arbiscan API Key
- 确认构造函数参数正确
- 可以稍后手动验证

## 🎉 部署完成后

1. ✅ 合约地址记录在deployment-info.json
2. 🔍 在Arbiscan上查看合约
3. ⚙️ 更新前端配置
4. 🧪 开始端到端测试

---

**注意**: 这是测试网部署，仅用于开发和演示目的。主网部署需要更严格的安全审查和配置。