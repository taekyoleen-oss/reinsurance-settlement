'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Equal,
  ArrowRightLeft,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import type { ContractWorkflowSummary } from '@/app/api/contracts/[id]/workflow/route'

interface Props {
  contractId: string
}

const STEP_DEFS = [
  { key: 'contract', label: '1. 계약 등록' },
  { key: 'shares', label: '2. 수재사 지분' },
  { key: 'schedules', label: '3. 정산 일정' },
  { key: 'bordereau', label: '4. 명세 입력' },
  { key: 'receipts', label: '5. 수령 확인' },
  { key: 'ac', label: '6. 정산서 발행' },
  { key: 'settlement', label: '7. 결제 송금' },
] as const

type StepKey = (typeof STEP_DEFS)[number]['key']

function fmt(n: number, currency = '') {
  if (!n) return '–'
  return `${currency ? currency + ' ' : ''}${n.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function matchColor(p: number): string {
  // 99~101% = 일치, 그 외는 차이
  if (p >= 99 && p <= 101) return 'text-emerald-600'
  if (p >= 80) return 'text-amber-600'
  if (p > 0) return 'text-red-500'
  return 'text-[var(--text-muted)]'
}

function matchBadge(p: number): {
  label: string
  variant: 'success' | 'warning' | 'destructive' | 'muted'
} {
  if (p === 0) return { label: '데이터 없음', variant: 'muted' }
  if (p >= 99 && p <= 101) return { label: '일치', variant: 'success' }
  if (p >= 80) return { label: '근접', variant: 'warning' }
  return { label: '불일치', variant: 'destructive' }
}

export function ContractWorkflowCard({ contractId }: Props) {
  const [data, setData] = useState<ContractWorkflowSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}/workflow`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j?.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '로드 실패')
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-xs text-[var(--text-muted)] animate-pulse">
          업무 흐름 집계 중...
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-xs text-red-600">
          {error ?? '집계 데이터를 불러올 수 없습니다.'}
        </CardContent>
      </Card>
    )
  }

  // 각 단계 상태 계산
  const stepStatus: Record<StepKey, 'done' | 'partial' | 'pending'> = {
    contract: 'done',
    shares: data.shares.count > 0 ? 'done' : 'pending',
    schedules: data.schedules.count > 0 ? 'done' : 'pending',
    bordereau: data.bordereau.count > 0 ? 'done' : 'pending',
    receipts:
      data.schedules.count === 0
        ? 'pending'
        : data.schedules.fully_received_count === data.schedules.count
          ? 'done'
          : data.receipts.count > 0
            ? 'partial'
            : 'pending',
    ac: data.account_currents.count > 0 ? 'done' : 'pending',
    settlement:
      data.settlements.count > 0
        ? data.settlements.by_status?.verified
          ? 'done'
          : 'partial'
        : 'pending',
  }

  const cur = data.contract.settlement_currency

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
            업무 흐름 진행 상황
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            계약 → 일정 → 명세 → 수령 → 정산서 → 결제 7단계 + 3-way 일치 확인
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          새로고침
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 7-단계 progress */}
        <div className="grid grid-cols-7 gap-1">
          {STEP_DEFS.map((step) => {
            const st = stepStatus[step.key]
            return (
              <div
                key={step.key}
                className={`rounded-md border p-2 text-center ${
                  st === 'done'
                    ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30'
                    : st === 'partial'
                      ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/30'
                      : 'border-border bg-[var(--surface-elevated)]'
                }`}
              >
                <div className="flex items-center justify-center mb-0.5">
                  {st === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : st === 'partial' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                </div>
                <p className="text-[10px] leading-tight font-medium">{step.label}</p>
              </div>
            )
          })}
        </div>

        {/* 3-way 일치 검증 (계약·명세·수령) */}
        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
            <Equal className="h-3.5 w-3.5 text-blue-500" />
            3-Way 일치 확인 — 계약 예상 ≈ 명세 합계 ≈ 수령 합계
          </p>
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">① 계약 예상 (스케줄 합계)</p>
              <p className="font-mono text-sm font-medium text-[var(--text-number)]">
                {fmt(data.three_way.schedule_expected, cur)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {data.schedules.count}개 기간
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">② 명세서 합계 (ceded)</p>
              <p className="font-mono text-sm font-medium text-[var(--text-number)]">
                {fmt(data.three_way.bordereau_ceded, cur)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {data.bordereau.count}건
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">③ 실제 수령 (입금)</p>
              <p className="font-mono text-sm font-medium text-emerald-600">
                {fmt(data.three_way.receipts_inbound, cur)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {data.receipts.count}건 (matched {data.receipts.matched_count})
              </p>
            </div>
          </div>
          {/* 일치율 표시 */}
          <div className="grid grid-cols-3 gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">②/① :</span>
              <Badge
                variant={matchBadge(data.three_way.schedule_vs_bordereau_pct).variant}
                className="text-[9px]"
              >
                {matchBadge(data.three_way.schedule_vs_bordereau_pct).label}
              </Badge>
              <span className={`font-mono ${matchColor(data.three_way.schedule_vs_bordereau_pct)}`}>
                {data.three_way.schedule_vs_bordereau_pct}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">③/① :</span>
              <Badge
                variant={matchBadge(data.three_way.schedule_vs_receipts_pct).variant}
                className="text-[9px]"
              >
                {matchBadge(data.three_way.schedule_vs_receipts_pct).label}
              </Badge>
              <span className={`font-mono ${matchColor(data.three_way.schedule_vs_receipts_pct)}`}>
                {data.three_way.schedule_vs_receipts_pct}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">③/② :</span>
              <Badge
                variant={matchBadge(data.three_way.bordereau_vs_receipts_pct).variant}
                className="text-[9px]"
              >
                {matchBadge(data.three_way.bordereau_vs_receipts_pct).label}
              </Badge>
              <span className={`font-mono ${matchColor(data.three_way.bordereau_vs_receipts_pct)}`}>
                {data.three_way.bordereau_vs_receipts_pct}%
              </span>
            </div>
          </div>
        </div>

        {/* 정산 흐름 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded border border-border p-2">
            <p className="text-[10px] text-[var(--text-muted)]">완납 / 전체</p>
            <p className="font-mono text-sm font-medium">
              {data.schedules.fully_received_count} / {data.schedules.count}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">정산 기간</p>
          </div>
          <div className="rounded border border-border p-2">
            <p className="text-[10px] text-[var(--text-muted)]">미수령 잔액</p>
            <p className="font-mono text-sm font-medium text-amber-600">
              {fmt(data.schedules.outstanding_total, cur)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              연체 {data.schedules.overdue_count} · 대기 {data.schedules.pending_count}
            </p>
          </div>
          <div className="rounded border border-border p-2">
            <p className="text-[10px] text-[var(--text-muted)]">정산서(AC) 상태</p>
            <p className="font-mono text-sm font-medium">{data.account_currents.count}건</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">
              {Object.entries(data.account_currents.by_status)
                .map(([k, v]) => `${k}:${v}`)
                .join(' · ') || '–'}
            </p>
          </div>
          <div className="rounded border border-border p-2">
            <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              누적 수수료 추정
            </p>
            <p className="font-mono text-sm font-medium text-blue-600">
              {fmt(data.estimates.brokerage_estimate, cur)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              ceding rate{' '}
              {data.contract.ceding_commission_rate
                ? Math.round(Number(data.contract.ceding_commission_rate) * 1000) / 10 + '%'
                : '–'}
            </p>
          </div>
        </div>

        {/* 결제 송금 라인 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-border p-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">송금 합계 (출금)</p>
              <p className="font-mono text-sm font-medium text-amber-600">
                {fmt(data.receipts.outbound_total, cur)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-muted)]">
                결제 송금 ({data.settlements.count})
              </p>
              <p className="font-mono text-sm font-medium">
                {Object.entries(data.settlements.by_status)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(' · ') || '–'}
              </p>
            </div>
          </div>
          <div className="rounded border border-border p-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">net 잔액 합계 (AC)</p>
              <p
                className={`font-mono text-sm font-medium ${
                  data.account_currents.total_net_balance >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {fmt(Math.abs(data.account_currents.total_net_balance), cur)}
                <span className="ml-1 text-[10px] text-[var(--text-muted)]">
                  ({data.account_currents.total_net_balance >= 0 ? '수재사 지급' : '출재사 환급'})
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-muted)]">실송금 합계</p>
              <p className="font-mono text-sm font-medium text-emerald-600">
                {fmt(data.settlements.remitted_total, cur)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
