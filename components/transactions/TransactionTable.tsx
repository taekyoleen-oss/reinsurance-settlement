'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Lock, GitBranch } from 'lucide-react'
import type { TransactionWithRelations } from '@/types'

interface TransactionTableProps {
  transactions: TransactionWithRelations[]
  onDelete?: (id: string) => void
}

const TX_TYPE_LABELS: Record<string, string> = {
  premium: '보험료',
  return_premium: '환급보험료',
  loss: '보험금',
  commission: '수수료',
  deposit_premium: '예치보험료',
  interest: '이자',
  adjustment: '조정',
}

function fmt(n: number, _currency: string) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function TransactionTable({ transactions, onDelete }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm text-[var(--text-muted)]">
        거래 내역이 없습니다.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>거래번호</TableHead>
          <TableHead>날짜</TableHead>
          <TableHead>계약</TableHead>
          <TableHead>거래상대방</TableHead>
          <TableHead>유형</TableHead>
          <TableHead className="text-right">금액</TableHead>
          <TableHead>통화</TableHead>
          <TableHead>상태</TableHead>
          <TableHead className="text-right">액션</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id} className={tx.is_allocation_parent ? 'opacity-60' : ''}>
            <TableCell>
              <div className="flex items-center gap-1.5">
                {tx.is_allocation_parent && <GitBranch className="h-3 w-3 text-accent shrink-0" />}
                {tx.is_locked && <Lock className="h-3 w-3 text-[var(--text-muted)] shrink-0" />}
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  {tx.transaction_no}
                </span>
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-[var(--text-secondary)]">
              {format(new Date(tx.transaction_date), 'yyyy-MM-dd')}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs">
              {tx.contract?.contract_no ?? tx.contract_id.slice(0, 8)}
            </TableCell>
            <TableCell className="whitespace-nowrap min-w-[120px] text-xs">
              {tx.counterparty?.company_name_ko ?? tx.counterparty_id.slice(0, 8)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs">
              {TX_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}
            </TableCell>
            <TableCell className="font-mono text-right text-[var(--text-number)]">
              {tx.direction === 'payable' && <span className="text-warning-urgent mr-0.5">-</span>}
              {fmt(tx.amount_original, tx.currency_code)}
            </TableCell>
            <TableCell className="text-xs text-[var(--text-secondary)]">
              {tx.currency_code}
            </TableCell>
            <TableCell>
              <StatusBadge status={tx.status} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Link href={`/transactions/${tx.id}`}>
                  <Button size="sm" variant="ghost">
                    상세
                  </Button>
                </Link>
                {!tx.is_locked && onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-warning-urgent hover:text-warning-urgent"
                    onClick={() => onDelete(tx.id)}
                  >
                    삭제
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
