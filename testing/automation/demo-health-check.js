/**
 * RiverBit Demo健康检查自动化脚本
 * 用于快速验证demo的核心功能状态
 */

import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';

class DemoHealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall_status: 'UNKNOWN',
      tests_passed: 0,
      tests_failed: 0,
      tests_total: 0,
      detailed_results: [],
      performance_metrics: {},
      browser_compatibility: {}
    };
    
    this.baseUrl = 'http://localhost:5173'; // Vite开发服务器默认端口
    this.timeout = 30000; // 30秒超时
  }

  async runFullHealthCheck() {
    console.log('🚀 启动RiverBit Demo健康检查...');
    
    try {
      // 1. 基础可用性检查
      await this.checkBasicAvailability();
      
      // 2. 核心功能检查
      await this.checkCoreFunctionality();
      
      // 3. 跨浏览器兼容性检查
      await this.checkBrowserCompatibility();
      
      // 4. 性能基准检查
      await this.checkPerformanceMetrics();
      
      // 5. 生成报告
      await this.generateReport();
      
      console.log('✅ 健康检查完成');
      
    } catch (error) {
      console.error('❌ 健康检查失败:', error);
      this.results.overall_status = 'FAILED';
    }
    
    return this.results;
  }

  async checkBasicAvailability() {
    console.log('📡 检查基础可用性...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      // 检查页面是否可访问
      const startTime = Date.now();
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      // 检查关键元素是否存在
      const keyElements = [
        'text=RiverBit',
        'text=连接钱包',
        'text=Trading',
        '[data-testid="trading-interface"]'
      ];
      
      let elementsFound = 0;
      for (const selector of keyElements) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          elementsFound++;
        } catch (e) {
          console.warn(`⚠️ 元素未找到: ${selector}`);
        }
      }
      
      const result = {
        test_name: 'Basic Availability Check',
        status: loadTime < 5000 && elementsFound >= 3 ? 'PASSED' : 'FAILED',
        load_time: loadTime,
        elements_found: elementsFound,
        elements_expected: keyElements.length,
        details: `页面加载时间: ${loadTime}ms, 关键元素: ${elementsFound}/${keyElements.length}`
      };
      
      this.addTestResult(result);
      
    } finally {
      await browser.close();
    }
  }

  async checkCoreFunctionality() {
    console.log('🔧 检查核心功能...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(this.baseUrl);
      
      // 测试1: 钱包连接按钮可点击
      const walletButtonTest = await this.testWalletButton(page);
      this.addTestResult(walletButtonTest);
      
      // 测试2: 交易对选择器工作
      const pairSelectorTest = await this.testPairSelector(page);
      this.addTestResult(pairSelectorTest);
      
      // 测试3: 价格数据加载
      const priceDataTest = await this.testPriceData(page);
      this.addTestResult(priceDataTest);
      
      // 测试4: 订单薄显示
      const orderBookTest = await this.testOrderBook(page);
      this.addTestResult(orderBookTest);
      
      // 测试5: 图表组件加载
      const chartTest = await this.testChart(page);
      this.addTestResult(chartTest);
      
    } finally {
      await browser.close();
    }
  }

  async testWalletButton(page) {
    try {
      // 查找连接钱包按钮
      const walletButton = await page.$('text=连接钱包');
      if (!walletButton) {
        throw new Error('钱包连接按钮未找到');
      }
      
      // 检查按钮是否可点击
      const isEnabled = await walletButton.isEnabled();
      const isVisible = await walletButton.isVisible();
      
      return {
        test_name: 'Wallet Connection Button',
        status: isEnabled && isVisible ? 'PASSED' : 'FAILED',
        details: `按钮可见: ${isVisible}, 按钮可用: ${isEnabled}`
      };
      
    } catch (error) {
      return {
        test_name: 'Wallet Connection Button',
        status: 'FAILED',
        error: error.message
      };
    }
  }

  async testPairSelector(page) {
    try {
      // 查找交易对选择器
      const pairSelector = await page.$('[data-testid="pair-selector"], .pair-selector, select');
      if (!pairSelector) {
        // 尝试其他可能的选择器
        const btcButton = await page.$('text=BTC');
        if (btcButton) {
          return {
            test_name: 'Trading Pair Selector',
            status: 'PASSED',
            details: '找到交易对按钮'
          };
        }
        throw new Error('交易对选择器未找到');
      }
      
      return {
        test_name: 'Trading Pair Selector',
        status: 'PASSED',
        details: '交易对选择器正常显示'
      };
      
    } catch (error) {
      return {
        test_name: 'Trading Pair Selector',
        status: 'FAILED',
        error: error.message
      };
    }
  }

  async testPriceData(page) {
    try {
      // 等待价格数据加载
      await page.waitForTimeout(3000);
      
      // 查找价格显示元素
      const priceElements = await page.$$('text=/\\$[0-9,]+\\.?[0-9]*/');
      
      if (priceElements.length === 0) {
        throw new Error('未找到价格数据显示');
      }
      
      // 检查价格格式是否合理
      const priceText = await priceElements[0].textContent();
      const priceValue = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      
      return {
        test_name: 'Price Data Loading',
        status: priceValue > 0 ? 'PASSED' : 'FAILED',
        details: `找到 ${priceElements.length} 个价格元素, 示例价格: ${priceText}`
      };
      
    } catch (error) {
      return {
        test_name: 'Price Data Loading',
        status: 'FAILED',
        error: error.message
      };
    }
  }

  async testOrderBook(page) {
    try {
      // 查找订单薄组件
      const orderBookSelectors = [
        '[data-testid="order-book"]',
        '.order-book',
        'text=订单薄',
        'text=买单',
        'text=卖单'
      ];
      
      let orderBookFound = false;
      for (const selector of orderBookSelectors) {
        const element = await page.$(selector);
        if (element) {
          orderBookFound = true;
          break;
        }
      }
      
      if (!orderBookFound) {
        throw new Error('订单薄组件未找到');
      }
      
      // 检查是否有买卖单数据
      const orderRows = await page.$$('.order-row, tr, .bid, .ask');
      
      return {
        test_name: 'Order Book Display',
        status: orderRows.length > 0 ? 'PASSED' : 'FAILED',
        details: `订单薄显示正常, 找到 ${orderRows.length} 个订单行`
      };
      
    } catch (error) {
      return {
        test_name: 'Order Book Display',
        status: 'FAILED',
        error: error.message
      };
    }
  }

  async testChart(page) {
    try {
      // 查找图表组件
      const chartSelectors = [
        'iframe[title*="TradingView"]',
        'canvas',
        '.chart-container',
        '[data-testid="chart"]'
      ];
      
      let chartFound = false;
      let chartType = 'unknown';
      
      for (const selector of chartSelectors) {
        const element = await page.$(selector);
        if (element) {
          chartFound = true;
          chartType = selector.includes('iframe') ? 'TradingView iframe' : 
                    selector.includes('canvas') ? 'Canvas chart' : 'Custom chart';
          break;
        }
      }
      
      return {
        test_name: 'Chart Component',
        status: chartFound ? 'PASSED' : 'FAILED',
        details: chartFound ? `图表组件正常 (${chartType})` : '图表组件未找到'
      };
      
    } catch (error) {
      return {
        test_name: 'Chart Component',
        status: 'FAILED',
        error: error.message
      };
    }
  }

  async checkBrowserCompatibility() {
    console.log('🌐 检查浏览器兼容性...');
    
    const browsers = [
      { name: 'Chromium', launcher: chromium },
      { name: 'Firefox', launcher: firefox },
      { name: 'WebKit', launcher: webkit }
    ];
    
    for (const browserInfo of browsers) {
      try {
        const browser = await browserInfo.launcher.launch();
        const page = await browser.newPage();
        
        const startTime = Date.now();
        await page.goto(this.baseUrl, { timeout: this.timeout });
        const loadTime = Date.now() - startTime;
        
        // 检查关键功能是否正常
        const walletButton = await page.$('text=连接钱包');
        const functionalityWorks = walletButton !== null;
        
        this.results.browser_compatibility[browserInfo.name] = {
          status: functionalityWorks ? 'PASSED' : 'FAILED',
          load_time: loadTime,
          functional: functionalityWorks
        };
        
        await browser.close();
        
      } catch (error) {
        this.results.browser_compatibility[browserInfo.name] = {
          status: 'FAILED',
          error: error.message
        };
      }
    }
  }

  async checkPerformanceMetrics() {
    console.log('⚡ 检查性能指标...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      // 启用性能监控
      await page.coverage.startJSCoverage();
      await page.coverage.startCSSCoverage();
      
      const startTime = Date.now();
      
      // 访问页面并等待完全加载
      await page.goto(this.baseUrl);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // 获取性能指标
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });
      
      // 获取资源使用情况
      const jsCoverage = await page.coverage.stopJSCoverage();
      const cssCoverage = await page.coverage.stopCSSCoverage();
      
      const totalJSBytes = jsCoverage.reduce((sum, entry) => sum + entry.text.length, 0);
      const totalCSSBytes = cssCoverage.reduce((sum, entry) => sum + entry.text.length, 0);
      
      this.results.performance_metrics = {
        total_load_time: loadTime,
        dom_content_loaded: performanceMetrics.domContentLoaded,
        first_paint: performanceMetrics.firstPaint,
        first_contentful_paint: performanceMetrics.firstContentfulPaint,
        javascript_size: totalJSBytes,
        css_size: totalCSSBytes,
        performance_score: this.calculatePerformanceScore(loadTime, performanceMetrics)
      };
      
    } finally {
      await browser.close();
    }
  }

  calculatePerformanceScore(loadTime, metrics) {
    let score = 100;
    
    // 加载时间评分 (3秒内满分)
    if (loadTime > 3000) score -= Math.min(30, (loadTime - 3000) / 100);
    
    // First Contentful Paint评分 (1.5秒内满分)
    if (metrics.firstContentfulPaint > 1500) {
      score -= Math.min(20, (metrics.firstContentfulPaint - 1500) / 50);
    }
    
    return Math.max(0, Math.round(score));
  }

  addTestResult(result) {
    this.results.detailed_results.push(result);
    this.results.tests_total++;
    
    if (result.status === 'PASSED') {
      this.results.tests_passed++;
    } else {
      this.results.tests_failed++;
    }
  }

  async generateReport() {
    // 计算总体状态
    const passRate = this.results.tests_passed / this.results.tests_total;
    this.results.overall_status = passRate >= 0.9 ? 'HEALTHY' : 
                                 passRate >= 0.7 ? 'WARNING' : 'CRITICAL';
    
    // 生成详细报告
    const report = this.formatReport();
    
    // 保存报告文件
    const reportPath = path.join(process.cwd(), 'testing', 'test-reports', 
                                `health-check-${new Date().toISOString().split('T')[0]}.json`);
    
    try {
      await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.promises.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`📊 报告已保存: ${reportPath}`);
    } catch (error) {
      console.error('保存报告失败:', error);
    }
    
    // 输出控制台报告
    console.log(report);
  }

  formatReport() {
    const statusIcon = {
      'HEALTHY': '✅',
      'WARNING': '⚠️',
      'CRITICAL': '❌'
    };
    
    let report = `
${statusIcon[this.results.overall_status]} RiverBit Demo健康检查报告
=====================================

📊 总体状态: ${this.results.overall_status}
📈 测试通过: ${this.results.tests_passed}/${this.results.tests_total}
⏱️  检查时间: ${this.results.timestamp}

🔍 详细测试结果:
`;
    
    this.results.detailed_results.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      report += `${icon} ${result.test_name}: ${result.status}\n`;
      if (result.details) {
        report += `   💬 ${result.details}\n`;
      }
      if (result.error) {
        report += `   🚫 错误: ${result.error}\n`;
      }
    });
    
    if (this.results.performance_metrics.performance_score) {
      report += `
⚡ 性能指标:
   🏃 加载时间: ${this.results.performance_metrics.total_load_time}ms
   🎨 首次绘制: ${this.results.performance_metrics.first_paint}ms
   📊 性能评分: ${this.results.performance_metrics.performance_score}/100
`;
    }
    
    report += `
🌐 浏览器兼容性:
`;
    Object.entries(this.results.browser_compatibility).forEach(([browser, result]) => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      report += `${icon} ${browser}: ${result.status}\n`;
    });
    
    return report;
  }
}

// 命令行接口
async function main() {
  const checker = new DemoHealthChecker();
  
  if (process.argv.includes('--quick')) {
    console.log('🏃 执行快速检查...');
    await checker.checkBasicAvailability();
    await checker.generateReport();
  } else {
    console.log('🔬 执行完整健康检查...');
    await checker.runFullHealthCheck();
  }
}

// 导出模块
export default DemoHealthChecker;

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}