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
import type { SettlementRow, CounterpartyRow } from '@/types'

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementRow[]>([])
  const [counterparties, setCounterparties] = useState<CounterpartyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMatchPanel, setShowMatchPanel] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const [form, setForm] = useState({
    counterparty_id: '',
    settlement_type: 'wire_transfer',
    amount: '',
    currency_code: 'KRW',
    settlement_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    notes: '',
  })

  const fetchSettlements = () => {
    setLoading(true)
    fetch('/api/settlements')
      .then((r) => r.json())
      .then((d) => setSettlements(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSettlements()
    fetch('/api/counterparties')
      .then((r) => r.json())
      .then((d) => setCounterparties(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
  }, [])

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
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '등록 실패')
      toast.success('결제가 등록되었습니다.')
      setShowForm(false)
      setForm({ counterparty_id: '', settlement_type: 'wire_transfer', amount: '', currency_code: 'KRW', settlement_date: new Date().toISOString().split('T')[0], reference_no: '', notes: '' })
      fetchSettlements()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    wire_transfer: '전신환',
    check: '수표',
    offset: '상계',
    other: '기타',
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
                <Label>결제 유형</Label>
                <Select value={form.settlement_type} onValueChange={(v) => setForm((f) => ({ ...f, settlement_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wire_transfer">전신환</SelectItem>
                    <SelectItem value="check">수표</SelectItem>
                    <SelectItem value="offset">상계</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>금액 *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>통화</Label>
                <Input value={form.currency_code} onChange={(e) => setForm((f) => ({ ...f, currency_code: e.target.value }))} className="w-24 font-mono" />
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
              <TableHead>결제일</TableHead>
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
                  {format(new Date(s.settlement_date), 'yyyy-MM-dd')}
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
                <TableCell colSpan={8} className="text-center text-[var(--text-muted)] py-8">결제 없음</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
