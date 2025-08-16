import React, { useState, useEffect, useRef } from 'react';
import { cn } from './utils';

interface NaturalCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'calm' | 'focused' | 'volatile' | 'trending' | 'alert';
  breathing?: boolean;
  interactive?: boolean;
  emotionalResponse?: boolean;
  onHover?: () => void;
  onFocus?: () => void;
  onClick?: () => void;
}

const NaturalCard: React.FC<NaturalCardProps> = ({
  children,
  className,
  variant = 'calm',
  breathing = true,
  interactive = true,
  emotionalResponse = true,
  onHover,
  onFocus,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  // 鼠标跟踪以实现自然光流效果
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !interactive) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMousePosition({ x, y });
    
    // 更新CSS自定义属性以实现光流效果
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  // 情境感知的样式变化
  const getVariantClasses = () => {
    const baseClasses = 'natural-interactive relative overflow-hidden';
    
    switch (variant) {
      case 'focused':
        return `${baseClasses} market-emotion-focus border border-blue-400/30`;
      case 'volatile':
        return `${baseClasses} market-emotion-volatile border border-pink-400/30`;
      case 'trending':
        return `${baseClasses} market-emotion-trending border border-green-400/30`;
      case 'alert':
        return `${baseClasses} market-emotion-alert border border-red-400/30`;
      default:
        return `${baseClasses} market-emotion-calm border border-gray-400/20`;
    }
  };

  const breathingClass = breathing ? (
    variant === 'volatile' ? 'section-breath' :
    variant === 'trending' ? 'element-breath breath-delay-1' :
    'global-breath breath-delay-2'
  ) : '';

  return (
    <div
      ref={cardRef}
      className={cn(
        'transition-all duration-300',
        getVariantClasses(),
        breathingClass,
        interactive && 'cursor-pointer',
        isHovered && 'scale-[1.02] shadow-2xl',
        isFocused && 'ring-2 ring-blue-400/50',
        className
      )}
      style={{
        '--mouse-x': `${mousePosition.x}%`,
        '--mouse-y': `${mousePosition.y}%`,
      } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        setIsHovered(true);
        onHover?.();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      onFocus={() => {
        setIsFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setIsFocused(false);
      }}
      onClick={onClick}
      tabIndex={interactive ? 0 : -1}
    >
      {/* 自然光流背景层 */}
      {interactive && (
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
              ${variant === 'trending' ? 'rgba(16, 185, 129, 0.1)' :
                variant === 'volatile' ? 'rgba(255, 0, 229, 0.1)' :
                variant === 'alert' ? 'rgba(239, 68, 68, 0.1)' :
                'rgba(0, 212, 255, 0.1)'} 0%, 
              transparent 50%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />
      )}
      
      {/* 呼吸光晕效果 */}
      {breathing && emotionalResponse && (
        <div
          className={cn(
            'absolute inset-0 rounded-lg pointer-events-none',
            variant === 'trending' && 'animate-breathe-glow',
            variant === 'volatile' && 'animate-pulse',
            variant === 'alert' && 'animate-pulse'
          )}
          style={{
            boxShadow: `0 0 ${isHovered ? '40px' : '20px'} ${
              variant === 'trending' ? 'rgba(16, 185, 129, 0.2)' :
              variant === 'volatile' ? 'rgba(255, 0, 229, 0.2)' :
              variant === 'alert' ? 'rgba(239, 68, 68, 0.2)' :
              'rgba(0, 212, 255, 0.2)'
            }`,
          }}
        />
      )}
      
      {/* 内容区域 */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* 温暖细节纹理 */}
      <div className="absolute inset-0 subtle-texture pointer-events-none opacity-30" />
    </div>
  );
};

export default NaturalCard;