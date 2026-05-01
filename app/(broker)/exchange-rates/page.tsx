'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, RefreshCw } from 'lucide-react'
import type { ExchangeRateRow } from '@/types'

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRateRow[]>([])
  const [currencies, setCurrencies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [filterCurrency, setFilterCurrency] = useState('all')

  const [form, setForm] = useState({
    from_currency: 'USD',
    to_currency: 'KRW',
    rate_date: new Date().toISOString().split('T')[0],
    rate: '',
    rate_type: 'daily',
    source: '',
  })

  const fetchRates = () => {
    setLoading(true)
    const params = filterCurrency !== 'all' ? `?fromCurrency=${filterCurrency}` : ''
    fetch(`/api/exchange-rates${params}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.data ?? []
        setRates(list)
        const curs = Array.from(new Set(list.map((r: ExchangeRateRow) => r.from_currency))) as string[]
        setCurrencies(curs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRates() }, [filterCurrency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.rate) { toast.error('환율을 입력하세요.'); return }
    setFormLoading(true)
    try {
      const res = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rate: parseFloat(form.rate) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '등록 실패')
      toast.success('환율이 등록되었습니다.')
      setShowForm(false)
      fetchRates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">환율 관리</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">일자별 환율 등록 및 이력 관리</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchRates}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />
            환율 등록
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">환율 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>기준 통화</Label>
                <Input value={form.from_currency} onChange={(e) => setForm((f) => ({ ...f, from_currency: e.target.value.toUpperCase() }))} className="font-mono w-24" maxLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label>대상 통화</Label>
                <Input value={form.to_currency} onChange={(e) => setForm((f) => ({ ...f, to_currency: e.target.value.toUpperCase() }))} className="font-mono w-24" maxLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label>환율 날짜 *</Label>
                <Input type="date" value={form.rate_date} onChange={(e) => setForm((f) => ({ ...f, rate_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>환율 *</Label>
                <Input type="number" step="0.0001" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} placeholder="1350.0000" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Select value={form.rate_type} onValueChange={(v) => setForm((f) => ({ ...f, rate_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">일별</SelectItem>
                    <SelectItem value="monthly">월별</SelectItem>
                    <SelectItem value="spot">현물</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>출처</Label>
                <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="BOK, 기준..." />
              </div>
              <div className="col-span-3 flex gap-2">
                <Button type="submit" disabled={formLoading}>{formLoading ? '등록 중...' : '등록'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Select value={filterCurrency} onValueChange={setFilterCurrency}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {currencies.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>통화쌍</TableHead>
              <TableHead className="text-right">환율</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>출처</TableHead>
              <TableHead>등록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.rate_date}</TableCell>
                <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                  {r.from_currency}/{r.to_currency}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                  {r.rate?.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </TableCell>
                <TableCell className="text-xs">{r.rate_type}</TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">{r.source ?? '-'}</TableCell>
                <TableCell className="text-xs text-[var(--text-muted)]">
                  {r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : '-'}
                </TableCell>
              </TableRow>
            ))}
            {rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[var(--text-muted)] py-8">
                  환율 데이터 없음
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
