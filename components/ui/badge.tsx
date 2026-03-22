import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-surface2 text-text-primary",
        destructive:
          "border-transparent bg-red-bgbg text-ds-red",
        outline: "border-border text-text-secondary bg-transparent",
        success:
          "border-transparent bg-green-bgbg text-ds-green",
        warning:
          "border-transparent bg-amber-bgbg text-ds-amber",
        info:
          "border-transparent bg-blue-bgbg text-ds-blue",
        neutral:
          "border-transparent bg-tag-bg text-tag-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
