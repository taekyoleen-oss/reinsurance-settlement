'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContractBasicFields } from '@/components/contracts/ContractBasicFields'
import { ContractSharesCard, type ShareEntry } from '@/components/contracts/ContractSharesCard'
import {
  ContractCommissionSection,
  ContractReserveSection,
  ContractSettlementTermsSection,
} from '@/components/contracts/ContractTermsSections'
import { AttachmentSection, uploadStagedFiles } from '@/components/shared/AttachmentSection'
import { useCounterpartiesByType } from '@/hooks/use-reference-data'

const INITIAL_FORM = {
  contract_no: '',
  contract_type: 'treaty',
  treaty_type: 'proportional',
  class_of_business: 'fire',
  cedant_id: '',
  inception_date: '',
  expiry_date: '',
  settlement_currency: 'KRW',
  settlement_period: 'quarterly',
  premium_settlement_period: 'quarterly',
  loss_settlement_period: 'adhoc',
  commission_settlement_period: 'quarterly',
  description: '',
  ceding_commission_rate: '',
  ceding_commission_amount: '',
  profit_commission_rate: '',
  profit_commission_amount: '',
  brokerage_rate: '',
  brokerage_amount: '',
  premium_reserve_rate: '',
  loss_reserve_rate: '',
  interest_rate: '',
  reserve_release_timing: 'next_period',
  payment_due_days: '',
  confirmation_due_days: '',
  offset_allowed: false,
  cash_loss_threshold: '',
  underwriting_basis: 'UY',
}

export default function NewContractPage() {
  const router = useRouter()
  const cedants = useCounterpartiesByType('cedant')
  const reinsurers = useCounterpartiesByType('reinsurer')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [shares, setShares] = useState<ShareEntry[]>([
    { reinsurer_id: '', signed_line: '', effective_from: '', effective_to: '' },
  ])
  const [facultativeReinsurer, setFacultativeReinsurer] = useState('')
  const [stagedFiles, setStagedFiles] = useState<File[]>([])

  const set = (key: string) => (value: string) => setForm((p) => ({ ...p, [key]: value }))
  const totalSignedLine = shares.reduce((sum, s) => sum + (parseFloat(s.signed_line) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.contract_type === 'treaty') {
      if (Math.abs(totalSignedLine - 100) > 0.01) {
        toast.error(`지분율 합계가 100%이어야 합니다. (현재: ${totalSignedLine.toFixed(2)}%)`)
        return
      }
    }

    setLoading(true)
    try {
      const pct = (v: string) => (v !== '' ? parseFloat(v) / 100 : null)
      const num = (v: string) => (v !== '' ? parseFloat(v) : null)
      const int = (v: string) => (v !== '' ? parseInt(v, 10) : null)

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ceding_commission_rate: pct(form.ceding_commission_rate),
          ceding_commission_amount: num(form.ceding_commission_amount),
          profit_commission_rate: pct(form.profit_commission_rate),
          profit_commission_amount: num(form.profit_commission_amount),
          brokerage_rate: pct(form.brokerage_rate),
          brokerage_amount: num(form.brokerage_amount),
          premium_reserve_rate: pct(form.premium_reserve_rate),
          loss_reserve_rate: pct(form.loss_reserve_rate),
          interest_rate: num(form.interest_rate),
          reserve_release_timing: form.reserve_release_timing || null,
          payment_due_days: int(form.payment_due_days),
          confirmation_due_days: int(form.confirmation_due_days),
          cash_loss_threshold: num(form.cash_loss_threshold),
          underwriting_basis: form.underwriting_basis || null,
          shares:
            form.contract_type === 'treaty'
              ? shares.map((s) => ({ ...s, signed_line: parseFloat(s.signed_line) / 100 }))
              : [
                  {
                    reinsurer_id: facultativeReinsurer,
                    signed_line: 1,
                    effective_from: form.inception_date,
                    effective_to: form.expiry_date,
                  },
                ],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? '저장 실패')
        return
      }

      const created = await res.json()
      toast.success('계약이 등록되었습니다.')
      if (stagedFiles.length > 0 && created?.data?.id) {
        try {
          await uploadStagedFiles('contract', created.data.id, stagedFiles)
        } catch (err: unknown) {
          toast.error(`첨부 업로드 실패: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      router.push('/contracts')
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">계약 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ContractBasicFields form={form} cedants={cedants} set={set} />

        {form.contract_type === 'treaty' && (
          <ContractSharesCard
            shares={shares}
            reinsurers={reinsurers}
            totalSignedLine={totalSignedLine}
            onChange={setShares}
          />
        )}

        {form.contract_type === 'facultative' && (
          <Card>
            <CardHeader>
              <CardTitle>수재사 지정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-w-xs">
                <Select value={facultativeReinsurer} onValueChange={setFacultativeReinsurer}>
                  <SelectTrigger>
                    <SelectValue placeholder="수재사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {reinsurers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.company_name_ko}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 항목별 정산주기 */}
        <Card>
          <CardHeader>
            <CardTitle>항목별 정산주기</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'premium_settlement_period', label: '보험료 주기' },
              { key: 'loss_settlement_period', label: '보험금 주기' },
              { key: 'commission_settlement_period', label: '수수료 주기' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm text-[var(--text-secondary)]">{label}</label>
                <Select
                  value={(form as unknown as Record<string, string>)[key]}
                  onValueChange={set(key)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">분기</SelectItem>
                    <SelectItem value="semiannual">반기</SelectItem>
                    <SelectItem value="annual">연간</SelectItem>
                    <SelectItem value="adhoc">수시</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>

        <ContractCommissionSection form={form} set={set} />
        <ContractReserveSection form={form} set={set} />
        <ContractSettlementTermsSection
          form={form}
          set={set}
          onOffsetChange={(v) => setForm((p) => ({ ...p, offset_allowed: v }))}
        />

        <AttachmentSection entityType="contract" onStagedFilesChange={setStagedFiles} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="default" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '저장 중...' : '계약 등록'}
          </Button>
        </div>
      </form>
    </div>
  )
}
