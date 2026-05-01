'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CounterpartyRow, CurrencyRow } from '@/types'

const INITIAL_FORM = {
  counterparty_id: '',
  settlement_type: 'receipt' as 'receipt' | 'payment',
  amount: '',
  currency_code: 'KRW',
  settlement_date: new Date().toISOString().split('T')[0],
  reference_no: '',
  notes: '',
}

interface Props {
  counterparties: CounterpartyRow[]
  currencies: CurrencyRow[]
  onSuccess: () => void
  onCancel: () => void
}

export function SettlementForm({ counterparties, currencies, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)

  const set = <K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.counterparty_id || !form.amount) {
      toast.error('필수 항목을 입력하세요.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_type:  form.settlement_type,
          counterparty_id:  form.counterparty_id,
          amount:           parseFloat(form.amount),
          currency_code:    form.currency_code.trim().toUpperCase(),
          settlement_date:  form.settlement_date,
          reference_no:     form.reference_no.trim() || undefined,
          notes:            form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 422) throw new Error(data.error ?? '환율을 먼저 등록하세요.')
      if (!res.ok) throw new Error(data.error ?? '등록 실패')
      toast.success('결제가 등록되었습니다.')
      setForm(INITIAL_FORM)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">신규 결제 등록</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>거래상대방 *</Label>
            <Select value={form.counterparty_id} onValueChange={(v) => set('counterparty_id', v)}>
              <SelectTrigger><SelectValue placeholder="선택..." /></SelectTrigger>
              <SelectContent>
                {counterparties.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>{cp.company_name_ko}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>결제 구분</Label>
            <Select
              value={form.settlement_type}
              onValueChange={(v) => set('settlement_type', v as 'receipt' | 'payment')}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">수취(입금)</SelectItem>
                <SelectItem value="payment">지급(출금)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>금액 *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>통화</Label>
            {currencies.length > 0 ? (
              <Select value={form.currency_code} onValueChange={(v) => set('currency_code', v)}>
                <SelectTrigger className="w-28 font-mono"><SelectValue placeholder="통화" /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code} · {c.name_ko}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={form.currency_code}
                onChange={(e) => set('currency_code', e.target.value.toUpperCase())}
                className="w-24 font-mono"
                maxLength={3}
                placeholder="KRW"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>결제일</Label>
            <Input
              type="date"
              value={form.settlement_date}
              onChange={(e) => set('settlement_date', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>참조번호</Label>
            <Input
              value={form.reference_no}
              onChange={(e) => set('reference_no', e.target.value)}
              placeholder="REF-..."
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>비고</Label>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div className="col-span-2 flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? '등록 중...' : '등록'}</Button>
            <Button type="button" variant="ghost" onClick={onCancel}>취소</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
