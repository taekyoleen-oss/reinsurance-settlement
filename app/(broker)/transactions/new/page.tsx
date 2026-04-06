import { TransactionForm } from '@/components/transactions/TransactionForm'

export default function NewTransactionPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">거래 등록</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">신규 거래를 등록합니다.</p>
      </div>
      <TransactionForm />
    </div>
  )
}
