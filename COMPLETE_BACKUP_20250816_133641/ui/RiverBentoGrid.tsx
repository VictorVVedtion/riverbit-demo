import React, { ReactNode, HTMLAttributes } from 'react';
import { cn } from './utils';

interface RiverBentoGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  columns?: 4 | 8 | 12;
  spacing?: 'tight' | 'normal' | 'relaxed';
  theme?: 'river' | 'dark' | 'auto';
  adaptive?: boolean;
}

const RiverBentoGrid: React.FC<RiverBentoGridProps> = ({
  children,
  columns = 12,
  spacing = 'normal',
  theme = 'river', 
  adaptive = true,
  className,
  ...props
}) => {
  // 基础网格容器类
  const baseClasses = 'river-bento-grid';
  
  // 列数类
  const columnClasses = {
    4: 'river-bento-4',
    8: 'river-bento-8', 
    12: 'river-bento-12'
  };
  
  // 间距调整
  const spacingClasses = {
    tight: 'gap-px',
    normal: 'gap-1',
    relaxed: 'gap-2'
  };
  
  // 主题样式
  const themeClasses = {
    river: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
    dark: 'bg-slate-950',
    auto: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
  };
  
  // 响应式适配
  const adaptiveClasses = adaptive ? 'lg:river-bento-12 md:river-bento-8 sm:river-bento-4' : '';

  const combinedClassName = cn(
    baseClasses,
    columnClasses[columns],
    spacingClasses[spacing],
    themeClasses[theme],
    adaptiveClasses,
    className
  );

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};

export default RiverBentoGrid;