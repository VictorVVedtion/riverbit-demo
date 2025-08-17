import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  // River Base Button Classes - Professional Trading Optimized for Performance
  "river-btn natural-button inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none transform-gpu will-change-transform relative overflow-hidden natural-interactive",
  {
    variants: {
      variant: {
        // River Primary - Aurora 2024 Enhanced with Natural Flow Dynamics
        default: "river-btn-primary bg-gradient-to-br from-[#0369a1] via-[#0ea5e9] to-[#00d4ff] text-white shadow-[0_8px_32px_0_rgba(0,212,255,0.6),0_16px_64px_0_rgba(0,212,255,0.3)] hover:shadow-[0_16px_64px_0_rgba(0,212,255,0.8),0_32px_128px_0_rgba(0,212,255,0.4)] hover:animate-none focus-visible:ring-4 focus-visible:ring-[#00d4ff]/70 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500 after:absolute after:inset-0 after:bg-gradient-conic after:from-[#00d4ff] after:via-[#7B3FF2] after:to-[#00d4ff] after:opacity-0 hover:after:opacity-30 after:blur-xl after:transition-opacity after:duration-300 after:-z-10 haptic-medium",
        
        // River Secondary - Aurora 2024 Ultra Glass Morphism
        secondary: "river-btn-secondary bg-[rgba(20,20,41,0.85)] backdrop-blur-3xl border-2 border-[rgba(0,212,255,0.25)] text-[#e2e8f0] shadow-[0_8px_32px_0_rgba(0,0,0,0.4),0_4px_16px_0_rgba(0,212,255,0.2),0_1px_0_0_rgba(255,255,255,0.1)_inset] hover:bg-[rgba(30,30,58,0.95)] hover:border-[rgba(0,212,255,0.6)] hover:-translate-y-3 hover:scale-[1.03] hover:shadow-[0_16px_64px_0_rgba(0,212,255,0.3),0_8px_32px_0_rgba(0,212,255,0.4)] hover:backdrop-blur-[48px] focus-visible:ring-4 focus-visible:ring-[#00d4ff]/50 before:absolute before:inset-0 before:bg-gradient-radial before:from-[rgba(0,212,255,0.1)] before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        // River Ghost - Aurora 2024 Spectral Enhancement with Natural Breathing
        ghost: "river-btn-ghost bg-transparent text-[#e2e8f0] hover:bg-[rgba(20,20,41,0.85)] hover:backdrop-blur-3xl hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.3),0_8px_24px_0_rgba(0,212,255,0.2)] hover:border-2 hover:border-[rgba(0,212,255,0.4)] focus-visible:ring-4 focus-visible:ring-[#00d4ff]/50 before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-radial before:from-[rgba(0,212,255,0.2)] before:via-[rgba(123,63,242,0.1)] before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 after:absolute after:inset-0 after:bg-[conic-gradient(from_0deg_at_50%_50%,rgba(0,212,255,0.1),rgba(123,63,242,0.1),rgba(255,0,229,0.1),rgba(0,212,255,0.1))] after:opacity-0 hover:after:opacity-60 after:blur-lg after:transition-all after:duration-500 after:-z-10 breathing-card breath-delay-1 haptic-light",
        
        // Trading Long Position - Enhanced with Natural Market Emotion
        long: "river-btn-long market-emotion-trending bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.25)] hover:shadow-[0_8px_25px_0_rgba(16,185,129,0.4)] focus-visible:ring-2 focus-visible:ring-green-500/50 after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent after:translate-x-[-100%] hover:after:translate-x-[100%] after:transition-transform after:duration-500 haptic-medium price-natural-up",
        
        // Trading Short Position - Enhanced with Natural Market Emotion
        short: "river-btn-short market-emotion-caution bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#b91c1c] text-white shadow-[0_4px_14px_0_rgba(239,68,68,0.25)] hover:shadow-[0_8px_25px_0_rgba(239,68,68,0.4)] focus-visible:ring-2 focus-visible:ring-red-500/50 after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent after:translate-x-[-100%] hover:after:translate-x-[100%] after:transition-transform after:duration-500 haptic-medium price-natural-down",
        
        // Outline with Enhanced River Theme and Depth
        outline: "border border-[rgba(0,212,255,0.2)] bg-transparent text-[#e2e8f0] shadow-[0_2px_8px_0_rgba(0,0,0,0.15)] hover:bg-[rgba(20,20,41,0.85)] hover:border-[rgba(0,212,255,0.4)] hover:backdrop-blur-xl hover:-translate-y-0.5 hover:shadow-[0_4px_15px_0_rgba(0,212,255,0.2)] focus-visible:ring-2 focus-visible:ring-[#00d4ff]/30",
        
        // Destructive with Enhanced River Styling
        destructive: "bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#b91c1c] text-white shadow-[0_4px_14px_0_rgba(239,68,68,0.25)] hover:shadow-[0_8px_25px_0_rgba(239,68,68,0.4)] hover:-translate-y-1 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-red-500/50",
        
        // Link Style - Enhanced with Subtle Animations
        link: "text-[#00d4ff] underline-offset-4 hover:underline hover:text-[#22d3ee] transition-all duration-200 hover:translate-y-[-1px] relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-gradient-to-r after:from-[#00d4ff] after:to-[#22d3ee] hover:after:w-full after:transition-all after:duration-300",
        
        // Premium Variant - Aurora 2024 Ultimate Experience with Living Interface
        premium: "river-btn-premium breathing-card warm-glow bg-[rgba(40,40,75,0.95)] backdrop-blur-[64px] border-2 border-[#00d4ff] text-white shadow-[0_16px_64px_0_rgba(0,212,255,0.6),0_8px_32px_0_rgba(0,212,255,0.4),0_32px_128px_0_rgba(0,212,255,0.2),0_2px_0_0_rgba(255,255,255,0.15)_inset] hover:shadow-[0_32px_128px_0_rgba(0,212,255,0.8),0_16px_64px_0_rgba(0,212,255,0.6),0_64px_256px_0_rgba(0,212,255,0.3)] focus-visible:ring-6 focus-visible:ring-[#00d4ff]/80 before:absolute before:inset-0 before:bg-gradient-conic before:from-[rgba(0,212,255,0.3)] before:via-[rgba(123,63,242,0.2)] before:to-[rgba(255,0,229,0.3)] before:animate-spin-slow after:absolute after:inset-0 after:bg-gradient-radial after:from-[rgba(0,212,255,0.2)] after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300 after:blur-2xl after:-z-10 haptic-strong smile-curve attention-flow",
      },
      size: {
        sm: "h-8 px-3 py-1.5 text-xs rounded-lg gap-1.5 has-[>svg]:px-2.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]",
        default: "h-10 px-4 py-2.5 text-sm rounded-xl gap-2 has-[>svg]:px-3 shadow-[0_2px_6px_0_rgba(0,0,0,0.15)]",
        lg: "h-12 px-6 py-3 text-base rounded-xl gap-2.5 has-[>svg]:px-4 shadow-[0_3px_8px_0_rgba(0,0,0,0.2)]",
        xl: "h-14 px-8 py-4 text-lg rounded-2xl gap-3 has-[>svg]:px-6 shadow-[0_4px_12px_0_rgba(0,0,0,0.25)]",
        icon: "size-10 rounded-xl shadow-[0_2px_6px_0_rgba(0,0,0,0.15)]",
        "icon-sm": "size-8 rounded-lg shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]",
        "icon-lg": "size-12 rounded-xl shadow-[0_3px_8px_0_rgba(0,0,0,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.memo(function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

export { Button, buttonVariants };
