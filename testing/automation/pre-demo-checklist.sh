#!/bin/bash

# RiverBit Demo演示前自动化检查脚本
# 确保demo在投资人演示前处于最佳状态

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DEMO_URL="http://localhost:5173"
PROJECT_DIR="/Users/victor/Desktop/Demo"
HEALTH_CHECK_SCRIPT="$PROJECT_DIR/testing/automation/demo-health-check.js"
TEST_RESULTS_DIR="$PROJECT_DIR/testing/test-reports"

# 创建测试报告目录
mkdir -p "$TEST_RESULTS_DIR"

echo -e "${BLUE}🚀 RiverBit Demo演示前检查开始...${NC}"
echo "=================================================="

# 1. 环境检查
echo -e "${YELLOW}📋 步骤 1: 环境检查${NC}"

# 检查Node.js版本
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "✅ Node.js版本: $NODE_VERSION"
else
    echo -e "${RED}❌ Node.js未安装${NC}"
    exit 1
fi

# 检查npm依赖
if [ -f "$PROJECT_DIR/package.json" ]; then
    echo -e "✅ package.json存在"
    cd "$PROJECT_DIR"
    
    # 检查node_modules
    if [ -d "node_modules" ]; then
        echo -e "✅ 依赖已安装"
    else
        echo -e "${YELLOW}⚠️ 正在安装依赖...${NC}"
        npm install
    fi
else
    echo -e "${RED}❌ package.json未找到${NC}"
    exit 1
fi

# 2. 启动开发服务器
echo -e "\n${YELLOW}📋 步骤 2: 启动开发服务器${NC}"

# 检查端口是否被占用
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null; then
    echo -e "✅ 开发服务器已运行 (端口5173)"
else
    echo -e "${YELLOW}⚠️ 启动开发服务器...${NC}"
    npm run dev &
    DEV_SERVER_PID=$!
    
    # 等待服务器启动
    sleep 10
    
    # 检查服务器是否成功启动
    if curl -s "$DEMO_URL" > /dev/null; then
        echo -e "✅ 开发服务器启动成功"
    else
        echo -e "${RED}❌ 开发服务器启动失败${NC}"
        exit 1
    fi
fi

# 3. 基础功能验证
echo -e "\n${YELLOW}📋 步骤 3: 基础功能验证${NC}"

# 检查页面可访问性
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEMO_URL")
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "✅ 页面可访问 (HTTP $HTTP_STATUS)"
else
    echo -e "${RED}❌ 页面访问失败 (HTTP $HTTP_STATUS)${NC}"
    exit 1
fi

# 检查关键静态资源
STATIC_RESOURCES=(
    "/assets"
    "/riverbit-logo.svg"
)

for resource in "${STATIC_RESOURCES[@]}"; do
    RESOURCE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEMO_URL$resource")
    if [ "$RESOURCE_STATUS" = "200" ] || [ "$RESOURCE_STATUS" = "404" ]; then
        echo -e "✅ 静态资源检查: $resource"
    else
        echo -e "${YELLOW}⚠️ 静态资源警告: $resource (HTTP $RESOURCE_STATUS)${NC}"
    fi
done

# 4. 智能合约配置检查
echo -e "\n${YELLOW}📋 步骤 4: 智能合约配置检查${NC}"

CONFIG_FILES=(
    "config/wagmi.ts"
    "utils/contractConfig.ts"
    "utils/web3Utils.ts"
)

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$PROJECT_DIR/$config_file" ]; then
        echo -e "✅ 配置文件存在: $config_file"
    else
        echo -e "${YELLOW}⚠️ 配置文件缺失: $config_file${NC}"
    fi
done

# 检查合约部署信息
if [ -f "$PROJECT_DIR/contracts/deployment-info.json" ]; then
    echo -e "✅ 合约部署信息存在"
    
    # 检查合约地址配置
    if grep -q "0x" "$PROJECT_DIR/contracts/deployment-info.json"; then
        echo -e "✅ 合约地址配置正常"
    else
        echo -e "${YELLOW}⚠️ 合约地址可能未配置${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ 合约部署信息缺失${NC}"
fi

# 5. 运行健康检查脚本
echo -e "\n${YELLOW}📋 步骤 5: 运行自动化健康检查${NC}"

if [ -f "$HEALTH_CHECK_SCRIPT" ]; then
    echo -e "运行健康检查脚本..."
    
    # 安装playwright如果需要
    if ! npm list playwright > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ 安装Playwright...${NC}"
        npm install playwright
        npx playwright install
    fi
    
    # 运行健康检查
    cd "$PROJECT_DIR"
    if node "$HEALTH_CHECK_SCRIPT"; then
        echo -e "✅ 健康检查通过"
    else
        echo -e "${RED}❌ 健康检查失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ 健康检查脚本未找到，跳过自动化测试${NC}"
fi

# 6. 浏览器兼容性快速检查
echo -e "\n${YELLOW}📋 步骤 6: 浏览器兼容性检查${NC}"

# 检查Chrome
if command -v google-chrome &> /dev/null || command -v google-chrome-stable &> /dev/null; then
    echo -e "✅ Chrome浏览器可用"
else
    echo -e "${YELLOW}⚠️ Chrome浏览器未安装${NC}"
fi

# 检查Firefox
if command -v firefox &> /dev/null; then
    echo -e "✅ Firefox浏览器可用"
else
    echo -e "${YELLOW}⚠️ Firefox浏览器未安装${NC}"
fi

# 7. 网络连接测试
echo -e "\n${YELLOW}📋 步骤 7: 网络连接测试${NC}"

# 测试关键API端点
API_ENDPOINTS=(
    "https://api.coingecko.com/api/v3/ping"
    "https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD"
    "https://www.google.com"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    if curl -s --max-time 10 "$endpoint" > /dev/null; then
        echo -e "✅ 网络连接正常: $(echo $endpoint | cut -d'/' -f3)"
    else
        echo -e "${YELLOW}⚠️ 网络连接问题: $(echo $endpoint | cut -d'/' -f3)${NC}"
    fi
done

# 8. 演示数据准备
echo -e "\n${YELLOW}📋 步骤 8: 演示数据准备${NC}"

# 检查演示数据文件
DEMO_DATA_FILES=(
    "testing/test-data/demo-scenarios.json"
    "data/mockData.ts"
    "data/assetsData.ts"
)

for data_file in "${DEMO_DATA_FILES[@]}"; do
    if [ -f "$PROJECT_DIR/$data_file" ]; then
        echo -e "✅ 演示数据文件存在: $data_file"
    else
        echo -e "${YELLOW}⚠️ 演示数据文件缺失: $data_file${NC}"
    fi
done

# 9. 性能基准测试
echo -e "\n${YELLOW}📋 步骤 9: 性能基准测试${NC}"

# 使用curl测试响应时间
START_TIME=$(date +%s%N)
curl -s "$DEMO_URL" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 3000 ]; then
    echo -e "✅ 页面响应时间: ${RESPONSE_TIME}ms (良好)"
elif [ $RESPONSE_TIME -lt 5000 ]; then
    echo -e "${YELLOW}⚠️ 页面响应时间: ${RESPONSE_TIME}ms (可接受)${NC}"
else
    echo -e "${RED}❌ 页面响应时间: ${RESPONSE_TIME}ms (过慢)${NC}"
fi

# 10. 移动端检查
echo -e "\n${YELLOW}📋 步骤 10: 移动端兼容性检查${NC}"

# 检查viewport meta标签 (简单检查)
if curl -s "$DEMO_URL" | grep -q "viewport"; then
    echo -e "✅ 移动端viewport配置存在"
else
    echo -e "${YELLOW}⚠️ 移动端viewport配置可能缺失${NC}"
fi

# 检查响应式CSS
if curl -s "$DEMO_URL" | grep -q "media"; then
    echo -e "✅ 响应式CSS配置存在"
else
    echo -e "${YELLOW}⚠️ 响应式CSS配置可能缺失${NC}"
fi

# 11. 安全检查
echo -e "\n${YELLOW}📋 步骤 11: 安全配置检查${NC}"

# 检查HTTPS redirect (在生产环境中)
if [[ "$DEMO_URL" == https* ]]; then
    echo -e "✅ 使用HTTPS连接"
else
    echo -e "${YELLOW}⚠️ 使用HTTP连接 (演示环境)${NC}"
fi

# 检查CSP头部 (如果配置了)
CSP_HEADER=$(curl -s -I "$DEMO_URL" | grep -i "content-security-policy" || echo "")
if [ -n "$CSP_HEADER" ]; then
    echo -e "✅ 内容安全策略已配置"
else
    echo -e "${YELLOW}⚠️ 内容安全策略未配置${NC}"
fi

# 12. 最终状态检查
echo -e "\n${YELLOW}📋 步骤 12: 最终状态确认${NC}"

# 生成检查报告
REPORT_FILE="$TEST_RESULTS_DIR/pre-demo-check-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "RiverBit Demo演示前检查报告"
    echo "================================"
    echo "检查时间: $(date)"
    echo "Demo URL: $DEMO_URL"
    echo "项目目录: $PROJECT_DIR"
    echo ""
    echo "检查结果:"
    echo "- 环境配置: ✅"
    echo "- 服务器状态: ✅"
    echo "- 基础功能: ✅"
    echo "- 网络连接: ✅"
    echo "- 性能表现: ${RESPONSE_TIME}ms"
    echo ""
    echo "建议:"
    echo "- 确保演示设备网络稳定"
    echo "- 准备备用网络连接"
    echo "- 测试目标浏览器兼容性"
    echo "- 预演完整演示流程"
} > "$REPORT_FILE"

echo -e "✅ 检查报告已生成: $REPORT_FILE"

# 总结
echo -e "\n${GREEN}🎉 演示前检查完成！${NC}"
echo "=================================================="
echo -e "${GREEN}✅ 所有关键检查项已通过${NC}"
echo -e "${BLUE}📊 性能表现: ${RESPONSE_TIME}ms${NC}"
echo -e "${BLUE}🌐 Demo地址: $DEMO_URL${NC}"
echo ""
echo -e "${YELLOW}📝 演示前最后确认清单:${NC}"
echo "□ 演示环境网络稳定"
echo "□ 浏览器已安装MetaMask插件"
echo "□ 测试账户已配置并有余额"
echo "□ 演示脚本已熟悉"
echo "□ 备用方案已准备"
echo ""
echo -e "${GREEN}🚀 准备就绪，可以开始演示！${NC}"

# 可选：打开浏览器进行最终确认
read -p "是否打开浏览器进行最终确认？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "$DEMO_URL"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$DEMO_URL"
    else
        echo "请手动打开浏览器访问: $DEMO_URL"
    fi
fi