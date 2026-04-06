import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface-elevated text-[var(--text-secondary)] border border-border',
        primary: 'bg-[var(--primary-muted)] text-primary border border-primary',
        accent: 'bg-blue-500/20 text-accent border border-accent/30',
        success: 'bg-emerald-500/20 text-success border border-emerald-500/30',
        warning: 'bg-amber-500/20 text-warning border border-amber-500/30',
        destructive: 'bg-red-500/20 text-warning-urgent border border-red-500/30',
        pending: 'bg-violet-500/20 text-pending border border-violet-500/30',
        muted: 'bg-surface-elevated text-[var(--text-muted)] border border-border line-through',
      },
    },
    defaultVariants: {
      variant: 'default',
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
