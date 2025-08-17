const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 部署完全无限制的USDC合约...");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);
    
    // 获取账户余额
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("部署者余额:", ethers.formatEther(balance), "ETH");
    
    console.log("\n📝 部署UnlimitedUSDCFaucet合约...");
    
    // 部署UnlimitedUSDCFaucet合约
    const UnlimitedUSDCFaucet = await ethers.getContractFactory("UnlimitedUSDCFaucet");
    const unlimitedUSDC = await UnlimitedUSDCFaucet.deploy();
    await unlimitedUSDC.waitForDeployment();
    
    console.log("✅ UnlimitedUSDCFaucet部署成功!");
    const contractAddress = await unlimitedUSDC.getAddress();
    console.log("合约地址:", contractAddress);
    
    // 验证合约状态
    console.log("\n🔍 验证合约状态...");
    const name = await unlimitedUSDC.name();
    const symbol = await unlimitedUSDC.symbol();
    const decimals = await unlimitedUSDC.decimals();
    const totalSupply = await unlimitedUSDC.totalSupply();
    const faucetEnabled = await unlimitedUSDC.faucetEnabled();
    
    console.log("代币名称:", name);
    console.log("代币符号:", symbol);
    console.log("代币精度:", decimals);
    console.log("初始总供应量:", ethers.formatUnits(totalSupply, decimals), symbol);
    console.log("水龙头启用状态:", faucetEnabled);
    
    // 测试mint功能
    console.log("\n🧪 测试mint功能...");
    const testAmount = ethers.parseUnits("1000000", decimals); // 1M USDC
    
    console.log("测试mint 1,000,000 USDC...");
    const mintTx = await unlimitedUSDC.faucetMint(testAmount);
    await mintTx.wait();
    
    const deployerBalance = await unlimitedUSDC.balanceOf(deployer.address);
    console.log("部署者USDC余额:", ethers.formatUnits(deployerBalance, decimals), symbol);
    
    // 测试便捷函数
    console.log("\n测试便捷mint函数...");
    const millionTx = await unlimitedUSDC.mintMillion();
    await millionTx.wait();
    
    const newBalance = await unlimitedUSDC.balanceOf(deployer.address);
    console.log("mint百万后余额:", ethers.formatUnits(newBalance, decimals), symbol);
    
    // 保存部署信息
    const deploymentInfo = {
        timestamp: new Date().toISOString(),
        network: "arbitrum-sepolia",
        deployer: deployer.address,
        contracts: {
            UnlimitedUSDCFaucet: {
                address: contractAddress,
                name: name,
                symbol: symbol,
                decimals: decimals,
                features: [
                    "无限制mint",
                    "无冷却时间",
                    "无数量限制",
                    "任何地址可用",
                    "便捷函数支持"
                ]
            }
        },
        txHashes: {
            deployment: unlimitedUSDC.deployTransaction.hash,
            testMint: mintTx.hash,
            millionMint: millionTx.hash
        }
    };
    
    // 保存到配置文件
    const configDir = path.join(__dirname, "../config");
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    const configPath = path.join(configDir, "unlimited-usdc-deployment.json");
    fs.writeFileSync(configPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n💾 部署信息已保存到:", configPath);
    
    // 创建前端配置
    const frontendConfig = {
        UNLIMITED_USDC_ADDRESS: contractAddress,
        UNLIMITED_USDC_ABI: [
            "function faucetMint(uint256 amount) external",
            "function mintTo(address to, uint256 amount) external", 
            "function mintPreset(uint8 preset) external",
            "function mintMillion() external",
            "function mintTenMillion() external",
            "function balanceOf(address account) external view returns (uint256)",
            "function decimals() external pure returns (uint8)",
            "function name() external view returns (string)",
            "function symbol() external view returns (string)",
            "function canMint(address user, uint256 amount) external view returns (bool, string)",
            "function getFaucetStats() external view returns (bool, uint256)"
        ]
    };
    
    const frontendConfigPath = path.join(configDir, "unlimited-usdc-frontend.json");
    fs.writeFileSync(frontendConfigPath, JSON.stringify(frontendConfig, null, 2));
    
    console.log("💻 前端配置已保存到:", frontendConfigPath);
    
    console.log("\n🎉 部署完成！");
    console.log("=".repeat(50));
    console.log("合约地址:", contractAddress);
    console.log("特性: 完全无限制mint，测试网专用");
    console.log("使用方法:");
    console.log("- faucetMint(amount): mint任意数量");
    console.log("- mintMillion(): 快速mint 100万");
    console.log("- mintTenMillion(): 快速mint 1000万");
    console.log("=".repeat(50));
    
    return {
        unlimitedUSDC: contractAddress,
        deploymentInfo
    };
}

// 执行部署
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 部署失败:", error);
        process.exit(1);
    });