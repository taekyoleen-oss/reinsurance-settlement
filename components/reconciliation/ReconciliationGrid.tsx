'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReconciliationItemWithRelations, ReconciliationStatus } from '@/types'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const STATUS_STYLE: Record<ReconciliationStatus, { label: string; class: string }> = {
  matched: { label: '일치', class: 'text-success' },
  unmatched: { label: '불일치', class: 'text-warning-urgent' },
  disputed: { label: '이의', class: 'text-warning' },
}

interface ReconciliationGridProps {
  contractId?: string
  counterpartyId?: string
}

export function ReconciliationGrid({ contractId, counterpartyId }: ReconciliationGridProps) {
  const [items, setItems] = useState<ReconciliationItemWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (contractId) params.set('contract_id', contractId)
    if (counterpartyId) params.set('counterparty_id', counterpartyId)

    fetch(`/api/reconciliation?${params}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contractId, counterpartyId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>대사 현황</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-sm text-[var(--text-muted)]">대사 항목 없음</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기간</TableHead>
                <TableHead>거래상대방</TableHead>
                <TableHead>계약</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">브로커 금액</TableHead>
                <TableHead className="text-right">상대방 금액</TableHead>
                <TableHead className="text-right">차이</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const st = STATUS_STYLE[item.status]
                const diff = item.difference ?? (item.counterparty_claimed_amount != null
                  ? item.broker_amount - item.counterparty_claimed_amount
                  : null)
                return (
                  <TableRow
                    key={item.id}
                    className={
                      item.status === 'matched'
                        ? ''
                        : item.status === 'disputed'
                        ? 'bg-amber-900/10'
                        : 'bg-red-900/10'
                    }
                  >
                    <TableCell className="text-xs text-[var(--text-secondary)]">
                      {format(new Date(item.period_from), 'yyyy-MM-dd')} ~{' '}
                      {format(new Date(item.period_to), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.counterparty?.company_name_ko ?? item.counterparty_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.contract?.contract_no ?? item.contract_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)]">
                      {item.transaction_type}
                    </TableCell>
                    <TableCell className="font-mono text-right text-[var(--text-number)]">
                      {fmt(item.broker_amount)}
                    </TableCell>
                    <TableCell className="font-mono text-right text-[var(--text-number)]">
                      {item.counterparty_claimed_amount != null ? fmt(item.counterparty_claimed_amount) : '-'}
                    </TableCell>
                    <TableCell className={`font-mono text-right ${diff != null && diff !== 0 ? 'text-warning-urgent font-semibold' : 'text-[var(--text-muted)]'}`}>
                      {diff != null ? fmt(diff) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${st.class}`}>{st.label}</span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
