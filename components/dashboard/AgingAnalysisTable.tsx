'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TableExportButton } from '@/components/shared/TableExportButton'
import { X } from 'lucide-react'

interface AgingRow {
  counterparty: string
  currency: string
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  days_over_90: number
  total: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function sumTotalsByCurrency(rows: AgingRow[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const row of rows) {
    m.set(row.currency, (m.get(row.currency) ?? 0) + row.total)
  }
  return m
}

export interface OutstandingScopeProps {
  counterpartyId?: string
  contractId?: string
  cedantId?: string
  filterCurrency?: string
  onClearFilter?: () => void
}

export function AgingAnalysisTable({
  counterpartyId,
  contractId,
  cedantId,
  filterCurrency,
  onClearFilter,
}: OutstandingScopeProps = {}) {
  const [rows, setRows] = useState<AgingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setRows([])

    const p = new URLSearchParams()
    p.set('type', 'aging')
    if (counterpartyId) p.set('counterpartyId', counterpartyId)
    if (contractId) p.set('contractId', contractId)
    if (cedantId) p.set('cedant_id', cedantId)

    fetch(`/api/outstanding?${p}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        if (cancelled) return
        const raw = Array.isArray(d) ? d : (d.aging ?? d.data ?? [])
        setRows(raw)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [counterpartyId, contractId, cedantId])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle>Aging 분석</CardTitle>
          {filterCurrency && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-xs text-[var(--text-muted)]"
              onClick={onClearFilter}
            >
              {filterCurrency} 필터
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <TableExportButton
          headers={[
            '거래상대방',
            '통화',
            'Current',
            '1-30일',
            '31-60일',
            '61-90일',
            '90일+',
            '합계',
          ]}
          rows={rows.map((row) => [
            row.counterparty,
            row.currency,
            row.current,
            row.days_1_30,
            row.days_31_60,
            row.days_61_90,
            row.days_over_90,
            row.total,
          ])}
          filename="Aging분석"
        />
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm animate-pulse">
            로딩 중...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm">데이터 없음</div>
        ) : (
          <div>
            <p className="px-4 pb-2 text-xs text-[var(--text-muted)]">
              상단 KPI 수취채권·지급채무는 거래 방향별 총액이고, 표의 합계는 거래상대방별
              순잔액(수취−지급)입니다. 통화별 소계와 KPI &quot;순잔액&quot;이 일치합니다.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>거래상대방</TableHead>
                  <TableHead>통화</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">1-30일</TableHead>
                  <TableHead className="text-right">31-60일</TableHead>
                  <TableHead className="text-right">61-90일</TableHead>
                  <TableHead className="text-right text-warning-urgent">90일+</TableHead>
                  <TableHead className="text-right">합계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const isFiltering = !!filterCurrency
                  const isHighlighted = isFiltering && row.currency === filterCurrency
                  const isDimmed = isFiltering && row.currency !== filterCurrency
                  return (
                    <TableRow
                      key={idx}
                      className={`transition-opacity ${isHighlighted ? 'bg-accent/10' : ''} ${isDimmed ? 'opacity-30' : ''}`}
                    >
                      <TableCell className="whitespace-nowrap min-w-[120px] text-[var(--text-primary)]">
                        {row.counterparty}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[var(--text-secondary)]">
                        {row.currency}
                      </TableCell>
                      <TableCell className="font-mono text-right text-[var(--text-number)]">
                        {fmt(row.current)}
                      </TableCell>
                      <TableCell className="font-mono text-right text-[var(--text-number)]">
                        {fmt(row.days_1_30)}
                      </TableCell>
                      <TableCell className="font-mono text-right text-warning">
                        {fmt(row.days_31_60)}
                      </TableCell>
                      <TableCell className="font-mono text-right text-warning">
                        {fmt(row.days_61_90)}
                      </TableCell>
                      <TableCell className="font-mono text-right text-warning-urgent">
                        {fmt(row.days_over_90)}
                      </TableCell>
                      <TableCell className="font-mono text-right font-semibold text-[var(--text-number)]">
                        {fmt(row.total)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {[...sumTotalsByCurrency(rows).entries()]
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([currency, sumNet]) => (
                    <TableRow
                      key={`subtotal-${currency}`}
                      className="bg-surface-elevated/80 border-t-2 border-border"
                    >
                      <TableCell
                        colSpan={7}
                        className="font-medium text-[var(--text-secondary)] whitespace-nowrap"
                      >
                        소계 · 순잔액 ({currency})
                      </TableCell>
                      <TableCell className="font-mono text-right font-semibold text-primary tabular-nums">
                        {fmt(sumNet)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
