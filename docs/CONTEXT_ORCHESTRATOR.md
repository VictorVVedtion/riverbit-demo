# RiverBit Context Orchestrator - 智能任务协调系统

## 🎯 系统概述

RiverBit Context Orchestrator 是一个为DeFi交易平台量身定制的智能任务分析与Agent协调系统。它能够理解用户的自然语言需求（支持中文、英文），智能分析技术领域，并协调多个专业agents高效完成复杂任务。

### 🌟 核心特性

- **🧠 智能自然语言理解**：支持中文、英文和混合语言输入
- **🔍 多领域技术分析**：自动识别UI/UX、智能合约、功能测试、数据展示等技术领域  
- **🤖 智能Agent调度**：根据任务特点自动选择和优先级排序最适合的专业agents
- **📊 可视化工作流程**：生成清晰的执行计划和时间估算
- **⚡ 风险评估预警**：主动识别潜在风险并提供缓解方案
- **🎨 现代化Web界面**：提供直观的浏览器操作界面

## 📁 文件结构

```
Demo/
├── context-orchestrator.js          # 核心协调引擎
├── context-orchestrator.html        # Web界面
├── test-orchestrator.js            # 测试示例脚本
├── orchestrator-config.json        # 配置文件
└── docs/
    └── CONTEXT_ORCHESTRATOR.md     # 本文件（整合后的文档）
```

## 🚀 快速开始

### 方式一：Web界面（推荐）

1. **打开Web界面**
   ```bash
   # 启动本地开发服务器
   npm run dev
   # 或者直接在浏览器中打开
   open context-orchestrator.html
   ```

2. **使用界面**
   - 在文本框中输入您的需求
   - 选择语言和优先级
   - 点击"智能分析"按钮
   - 查看详细的执行计划

### 方式二：命令行界面

1. **运行测试示例**
   ```bash
   node test-orchestrator.js
   ```

2. **编程方式使用**
   ```javascript
   // 在Node.js环境中
   const ContextOrchestrator = require('./context-orchestrator.js');
   
   // 在浏览器环境中（已在HTML中引入script）
   // 直接使用 window.ContextOrchestrator
   
   // 创建实例
   const orchestrator = new ContextOrchestrator();
   
   // 处理用户请求
   const result = await orchestrator.processUserRequest(
     "优化交易界面的用户体验，确保移动端流畅",
     { language: 'zh', priority: 'high' }
   );
   
   console.log(result);
   ```

## 🤖 可用的专业Agents

| Agent | 专业领域 | 主要功能 |
|-------|----------|----------|
| **dex-ui-ux-reviewer** | DEX界面用户体验 | 用户界面设计、UX优化、响应式布局、移动端适配 |
| **smart-contract-engineer** | 智能合约开发 | 区块链集成、Web3连接、合约部署、安全审计 |
| **demo-functionality-tester** | 功能测试验证 | bug修复、性能优化、兼容性测试、错误处理 |
| **presentation-optimizer** | 演示效果优化 | 数据可视化、图表优化、投资人展示效果 |

## 📝 使用示例

### 示例 1: UI/UX 优化任务

```javascript
const result = await orchestrator.processUserRequest(
  "交易页面在移动端显示有问题，需要优化响应式布局和交互体验",
  { language: 'zh', priority: 'high' }
);

// 预期输出：
// {
//   requiredAgents: ['dex-ui-ux-reviewer'],
//   executionPlan: [
//     {
//       agent: 'dex-ui-ux-reviewer',
//       tasks: ['分析移动端布局问题', '优化响应式设计', '改善交互体验'],
//       estimatedTime: '2-3小时'
//     }
//   ],
//   risks: ['可能影响桌面端布局'],
//   recommendations: ['建议先在测试环境验证']
// }
```

### 示例 2: 智能合约集成

```javascript
const result = await orchestrator.processUserRequest(
  "Add real Web3 trading functionality to connect with Arbitrum",
  { language: 'en', priority: 'medium' }
);

// 预期输出：
// {
//   requiredAgents: ['smart-contract-engineer', 'demo-functionality-tester'],
//   executionPlan: [
//     {
//       agent: 'smart-contract-engineer',
//       tasks: ['Setup Arbitrum connection', 'Implement trading contracts'],
//       estimatedTime: '4-6小时'
//     },
//     {
//       agent: 'demo-functionality-tester', 
//       tasks: ['Test Web3 integration', 'Verify security'],
//       estimatedTime: '2-3小时'
//     }
//   ]
// }
```

