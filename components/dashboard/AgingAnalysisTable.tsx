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
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export function AgingAnalysisTable() {
  const [rows, setRows] = useState<AgingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/outstanding?type=aging')
      .then((r) => r.json())
      .then((d) => {
        const raw = Array.isArray(d) ? d : (d.aging ?? d.data ?? [])
        setRows(raw)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging 분석</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm animate-pulse">로딩 중...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm">데이터 없음</div>
        ) : (
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
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-[var(--text-primary)]">{row.counterparty}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{row.currency}</TableCell>
                  <TableCell className="font-mono text-right text-[var(--text-number)]">{fmt(row.current)}</TableCell>
                  <TableCell className="font-mono text-right text-[var(--text-number)]">{fmt(row.days_1_30)}</TableCell>
                  <TableCell className="font-mono text-right text-warning">{fmt(row.days_31_60)}</TableCell>
                  <TableCell className="font-mono text-right text-warning">{fmt(row.days_61_90)}</TableCell>
                  <TableCell className="font-mono text-right text-warning-urgent">{fmt(row.days_over_90)}</TableCell>
                  <TableCell className="font-mono text-right font-semibold text-[var(--text-number)]">{fmt(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
