'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <Sonner
      theme={mounted && resolvedTheme === 'light' ? 'light' : 'dark'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[var(--text-secondary)]',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-surface-elevated group-[.toast]:text-[var(--text-muted)]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
