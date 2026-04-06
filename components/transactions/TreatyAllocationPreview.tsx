'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AllocationItem {
  reinsurer_id: string
  reinsurer_name?: string
  signed_line: number
  allocated_amount: number
  currency_code: string
}

interface TreatyAllocationPreviewProps {
  items: AllocationItem[]
  totalAmount: number
  currency: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function TreatyAllocationPreview({ items, totalAmount, currency }: TreatyAllocationPreviewProps) {
  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">자동 배분 미리보기</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>수재사</TableHead>
              <TableHead className="text-right">지분율 (%)</TableHead>
              <TableHead className="text-right">배분 금액 ({currency})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.reinsurer_id}>
                <TableCell className="text-sm">
                  {item.reinsurer_name ?? item.reinsurer_id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-mono text-right text-[var(--text-number)]">
                  {(item.signed_line * 100).toFixed(4)}%
                </TableCell>
                <TableCell className="font-mono text-right text-[var(--text-number)]">
                  {fmt(item.allocated_amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-between px-3 py-2 border-t border-border bg-surface-elevated">
          <span className="text-xs text-[var(--text-muted)]">합계</span>
          <span className="font-mono text-sm font-semibold text-[var(--text-number)]">
            {fmt(totalAmount)} {currency}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
