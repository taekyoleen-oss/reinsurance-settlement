'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OutstandingKPICard } from '@/components/dashboard/OutstandingKPICard'
import { AgingAnalysisTable } from '@/components/dashboard/AgingAnalysisTable'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'

interface OutstandingItem {
  counterparty_id: string
  counterparty_name: string
  contract_id: string
  contract_no: string
  currency_code: string
  direction: string
  amount: number
  due_date?: string
  aging_bucket: string
}

export default function OutstandingPage() {
  const [items, setItems] = useState<OutstandingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCurrency, setFilterCurrency] = useState('all')
  const [filterDirection, setFilterDirection] = useState('all')

  useEffect(() => {
    fetch('/api/outstanding')
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter((item) => {
    if (filterCurrency !== 'all' && item.currency_code !== filterCurrency) return false
    if (filterDirection !== 'all' && item.direction !== filterDirection) return false
    return true
  })

  const currencies = Array.from(new Set(items.map((i) => i.currency_code)))

  const AGING_COLORS: Record<string, string> = {
    current: 'text-[var(--success)]',
    '30': 'text-[var(--warning)]',
    '60': 'text-orange-500',
    '90': 'text-red-500',
    '90+': 'text-[var(--warning-urgent)]',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">미청산 잔액</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">거래상대방·계약·통화별 미청산 현황 및 Aging</p>
      </div>

      <OutstandingKPICard />
      <AgingAnalysisTable />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">미청산 상세 내역</h2>
        </div>

        <div className="flex gap-3">
          <Select value={filterCurrency} onValueChange={setFilterCurrency}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 통화</SelectItem>
              {currencies.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDirection} onValueChange={setFilterDirection}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 방향</SelectItem>
              <SelectItem value="receivable">수취</SelectItem>
              <SelectItem value="payable">지급</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>거래상대방</TableHead>
                <TableHead>계약번호</TableHead>
                <TableHead>통화</TableHead>
                <TableHead>방향</TableHead>
                <TableHead className="text-right">미청산 금액</TableHead>
                <TableHead>만기일</TableHead>
                <TableHead>Aging</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{item.counterparty_name ?? item.counterparty_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs font-mono">{item.contract_no ?? item.contract_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs font-mono">{item.currency_code}</TableCell>
                  <TableCell>
                    <Badge variant={item.direction === 'receivable' ? 'success' : 'warning'}>
                      {item.direction === 'receivable' ? '수취' : '지급'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                    {item.amount?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">
                    {item.due_date ?? '-'}
                  </TableCell>
                  <TableCell className={`text-xs font-medium ${AGING_COLORS[item.aging_bucket] ?? ''}`}>
                    {item.aging_bucket === 'current' ? '정상' : `${item.aging_bucket}일 초과`}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[var(--text-muted)] py-8">
                    미청산 잔액 없음
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
