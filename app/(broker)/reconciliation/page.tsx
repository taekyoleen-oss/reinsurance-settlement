'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ReconciliationGrid } from '@/components/reconciliation/ReconciliationGrid'
import { GitMerge } from 'lucide-react'

export default function ReconciliationPage() {
  const [contractId, setContractId] = useState('')
  const [counterpartyId, setCounterpartyId] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSearch = () => {
    if (!contractId || !periodFrom || !periodTo) return
    setSubmitted(true)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">대사 관리</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          브로커 ↔ 거래상대방 금액 비교 대사
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end p-4 bg-surface rounded-lg border border-border">
        <div className="space-y-1.5">
          <Label>계약 ID</Label>
          <Input
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            placeholder="계약 ID 입력..."
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label>거래상대방 ID</Label>
          <Input
            value={counterpartyId}
            onChange={(e) => setCounterpartyId(e.target.value)}
            placeholder="거래상대방 ID..."
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label>기간 시작</Label>
          <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>기간 종료</Label>
          <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
        </div>
        <Button onClick={handleSearch} disabled={!contractId || !periodFrom || !periodTo}>
          <GitMerge className="h-4 w-4 mr-1" />
          대사 조회
        </Button>
      </div>

      {submitted && <ReconciliationGrid contractId={contractId} counterpartyId={counterpartyId} />}

      {!submitted && (
        <div className="p-12 text-center text-sm text-[var(--text-muted)] border border-dashed border-border rounded-lg">
          계약과 기간을 입력 후 &quot;대사 조회&quot;를 클릭하세요.
        </div>
      )}
    </div>
  )
}
