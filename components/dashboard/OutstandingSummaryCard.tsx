'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OutstandingItem {
  currency: string
  direction: 'receivable' | 'payable'
  total_amount: number
}

interface ExchangeRateRow {
  from_currency: string
  to_currency: string
  rate: number
  rate_date: string
}

function toKRW(amount: number, currency: string, rates: Map<string, number>): number {
  if (currency === 'KRW') return amount
  const rate = rates.get(currency)
  if (!rate) return 0
  return amount * rate
}

export function OutstandingSummaryCard() {
  const [receivableKRW, setReceivableKRW] = useState<number | null>(null)
  const [payableKRW, setPayableKRW] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/outstanding')
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
      fetch('/api/exchange-rates')
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ]).then(([od, rd]) => {
      const items: OutstandingItem[] = od.data ?? []
      const allRates: ExchangeRateRow[] = rd.data ?? []

      const rateMap = new Map<string, number>()
      const sorted = [...allRates].sort((a, b) => b.rate_date.localeCompare(a.rate_date))
      for (const r of sorted) {
        if (!rateMap.has(r.from_currency) && r.to_currency === 'KRW') {
          rateMap.set(r.from_currency, r.rate)
        }
      }

      let rec = 0
      let pay = 0
      for (const item of items) {
        const krw = toKRW(Math.abs(item.total_amount), item.currency, rateMap)
        if (item.direction === 'receivable') rec += krw
        else pay += krw
      }
      setReceivableKRW(rec)
      setPayableKRW(pay)
    })
  }, [])

  const fmt = (n: number | null) =>
    n === null ? '—' : `₩ ${n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`

  const net = receivableKRW !== null && payableKRW !== null ? receivableKRW - payableKRW : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
          미청산 KRW 환산
        </CardTitle>
        <Link href="/outstanding" className="text-xs text-primary hover:underline">
          전체 보기 →
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-[var(--text-muted)]">수취(Receivable)</div>
            <div className="mt-1 text-base font-bold font-mono text-[var(--text-number)]">
              {fmt(receivableKRW)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">지급(Payable)</div>
            <div className="mt-1 text-base font-bold font-mono text-[var(--text-number)]">
              {fmt(payableKRW)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Net</div>
            <div
              className={`mt-1 text-base font-bold font-mono ${net !== null && net >= 0 ? 'text-success' : 'text-warning-urgent'}`}
            >
              {fmt(net)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
