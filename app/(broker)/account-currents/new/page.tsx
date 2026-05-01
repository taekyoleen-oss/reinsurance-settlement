'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import { DuplicateACWarningBanner } from '@/components/shared/DuplicateACWarningBanner'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { useContracts, useCounterparties } from '@/hooks/use-reference-data'

export default function NewAccountCurrentPage() {
  const router = useRouter()
  const contracts = useContracts()
  const counterparties = useCounterparties()
  const [loading, setLoading] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [filterCedantId, setFilterCedantId] = useState('')

  const [form, setForm] = useState({
    contract_id: '',
    counterparty_id: '',
    period_type: 'monthly',
    period_from: '',
    period_to: '',
    settlement_currency: 'KRW',
    notes: '',
  })

  const contractsForSelect = useMemo(
    () => contracts.filter((c) => !filterCedantId || c.cedant_id === filterCedantId),
    [contracts, filterCedantId]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = new URLSearchParams(window.location.search).get('contractId')
    if (id) {
      setForm((f) => (f.contract_id === id ? f : { ...f, contract_id: id }))
    }
  }, [])

  useEffect(() => {
    if (!form.contract_id || contracts.length === 0) return
    if (!contractsForSelect.some((c) => c.id === form.contract_id)) {
      setForm((f) => ({ ...f, contract_id: '' }))
    }
  }, [contractsForSelect, form.contract_id, contracts.length])

  useEffect(() => {
    const c = contracts.find((x) => x.id === form.contract_id)
    if (!c?.settlement_currency) return
    setForm((f) =>
      f.settlement_currency === c.settlement_currency
        ? f
        : { ...f, settlement_currency: c.settlement_currency }
    )
  }, [form.contract_id, contracts])

  // 기간 중복 체크
  useEffect(() => {
    if (form.contract_id && form.counterparty_id && form.period_from && form.period_to) {
      const params = new URLSearchParams({
        contract_id: form.contract_id,
        counterparty_id: form.counterparty_id,
        period_from: form.period_from,
        period_to: form.period_to,
        check_duplicate: 'true',
      })
      fetch(`/api/account-currents?${params}`)
        .then((r) => r.json())
        .then((d) => setDuplicateWarning(d.duplicate === true))
        .catch(() => {})
    } else {
      setDuplicateWarning(false)
    }
  }, [form.contract_id, form.counterparty_id, form.period_from, form.period_to])

  // period_type에 따른 자동 기간 계산
  const handlePeriodTypeChange = (val: string) => {
    const now = new Date()
    let from = ''
    let to = ''

    if (val === 'monthly') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    } else if (val === 'quarterly') {
      const q = Math.floor(now.getMonth() / 3)
      from = `${now.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`
      const endMonth = q * 3 + 3
      const last = new Date(now.getFullYear(), endMonth, 0)
      to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    } else if (val === 'annual') {
      from = `${now.getFullYear()}-01-01`
      to = `${now.getFullYear()}-12-31`
    }

    setForm((f) => ({ ...f, period_type: val, period_from: from, period_to: to }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contract_id || !form.counterparty_id || !form.period_from || !form.period_to) {
      toast.error('필수 항목을 모두 입력하세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/account-currents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '생성 실패')
      toast.success('정산서가 생성되었습니다.')
      router.push(`/account-currents/${data.data?.id ?? data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/account-currents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">정산서 생성</h1>
        </div>
      </div>

      {duplicateWarning && <DuplicateACWarningBanner />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            정산서 정보 입력
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <CedantFilterSelect
                value={filterCedantId}
                onChange={setFilterCedantId}
                triggerClassName="h-9 w-[min(100%,14rem)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>계약 *</Label>
                <Select
                  value={form.contract_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, contract_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="계약 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contractsForSelect.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contract_no} ({c.contract_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>수재사 *</Label>
                <Select
                  value={form.counterparty_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, counterparty_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="수재사 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {counterparties
                      .filter((cp) => cp.company_type === 'reinsurer')
                      .map((cp) => (
                        <SelectItem key={cp.id} value={cp.id}>
                          {cp.company_name_ko}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>정산 주기</Label>
                <Select value={form.period_type} onValueChange={handlePeriodTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">월별</SelectItem>
                    <SelectItem value="quarterly">분기별</SelectItem>
                    <SelectItem value="annual">연간</SelectItem>
                    <SelectItem value="custom">직접 입력</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>기간 시작 *</Label>
                <Input
                  type="date"
                  value={form.period_from}
                  onChange={(e) => setForm((f) => ({ ...f, period_from: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>기간 종료 *</Label>
                <Input
                  type="date"
                  value={form.period_to}
                  onChange={(e) => setForm((f) => ({ ...f, period_to: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>정산 통화</Label>
              <Input
                value={form.settlement_currency}
                onChange={(e) => setForm((f) => ({ ...f, settlement_currency: e.target.value }))}
                placeholder="KRW"
                className="w-32"
              />
            </div>

            <div className="space-y-1.5">
              <Label>비고</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="메모..."
              />
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? '생성 중...' : '정산서 생성'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
