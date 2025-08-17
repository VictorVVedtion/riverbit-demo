const { run } = require("hardhat");

// 已部署合约地址和构造函数参数
const CONTRACTS_TO_VERIFY = [
  {
    name: "RiverBitCoreV2",
    address: "0xA12BdBf28af28EC5C5A3d9DDA65F637d8B683a5a",
    constructorArguments: []
  },
  {
    name: "ThreeGatesRiskManager", 
    address: "0xeBE3998F71a6Fe36aAC43F88c406d884c74C93e3",
    constructorArguments: []
  },
  {
    name: "GovernanceRegistry",
    address: "0x9F4575071EB45704ff1e7B900497c097Fe35D4bA", 
    constructorArguments: []
  }
  // Note: SAuthSettlement和LPBucketManager是proxy合约，需要单独验证
];

async function verifyOnArbiscan() {
  console.log("🔍 Verifying Contracts on Arbiscan...");
  console.log("=====================================");

  for (const contract of CONTRACTS_TO_VERIFY) {
    console.log(`\n📋 Verifying ${contract.name}...`);
    console.log(`📍 Address: ${contract.address}`);
    
    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
      });
      console.log(`✅ ${contract.name} verified successfully!`);
    } catch (error) {
      if (error.message.includes("already verified")) {
        console.log(`✅ ${contract.name} was already verified`);
      } else {
        console.log(`❌ Failed to verify ${contract.name}:`);
        console.log(`   ${error.message}`);
      }
    }
  }

  console.log("\n🔧 Manual Verification Required:");
  console.log("-".repeat(40));
  console.log("The following proxy contracts need manual verification:");
  console.log("");
  console.log("1. SAuthSettlement (Proxy): 0x77CD1024a8deEA3F877aB116184b993eF4E25214");
  console.log("   - This is an upgradeable proxy contract");
  console.log("   - Verify using OpenZeppelin proxy verification");
  console.log("");
  console.log("2. LPBucketManager (Proxy): 0x4240d7DE693BDAfEeE6E44F1C8d3811A38B36669");
  console.log("   - This is an upgradeable proxy contract");
  console.log("   - Verify using OpenZeppelin proxy verification");
  console.log("");
  console.log("🌐 Arbiscan Sepolia: https://sepolia.arbiscan.io/");
  
  console.log("\n🎉 Contract verification process completed!");
}

// 执行验证
verifyOnArbiscan()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Arbiscan verification failed:", error);
    process.exit(1);
  });

module.exports = { verifyOnArbiscan };