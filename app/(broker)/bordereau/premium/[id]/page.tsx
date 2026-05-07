'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldHelp } from '@/components/shared/FieldHelp'
import { AttachmentSection } from '@/components/shared/AttachmentSection'
import { ArrowLeft, Save, Calculator, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { PremiumBordereauRow } from '@/types/database'

export default function PremiumBordereauEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [original, setOriginal] = useState<PremiumBordereauRow | null>(null)

  const [form, setForm] = useState({
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
    validation_status: 'pending',
  })

  // 기존 데이터 로드
  useEffect(() => {
    fetch(`/api/bordereau/premium/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const row: PremiumBordereauRow = d.data ?? d
        setOriginal(row)
        setForm({
          period_yyyyqn: row.period_yyyyqn,
          policy_no: row.policy_no,
          insured_name: row.insured_name ?? '',
          risk_period_from: row.risk_period_from,
          risk_period_to: row.risk_period_to,
          sum_insured: String(row.sum_insured),
          original_premium: String(row.original_premium),
          cession_pct: String((row.cession_pct * 100).toFixed(4)),
          ceded_premium: String(row.ceded_premium),
          entry_type: row.entry_type,
          currency: row.currency,
          validation_status: row.validation_status,
        })
      })
      .catch(() => setError('명세를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [id])

  // 출재보험료 자동계산
  useEffect(() => {
    const orig = parseFloat(form.original_premium)
    const pct = parseFloat(form.cession_pct)
    if (!isNaN(orig) && !isNaN(pct) && pct > 0) {
      const calc = pct > 1 ? orig * (pct / 100) : orig * pct
      setForm((f) => ({ ...f, ceded_premium: Math.round(calc).toString() }))
    }
  }, [form.original_premium, form.cession_pct])

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const backHref = original?.contract_id
    ? `/bordereau?contractId=${encodeURIComponent(original.contract_id)}`
    : '/bordereau'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const pct = parseFloat(form.cession_pct)
      const payload = {
        period_yyyyqn: form.period_yyyyqn,
        policy_no: form.policy_no,
        insured_name: form.insured_name || null,
        risk_period_from: form.risk_period_from,
        risk_period_to: form.risk_period_to,
        sum_insured: parseFloat(form.sum_insured),
        original_premium: parseFloat(form.original_premium),
        cession_pct: pct > 1 ? pct / 100 : pct,
        ceded_premium: parseFloat(form.ceded_premium),
        entry_type: form.entry_type,
        currency: form.currency,
        validation_status: form.validation_status,
      }
      const res = await fetch(`/api/bordereau/premium/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? '수정 실패')
      }
      toast.success('보험료 명세가 수정되었습니다.')
      router.push(backHref)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 명세를 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/bordereau/premium/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? '삭제 실패')
      }
      toast.success('보험료 명세가 삭제되었습니다.')
      router.push(backHref)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
    }
  }

  const inputCls =
    'w-full rounded border border-border bg-background px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary'
  const labelCls = 'flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]'

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
        불러오는 중...
      </div>
    )
  }

  if (!original && !loading) {
    return (
      <div className="p-8 text-center text-sm text-destructive">
        {error || '명세를 찾을 수 없습니다.'}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">보험료 명세 수정</h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">{original?.policy_no}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {deleting ? '삭제 중...' : '삭제'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 계약 정보 (읽기 전용) */}
      <div className="rounded-lg border border-border bg-surface-elevated p-4">
        <p className="text-xs font-medium text-[var(--text-muted)] mb-1">계약 ID (변경 불가)</p>
        <p className="text-sm font-mono text-[var(--text-primary)]">{original?.contract_id}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 계약 및 기간 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">계약 및 회계기간</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>
                회계기간
                <FieldHelp text="예: 2026Q1(분기), 2026S1(반기), 2026A(연간)" />
                <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="예: 2026Q1"
                value={form.period_yyyyqn}
                onChange={set('period_yyyyqn')}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                처리구분 <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={form.entry_type}
                onChange={set('entry_type')}
                className={inputCls}
              >
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
                <FieldHelp text="원수보험계약의 증권번호" />
                <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="POL-2026-001"
                value={form.policy_no}
                onChange={set('policy_no')}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>피보험자</label>
              <input
                type="text"
                placeholder="피보험자명"
                value={form.insured_name}
                onChange={set('insured_name')}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                위험 시작일 <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="date"
                value={form.risk_period_from}
                onChange={set('risk_period_from')}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                위험 종료일 <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="date"
                value={form.risk_period_to}
                onChange={set('risk_period_to')}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* 보험료 명세 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">보험료 명세</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>
                통화 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.currency}
                onChange={set('currency')}
                maxLength={3}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                보험가입금액
                <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={form.sum_insured}
                onChange={set('sum_insured')}
                className={`${inputCls} font-mono text-right`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                원보험료
                <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.original_premium}
                onChange={set('original_premium')}
                className={`${inputCls} font-mono text-right`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                출재비율(%)
                <FieldHelp text="30%는 30 또는 0.30 모두 입력 가능합니다." />
                <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="30"
                value={form.cession_pct}
                onChange={set('cession_pct')}
                className={`${inputCls} font-mono text-right`}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>
                출재보험료
                <FieldHelp text="원보험료 × 출재비율로 자동 계산됩니다. 직접 수정도 가능합니다." />
                <Calculator className="h-3 w-3 text-primary" />
                <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.ceded_premium}
                onChange={set('ceded_premium')}
                className={`${inputCls} font-mono text-right`}
              />
            </div>
          </div>
        </div>

        {/* 검증 상태 */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">검증 상태</p>
          <select
            value={form.validation_status}
            onChange={set('validation_status')}
            className={`${inputCls} max-w-xs`}
          >
            <option value="pending">미검증</option>
            <option value="valid">정상</option>
            <option value="warning">경고</option>
            <option value="error">오류</option>
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={backHref}>취소</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? '저장 중...' : '수정 저장'}
          </Button>
        </div>
      </form>

      {/* 별첨 — entity_id가 있으므로 live 모드 */}
      <AttachmentSection entityType="bordereau" entityId={id} />
    </div>
  )
}
