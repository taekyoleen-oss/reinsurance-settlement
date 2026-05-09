'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle2, Clock, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PremiumAlertItem } from '@/app/api/premium-alerts/route'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'destructive' | 'warning' | 'default'; Icon: React.ElementType }
> = {
  overdue: { label: '연체', variant: 'destructive', Icon: AlertTriangle },
  overdue_partial: { label: '부분연체', variant: 'destructive', Icon: AlertTriangle },
  partially_received: { label: '부분수령', variant: 'warning', Icon: TrendingDown },
  pending: { label: '대기', variant: 'default', Icon: Clock },
}

export function PremiumAlertCard() {
  const { data, isLoading } = useSWR('/api/premium-alerts', fetcher, {
    revalidateOnFocus: false,
  })

  const summary = data?.data as
    | {
        overdue_count: number
        pending_count: number
        partial_count: number
        schedules: PremiumAlertItem[]
      }
    | undefined

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">보험료 수령 현황</h3>
        <Link href="/contracts" className="text-xs text-primary hover:underline">
          계약 목록 →
        </Link>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-[var(--text-muted)] animate-pulse">
          로딩 중…
        </div>
      ) : !summary || summary.schedules.length === 0 ? (
        <div className="flex items-center gap-2 py-3 text-sm text-[var(--text-muted)]">
          <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
          미결 보험료 없음
        </div>
      ) : (
        <>
          {/* 요약 카운터 */}
          <div className="flex gap-3">
            {summary.overdue_count > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-medium text-destructive">
                  연체 {summary.overdue_count}건
                </span>
              </div>
            )}
            {summary.partial_count > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-warning/10 px-2.5 py-1">
                <TrendingDown className="h-3.5 w-3.5 text-warning-urgent" />
                <span className="text-xs font-medium text-warning-urgent">
                  부분수령 {summary.partial_count}건
                </span>
              </div>
            )}
            {summary.pending_count > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
                <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  대기 {summary.pending_count}건
                </span>
              </div>
            )}
          </div>

          {/* 스케줄 목록 (최대 5건) */}
          <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {summary.schedules.slice(0, 5).map((item) => {
              const cfg = STATUS_CONFIG[item.receipt_status] ?? {
                label: item.receipt_status,
                variant: 'default' as const,
                Icon: Clock,
              }
              const isOverdue = item.receipt_status.startsWith('overdue')
              return (
                <div
                  key={item.schedule_id}
                  className={`flex items-center justify-between px-3 py-2 text-xs ${isOverdue ? 'bg-destructive/5' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <cfg.Icon
                      className={`h-3.5 w-3.5 shrink-0 ${isOverdue ? 'text-destructive' : 'text-[var(--text-muted)]'}`}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/contracts/${item.contract_id}`}
                        className="font-mono font-medium hover:underline text-[var(--text-primary)] truncate block"
                      >
                        {item.contract_no}
                      </Link>
                      <span className="text-[var(--text-muted)] truncate block">
                        {item.cedant_name} · {item.period_label}
                        {item.due_date && (
                          <>
                            {' '}
                            · 납기{' '}
                            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                              {format(new Date(item.due_date), 'MM/dd')}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                      {cfg.label}
                    </Badge>
                    {item.outstanding_amount > 0 && (
                      <span className="font-mono text-[var(--text-secondary)]">
                        {item.currency_code}{' '}
                        {item.outstanding_amount.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {summary.schedules.length > 5 && (
            <p className="text-xs text-[var(--text-muted)] text-center">
              외 {summary.schedules.length - 5}건 더 있음 —{' '}
              <Link href="/contracts" className="text-primary hover:underline">
                전체 보기
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}
