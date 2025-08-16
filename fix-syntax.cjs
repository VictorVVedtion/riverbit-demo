const fs = require('fs');

// 读取文件
let content = fs.readFileSync('components/LiquidBentoTradingInterface.tsx', 'utf8');

// 查找并修复语法错误
// 问题是在第1840行的 )}  后面有额外的空格或格式问题

// 重新格式化有问题的部分
content = content.replace(
  /(\s+<\/>\s+)\}\)/g,
  '\n              </>\n            )}'
);

// 写回文件
fs.writeFileSync('components/LiquidBentoTradingInterface.tsx', content);

console.log('语法错误已修复');