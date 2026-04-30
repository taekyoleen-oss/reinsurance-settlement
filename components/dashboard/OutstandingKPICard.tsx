'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface OutstandingSummary {
  currency: string
  receivable: number
  payable: number
  net: number
}

/** 미청산 KPI 조회 범위 (거래상대방·출재사·특약) */
export interface OutstandingScopeProps {
  counterpartyId?: string
  contractId?: string
  cedantId?: string
}

export function OutstandingKPICard({
  counterpartyId,
  contractId,
  cedantId,
}: OutstandingScopeProps = {}) {
  const [data, setData] = useState<OutstandingSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setData([])

    const p = new URLSearchParams()
    if (counterpartyId) p.set('counterpartyId', counterpartyId)
    if (contractId) p.set('contractId', contractId)
    if (cedantId) p.set('cedant_id', cedantId)
    const qs = p.toString()
    const url = qs ? `/api/outstanding?${qs}` : '/api/outstanding'

    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        if (cancelled) return
        const raw: OutstandingSummary[] = Array.isArray(d) ? d : (d.data ?? [])
        setData(raw)
      })
      .catch(() => {
        if (!cancelled) setData([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [counterpartyId, contractId, cedantId])

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 h-24 animate-pulse bg-surface-elevated rounded" />
          </Card>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-[var(--text-muted)] text-sm">
          미청산 잔액 데이터 없음
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.currency} className="grid grid-cols-3 gap-4">
          <Card accentColor="var(--success)">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-[var(--text-muted)]">수취채권 ({item.currency})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success shrink-0" />
                <span className="font-mono text-lg font-semibold text-success tabular-nums">
                  {fmt(item.receivable, item.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card accentColor="var(--warning-urgent)">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-[var(--text-muted)]">지급채무 ({item.currency})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning-urgent shrink-0" />
                <span className="font-mono text-lg font-semibold text-warning-urgent tabular-nums">
                  {fmt(item.payable, item.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card accentColor={item.net >= 0 ? 'var(--primary)' : 'var(--warning)'}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-[var(--text-muted)]">순잔액 ({item.currency})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
                <span
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    item.net >= 0 ? 'text-primary' : 'text-warning'
                  }`}
                >
                  {fmt(item.net, item.currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
