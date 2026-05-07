'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RateItem {
  from_currency: string
  to_currency: string
  rate: number
  rate_date: string
  prev_rate?: number
}

const DISPLAY_PAIRS = [
  { from: 'USD', to: 'KRW' },
  { from: 'EUR', to: 'KRW' },
  { from: 'GBP', to: 'KRW' },
  { from: 'JPY', to: 'KRW' },
]

export function ExchangeRatePanel() {
  const [rates, setRates] = useState<RateItem[]>([])

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then((r) => r.json())
      .then((d) => {
        const all: RateItem[] = d.data ?? []
        const latestMap = new Map<string, RateItem[]>()
        for (const row of all) {
          const key = `${row.from_currency}/${row.to_currency}`
          if (!latestMap.has(key)) latestMap.set(key, [])
          latestMap.get(key)!.push(row)
        }
        const result: RateItem[] = []
        for (const { from, to } of DISPLAY_PAIRS) {
          const key = `${from}/${to}`
          const rows = latestMap.get(key)
          if (!rows || rows.length === 0) continue
          rows.sort((a, b) => b.rate_date.localeCompare(a.rate_date))
          result.push({ ...rows[0], prev_rate: rows[1]?.rate })
        }
        setRates(result)
      })
      .catch(() => {})
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
          최신 환율
        </CardTitle>
        <Link href="/exchange-rates" className="text-xs text-primary hover:underline">
          환율 관리 →
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DISPLAY_PAIRS.map(({ from, to }) => {
            const item = rates.find((r) => r.from_currency === from && r.to_currency === to)
            if (!item) {
              return (
                <div key={`${from}/${to}`} className="rounded-lg bg-surface-elevated p-3">
                  <div className="text-xs text-[var(--text-muted)] font-mono">
                    {from}/{to}
                  </div>
                  <div className="mt-1 text-sm text-[var(--text-muted)]">—</div>
                </div>
              )
            }
            const diff = item.prev_rate ? ((item.rate - item.prev_rate) / item.prev_rate) * 100 : 0
            const isUp = diff > 0.001
            const isDown = diff < -0.001
            return (
              <div key={`${from}/${to}`} className="rounded-lg bg-surface-elevated p-3">
                <div className="text-xs text-[var(--text-muted)] font-mono">
                  {from}/{to}
                </div>
                <div className="mt-1 text-base font-bold font-mono text-[var(--text-number)]">
                  {item.rate.toLocaleString('ko-KR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {isUp && <TrendingUp className="h-3 w-3 text-red-400" />}
                  {isDown && <TrendingDown className="h-3 w-3 text-blue-400" />}
                  {!isUp && !isDown && <Minus className="h-3 w-3 text-[var(--text-muted)]" />}
                  <span
                    className={`text-xs font-mono ${isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}
                  >
                    {diff === 0 ? '0.00%' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">{item.rate_date}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
