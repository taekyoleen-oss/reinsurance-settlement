'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface FieldHelpProps {
  text: string
  className?: string
}

export function FieldHelp({ text, className }: FieldHelpProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label="도움말"
        onClick={() => setOpen(v => !v)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-primary focus:outline-none"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span
          role="tooltip"
          className={cn(
            'absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2',
            'rounded-md border border-border bg-surface-elevated px-3 py-2',
            'text-xs text-[var(--text-secondary)] shadow-md'
          )}
        >
          {text}
          {/* 말풍선 꼬리 */}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border" />
        </span>
      )}
    </span>
  )
}
