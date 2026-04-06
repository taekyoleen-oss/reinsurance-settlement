'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[var(--text-secondary)]',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-[#0F1117]',
          cancelButton:
            'group-[.toast]:bg-surface-elevated group-[.toast]:text-[var(--text-muted)]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
