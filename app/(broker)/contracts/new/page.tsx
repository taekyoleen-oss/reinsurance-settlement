'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2 } from 'lucide-react'
import { SectionAccordion } from '@/components/shared/SectionAccordion'
import { FieldHelp } from '@/components/shared/FieldHelp'
import type { CounterpartyRow } from '@/types'

interface ShareEntry {
  reinsurer_id: string
  signed_line: string
  effective_from: string
  effective_to: string
}

export default function NewContractPage() {
  const router = useRouter()
  const [cedants, setCedants] = useState<CounterpartyRow[]>([])
  const [reinsurers, setReinsurers] = useState<CounterpartyRow[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    contract_no: '',
    contract_type: 'treaty',
    treaty_type: 'proportional',
    class_of_business: 'fire',
    cedant_id: '',
    inception_date: '',
    expiry_date: '',
    settlement_currency: 'KRW',
    settlement_period: 'quarterly',
    description: '',
    // v1.4 — 수수료 체계
    ceding_commission_rate: '',
    profit_commission_rate: '',
    brokerage_rate: '',
    // v1.4 — 적립금·이자
    premium_reserve_rate: '',
    loss_reserve_rate: '',
    interest_rate: '',
    reserve_release_timing: 'next_period',
    // v1.4 — 정산 조건
    payment_due_days: '',
    confirmation_due_days: '',
    offset_allowed: false,
    cash_loss_threshold: '',
    underwriting_basis: 'UY',
  })

  const [shares, setShares] = useState<ShareEntry[]>([
    { reinsurer_id: '', signed_line: '', effective_from: '', effective_to: '' },
  ])
  const [facultativeReinsurer, setFacultativeReinsurer] = useState('')

  useEffect(() => {
    fetch('/api/counterparties?company_type=cedant')
      .then((r) => r.json())
      .then((d) => setCedants(d.data ?? []))
      .catch(() => {})

    fetch('/api/counterparties?company_type=reinsurer')
      .then((r) => r.json())
      .then((d) => setReinsurers(d.data ?? []))
      .catch(() => {})
  }, [])

  const set = (key: string) => (value: string) => setForm((p) => ({ ...p, [key]: value }))

  const totalSignedLine = shares.reduce((sum, s) => sum + (parseFloat(s.signed_line) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.contract_type === 'treaty') {
      const total = shares.reduce((s, sh) => s + (parseFloat(sh.signed_line) || 0), 0)
      if (Math.abs(total - 100) > 0.01) {
        toast.error(`지분율 합계가 100%이어야 합니다. (현재: ${total.toFixed(2)}%)`)
        return
      }
    }

    setLoading(true)
    try {
      // 숫자 필드 변환 (빈 문자열은 null로)
      const pct = (v: string) => v !== '' ? parseFloat(v) / 100 : null
      const num = (v: string) => v !== '' ? parseFloat(v)       : null
      const int = (v: string) => v !== '' ? parseInt(v, 10)     : null

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ceding_commission_rate: pct(form.ceding_commission_rate),
          profit_commission_rate: pct(form.profit_commission_rate),
          brokerage_rate:         pct(form.brokerage_rate),
          premium_reserve_rate:   pct(form.premium_reserve_rate),
          loss_reserve_rate:      pct(form.loss_reserve_rate),
          interest_rate:          num(form.interest_rate),
          reserve_release_timing: form.reserve_release_timing || null,
          payment_due_days:       int(form.payment_due_days),
          confirmation_due_days:  int(form.confirmation_due_days),
          cash_loss_threshold:    num(form.cash_loss_threshold),
          underwriting_basis:     form.underwriting_basis || null,
          shares:
            form.contract_type === 'treaty'
              ? shares.map((s) => ({
                  ...s,
                  signed_line: parseFloat(s.signed_line) / 100,
                }))
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

      toast.success('계약이 등록되었습니다.')
      router.push('/contracts')
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">계약 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>계약번호 *</Label>
              <Input value={form.contract_no} onChange={(e) => set('contract_no')(e.target.value)} placeholder="예: TR-2026-001" required />
            </div>
            <div className="space-y-1.5">
              <Label>계약 유형 *</Label>
              <Select value={form.contract_type} onValueChange={set('contract_type')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="treaty">Treaty</SelectItem>
                  <SelectItem value="facultative">Facultative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.contract_type === 'treaty' && (
              <div className="space-y-1.5">
                <Label>Treaty 유형</Label>
                <Select value={form.treaty_type} onValueChange={set('treaty_type')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proportional">Proportional</SelectItem>
                    <SelectItem value="non_proportional">Non-Proportional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>사업 종류 (COB)</Label>
              <Select value={form.class_of_business} onValueChange={set('class_of_business')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fire">화재</SelectItem>
                  <SelectItem value="marine">해상</SelectItem>
                  <SelectItem value="liability">배상책임</SelectItem>
                  <SelectItem value="engineering">공사</SelectItem>
                  <SelectItem value="misc">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>출재사 *</Label>
              <Select value={form.cedant_id} onValueChange={set('cedant_id')}>
                <SelectTrigger><SelectValue placeholder="출재사 선택" /></SelectTrigger>
                <SelectContent>
                  {cedants.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name_ko}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>개시일 *</Label>
              <Input type="date" value={form.inception_date} onChange={(e) => set('inception_date')(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>만기일</Label>
              <Input type="date" value={form.expiry_date} onChange={(e) => set('expiry_date')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>정산 통화 *</Label>
              <Input value={form.settlement_currency} onChange={(e) => set('settlement_currency')(e.target.value)} placeholder="KRW" />
            </div>
            <div className="space-y-1.5">
              <Label>정산 주기 *</Label>
              <Select value={form.settlement_period} onValueChange={set('settlement_period')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">분기</SelectItem>
                  <SelectItem value="semiannual">반기</SelectItem>
                  <SelectItem value="annual">연간</SelectItem>
                  <SelectItem value="adhoc">수시</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>설명</Label>
              <Input value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="계약 설명" />
            </div>
          </CardContent>
        </Card>

        {form.contract_type === 'treaty' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                지분율 (합계:{' '}
                <span className={Math.abs(totalSignedLine - 100) < 0.01 ? 'text-success' : 'text-warning-urgent'}>
                  {totalSignedLine.toFixed(2)}%
                </span>
                )
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => setShares((p) => [...p, { reinsurer_id: '', signed_line: '', effective_from: '', effective_to: '' }])}
              >
                <Plus className="h-3 w-3 mr-1" /> 추가
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {shares.map((share, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-3 items-end">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">수재사</Label>
                    <Select
                      value={share.reinsurer_id}
                      onValueChange={(v) => {
                        const next = [...shares]
                        next[idx].reinsurer_id = v
                        setShares(next)
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="수재사 선택" /></SelectTrigger>
                      <SelectContent>
                        {reinsurers.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.company_name_ko}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">지분율 (%)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={share.signed_line}
                      onChange={(e) => {
                        const next = [...shares]
                        next[idx].signed_line = e.target.value
                        setShares(next)
                      }}
                      className="font-mono text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">유효기간 시작</Label>
                    <Input
                      type="date"
                      value={share.effective_from}
                      onChange={(e) => {
                        const next = [...shares]
                        next[idx].effective_from = e.target.value
                        setShares(next)
                      }}
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">유효기간 종료</Label>
                      <Input
                        type="date"
                        value={share.effective_to}
                        onChange={(e) => {
                          const next = [...shares]
                          next[idx].effective_to = e.target.value
                          setShares(next)
                        }}
                      />
                    </div>
                    {shares.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-warning-urgent"
                        onClick={() => setShares((p) => p.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {form.contract_type === 'facultative' && (
          <Card>
            <CardHeader><CardTitle>수재사 지정</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-w-xs">
                <Label>수재사 *</Label>
                <Select value={facultativeReinsurer} onValueChange={setFacultativeReinsurer}>
                  <SelectTrigger><SelectValue placeholder="수재사 선택" /></SelectTrigger>
                  <SelectContent>
                    {reinsurers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.company_name_ko}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 수수료 체계 */}
        <SectionAccordion
          title="수수료 체계 (Commission)"
          description="출재수수료·이익수수료·중개수수료율 설정"
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                출재수수료율(%)
                <FieldHelp text="수재사가 출재사에 지급하는 수수료율. 예: 25 = 25%. 출재보험료에 이 비율을 곱해 산출합니다." />
              </Label>
              <Input type="number" min="0" max="100" step="0.01" placeholder="25.00" value={form.ceding_commission_rate} onChange={e => set('ceding_commission_rate')(e.target.value)} className="font-mono text-right" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                이익수수료율(%)
                <FieldHelp text="이익이 발생했을 때 출재사가 받는 수수료율. 이익 = 출재보험료 - 출재보험금 - 출재수수료." />
              </Label>
              <Input type="number" min="0" max="100" step="0.01" placeholder="0.00" value={form.profit_commission_rate} onChange={e => set('profit_commission_rate')(e.target.value)} className="font-mono text-right" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                중개수수료율(%)
                <FieldHelp text="중개사(Broker)에게 지급하는 수수료율. 중개사 없이 직접 거래 시 0으로 두세요." />
              </Label>
              <Input type="number" min="0" max="100" step="0.01" placeholder="0.00" value={form.brokerage_rate} onChange={e => set('brokerage_rate')(e.target.value)} className="font-mono text-right" />
            </div>
          </div>
        </SectionAccordion>

        {/* 적립금·이자 */}
        <SectionAccordion
          title="적립금 및 이자 (Reserve Deposit)"
          description="보험료·손해 적립금율, 이자율, 환급 시점"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                보험료 적립금율(%)
                <FieldHelp text="수재사가 유보하는 보험료의 비율. 통상 35~40%. 해당 기간 동안 수재사가 보험료의 일부를 담보로 보유합니다." />
              </Label>
              <Input type="number" min="0" max="100" step="0.01" placeholder="35.00" value={form.premium_reserve_rate} onChange={e => set('premium_reserve_rate')(e.target.value)} className="font-mono text-right" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                손해 적립금율(%)
                <FieldHelp text="미결손해의 몇 %를 적립금으로 유보할지. 통상 100%(미결손해 전액)." />
              </Label>
              <Input type="number" min="0" max="100" step="0.01" placeholder="100.00" value={form.loss_reserve_rate} onChange={e => set('loss_reserve_rate')(e.target.value)} className="font-mono text-right" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                이자율(% 연환산)
                <FieldHelp text="적립금에 대한 연 이자율. 수재사가 유보한 적립금에 이 이율로 이자를 계산해 출재사에 지급합니다." />
              </Label>
              <Input type="number" min="0" step="0.001" placeholder="3.000" value={form.interest_rate} onChange={e => set('interest_rate')(e.target.value)} className="font-mono text-right" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                적립금 환급 시점
                <FieldHelp text="next_period: 익기(다음 정산기간) 환급. period_after_next: 익익기(그 다음 정산기간) 환급." />
              </Label>
              <Select value={form.reserve_release_timing} onValueChange={v => set('reserve_release_timing')(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_period">익기 (Next Period)</SelectItem>
                  <SelectItem value="period_after_next">익익기 (Period After Next)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionAccordion>

        {/* 정산 조건 */}
        <SectionAccordion
          title="정산 조건 (Settlement Terms)"
          description="지급기한·확인기한·상계허용·Cash Loss 한도"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                지급기한 (SOA 후 N일)
                <FieldHelp text="SOA 발행 후 출재사가 수재사에게 지급해야 하는 기한(일수). 통상 15일." />
              </Label>
              <Input type="number" min="0" step="1" placeholder="15" value={form.payment_due_days} onChange={e => set('payment_due_days')(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                확인기한 (수신 후 N일)
                <FieldHelp text="수재사가 SOA를 수신한 후 확인(Acknowledge)해야 하는 기한(일수). 통상 14일." />
              </Label>
              <Input type="number" min="0" step="1" placeholder="14" value={form.confirmation_due_days} onChange={e => set('confirmation_due_days')(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                Cash Loss 한도
                <FieldHelp text="이 금액을 초과하는 단일 손해는 정기 SOA 외 즉시 청구(Cash Call)할 수 있습니다." />
              </Label>
              <Input type="number" min="0" step="1000" placeholder="예: 100000000" value={form.cash_loss_threshold} onChange={e => set('cash_loss_threshold')(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                인수 기준
                <FieldHelp text="UY: 인수년도(Underwriting Year) 기준. Clean-Cut: 회계년도 기준으로 포트폴리오 이전이 필요합니다." />
              </Label>
              <Select value={form.underwriting_basis} onValueChange={v => set('underwriting_basis')(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UY">인수년도 (UY)</SelectItem>
                  <SelectItem value="clean_cut">회계년도 (Clean-Cut)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2">
              <input
                type="checkbox"
                id="offset_allowed"
                checked={form.offset_allowed}
                onChange={e => setForm(p => ({ ...p, offset_allowed: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <label htmlFor="offset_allowed" className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                상계 허용 (Offset Clause)
                <FieldHelp text="동일 거래상대방과의 출재/수재 SOA를 서로 상계할 수 있는지 여부. 계약 조항에 Offset Clause가 있는 경우에만 체크합니다." />
              </label>
            </div>
          </div>
        </SectionAccordion>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="default" onClick={() => router.back()}>취소</Button>
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : '계약 등록'}</Button>
        </div>
      </form>
    </div>
  )
}
