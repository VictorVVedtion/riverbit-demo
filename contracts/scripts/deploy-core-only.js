const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 开始部署RiverBitCore合约...\n");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📋 部署者地址:", deployer.address);
  
  // 检查余额
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 部署者余额:", ethers.formatEther(balance), "ETH\n");

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
    
    // 保存部署信息
    const deploymentInfo = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        riverbitCore: riverbitCoreAddress,
        usdc: USDC_ADDRESS
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      'deployment-info.json', 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n📄 部署信息已保存到 deployment-info.json");
    console.log("\n🎉 部署完成!");
    console.log("📍 合约地址:", riverbitCoreAddress);
    
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