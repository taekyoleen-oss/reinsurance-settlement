'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import { FieldHelp } from '@/components/shared/FieldHelp'
import { ArrowLeft, Save, Calculator } from 'lucide-react'
import Link from 'next/link'
import type { ContractWithCedantRow } from '@/types'

export default function LossBordereauNewPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<ContractWithCedantRow[]>([])
  const [filterCedantId, setFilterCedantId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    contract_id: '',
    period_yyyyqn: '',
    claim_no: '',
    loss_date: '',
    report_date: '',
    paid_amount: '',
    os_reserve: '',
    cession_pct: '',
    recoverable_amount: '',
    is_cash_loss: false,
    loss_status: 'in_progress',
    currency: 'KRW',
  })

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterCedantId) params.set('cedant_id', filterCedantId)
    const q = params.toString()
    fetch(q ? `/api/contracts?${q}` : '/api/contracts')
      .then((r) => r.json())
      .then((j) => setContracts(j.data ?? []))
  }, [filterCedantId])

  useEffect(() => {
    if (!form.contract_id || contracts.length === 0) return
    if (!contracts.some((c) => c.id === form.contract_id)) {
      setForm((f) => ({ ...f, contract_id: '' }))
    }
  }, [contracts, form.contract_id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = new URLSearchParams(window.location.search).get('contractId')
    if (id) setForm((f) => ({ ...f, contract_id: id }))
  }, [])

  // 재보험금 회수액 자동계산
  useEffect(() => {
    const paid = parseFloat(form.paid_amount) || 0
    const os = parseFloat(form.os_reserve) || 0
    const pct = parseFloat(form.cession_pct)
    if (!isNaN(pct) && pct > 0) {
      const effectivePct = pct > 1 ? pct / 100 : pct
      const calc = Math.round((paid + os) * effectivePct)
      setForm(f => ({ ...f, recoverable_amount: calc.toString() }))
    }
  }, [form.paid_amount, form.os_reserve, form.cession_pct])

  // 계약 선택 시 통화 자동 설정
  useEffect(() => {
    const c = contracts.find(c => c.id === form.contract_id)
    if (c) setForm(f => ({ ...f, currency: c.settlement_currency }))
  }, [form.contract_id, contracts])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const pct = parseFloat(form.cession_pct)
      const payload = {
        ...form,
        paid_amount:        parseFloat(form.paid_amount) || 0,
        os_reserve:         parseFloat(form.os_reserve) || 0,
        cession_pct:        pct > 1 ? pct / 100 : pct,
        recoverable_amount: parseFloat(form.recoverable_amount) || 0,
      }
      const res = await fetch('/api/bordereau/loss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? '저장 실패')
      }
      const q = new URLSearchParams()
      q.set('tab', 'loss')
      if (form.contract_id) q.set('contractId', form.contract_id)
      router.push(`/bordereau?${q.toString()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded border border-border bg-background px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary'
  const labelCls = 'flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]'
  const bordereauListHref =
    form.contract_id !== ''
      ? `/bordereau?contractId=${encodeURIComponent(form.contract_id)}&tab=loss`
      : '/bordereau?tab=loss'

  const paid = parseFloat(form.paid_amount) || 0
  const os   = parseFloat(form.os_reserve)  || 0
  const pct  = parseFloat(form.cession_pct)
  const effectivePct = !isNaN(pct) && pct > 1 ? pct / 100 : pct

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={bordereauListHref}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">손해 명세 추가</h1>
          <p className="text-xs text-[var(--text-muted)]">2단계 — 원수계약 사고 단위 재보험금 청구 명세를 입력합니다</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 계약 및 기간 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">계약 및 회계기간</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-wrap items-end gap-4">
              <CedantFilterSelect
                value={filterCedantId}
                onChange={setFilterCedantId}
                triggerClassName="h-9 w-[min(100%,14rem)]"
              />
              <p className="pb-2 text-[11px] text-[var(--text-muted)]">
                출재사를 먼저 좁히면 계약 목록에서 찾기 쉽습니다.
              </p>
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>
                계약 <span className="text-destructive">*</span>
              </label>
              <select required value={form.contract_id} onChange={set('contract_id')} className={inputCls}>
                <option value="">계약을 선택하세요</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contract_no}
                    {' — '}
                    {c.cedant?.company_name_ko ?? c.description ?? c.contract_type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                회계기간 <span className="text-destructive">*</span>
              </label>
              <input required type="text" placeholder="예: 2026Q1" value={form.period_yyyyqn} onChange={set('period_yyyyqn')} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>통화 <span className="text-destructive">*</span></label>
              <input type="text" value={form.currency} onChange={set('currency')} maxLength={3} className={inputCls} />
            </div>
          </div>
        </div>

        {/* 사고 정보 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">사고 정보</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>
                사고번호
                <FieldHelp text="사내 사고 관리번호 또는 원수사 클레임번호입니다." />
                <span className="text-destructive">*</span>
              </label>
              <input required type="text" placeholder="CLM-2026-001" value={form.claim_no} onChange={set('claim_no')} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>사고 발생일 <span className="text-destructive">*</span></label>
              <input required type="date" value={form.loss_date} onChange={set('loss_date')} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>사고 보고일</label>
              <input type="date" value={form.report_date} onChange={set('report_date')} className={inputCls} />
            </div>
          </div>
        </div>

        {/* 손해 금액 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">손해 금액</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>
                원수 지급보험금
                <FieldHelp text="현재까지 원수사가 실제 지급한 보험금(Paid Loss)입니다." />
              </label>
              <input type="number" min="0" step="0.01" placeholder="0" value={form.paid_amount} onChange={set('paid_amount')} className={`${inputCls} font-mono text-right`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                미결손해(O/S Reserve)
                <FieldHelp text="아직 지급되지 않은 예상 손해액 적립금입니다. paid + O/S = 총 손해(Incurred)." />
              </label>
              <input type="number" min="0" step="0.01" placeholder="0" value={form.os_reserve} onChange={set('os_reserve')} className={`${inputCls} font-mono text-right`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                출재비율(%)
                <FieldHelp text="보험료 명세의 출재비율과 동일하게 입력합니다." />
                <span className="text-destructive">*</span>
              </label>
              <input required type="number" min="0" max="100" step="0.01" placeholder="30" value={form.cession_pct} onChange={set('cession_pct')} className={`${inputCls} font-mono text-right`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                재보험금 회수액
                <FieldHelp text="(지급 + 미결) × 출재비율로 자동 계산됩니다." />
                <Calculator className="h-3 w-3 text-primary" />
                <span className="text-destructive">*</span>
              </label>
              <input required type="number" min="0" step="0.01" placeholder="0" value={form.recoverable_amount} onChange={set('recoverable_amount')} className={`${inputCls} font-mono text-right`} />
              {!isNaN(effectivePct) && (
                <p className="text-[10px] text-[var(--text-muted)]">
                  자동계산: ({paid.toLocaleString()} + {os.toLocaleString()}) × {(effectivePct * 100).toFixed(2)}% = {Math.round((paid + os) * effectivePct).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 상태 및 Cash Loss */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">상태</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>손해 상태 <span className="text-destructive">*</span></label>
              <select required value={form.loss_status} onChange={set('loss_status')} className={inputCls}>
                <option value="in_progress">진행중</option>
                <option value="paid">지급완료</option>
                <option value="closed">종결</option>
                <option value="denied">거절</option>
              </select>
            </div>
            <div className="flex items-end pb-2 gap-2">
              <input
                type="checkbox"
                id="is_cash_loss"
                checked={form.is_cash_loss}
                onChange={e => setForm(f => ({ ...f, is_cash_loss: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <label htmlFor="is_cash_loss" className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                Cash Loss
                <FieldHelp text="계약의 Cash Loss 한도를 초과하는 손해로 정기 SOA와 별도로 즉시 청구할 수 있습니다." />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={bordereauListHref}>취소</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}
