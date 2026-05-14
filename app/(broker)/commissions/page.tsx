'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Coins, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react'
import type { CommissionsResponse } from '@/app/api/commissions/route'

function fmt(n: number) {
  if (!n) return '–'
  return n.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function CommissionsPage() {
  const [data, setData] = useState<CommissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/commissions')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j?.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '로드 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
            <Coins className="h-5 w-5 text-amber-500" />
            수수료 대시보드
          </h1>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            계약별 누적 수령(inbound) 기준 ceding commission · brokerage 추정 + AC 의 실제
            commission 항목 합계
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 통화별 합계 KPI */}
      {data && data.totals_by_currency.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.totals_by_currency.map((t) => (
            <Card key={t.currency}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">{t.currency}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)]">누적 수령</p>
                    <p className="font-mono text-sm text-[var(--text-number)]">
                      {fmt(t.total_inbound)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)]">AC commission 실집계</p>
                    <p className="font-mono text-sm text-blue-600">{fmt(t.ac_commission_total)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)]">ceding commission 추정</p>
                    <p className="font-mono text-sm text-emerald-600">
                      {fmt(t.estimated_ceding_commission)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)]">brokerage 추정</p>
                    <p className="font-mono text-sm text-amber-600">{fmt(t.estimated_brokerage)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">계약별 수수료 상세</CardTitle>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            추정값 = 누적 inbound × rate · AC 실집계 = AC items 의 commission 항목 합계
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="m-4 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
              {error}
            </div>
          ) : loading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] animate-pulse">
              불러오는 중...
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              계약이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>계약번호</TableHead>
                  <TableHead>출재사</TableHead>
                  <TableHead className="w-16 text-center">통화</TableHead>
                  <TableHead className="text-right">누적 수령</TableHead>
                  <TableHead className="text-right">ceding %</TableHead>
                  <TableHead className="text-right">ceding 추정</TableHead>
                  <TableHead className="text-right">brokerage %</TableHead>
                  <TableHead className="text-right">brokerage 추정</TableHead>
                  <TableHead className="text-right">AC 실집계</TableHead>
                  <TableHead className="w-16 text-center">상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((r) => (
                  <TableRow key={r.contract_id}>
                    <TableCell className="font-mono text-xs">{r.contract_no}</TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)]">
                      {r.cedant_name ?? '–'}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {r.settlement_currency}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-[var(--text-number)]">
                      {fmt(r.total_inbound)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-[var(--text-muted)]">
                      {r.ceding_commission_rate
                        ? `${(Number(r.ceding_commission_rate) * 100).toFixed(2)}%`
                        : '–'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600">
                      {fmt(r.estimated_ceding_commission)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-[var(--text-muted)]">
                      {r.brokerage_rate ? `${(Number(r.brokerage_rate) * 100).toFixed(2)}%` : '–'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-600">
                      {fmt(r.estimated_brokerage)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-blue-600">
                      {fmt(r.ac_commission_total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/contracts/${r.contract_id}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
