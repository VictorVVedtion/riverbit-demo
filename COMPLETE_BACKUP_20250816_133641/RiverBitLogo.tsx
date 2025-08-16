import React, { useState } from 'react';

type LogoSize = 'small' | 'medium' | 'large' | 'xl';
type LogoVariant = 'horizontal' | 'vertical' | 'compact';

interface RiverBitLogoProps {
  className?: string;
  size?: LogoSize;
  variant?: LogoVariant;
  height?: number;
  width?: number;
  priority?: boolean;
  adaptive?: boolean; // 自适应移动端显示
}

const sizeClasses = {
  small: 'h-8 w-auto',
  medium: 'h-12 w-auto',
  large: 'h-16 w-auto',
  xl: 'h-24 w-auto'
};

const sizePixels = {
  small: 32,
  medium: 48,
  large: 64,
  xl: 96
};

const RiverBitLogo: React.FC<RiverBitLogoProps> = ({ 
  className,
  size = 'medium',
  variant = 'horizontal',
  height,
  width,
  priority = false,
  adaptive = true
}) => {
  const [imageError, setImageError] = useState(false);
  
  // 河流主题增强的className
  const riverEnhancedClass = `${sizeClasses[size]} river-logo-container transition-all duration-300 hover:scale-105`;
  // 确定最终的className
  const finalClassName = className || riverEnhancedClass;
  // 确定最终的高度
  const finalHeight = height || sizePixels[size];
  
  // 根据variant选择logo文件
  const getLogoSrc = () => {
    switch (variant) {
      case 'vertical':
        return '/riverbit-logo-vertical.png';
      case 'compact':
        return '/riverbit-logo-horizontal-alt.png';
      default:
        return '/riverbit-logo-horizontal.png';
    }
  };
  
  // 如果图片加载失败，显示高质量的后备方案
  if (imageError) {
    return (
      <div className={`flex items-center space-x-2 ${finalClassName} riverbit-logo-fallback`}>
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-river-blue-main rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <span className="font-bold text-lg bg-gradient-to-r from-primary-600 to-river-blue-main bg-clip-text text-transparent tracking-tight">
          RiverBit
        </span>
      </div>
    );
  }
  
  return (
    <div className="riverbit-logo-container relative">
      <img 
        src={getLogoSrc()} 
        alt="RiverBit - Professional DEX Trading Platform" 
        className={`${finalClassName} riverbit-logo transition-all duration-500 ease-out filter drop-shadow-lg`}
        style={{ 
          height: finalHeight, 
          width: width || 'auto'
        }}
        loading={priority ? "eager" : "lazy"}
        onError={() => setImageError(true)}
      />
      
      {/* 品牌光晕效果 */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-river-blue-main/20 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-lg blur-xl -z-10"></div>
    </div>
  );
};

export default RiverBitLogo;
