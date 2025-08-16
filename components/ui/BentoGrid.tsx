import React, { ReactNode, HTMLAttributes } from 'react';
import { cn } from './utils';

interface BentoGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'dense' | 'masonry';
  animated?: boolean;
}

interface BentoCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xl';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  interactive?: boolean;
  withGlow?: boolean;
  withAnimation?: boolean;
}

const BentoGrid: React.FC<BentoGridProps> = ({
  children,
  variant = 'default',
  animated = true,
  className,
  ...props
}) => {
  const baseClasses = 'bento-grid optimized-container';
  
  const variantClasses = {
    default: '',
    dense: 'bento-grid-dense',
    masonry: 'bento-grid-masonry'
  };

  const animatedClasses = animated ? 'bento-slide-in' : '';

  const combinedClassName = cn(
    baseClasses,
    variantClasses[variant],
    animatedClasses,
    className
  );

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};

const BentoCard: React.FC<BentoCardProps> = ({
  children,
  size = 'small',
  variant = 'default',
  interactive = true,
  withGlow = false,
  withAnimation = true,
  className,
  ...props
}) => {
  const baseClasses = 'bento-card gpu-accelerated';
  
  const sizeClasses = {
    small: 'bento-card-small',
    medium: 'bento-card-medium',
    large: 'bento-card-large',
    xl: 'bento-card-xl'
  };

  const variantClasses = {
    default: '',
    primary: 'bento-card-primary',
    success: 'bento-card-success',
    warning: 'bento-card-warning',
    danger: 'bento-card-danger'
  };

  const interactiveClasses = interactive ? 'bento-card-interactive' : '';
  const glowClasses = withGlow ? 'bento-card-glow' : '';
  const animationClasses = withAnimation ? 'bento-slide-in' : '';

  const combinedClassName = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    interactiveClasses,
    glowClasses,
    animationClasses,
    className
  );

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};

export { BentoGrid, BentoCard };
export default BentoGrid;