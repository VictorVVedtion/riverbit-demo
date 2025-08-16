import * as React from "react";

import { cn } from "./utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // River Glass Card Foundation - Aurora 2024 Shock & Awe Standard
        "river-card bg-[rgba(20,20,41,0.95)] backdrop-blur-[64px] border-2 border-[rgba(0,212,255,0.3)] text-[#ffffff] flex flex-col gap-6 rounded-3xl transform-gpu transition-all duration-700 ease-out will-change-transform relative overflow-hidden",
        // Aurora 2024 Ultra-Dimensional Glass Effect with Extreme Multi-layer Shadows
        "shadow-[0_16px_64px_rgba(0,0,0,0.4),0_8px_32px_rgba(0,212,255,0.3),0_32px_128px_rgba(0,212,255,0.1),0_2px_0_rgba(255,255,255,0.15)_inset]",
        "hover:shadow-[0_32px_128px_rgba(0,0,0,0.5),0_16px_64px_rgba(0,212,255,0.6),0_64px_256px_rgba(0,212,255,0.3),0_4px_0_rgba(255,255,255,0.2)_inset]",
        // Aurora Enhanced Hover States with Dramatic Scale and Translation
        "hover:-translate-y-6 hover:scale-[1.04] hover:border-[rgba(0,212,255,0.8)] hover:backdrop-blur-[80px] hover:saturate-[1.8] hover:brightness-[1.1]",
        // Ultra-Smooth Interaction Feedback
        "active:scale-[1.02] active:translate-y-[-8px] active:shadow-[0_24px_96px_rgba(0,212,255,0.4)]",
        // Aurora Dynamic Gradient Overlay for Ultra Depth
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-[rgba(0,212,255,0.15)] before:via-[rgba(123,63,242,0.08)] before:to-[rgba(255,0,229,0.1)] before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-700 before:pointer-events-none after:absolute after:inset-0 after:bg-[conic-gradient(from_0deg_at_50%_50%,rgba(0,212,255,0.1),rgba(123,63,242,0.1),rgba(255,0,229,0.1),rgba(0,212,255,0.1))] after:opacity-0 hover:after:opacity-40 after:blur-2xl after:transition-all after:duration-500 after:-z-10",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // River Card Header - Aurora 2024 Ultra Professional Hierarchy
        "river-card-header @container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-4 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 [.border-b]:border-[rgba(0,212,255,0.4)] relative z-10",
        // Aurora Enhanced border and separation effects
        "[.border-b]:shadow-[0_2px_0_rgba(255,255,255,0.1),0_1px_0_rgba(0,212,255,0.3)]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn(
        // River Card Title - Enhanced 2024 Professional Typography with Subtle Glow
        "river-card-title font-display text-lg font-bold leading-none text-[#ffffff] tracking-tight relative z-10",
        // Subtle text shadow for depth and readability
        "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] text-shadow-sm",
        // Enhanced hover interaction
        "transition-all duration-300 hover:text-[rgba(0,212,255,0.95)] hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        // River Card Description - Enhanced 2024 Muted Text with Better Readability
        "river-card-description text-[#a1a9b5] text-sm leading-relaxed relative z-10",
        // Improved contrast and subtle shadow
        "drop-shadow-[0_0.5px_1px_rgba(0,0,0,0.3)]",
        // Smooth transition for interactions
        "transition-colors duration-300 hover:text-[#b8c0cc]",
        className
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        // Enhanced 2024 Content Spacing with Better Visual Flow
        "px-6 [&:last-child]:pb-6 relative z-10",
        // Smooth transitions for nested interactive elements
        "transition-all duration-300",
        className
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // Enhanced 2024 Footer with Better Separation and Visual Hierarchy
        "flex items-center px-6 pb-6 [.border-t]:pt-6 [.border-t]:border-[rgba(0,212,255,0.15)] relative z-10",
        // Enhanced border top effect
        "[.border-t]:shadow-[0_-1px_0_rgba(255,255,255,0.05)]",
        // Smooth transitions
        "transition-all duration-300",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
