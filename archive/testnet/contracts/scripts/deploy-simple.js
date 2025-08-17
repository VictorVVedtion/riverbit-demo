const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 开始部署RiverBit简化版合约到Arbitrum Sepolia...\n");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📋 部署者地址:", deployer.address);
  
  // 检查余额
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 部署者余额:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.01")) {
    console.log("❌ 余额不足，需要至少0.01 ETH进行部署");
    return;
  }

  // USDC地址 (Arbitrum Sepolia)
  const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  
  try {
    // 部署RiverBitCore合约
    console.log("📝 正在部署RiverBitCore合约...");
    
    const RiverBitCore = await ethers.getContractFactory("RiverBitCore");
    
    // 部署合约
    const riverbitCore = await RiverBitCore.deploy(USDC_ADDRESS);
    
    // 等待部署完成
    await riverbitCore.waitForDeployment();
    const riverbitCoreAddress = await riverbitCore.getAddress();
    
    console.log("✅ RiverBitCore合约部署成功!");
    console.log("📍 合约地址:", riverbitCoreAddress);
    
    // 等待几个区块确认
    console.log("⏳ 等待区块确认...");
    await riverbitCore.deploymentTransaction().wait(2);
    
    // 初始化一些基础价格数据
    console.log("🔧 初始化合约...");
    
    // 设置一些基础资产价格 (模拟价格，实际应从oracle获取)
    const initialPrices = [
      { symbol: "BTC", price: ethers.parseUnits("43000", 8) }, // $43,000
      { symbol: "ETH", price: ethers.parseUnits("2500", 8) },  // $2,500
      { symbol: "SOL", price: ethers.parseUnits("100", 8) },   // $100
      { symbol: "xAAPL", price: ethers.parseUnits("175", 8) }, // $175
      { symbol: "xTSLA", price: ethers.parseUnits("250", 8) }, // $250
      { symbol: "xMSFT", price: ethers.parseUnits("380", 8) }, // $380
      { symbol: "xGOOGL", price: ethers.parseUnits("140", 8) } // $140
    ];

    for (const asset of initialPrices) {
      try {
        const tx = await riverbitCore.updatePrice(asset.symbol, asset.price);
        await tx.wait();
        console.log(`   ✓ 设置 ${asset.symbol} 价格: $${ethers.formatUnits(asset.price, 8)}`);
      } catch (error) {
        console.log(`   ❌ 设置 ${asset.symbol} 价格失败:`, error.message);
      }
    }

    console.log("\n🎉 部署完成!");
    console.log("=".repeat(60));
    console.log("📋 部署摘要:");
    console.log("=".repeat(60));
    console.log(`📍 RiverBitCore地址: ${riverbitCoreAddress}`);
    console.log(`🏦 USDC地址: ${USDC_ADDRESS}`);
    console.log(`👤 所有者: ${deployer.address}`);
    console.log(`⛽ Gas消耗: ${await deployer.provider.getTransactionCount(deployer.address)}`);
    
    // 保存部署信息到文件
    const deploymentInfo = {
      network: "arbitrumSepolia",
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        riverbitCore: riverbitCoreAddress,
        usdc: USDC_ADDRESS
      },
      initialPrices: initialPrices.map(p => ({
        symbol: p.symbol,
        price: ethers.formatUnits(p.price, 8)
      }))
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      'deployment-info.json', 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n📄 部署信息已保存到 deployment-info.json");
    
    // 验证合约 (如果设置了API key)
    if (process.env.ARBISCAN_API_KEY && process.env.AUTO_VERIFY === 'true') {
      console.log("\n🔍 正在验证合约...");
      try {
        await hre.run("verify:verify", {
          address: riverbitCoreAddress,
          constructorArguments: [USDC_ADDRESS],
        });
        console.log("✅ 合约验证成功!");
      } catch (error) {
        console.log("❌ 合约验证失败:", error.message);
        console.log("💡 您可以稍后手动验证合约");
      }
    }
    
    console.log("\n🔗 有用的链接:");
    console.log(`📍 Arbiscan: https://sepolia.arbiscan.io/address/${riverbitCoreAddress}`);
    console.log(`🏦 USDC合约: https://sepolia.arbiscan.io/address/${USDC_ADDRESS}`);
    
    console.log("\n🎯 下一步:");
    console.log("1. 更新前端配置文件中的合约地址");
    console.log("2. 向合约存入一些初始USDC用于测试");
    console.log("3. 测试基本的存取和交易功能");
    
  } catch (error) {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  }
}

// 执行部署
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });