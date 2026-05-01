'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import { FieldHelp } from '@/components/shared/FieldHelp'
import { ArrowLeft, Save, Calculator } from 'lucide-react'
import Link from 'next/link'
import type { ContractWithCedantRow } from '@/types'

export default function PremiumBordereauNewPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<ContractWithCedantRow[]>([])
  const [filterCedantId, setFilterCedantId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    contract_id: '',
    period_yyyyqn: '',
    policy_no: '',
    insured_name: '',
    risk_period_from: '',
    risk_period_to: '',
    sum_insured: '',
    original_premium: '',
    cession_pct: '',
    ceded_premium: '',
    entry_type: 'new',
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

  // 출재보험료 자동계산
  useEffect(() => {
    const orig = parseFloat(form.original_premium)
    const pct = parseFloat(form.cession_pct)
    if (!isNaN(orig) && !isNaN(pct) && pct > 0) {
      const calc = pct > 1 ? orig * (pct / 100) : orig * pct
      setForm(f => ({ ...f, ceded_premium: Math.round(calc).toString() }))
    }
  }, [form.original_premium, form.cession_pct])

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
        sum_insured:      parseFloat(form.sum_insured),
        original_premium: parseFloat(form.original_premium),
        cession_pct:      pct > 1 ? pct / 100 : pct,
        ceded_premium:    parseFloat(form.ceded_premium),
      }
      const res = await fetch('/api/bordereau/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? '저장 실패')
      }
      const back =
        form.contract_id !== ''
          ? `/bordereau?contractId=${encodeURIComponent(form.contract_id)}`
          : '/bordereau'
      router.push(back)
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
      ? `/bordereau?contractId=${encodeURIComponent(form.contract_id)}`
      : '/bordereau'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={bordereauListHref}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">보험료 명세 추가</h1>
          <p className="text-xs text-[var(--text-muted)]">2단계 — 원수계약 증권 단위 출재 보험료를 입력합니다</p>
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
                계약
                <FieldHelp text="이 명세가 속한 재보험 계약을 선택합니다. 계약의 통화와 조건이 자동으로 적용됩니다." />
                <span className="text-destructive">*</span>
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
                회계기간
                <FieldHelp text="해당 명세의 회계기간입니다. 예: 2026Q1(분기), 2026S1(반기), 2026A(연간)" />
                <span className="text-destructive">*</span>
              </label>
              <input required type="text" placeholder="예: 2026Q1" value={form.period_yyyyqn} onChange={set('period_yyyyqn')} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>처리구분 <span className="text-destructive">*</span></label>
              <select required value={form.entry_type} onChange={set('entry_type')} className={inputCls}>
                <option value="new">신규</option>
                <option value="cancel">취소</option>
                <option value="refund">환급</option>
                <option value="adjustment">조정</option>
              </select>
            </div>
          </div>
        </div>

        {/* 원수계약 정보 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">원수계약 정보</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>
                증권번호
                <FieldHelp text="원수보험계약의 증권번호. 손해 명세와 연결 시 사용됩니다." />
                <span className="text-destructive">*</span>
              </label>
              <input required type="text" placeholder="POL-2026-001" value={form.policy_no} onChange={set('policy_no')} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>피보험자</label>
              <input type="text" placeholder="피보험자명" value={form.insured_name} onChange={set('insured_name')} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>위험 시작일 <span className="text-destructive">*</span></label>
              <input required type="date" value={form.risk_period_from} onChange={set('risk_period_from')} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>위험 종료일 <span className="text-destructive">*</span></label>
              <input required type="date" value={form.risk_period_to} onChange={set('risk_period_to')} className={inputCls} />
            </div>
          </div>
        </div>

        {/* 보험료 명세 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">보험료 명세</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>통화 <span className="text-destructive">*</span></label>
              <input type="text" value={form.currency} onChange={set('currency')} maxLength={3} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                보험가입금액
                <FieldHelp text="원수계약의 총 보험가입금액(Sum Insured)입니다." />
                <span className="text-destructive">*</span>
              </label>
              <input required type="number" min="0" step="1" placeholder="0" value={form.sum_insured} onChange={set('sum_insured')} className={`${inputCls} font-mono text-right`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                원보험료
                <FieldHelp text="재보험 출재 전 원수보험료 전액입니다." />
                <span className="text-destructive">*</span>
              </label>
              <input required type="number" min="0" step="0.01" placeholder="0" value={form.original_premium} onChange={set('original_premium')} className={`${inputCls} font-mono text-right`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                출재비율(%)
                <FieldHelp text="Quota Share는 계약 고정율, Surplus는 위험별 산정. 30%는 30 또는 0.30 모두 입력 가능합니다." />
                <span className="text-destructive">*</span>
              </label>
              <input required type="number" min="0" max="100" step="0.01" placeholder="30" value={form.cession_pct} onChange={set('cession_pct')} className={`${inputCls} font-mono text-right`} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>
                출재보험료
                <FieldHelp text="원보험료 × 출재비율로 자동 계산됩니다. 직접 수정도 가능합니다." />
                <Calculator className="h-3 w-3 text-primary" />
                <span className="text-destructive">*</span>
              </label>
              <input required type="number" min="0" step="0.01" placeholder="0" value={form.ceded_premium} onChange={set('ceded_premium')} className={`${inputCls} font-mono text-right`} />
              {form.original_premium && form.cession_pct && (
                <p className="text-[10px] text-[var(--text-muted)]">
                  자동계산: {parseFloat(form.original_premium).toLocaleString()} × {parseFloat(form.cession_pct) > 1 ? parseFloat(form.cession_pct) / 100 : parseFloat(form.cession_pct)} = {Math.round(parseFloat(form.original_premium) * (parseFloat(form.cession_pct) > 1 ? parseFloat(form.cession_pct) / 100 : parseFloat(form.cession_pct))).toLocaleString()}
                </p>
              )}
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
