'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SectionAccordionProps {
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  badge?: React.ReactNode
}

export function SectionAccordion({
  title,
  description,
  defaultOpen = false,
  children,
  className,
  badge,
}: SectionAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('rounded-lg border border-border', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-elevated/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {description && !open && (
            <span className="text-xs text-[var(--text-muted)] hidden sm:block">{description}</span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[var(--text-muted)] transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-4">
          {description && (
            <p className="mb-3 text-xs text-[var(--text-muted)]">{description}</p>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
