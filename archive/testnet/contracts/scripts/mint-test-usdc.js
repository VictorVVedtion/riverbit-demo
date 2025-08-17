const { ethers } = require("hardhat");

async function main() {
  console.log("🪙 开始为测试账户mint测试USDC...\n");

  // 获取签名者
  const [signer] = await ethers.getSigners();
  console.log("📋 账户地址:", signer.address);

  // 测试USDC合约地址（可以mint的版本）
  const TEST_USDC_ADDRESS = "0x8be869a56eda7d5a09995b2cbc0d4d37d9d484b3";
  
  // 简化的ERC20 mint接口
  const testUsdcAbi = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)"
  ];

  try {
    // 连接合约
    const testUsdc = new ethers.Contract(TEST_USDC_ADDRESS, testUsdcAbi, signer);
    
    // 检查合约信息
    const symbol = await testUsdc.symbol();
    const decimals = await testUsdc.decimals();
    console.log(`💱 代币符号: ${symbol}`);
    console.log(`🔢 精度: ${decimals}`);
    
    // 检查当前余额
    const currentBalance = await testUsdc.balanceOf(signer.address);
    console.log(`💰 当前余额: ${ethers.formatUnits(currentBalance, decimals)} ${symbol}`);
    
    // Mint 1000 USDC
    const mintAmount = ethers.parseUnits("1000", decimals);
    console.log(`\n🔨 正在mint ${ethers.formatUnits(mintAmount, decimals)} ${symbol}...`);
    
    const tx = await testUsdc.mint(signer.address, mintAmount);
    console.log("📝 交易哈希:", tx.hash);
    
    // 等待确认
    await tx.wait();
    console.log("✅ Mint成功!");
    
    // 检查新余额
    const newBalance = await testUsdc.balanceOf(signer.address);
    console.log(`💰 新余额: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
    
    console.log("\n🎉 测试USDC获取完成!");
    console.log(`📍 测试USDC合约: ${TEST_USDC_ADDRESS}`);
    console.log(`🔗 查看交易: https://sepolia.arbiscan.io/tx/${tx.hash}`);
    
  } catch (error) {
    console.error("❌ Mint失败:", error.message);
    
    // 如果mint失败，提供其他建议
    console.log("\n💡 其他获取USDC的方法:");
    console.log("1. 访问 Circle官方水龙头: https://faucet.circle.com/");
    console.log("2. 使用跨链桥从其他测试网转移USDC");
    console.log("3. 在Telegram/Discord社区寻求测试代币");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });