'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = '', value = 0, max = 100, indicatorClassName = '', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary/20 ${className}`}
        {...props}
      >
        <motion.div
          className={`h-full bg-primary rounded-full ${indicatorClassName}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            type: "spring", 
            stiffness: 100, 
            damping: 20,
            duration: 0.5 
          }}
          style={{
            background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%)'
          }}
        />
      </div>
    )
  }
)

Progress.displayName = 'Progress'

export { Progress }