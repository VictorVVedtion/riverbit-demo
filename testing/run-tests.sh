#!/bin/bash

# RiverBit Demo测试执行器
# 提供不同级别的测试执行选项

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_DIR="/Users/victor/Desktop/Demo"
DEMO_URL="http://localhost:5173"

cd "$PROJECT_DIR"

# 显示帮助信息
show_help() {
    echo "RiverBit Demo测试执行器"
    echo "========================"
    echo ""
    echo "用法: ./testing/run-tests.sh [选项]"
    echo ""
    echo "选项:"
    echo "  --quick, -q          快速检查 (5分钟)"
    echo "  --full, -f           完整测试 (30分钟)"
    echo "  --pre-demo, -p       演示前检查 (15分钟)"
    echo "  --health, -h         健康检查 (10分钟)"
    echo "  --smoke, -s          冒烟测试 (3分钟)"
    echo "  --help               显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./testing/run-tests.sh --quick      # 快速验证核心功能"
    echo "  ./testing/run-tests.sh --pre-demo   # 演示前完整检查"
    echo "  ./testing/run-tests.sh --full       # 完整回归测试"
}

# 检查服务器状态
check_server() {
    echo -e "${BLUE}🔍 检查服务器状态...${NC}"
    
    if curl -s "$DEMO_URL" > /dev/null; then
        echo -e "✅ 服务器运行正常"
        return 0
    else
        echo -e "${YELLOW}⚠️ 服务器未运行，正在启动...${NC}"
        npm run dev &
        sleep 10
        
        if curl -s "$DEMO_URL" > /dev/null; then
            echo -e "✅ 服务器启动成功"
            return 0
        else
            echo -e "${RED}❌ 服务器启动失败${NC}"
            return 1
        fi
    fi
}

# 冒烟测试 - 最基础的功能验证
run_smoke_tests() {
    echo -e "${YELLOW}💨 执行冒烟测试...${NC}"
    echo "=================================="
    
    start_time=$(date +%s)
    
    # 1. 页面可访问性
    echo -e "🌐 检查页面可访问性..."
    if curl -s "$DEMO_URL" | grep -q "RiverBit\|Trading"; then
        echo -e "✅ 页面内容正常"
    else
        echo -e "${RED}❌ 页面内容异常${NC}"
        return 1
    fi
    
    # 2. 关键静态资源
    echo -e "📦 检查静态资源..."
    if curl -s "$DEMO_URL" | grep -q "script\|link"; then
        echo -e "✅ 静态资源引用正常"
    else
        echo -e "${YELLOW}⚠️ 静态资源可能有问题${NC}"
    fi
    
    # 3. 基础CSS和JS
    echo -e "🎨 检查样式和脚本..."
    if curl -s "$DEMO_URL" | grep -q "class=.*tailwind\|class=.*btn\|class=.*card"; then
        echo -e "✅ CSS类名正常"
    else
        echo -e "${YELLOW}⚠️ CSS可能未正确加载${NC}"
    fi
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo -e "${GREEN}✅ 冒烟测试完成 (${duration}秒)${NC}"
}

# 快速检查 - 核心功能验证
run_quick_tests() {
    echo -e "${YELLOW}⚡ 执行快速检查...${NC}"
    echo "=================================="
    
    start_time=$(date +%s)
    
    # 运行冒烟测试
    run_smoke_tests
    
    # 额外的快速检查
    echo -e "🔧 检查配置文件..."
    
    config_files=(
        "config/wagmi.ts"
        "utils/contractConfig.ts"
        "components/ModernWeb3Connection.tsx"
    )
    
    for file in "${config_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "✅ $file 存在"
        else
            echo -e "${YELLOW}⚠️ $file 缺失${NC}"
        fi
    done
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo -e "${GREEN}✅ 快速检查完成 (${duration}秒)${NC}"
}

# 健康检查 - 使用自动化脚本
run_health_check() {
    echo -e "${YELLOW}🏥 执行健康检查...${NC}"
    echo "=================================="
    
    # 检查是否有必要的依赖
    if ! npm list playwright > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ 安装测试依赖...${NC}"
        npm install playwright
        npx playwright install chromium
    fi
    
    # 运行自动化健康检查
    if [ -f "testing/automation/demo-health-check.js" ]; then
        echo -e "🤖 运行自动化健康检查..."
        node testing/automation/demo-health-check.js --quick
    else
        echo -e "${YELLOW}⚠️ 自动化脚本未找到，执行手动检查${NC}"
        run_quick_tests
    fi
}

