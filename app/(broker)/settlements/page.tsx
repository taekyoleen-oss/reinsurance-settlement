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
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SettlementMatchPanel } from '@/components/settlements/SettlementMatchPanel'
import { Plus, ChevronsRight } from 'lucide-react'
import type { SettlementRow, CounterpartyRow, CurrencyRow } from '@/types'

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementRow[]>([])
  const [counterparties, setCounterparties] = useState<CounterpartyRow[]>([])
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterCounterpartyId, setFilterCounterpartyId] = useState('all')
  const [filterMatchStatus, setFilterMatchStatus] = useState('all')
  const [filterCurrencyCode, setFilterCurrencyCode] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMatchPanel, setShowMatchPanel] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const [form, setForm] = useState({
    counterparty_id: '',
    /** DB: receipt(수취) | payment(지급) */
    settlement_type: 'receipt' as 'receipt' | 'payment',
    amount: '',
    currency_code: 'KRW',
    settlement_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    notes: '',
  })

  const fetchSettlements = () => {
    setLoading(true)
    setLoadError('')
    const params = new URLSearchParams()
    if (filterCounterpartyId !== 'all') params.set('counterpartyId', filterCounterpartyId)
    if (filterMatchStatus !== 'all') params.set('matchStatus', filterMatchStatus)
    if (filterCurrencyCode.trim()) params.set('currencyCode', filterCurrencyCode.trim().toUpperCase())
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    const qs = params.toString()
    fetch(qs ? `/api/settlements?${qs}` : '/api/settlements')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? '결제 목록을 불러오지 못했습니다.')
        setSettlements(Array.isArray(d) ? d : (d.data ?? []))
      })
      .catch((e: Error) => {
        setSettlements([])
        setLoadError(e.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/counterparties')
      .then((r) => r.json())
      .then((d) => setCounterparties(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})

    fetch('/api/currencies')
      .then((r) => r.json())
      .then((d) => setCurrencies(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => setCurrencies([]))
  }, [])

  useEffect(() => {
    fetchSettlements()
  }, [filterCounterpartyId, filterMatchStatus, filterCurrencyCode, dateFrom, dateTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.counterparty_id || !form.amount) {
      toast.error('필수 항목을 입력하세요.')
      return
    }
    setFormLoading(true)
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_type: form.settlement_type,
          counterparty_id: form.counterparty_id,
          amount: parseFloat(form.amount),
          currency_code: form.currency_code.trim().toUpperCase(),
          settlement_date: form.settlement_date,
          reference_no: form.reference_no.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 422) {
        throw new Error(data.error ?? '환율을 먼저 등록하세요.')
      }
      if (!res.ok) throw new Error(data.error ?? '등록 실패')
      toast.success('결제가 등록되었습니다.')
      setShowForm(false)
      setForm({
        counterparty_id: '',
        settlement_type: 'receipt',
        amount: '',
        currency_code: 'KRW',
        settlement_date: new Date().toISOString().split('T')[0],
        reference_no: '',
        notes: '',
      })
      fetchSettlements()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    receipt: '수취(입금)',
    payment: '지급(출금)',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">결제 관리</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">수취/지급 결제 등록 및 정산서 매칭</p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" onClick={() => setShowMatchPanel(!showMatchPanel)}>
            매칭 패널
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />
            결제 등록
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded border border-warning-urgent/40 bg-warning-urgent/10 px-4 py-3 text-sm text-warning-urgent">
          {loadError}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">회사(거래상대방)</Label>
          <Select value={filterCounterpartyId} onValueChange={setFilterCounterpartyId}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 회사</SelectItem>
              {counterparties.map((cp) => (
                <SelectItem key={cp.id} value={cp.id}>
                  {cp.company_name_ko}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">매칭상태</Label>
          <Select value={filterMatchStatus} onValueChange={setFilterMatchStatus}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="unmatched">미매칭</SelectItem>
              <SelectItem value="partial">부분매칭</SelectItem>
              <SelectItem value="fully_matched">완전매칭</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">통화</Label>
          <Input
            value={filterCurrencyCode}
            onChange={(e) => setFilterCurrencyCode(e.target.value)}
            className="h-9 w-24 font-mono"
            placeholder="KRW"
            maxLength={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">시작일</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">종료일</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-40" />
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">신규 결제 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>거래상대방 *</Label>
                <Select value={form.counterparty_id} onValueChange={(v) => setForm((f) => ({ ...f, counterparty_id: v }))}>
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
                  onValueChange={(v) => setForm((f) => ({ ...f, settlement_type: v as 'receipt' | 'payment' }))}
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
                <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>통화</Label>
                {currencies.length > 0 ? (
                  <Select
                    value={form.currency_code}
                    onValueChange={(v) => setForm((f) => ({ ...f, currency_code: v }))}
                  >
                    <SelectTrigger className="w-28 font-mono">
                      <SelectValue placeholder="통화" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} · {c.name_ko}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.currency_code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency_code: e.target.value.toUpperCase() }))
                    }
                    className="w-24 font-mono"
                    maxLength={3}
                    placeholder="KRW"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>결제일</Label>
                <Input type="date" value={form.settlement_date} onChange={(e) => setForm((f) => ({ ...f, settlement_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>참조번호</Label>
                <Input value={form.reference_no} onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))} placeholder="REF-..." />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>비고</Label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit" disabled={formLoading}>{formLoading ? '등록 중...' : '등록'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showMatchPanel && (
        <SettlementMatchPanel />
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>결제번호</TableHead>
              <TableHead>결제일</TableHead>
              <TableHead>회사</TableHead>
              <TableHead>유형</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>통화</TableHead>
              <TableHead>잔액</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>참조번호</TableHead>
              <TableHead className="text-right">매칭</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-xs font-mono text-[var(--text-secondary)]">
                  {s.settlement_no}
                </TableCell>
                <TableCell className="text-xs font-mono text-[var(--text-secondary)]">
                  {format(new Date(s.settlement_date), 'yyyy-MM-dd')}
                </TableCell>
                <TableCell className="text-xs">
                  {counterparties.find((cp) => cp.id === s.counterparty_id)?.company_name_ko ?? s.counterparty_id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-xs">{TYPE_LABELS[s.settlement_type] ?? s.settlement_type}</TableCell>
                <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                  {s.amount?.toLocaleString()}
                </TableCell>
                <TableCell className="text-xs font-mono">{s.currency_code}</TableCell>
                <TableCell className="text-right font-mono text-xs text-[var(--text-secondary)]">
                  {((s.amount ?? 0) - (s.matched_amount ?? 0)).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={s.match_status === 'fully_matched' ? 'success' : s.match_status === 'partial' ? 'warning' : 'default'}>
                    {s.match_status === 'fully_matched' ? '매칭됨' : s.match_status === 'partial' ? '부분매칭' : '미매칭'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">{s.bank_reference ?? '-'}</TableCell>
                <TableCell className="text-right">
                  {s.match_status !== 'fully_matched' && (
                    <Button size="sm" variant="ghost" onClick={() => setShowMatchPanel(true)}>
                      <ChevronsRight className="h-4 w-4" />
                      매칭
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {settlements.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-[var(--text-muted)] py-8">
                  등록된 결제가 없습니다. 시드 SQL을 적용했거나 아래에서 결제를 등록해 보세요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
