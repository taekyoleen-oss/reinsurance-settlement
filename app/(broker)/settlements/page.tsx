'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SettlementMatchPanel } from '@/components/settlements/SettlementMatchPanel'
import { SettlementForm } from '@/components/settlements/SettlementForm'
import { Plus, ChevronsRight } from 'lucide-react'
import { useCounterparties, useCurrencies } from '@/hooks/use-reference-data'
import type { SettlementRow } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  receipt: '수취(입금)',
  payment: '지급(출금)',
}

export default function SettlementsPage() {
  const counterparties = useCounterparties()
  const currencies = useCurrencies()

  const [settlements, setSettlements] = useState<SettlementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterCounterpartyId, setFilterCounterpartyId] = useState('all')
  const [filterMatchStatus, setFilterMatchStatus] = useState('all')
  const [filterCurrencyCode, setFilterCurrencyCode] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMatchPanel, setShowMatchPanel] = useState(false)

  const fetchSettlements = () => {
    setLoading(true)
    setLoadError('')
    const params = new URLSearchParams()
    if (filterCounterpartyId !== 'all') params.set('counterpartyId', filterCounterpartyId)
    if (filterMatchStatus !== 'all') params.set('matchStatus', filterMatchStatus)
    if (filterCurrencyCode.trim()) params.set('currencyCode', filterCurrencyCode.trim().toUpperCase())
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo)   params.set('dateTo', dateTo)
    fetch(`/api/settlements?${params}`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? '결제 목록을 불러오지 못했습니다.')
        setSettlements(d.data ?? [])
      })
      .catch((e: Error) => {
        setSettlements([])
        setLoadError(e.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSettlements()
  }, [filterCounterpartyId, filterMatchStatus, filterCurrencyCode, dateFrom, dateTo])

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
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 회사</SelectItem>
              {counterparties.map((cp) => (
                <SelectItem key={cp.id} value={cp.id}>{cp.company_name_ko}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">매칭상태</Label>
          <Select value={filterMatchStatus} onValueChange={setFilterMatchStatus}>
            <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
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
        <SettlementForm
          counterparties={counterparties}
          currencies={currencies}
          onSuccess={() => { setShowForm(false); fetchSettlements() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showMatchPanel && <SettlementMatchPanel />}

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
                  <Badge variant={
                    s.match_status === 'fully_matched' ? 'success' :
                    s.match_status === 'partial' ? 'warning' : 'default'
                  }>
                    {s.match_status === 'fully_matched' ? '매칭됨' :
                     s.match_status === 'partial' ? '부분매칭' : '미매칭'}
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
                  등록된 결제가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