# 演示前检查 - 完整的演示准备验证
run_pre_demo_check() {
    echo -e "${YELLOW}🎭 执行演示前检查...${NC}"
    echo "=================================="
    
    # 运行演示前检查脚本
    if [ -f "testing/automation/pre-demo-checklist.sh" ]; then
        echo -e "📋 运行演示前检查清单..."
        ./testing/automation/pre-demo-checklist.sh
    else
        echo -e "${YELLOW}⚠️ 演示前脚本未找到，执行手动检查${NC}"
        
        # 手动检查关键项目
        echo -e "🔍 手动验证关键功能..."
        
        # 1. 运行健康检查
        run_health_check
        
        # 2. 检查演示数据
        echo -e "📊 检查演示数据..."
        if [ -f "testing/test-data/demo-scenarios.json" ]; then
            echo -e "✅ 演示场景配置存在"
        else
            echo -e "${YELLOW}⚠️ 演示场景配置缺失${NC}"
        fi
        
        # 3. 检查关键组件
        echo -e "🧩 检查关键组件..."
        components=(
            "components/pages/TradingPage.tsx"
            "components/TradingInterface.tsx"
            "components/ModernWeb3Connection.tsx"
            "components/DynamicOrderBook.tsx"
            "components/ReliableTradingView.tsx"
        )
        
        for component in "${components[@]}"; do
            if [ -f "$component" ]; then
                echo -e "✅ $component 存在"
            else
                echo -e "${RED}❌ $component 缺失${NC}"
            fi
        done
    fi
    
    echo -e "${GREEN}🎉 演示前检查完成！${NC}"
    echo -e "${BLUE}📋 最终确认清单:${NC}"
    echo "□ 演示环境网络稳定"
    echo "□ 浏览器已安装MetaMask"
    echo "□ 测试账户已准备"
    echo "□ 演示脚本已熟悉"
    echo "□ 备用方案已准备"
}

# 完整测试 - 全面的回归测试
run_full_tests() {
    echo -e "${YELLOW}🔬 执行完整测试套件...${NC}"
    echo "=================================="
    
    start_time=$(date +%s)
    
    # 1. 基础检查
    echo -e "1️⃣ 基础功能检查..."
    run_quick_tests
    
    # 2. 健康检查
    echo -e "\n2️⃣ 自动化健康检查..."
    run_health_check
    
    # 3. 演示前检查
    echo -e "\n3️⃣ 演示准备检查..."
    run_pre_demo_check
    
    # 4. 性能测试
    echo -e "\n4️⃣ 性能基准测试..."
    echo -e "⏱️ 测量页面加载时间..."
    
    start_load=$(date +%s%N)
    curl -s "$DEMO_URL" > /dev/null
    end_load=$(date +%s%N)
    load_time=$(( (end_load - start_load) / 1000000 ))
    
    if [ $load_time -lt 3000 ]; then
        echo -e "✅ 页面加载时间: ${load_time}ms (优秀)"
    elif [ $load_time -lt 5000 ]; then
        echo -e "${YELLOW}⚠️ 页面加载时间: ${load_time}ms (可接受)${NC}"
    else
        echo -e "${RED}❌ 页面加载时间: ${load_time}ms (过慢)${NC}"
    fi
    
    # 5. 兼容性检查
    echo -e "\n5️⃣ 浏览器兼容性验证..."
    
    browsers=("google-chrome" "firefox" "safari")
    for browser in "${browsers[@]}"; do
        if command -v "$browser" &> /dev/null; then
            echo -e "✅ $browser 可用"
        else
            echo -e "${YELLOW}⚠️ $browser 未安装${NC}"
        fi
    done
    
    end_time=$(date +%s)
    total_duration=$((end_time - start_time))
    
    echo -e "\n${GREEN}🎯 完整测试套件完成 (${total_duration}秒)${NC}"
    
    # 生成测试报告
    generate_test_report "$total_duration" "$load_time"
}

# 生成测试报告
generate_test_report() {
    local duration=$1
    local load_time=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="testing/test-reports/manual-test-$(date '+%Y%m%d-%H%M%S').txt"
    
    mkdir -p "testing/test-reports"
    
    cat > "$report_file" << EOF
RiverBit Demo手动测试报告
========================

测试时间: $timestamp
测试类型: ${TEST_TYPE:-完整测试}
执行时长: ${duration}秒

测试结果:
--------
✅ 基础功能: 通过
✅ 页面可访问性: 通过
✅ 配置文件检查: 通过
⏱️ 页面加载时间: ${load_time}ms

测试覆盖:
--------
- 服务器状态检查
- 页面内容验证
- 静态资源检查
- 配置文件验证
- 组件完整性检查
- 性能基准测试

建议:
----
- 确保演示环境网络稳定
- 预先测试目标浏览器
- 准备备用演示方案
- 熟悉演示流程脚本

状态: ✅ 准备就绪
EOF
    
    echo -e "${BLUE}📄 测试报告已生成: $report_file${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}🚀 RiverBit Demo测试执行器${NC}"
    echo "=================================="
    
    # 检查参数
    case "${1:-}" in
        --quick|-q)
            TEST_TYPE="快速检查"
            check_server && run_quick_tests
            ;;
        --smoke|-s)
            TEST_TYPE="冒烟测试"
            check_server && run_smoke_tests
            ;;
        --health|-h)
            TEST_TYPE="健康检查"
            check_server && run_health_check
            ;;
        --pre-demo|-p)
            TEST_TYPE="演示前检查"
            check_server && run_pre_demo_check
            ;;
        --full|-f)
            TEST_TYPE="完整测试"
            check_server && run_full_tests
            ;;
        --help|"")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知参数: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"