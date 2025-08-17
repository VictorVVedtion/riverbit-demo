import * as React from "react"
import { cn } from "./utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Professional Trading Input Foundation - River Glass Design
          "flex h-10 w-full rounded-lg border border-slate-600/40 bg-slate-800/60 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white placeholder:text-slate-400",
          // Enhanced Focus States for Professional Trading
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:border-cyan-400/60 focus-visible:bg-slate-800/80",
          // Professional Hover and Interaction States
          "hover:border-slate-500/60 hover:bg-slate-800/70 transition-all duration-200",
          // File Input Styling
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-300",
          // Disabled State
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-900/40",
          // Professional Number Input Styling
          "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&[type=number]]:appearance-textfield",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }