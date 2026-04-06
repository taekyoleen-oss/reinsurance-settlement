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
  })

  const [shares, setShares] = useState<ShareEntry[]>([
    { reinsurer_id: '', signed_line: '', effective_from: '', effective_to: '' },
  ])
  const [facultativeReinsurer, setFacultativeReinsurer] = useState('')

  useEffect(() => {
    fetch('/api/counterparties?company_type=cedant')
      .then((r) => r.json())
      .then((d) => setCedants(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})

    fetch('/api/counterparties?company_type=reinsurer')
      .then((r) => r.json())
      .then((d) => setReinsurers(Array.isArray(d) ? d : (d.data ?? [])))
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
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="default" onClick={() => router.back()}>취소</Button>
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : '계약 등록'}</Button>
        </div>
      </form>
    </div>
  )
}
