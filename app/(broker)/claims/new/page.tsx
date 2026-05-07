'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Contract {
  id: string
  contract_no: string
}
interface Currency {
  code: string
  name_ko: string
}

export default function NewClaimPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    contract_id: '',
    loss_event_date: new Date().toISOString().split('T')[0],
    reported_date: '',
    loss_reference: '',
    total_claimed_amount: '',
    currency_code: 'USD',
    description: '',
  })

  useEffect(() => {
    fetch('/api/contracts')
      .then((r) => r.json())
      .then((d) => setContracts(d.data ?? []))
      .catch(() => {})
    fetch('/api/currencies')
      .then((r) => r.json())
      .then((d) => setCurrencies(d.data ?? []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contract_id) {
      toast.error('계약을 선택하세요.')
      return
    }
    if (!form.total_claimed_amount) {
      toast.error('청구금액을 입력하세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          total_claimed_amount: parseFloat(form.total_claimed_amount),
          reported_date: form.reported_date || null,
          loss_reference: form.loss_reference || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '등록 실패')
      toast.success('청구가 등록되었습니다.')
      router.push(`/claims/${data.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">청구 등록</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">보험금 청구 헤더를 등록합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">청구 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>계약 *</Label>
              <Select
                value={form.contract_id}
                onValueChange={(v) => setForm((f) => ({ ...f, contract_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="계약 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>사고일 *</Label>
              <Input
                type="date"
                value={form.loss_event_date}
                onChange={(e) => setForm((f) => ({ ...f, loss_event_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>보고일</Label>
              <Input
                type="date"
                value={form.reported_date}
                onChange={(e) => setForm((f) => ({ ...f, reported_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>청구금액 *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.total_claimed_amount}
                onChange={(e) => setForm((f) => ({ ...f, total_claimed_amount: e.target.value }))}
                placeholder="0.00"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label>통화 *</Label>
              <Select
                value={form.currency_code}
                onValueChange={(v) => setForm((f) => ({ ...f, currency_code: v }))}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="font-mono">
                      {c.code} — {c.name_ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>외부 참조번호</Label>
              <Input
                value={form.loss_reference}
                onChange={(e) => setForm((f) => ({ ...f, loss_reference: e.target.value }))}
                placeholder="외부 청구 참조번호"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>설명</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="사고 경위 및 내용..."
              />
            </div>

            <div className="col-span-2 flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? '등록 중...' : '등록'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
