import { DashboardClient } from './DashboardClient'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">대시보드</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">미청산 잔액 및 Aging 현황</p>
      </div>
      <DashboardClient />
    </div>
  )
}
