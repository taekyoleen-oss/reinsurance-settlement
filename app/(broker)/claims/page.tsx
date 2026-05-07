'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, RefreshCw } from 'lucide-react'

interface Claim {
  id: string
  claim_no: string
  contract_id: string
  loss_event_date: string
  total_claimed_amount: number
  currency_code: string
  collected_amount: number
  paid_amount: number
  status: string
  description?: string
  contract?: { contract_no?: string; cedant?: { name: string } }
}

const STATUS_LABELS: Record<string, string> = {
  open: '열림',
  collecting: '수금중',
  ready_to_pay: '지급준비',
  paying: '지급중',
  closed: '완료',
  disputed: '이의',
  cancelled: '취소',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  collecting: 'bg-yellow-500/20 text-yellow-400',
  ready_to_pay: 'bg-purple-500/20 text-purple-400',
  paying: 'bg-orange-500/20 text-orange-400',
  closed: 'bg-green-500/20 text-green-400',
  disputed: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
}

function ProgressBar({
  collected,
  paid,
  total,
}: {
  collected: number
  paid: number
  total: number
}) {
  const collectedPct = total > 0 ? Math.min(100, (collected / total) * 100) : 0
  const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  return (
    <div className="space-y-0.5">
      <div className="flex h-2 w-32 overflow-hidden rounded bg-surface-elevated">
        <div
          className="bg-blue-400 transition-all"
          style={{ width: `${collectedPct}%` }}
          title={`수금 ${collectedPct.toFixed(0)}%`}
        />
      </div>
      <div className="flex h-2 w-32 overflow-hidden rounded bg-surface-elevated">
        <div
          className="bg-green-400 transition-all"
          style={{ width: `${paidPct}%` }}
          title={`지급 ${paidPct.toFixed(0)}%`}
        />
      </div>
    </div>
  )
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/claims')
      .then((r) => r.json())
      .then((d) => setClaims(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">청구 관리</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            보험금 청구 헤더 및 거래 연결 관리
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link href="/claims/new">
              <Plus className="h-4 w-4 mr-1" />
              청구 등록
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
          로딩 중...
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>청구번호</TableHead>
              <TableHead>계약</TableHead>
              <TableHead>사고일</TableHead>
              <TableHead className="text-right">청구금액</TableHead>
              <TableHead>수금/지급 진행</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-surface-elevated">
                <TableCell>
                  <Link
                    href={`/claims/${c.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {c.claim_no}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">
                  {c.contract?.contract_no ?? c.contract_id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-mono text-xs">{c.loss_event_date}</TableCell>
                <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                  {c.total_claimed_amount.toLocaleString('ko-KR')} {c.currency_code}
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <ProgressBar
                      collected={c.collected_amount}
                      paid={c.paid_amount}
                      total={c.total_claimed_amount}
                    />
                    <div className="text-[10px] text-[var(--text-muted)]">
                      수금 {c.collected_amount.toLocaleString()} / 지급{' '}
                      {c.paid_amount.toLocaleString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}
                  >
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {claims.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[var(--text-muted)] py-8">
                  등록된 청구가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
