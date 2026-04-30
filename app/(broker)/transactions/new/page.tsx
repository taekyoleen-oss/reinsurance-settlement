import { Suspense } from 'react'
import { TransactionNewClient } from './TransactionNewClient'

export default function NewTransactionPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">거래 등록</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          신규 거래를 등록합니다. 계약 상세에서 연 경우 계약이 미리 선택됩니다.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">폼을 불러오는 중…</div>
        }
      >
        <TransactionNewClient />
      </Suspense>
    </div>
  )
}
