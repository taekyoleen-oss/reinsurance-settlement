import { Toaster } from '@/components/ui/toast'

export default function ExternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-[#0F1117]">RS</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text-primary)]">재보험 정청산 시스템</h1>
            <p className="text-xs text-[var(--text-muted)]">Reinsurance Settlement Portal</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-6 py-8">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
