'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import type { PremiumAlertItem } from '@/app/api/premium-alerts/route'

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: 'default' | 'success' | 'warning' | 'muted' | 'destructive'
    icon: React.ReactNode
  }
> = {
  pending: { label: '수령 대기', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  overdue: {
    label: '연체',
    variant: 'destructive',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  partially_received: {
    label: '일부 수령',
    variant: 'warning',
    icon: <Clock className="h-3 w-3" />,
  },
  overdue_partial: {
    label: '연체·일부수령',
    variant: 'destructive',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  fully_received: {
    label: '수령 완료',
    variant: 'success',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  no_schedule: {
    label: '금액 미설정',
    variant: 'muted',
    icon: <CircleDashed className="h-3 w-3" />,
  },
}

type Filter = 'all' | 'overdue' | 'pending' | 'partial'

export default function PremiumSchedulePage() {
  const [items, setItems] = useState<PremiumAlertItem[]>([])
  const [counts, setCounts] = useState({ overdue_count: 0, pending_count: 0, partial_count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/premium-alerts')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j?.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      const json = await res.json()
      setItems(json.data?.schedules ?? [])
      setCounts({
        overdue_count: json.data?.overdue_count ?? 0,
        pending_count: json.data?.pending_count ?? 0,
        partial_count: json.data?.partial_count ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '로드 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'overdue') return items.filter((i) => i.receipt_status.startsWith('overdue'))
    if (filter === 'pending') return items.filter((i) => i.receipt_status === 'pending')
    if (filter === 'partial') return items.filter((i) => i.receipt_status === 'partially_received')
    return items
  }, [items, filter])

  const totalOutstanding = filtered.reduce((sum, i) => sum + (i.outstanding_amount || 0), 0)
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">보험료 정산 일정</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            전체 계약의 미수령·연체 보험료 일정을 한 곳에서 확인하고, 계약 상세에서 수령 확인을
            입력하세요.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-[var(--text-muted)]">연체</span>
            </div>
            <p className="text-2xl font-mono font-bold text-red-500 mt-1">{counts.overdue_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-[var(--text-muted)]">일부 수령</span>
            </div>
            <p className="text-2xl font-mono font-bold text-amber-500 mt-1">
              {counts.partial_count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-[var(--text-muted)]">대기</span>
            </div>
            <p className="text-2xl font-mono font-bold text-blue-500 mt-1">
              {counts.pending_count}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-end justify-between pb-3">
          <div>
            <CardTitle className="text-base">미수령 보험료 목록</CardTitle>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              표시: {filtered.length}건 · 합계 미수령액 {totalOutstanding.toLocaleString()}
            </p>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="overdue">연체만</SelectItem>
              <SelectItem value="partial">일부 수령</SelectItem>
              <SelectItem value="pending">대기만</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="m-4 rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              <p className="font-medium">데이터를 불러오지 못했습니다.</p>
              <p className="mt-0.5 text-[11px]">{error}</p>
              <p className="mt-0.5 text-[10px] opacity-80">
                Supabase의 step8 마이그레이션 적용 여부와 broker 권한을 확인하세요.
              </p>
            </div>
          ) : loading ? (
            <div className="py-10 text-center text-sm text-[var(--text-muted)] animate-pulse">
              불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--text-muted)]">
              해당 조건의 일정이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>계약번호</TableHead>
                  <TableHead>출재사</TableHead>
                  <TableHead className="w-24">기간</TableHead>
                  <TableHead className="w-28">납입 기한</TableHead>
                  <TableHead className="text-right">예상 보험료</TableHead>
                  <TableHead className="text-right">수령액</TableHead>
                  <TableHead className="text-right">잔액</TableHead>
                  <TableHead className="w-32 text-center">상태</TableHead>
                  <TableHead className="w-20 text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const cfg = STATUS_CONFIG[s.receipt_status] ?? STATUS_CONFIG.pending
                  const isOverdue =
                    s.due_date != null && s.due_date < today && s.outstanding_amount > 0
                  return (
                    <TableRow
                      key={s.schedule_id}
                      className={isOverdue ? 'bg-red-50/40 dark:bg-red-950/20' : undefined}
                    >
                      <TableCell className="font-mono text-xs">{s.contract_no}</TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)]">
                        {s.cedant_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.period_label}</TableCell>
                      <TableCell
                        className={`font-mono text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-[var(--text-secondary)]'}`}
                      >
                        {s.due_date ?? '–'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-[var(--text-number)]">
                        {s.currency_code ?? ''} {(s.expected_amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600">
                        {s.net_received > 0 ? s.net_received.toLocaleString() : '–'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600">
                        {s.outstanding_amount > 0 ? s.outstanding_amount.toLocaleString() : '–'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cfg.variant} className="gap-1 text-[10px]">
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/contracts/${s.contract_id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]">
                            <ExternalLink className="h-3 w-3 mr-0.5" />
                            상세
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
