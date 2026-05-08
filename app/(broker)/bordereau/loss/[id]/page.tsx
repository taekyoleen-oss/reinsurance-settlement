'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldHelp } from '@/components/shared/FieldHelp'
import { AttachmentSection } from '@/components/shared/AttachmentSection'
import { ArrowLeft, Save, Calculator, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { LossBordereauRow } from '@/types'

export default function LossBordereauEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [original, setOriginal] = useState<LossBordereauRow | null>(null)

  const [form, setForm] = useState({
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
    validation_status: 'pending',
  })

  // 기존 데이터 로드
  useEffect(() => {
    fetch(`/api/bordereau/loss/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const row: LossBordereauRow = d.data ?? d
        setOriginal(row)
        setForm({
          period_yyyyqn: row.period_yyyyqn,
          claim_no: row.claim_no,
          loss_date: row.loss_date,
          report_date: row.report_date ?? '',
          paid_amount: String(row.paid_amount),
          os_reserve: String(row.os_reserve),
          cession_pct: String((row.cession_pct * 100).toFixed(4)),
          recoverable_amount: String(row.recoverable_amount),
          is_cash_loss: row.is_cash_loss,
          loss_status: row.loss_status,
          currency: row.currency,
          validation_status: row.validation_status,
        })
      })
      .catch(() => setError('명세를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [id])

  // 재보험금 회수액 자동계산
  useEffect(() => {
    const paid = parseFloat(form.paid_amount) || 0
    const os = parseFloat(form.os_reserve) || 0
    const pct = parseFloat(form.cession_pct)
    if (!isNaN(pct) && pct > 0) {
      const effectivePct = pct > 1 ? pct / 100 : pct
      const calc = Math.round((paid + os) * effectivePct)
      setForm((f) => ({ ...f, recoverable_amount: calc.toString() }))
    }
  }, [form.paid_amount, form.os_reserve, form.cession_pct])

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const backHref = original?.contract_id
    ? `/bordereau?contractId=${encodeURIComponent(original.contract_id)}&tab=loss`
    : '/bordereau?tab=loss'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const pct = parseFloat(form.cession_pct)
      const payload = {
        period_yyyyqn: form.period_yyyyqn,
        claim_no: form.claim_no,
        loss_date: form.loss_date,
        report_date: form.report_date || null,
        paid_amount: parseFloat(form.paid_amount) || 0,
        os_reserve: parseFloat(form.os_reserve) || 0,
        cession_pct: pct > 1 ? pct / 100 : pct,
        recoverable_amount: parseFloat(form.recoverable_amount) || 0,
        is_cash_loss: form.is_cash_loss,
        loss_status: form.loss_status,
        currency: form.currency,
        validation_status: form.validation_status,
      }
      const res = await fetch(`/api/bordereau/loss/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? '수정 실패')
      }
      toast.success('손해 명세가 수정되었습니다.')
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
      const res = await fetch(`/api/bordereau/loss/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? '삭제 실패')
      }
      toast.success('손해 명세가 삭제되었습니다.')
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

  const paid = parseFloat(form.paid_amount) || 0
  const os = parseFloat(form.os_reserve) || 0
  const pct = parseFloat(form.cession_pct)
  const effectivePct = !isNaN(pct) && pct > 1 ? pct / 100 : pct

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
            <h1 className="text-lg font-bold text-[var(--text-primary)]">손해 명세 수정</h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">{original?.claim_no}</p>
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
                회계기간 <span className="text-destructive">*</span>
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
              <input
                required
                type="text"
                placeholder="CLM-2026-001"
                value={form.claim_no}
                onChange={set('claim_no')}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                사고 발생일 <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="date"
                value={form.loss_date}
                onChange={set('loss_date')}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>사고 보고일</label>
              <input
                type="date"
                value={form.report_date}
                onChange={set('report_date')}
                className={inputCls}
              />
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
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.paid_amount}
                onChange={set('paid_amount')}
                className={`${inputCls} font-mono text-right`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                미결손해(O/S Reserve)
                <FieldHelp text="아직 지급되지 않은 예상 손해액 적립금입니다." />
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.os_reserve}
                onChange={set('os_reserve')}
                className={`${inputCls} font-mono text-right`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>
                출재비율(%)
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
            <div className="space-y-1">
              <label className={labelCls}>
                재보험금 회수액
                <FieldHelp text="(지급 + 미결) × 출재비율로 자동 계산됩니다." />
                <Calculator className="h-3 w-3 text-primary" />
                <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.recoverable_amount}
                onChange={set('recoverable_amount')}
                className={`${inputCls} font-mono text-right`}
              />
              {!isNaN(effectivePct) && (
                <p className="text-[10px] text-[var(--text-muted)]">
                  자동계산: ({paid.toLocaleString()} + {os.toLocaleString()}) ×{' '}
                  {(effectivePct * 100).toFixed(2)}% ={' '}
                  {Math.round((paid + os) * effectivePct).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 상태 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">상태</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>
                손해 상태 <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={form.loss_status}
                onChange={set('loss_status')}
                className={inputCls}
              >
                <option value="in_progress">진행중</option>
                <option value="paid">지급완료</option>
                <option value="closed">종결</option>
                <option value="denied">거절</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>검증 상태</label>
              <select
                value={form.validation_status}
                onChange={set('validation_status')}
                className={inputCls}
              >
                <option value="pending">미검증</option>
                <option value="valid">정상</option>
                <option value="warning">경고</option>
                <option value="error">오류</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_cash_loss"
                checked={form.is_cash_loss}
                onChange={(e) => setForm((f) => ({ ...f, is_cash_loss: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <label
                htmlFor="is_cash_loss"
                className="flex items-center gap-1 text-sm text-[var(--text-secondary)]"
              >
                Cash Loss
                <FieldHelp text="계약의 Cash Loss 한도를 초과하는 손해로 즉시 청구 가능합니다." />
              </label>
            </div>
          </div>
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
