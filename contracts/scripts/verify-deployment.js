const { ethers } = require("hardhat");

// 已部署合约地址
const DEPLOYED_ADDRESSES = {
  RiverBitCoreV2: "0xA12BdBf28af28EC5C5A3d9DDA65F637d8B683a5a",
  SAuthSettlement: "0x77CD1024a8deEA3F877aB116184b993eF4E25214",
  LPBucketManager: "0x4240d7DE693BDAfEeE6E44F1C8d3811A38B36669",
  ThreeGatesRiskManager: "0xeBE3998F71a6Fe36aAC43F88c406d884c74C93e3",
  GovernanceRegistry: "0x9F4575071EB45704ff1e7B900497c097Fe35D4bA",
  USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
};

async function verifyDeployment() {
  console.log("🔍 RiverBit Deployment Verification");
  console.log("===================================");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Verifier: ${deployer.address}`);
  console.log("");

  let allVerified = true;

  try {
    // 1. 验证RiverBitCoreV2
    console.log("📋 1. Verifying RiverBitCoreV2...");
    try {
      const coreV2 = await ethers.getContractAt("RiverBitCoreV2", DEPLOYED_ADDRESSES.RiverBitCoreV2);
      const codeSize = await ethers.provider.getCode(DEPLOYED_ADDRESSES.RiverBitCoreV2);
      
      if (codeSize === "0x") {
        console.log("   ❌ No contract code found");
        allVerified = false;
      } else {
        console.log("   ✅ Contract code verified");
        console.log(`   📝 Code size: ${codeSize.length / 2 - 1} bytes`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allVerified = false;
    }

    // 2. 验证SAuthSettlement
    console.log("\n📋 2. Verifying SAuthSettlement...");
    try {
      const sAuth = await ethers.getContractAt("SAuthSettlement", DEPLOYED_ADDRESSES.SAuthSettlement);
      const codeSize = await ethers.provider.getCode(DEPLOYED_ADDRESSES.SAuthSettlement);
      
      if (codeSize === "0x") {
        console.log("   ❌ No contract code found");
        allVerified = false;
      } else {
        console.log("   ✅ Contract code verified");
        console.log(`   📝 Code size: ${codeSize.length / 2 - 1} bytes`);
        
        // 检查是否已初始化
        try {
          const hasRole = await sAuth.hasRole(ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE")), deployer.address);
          console.log(`   🔑 Admin role configured: ${hasRole}`);
        } catch (e) {
          console.log("   ⚠️  Could not check admin role");
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allVerified = false;
    }

    // 3. 验证LPBucketManager
    console.log("\n📋 3. Verifying LPBucketManager...");
    try {
      const lpManager = await ethers.getContractAt("LPBucketManager", DEPLOYED_ADDRESSES.LPBucketManager);
      const codeSize = await ethers.provider.getCode(DEPLOYED_ADDRESSES.LPBucketManager);
      
      if (codeSize === "0x") {
        console.log("   ❌ No contract code found");
        allVerified = false;
      } else {
        console.log("   ✅ Contract code verified");
        console.log(`   📝 Code size: ${codeSize.length / 2 - 1} bytes`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allVerified = false;
    }

    // 4. 验证ThreeGatesRiskManager
    console.log("\n📋 4. Verifying ThreeGatesRiskManager...");
    try {
      const riskManager = await ethers.getContractAt("ThreeGatesRiskManager", DEPLOYED_ADDRESSES.ThreeGatesRiskManager);
      const codeSize = await ethers.provider.getCode(DEPLOYED_ADDRESSES.ThreeGatesRiskManager);
      
      if (codeSize === "0x") {
        console.log("   ❌ No contract code found");
        allVerified = false;
      } else {
        console.log("   ✅ Contract code verified");
        console.log(`   📝 Code size: ${codeSize.length / 2 - 1} bytes`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allVerified = false;
    }

    // 5. 验证GovernanceRegistry
    console.log("\n📋 5. Verifying GovernanceRegistry...");
    try {
      const governance = await ethers.getContractAt("GovernanceRegistry", DEPLOYED_ADDRESSES.GovernanceRegistry);
      const codeSize = await ethers.provider.getCode(DEPLOYED_ADDRESSES.GovernanceRegistry);
      
      if (codeSize === "0x") {
        console.log("   ❌ No contract code found");
        allVerified = false;
      } else {
        console.log("   ✅ Contract code verified");
        console.log(`   📝 Code size: ${codeSize.length / 2 - 1} bytes`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allVerified = false;
    }

    // 6. 验证USDC测试代币
    console.log("\n📋 6. Verifying USDC Test Token...");
    try {
      const usdc = await ethers.getContractAt("IERC20", DEPLOYED_ADDRESSES.USDC);
      const codeSize = await ethers.provider.getCode(DEPLOYED_ADDRESSES.USDC);
      
      if (codeSize === "0x") {
        console.log("   ❌ No contract code found");
        allVerified = false;
      } else {
        console.log("   ✅ Contract code verified");
        
        // 检查USDC基本信息
        try {
          const balance = await usdc.balanceOf(deployer.address);
          const decimals = await usdc.decimals();
          console.log(`   💰 Deployer USDC balance: ${ethers.formatUnits(balance, decimals)} USDC`);
          console.log(`   🔢 USDC decimals: ${decimals}`);
        } catch (e) {
          console.log("   ⚠️  Could not fetch USDC info");
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allVerified = false;
    }

    // 总结
    console.log("\n" + "=".repeat(50));
    if (allVerified) {
      console.log("🎉 VERIFICATION COMPLETE - ALL CONTRACTS VERIFIED!");
      console.log("");
      console.log("📋 Contract Addresses Summary:");
      console.log("-".repeat(40));
      for (const [name, address] of Object.entries(DEPLOYED_ADDRESSES)) {
        console.log(`${name}: ${address}`);
      }
      console.log("");
      console.log("🚀 Next Steps:");
      console.log("1. Initialize contract parameters");
      console.log("2. Test basic contract interactions");
      console.log("3. Update frontend configuration");
      console.log("4. Prepare for integration testing");
    } else {
      console.log("❌ VERIFICATION FAILED - SOME CONTRACTS HAVE ISSUES");
      console.log("Please check the errors above and redeploy if necessary.");
    }

  } catch (error) {
    console.error("💥 Verification failed:", error);
    throw error;
  }
}

// 执行验证
verifyDeployment()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Verification script failed:", error);
    process.exit(1);
  });

module.exports = { verifyDeployment, DEPLOYED_ADDRESSES };