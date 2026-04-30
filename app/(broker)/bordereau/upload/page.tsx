'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import Link from 'next/link'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import type { ContractWithCedantRow } from '@/types'

const PREMIUM_CSV_HEADERS = [
  'policy_no', 'period_yyyyqn', 'insured_name',
  'risk_period_from', 'risk_period_to',
  'sum_insured', 'original_premium', 'cession_pct', 'ceded_premium',
  'entry_type', 'currency',
]

const LOSS_CSV_HEADERS = [
  'claim_no', 'period_yyyyqn', 'loss_date', 'report_date',
  'paid_amount', 'os_reserve', 'cession_pct', 'recoverable_amount',
  'is_cash_loss', 'loss_status', 'currency',
]

function downloadSample(type: 'premium' | 'loss') {
  const headers = type === 'premium' ? PREMIUM_CSV_HEADERS : LOSS_CSV_HEADERS
  const sampleRow = type === 'premium'
    ? ['POL-2026-001', '2026Q1', '홍길동', '2026-01-01', '2026-12-31', '1000000000', '5000000', '30', '1500000', 'new', 'KRW']
    : ['CLM-2026-001', '2026Q1', '2026-03-15', '2026-03-20', '50000000', '30000000', '30', '24000000', 'false', 'in_progress', 'KRW']
  const csv = [headers.join(','), sampleRow.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}_bordereau_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BordereauUploadPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [contracts, setContracts] = useState<ContractWithCedantRow[]>([])
  const [filterCedantId, setFilterCedantId] = useState('')
  const [type, setType] = useState<'premium' | 'loss'>('premium')
  const [contractId, setContractId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<null | { success: boolean; message: string; details?: string[] }>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterCedantId) params.set('cedant_id', filterCedantId)
    const q = params.toString()
    fetch(q ? `/api/contracts?${q}` : '/api/contracts')
      .then((r) => r.json())
      .then((j) => setContracts(j.data ?? []))
  }, [filterCedantId])

  useEffect(() => {
    if (!contractId || contracts.length === 0) return
    if (!contracts.some((c) => c.id === contractId)) {
      setContractId('')
    }
  }, [contracts, contractId])

  const handleUpload = async () => {
    if (!file || !contractId) return
    setUploading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      fd.append('contract_id', contractId)
      const res = await fetch('/api/bordereau/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        const details = json.parseErrors?.map((e: any) => `행 ${e.row}: ${e.errors.join(', ')}`) ?? [json.error]
        setResult({ success: false, message: '업로드 실패', details })
      } else {
        const d = json.data
        const errDetails = d.validationErrors?.map((e: any) => `행 ${e.rowIndex + 2}: ${e.errors.join(', ')}`) ?? []
        setResult({
          success: true,
          message: `${d.inserted}건 저장 완료 (총 ${d.total}건)`,
          details: errDetails.length > 0 ? ['⚠️ 검증 오류가 있는 행은 오류 상태로 저장됨:', ...errDetails] : [],
        })
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/bordereau"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">CSV 일괄 업로드</h1>
          <p className="text-xs text-[var(--text-muted)]">2단계 — 보험료 또는 손해 명세를 CSV로 일괄 등록합니다</p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-5 space-y-5">
        {/* 명세 유형 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)]">명세 유형</label>
          <div className="flex gap-3">
            {(['premium', 'loss'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  type === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-[var(--text-secondary)] hover:border-primary/40'
                }`}
              >
                {t === 'premium' ? '보험료 명세' : '손해 명세'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <CedantFilterSelect
            value={filterCedantId}
            onChange={setFilterCedantId}
            triggerClassName="h-9 w-[min(100%,14rem)]"
          />
        </div>

        {/* 계약 선택 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">계약 *</label>
          <select
            value={contractId}
            onChange={e => setContractId(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">계약을 선택하세요</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.contract_no} — {c.cedant?.company_name_ko ?? c.description ?? c.contract_type}
              </option>
            ))}
          </select>
        </div>

        {/* 파일 선택 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--text-secondary)]">CSV 파일 *</label>
            <button
              type="button"
              onClick={() => downloadSample(type)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Download className="h-3 w-3" />
              샘플 CSV 다운로드
            </button>
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
              file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-surface-elevated'
            }`}
          >
            {file ? (
              <>
                <FileText className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">클릭하거나 CSV 파일을 여기에 끌어다 놓으세요</p>
                <p className="text-xs text-[var(--text-muted)]">CSV 형식만 지원 (UTF-8 인코딩 권장)</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>

        {/* 필수 컬럼 안내 */}
        <div className="rounded-md bg-surface-elevated p-3 text-xs text-[var(--text-muted)]">
          <p className="font-medium text-[var(--text-secondary)] mb-1">
            {type === 'premium' ? '보험료 명세 필수 컬럼' : '손해 명세 필수 컬럼'}
          </p>
          <p className="font-mono leading-relaxed">
            {(type === 'premium' ? PREMIUM_CSV_HEADERS : LOSS_CSV_HEADERS).join(', ')}
          </p>
        </div>

        {/* 결과 */}
        {result && (
          <div className={`rounded-md border p-3 ${
            result.success
              ? 'border-success/30 bg-success/10'
              : 'border-destructive/30 bg-destructive/10'
          }`}>
            <div className="flex items-center gap-2">
              {result.success
                ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                : <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              }
              <p className={`text-sm font-medium ${result.success ? 'text-success' : 'text-destructive'}`}>
                {result.message}
              </p>
            </div>
            {result.details && result.details.length > 0 && (
              <ul className="mt-2 space-y-0.5 pl-6 text-xs text-[var(--text-secondary)]">
                {result.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/bordereau">취소</Link>
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !contractId || uploading}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading ? '업로드 중...' : '업로드'}
          </Button>
        </div>
      </div>

      {result?.success && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => router.push('/bordereau')}>
            명세 목록으로 이동
          </Button>
        </div>
      )}
    </div>
  )
}