### 示例 3: 综合优化任务

```javascript
const result = await orchestrator.processUserRequest(
  "准备投资人演示，需要优化整个项目的展示效果，包括UI美化、数据可视化和功能稳定性",
  { language: 'zh', priority: 'critical' }
);

// 预期输出：
// {
//   requiredAgents: [
//     'presentation-optimizer',
//     'dex-ui-ux-reviewer', 
//     'demo-functionality-tester'
//   ],
//   executionPlan: [
//     {
//       agent: 'presentation-optimizer',
//       tasks: ['数据美化', '图表优化', '演示场景设计'],
//       estimatedTime: '3-4小时'
//     },
//     {
//       agent: 'dex-ui-ux-reviewer',
//       tasks: ['界面美化', '动画效果', '专业化设计'],
//       estimatedTime: '2-3小时'
//     },
//     {
//       agent: 'demo-functionality-tester',
//       tasks: ['功能测试', '性能优化', '稳定性验证'],
//       estimatedTime: '2-3小时'
//     }
//   ],
//   totalEstimatedTime: '7-10小时',
//   criticalPath: ['presentation-optimizer', 'dex-ui-ux-reviewer']
// }
```

## ⚙️ 配置说明

### orchestrator-config.json 配置项

```json
{
  "agents": {
    "dex-ui-ux-reviewer": {
      "capabilities": ["ui-design", "ux-optimization", "responsive-layout"],
      "priority": 1,
      "estimatedTime": "2-4小时"
    },
    "smart-contract-engineer": {
      "capabilities": ["blockchain", "web3", "smart-contracts"],
      "priority": 2,
      "estimatedTime": "4-8小时"
    },
    "demo-functionality-tester": {
      "capabilities": ["testing", "debugging", "performance"],
      "priority": 3,
      "estimatedTime": "1-3小时"
    },
    "presentation-optimizer": {
      "capabilities": ["data-visualization", "demo-optimization"],
      "priority": 1,
      "estimatedTime": "2-5小时"
    }
  },
  "defaultLanguage": "zh",
  "maxConcurrentAgents": 2,
  "riskThreshold": "medium"
}
```

## 🔧 高级功能

### 1. 自定义Agent权重

```javascript
const customConfig = {
  agentWeights: {
    'dex-ui-ux-reviewer': 1.2,  // 提高UI/UX Agent优先级
    'smart-contract-engineer': 0.8
  }
};

const orchestrator = new ContextOrchestrator(customConfig);
```

### 2. 批量任务处理

```javascript
const tasks = [
  "Fix mobile responsive issues",
  "Add Web3 wallet connection", 
  "Optimize chart loading performance"
];

const results = await orchestrator.processBatchTasks(tasks);
```

### 3. 实时进度监控

```javascript
orchestrator.on('progress', (update) => {
  console.log(`当前进度: ${update.percentage}%`);
  console.log(`正在执行: ${update.currentTask}`);
});

orchestrator.on('agentComplete', (agentResult) => {
  console.log(`Agent ${agentResult.name} 完成任务`);
});
```

## 🚨 故障排除

### 常见问题

1. **Agent未正确识别**
   - 检查输入描述是否包含明确的技术领域关键词
   - 尝试更具体的描述

2. **执行计划不合理**
   - 调整agent权重配置
   - 检查orchestrator-config.json设置

3. **性能问题**
   - 减少maxConcurrentAgents数量
   - 检查系统资源使用情况

### 调试模式

```javascript
const orchestrator = new ContextOrchestrator({
  debug: true,
  logLevel: 'verbose'
});
```

## 🔄 更新历史

- **v1.0.0** - 初始版本，基础功能完成
- **v1.1.0** - 增加Web界面支持
- **v1.2.0** - 优化自然语言处理
- **v1.3.0** - 增加批量任务处理和实时监控

## 📄 许可证

MIT License - 详见项目根目录LICENSE文件

---

**注意**：Context Orchestrator是RiverBit项目的核心组件，负责协调所有专业agents的工作。请确保在使用前仔细阅读配置说明，并根据实际需求调整参数。