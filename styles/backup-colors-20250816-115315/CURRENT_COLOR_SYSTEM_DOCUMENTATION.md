# RiverBit DEX 当前配色系统文档

**备份时间**: 2025-08-16 11:53:15  
**备份目的**: Aurora 2024 配色系统升级前的完整备份

## 📋 当前主要配色

### 🎨 品牌主色调
```css
--primary: #3b82f6;              /* 主蓝色 */
--river-blue-light: #06b6d4;     /* 河流浅蓝 */
--river-blue-main: #0891b2;      /* 河流主蓝 */
--river-blue-dark: #0e7490;      /* 河流深蓝 */
--river-accent: #22d3ee;         /* 河流强调色 */
```

### 🌑 背景层级系统  
```css
--background: #0a0a1a;           /* 主背景 */
--surface-0: #0a0a1a;            /* Surface 0 */
--surface-1: #1a1a2a;            /* Surface 1 */
--surface-2: #2a2a3a;            /* Surface 2 */
--surface-3: #3a3a4a;            /* Surface 3 */
--surface-4: #4a4a5a;            /* Surface 4 */
```

### 📊 交易状态色
```css
--success: #10b981;              /* 成功/做多绿 */
--profit-green: #10b981;         /* 盈利绿 */
--danger: #ef4444;               /* 危险/做空红 */
--loss-red: #ef4444;             /* 亏损红 */
--warning: #f59e0b;              /* 警告黄 */
--neutral-gray: #64748b;         /* 中性灰 */
```

### 🖋 文字层级
```css
--foreground: #f8fafc;           /* 主文字 */
--muted-foreground: #94a3b8;     /* 次要文字 */
--card-foreground: #f1f5f9;      /* 卡片文字 */
```

### 🔲 边框系统
```css
--border: #334155;               /* 默认边框 */
--border-light: #475569;         /* 浅色边框 */
--border-accent: #3b82f6;        /* 强调边框 */
--border-subtle: rgba(51, 65, 85, 0.3);  /* 微妙边框 */
```

### 🌈 渐变系统
```css
--gradient-primary: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #06b6d4 100%);
--gradient-river: linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%);
--gradient-brand: linear-gradient(135deg, #1e3a8a 0%, #2563eb 25%, #0891b2 75%, #22d3ee 100%);
```

## 🎯 当前设计特征

1. **传统蓝紫色系**: 以蓝色为主，紫色为辅
2. **保守饱和度**: 整体色彩较为克制
3. **线性渐变**: 主要使用简单的线性渐变
4. **中等对比度**: 背景与前景对比度适中

## 🔄 即将升级的方向

- ✨ Aurora极光青色系
- 🌌 Deep Space深空背景
- 💫 Neon霓虹发光效果
- 🎭 多维度Aurora渐变
- ⚡ 高对比度设计

## 📂 备份文件列表

- `globals.css` - 主配色文件
- `tailwind.config.js` - Tailwind配置
- `riverbit-unified-design-system.css` - 统一设计系统
- `riverbit-colors.css` - RiverBit颜色定义
- 以及所有其他CSS文件

## 🔙 回滚方法

如需回滚到当前配色系统：
```bash
cp /Users/victor/Desktop/Demo/styles/backup-colors-20250816-115315/* /Users/victor/Desktop/Demo/styles/
cp /Users/victor/Desktop/Demo/styles/backup-colors-20250816-115315/tailwind.config.js /Users/victor/Desktop/Demo/
```

---
*此文档记录了Aurora 2024升级前的完整配色状态，确保可以安全回滚*