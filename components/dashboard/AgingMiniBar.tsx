'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AgingRow {
  aging_bucket: string
  total_amount: number
}

const BUCKET_LABELS: Record<string, string> = {
  current: 'Current',
  '1-30': '1-30일',
  '31-60': '31-60일',
  '61-90': '61-90일',
  '90+': '90일+',
}

const BUCKET_COLORS: Record<string, string> = {
  current: 'bg-success',
  '1-30': 'bg-blue-400',
  '31-60': 'bg-yellow-400',
  '61-90': 'bg-orange-400',
  '90+': 'bg-red-500',
}

const BUCKET_ORDER = ['current', '1-30', '31-60', '61-90', '90+']

export function AgingMiniBar() {
  const router = useRouter()
  const [buckets, setBuckets] = useState<AgingRow[]>([])

  useEffect(() => {
    fetch('/api/outstanding')
      .then((r) => r.json())
      .then((d) => {
        const items: { aging_bucket?: string; total_amount: number }[] = d.data ?? []
        const agg = new Map<string, number>()
        for (const item of items) {
          const b = item.aging_bucket ?? 'current'
          agg.set(b, (agg.get(b) ?? 0) + Math.abs(item.total_amount))
        }
        const rows: AgingRow[] = BUCKET_ORDER.filter((b) => agg.has(b)).map((b) => ({
          aging_bucket: b,
          total_amount: agg.get(b)!,
        }))
        setBuckets(rows)
      })
      .catch(() => {})
  }, [])

  const total = buckets.reduce((s, b) => s + b.total_amount, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
          Aging 분포
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-xs text-[var(--text-muted)] py-2">데이터 없음</div>
        ) : (
          <>
            <div className="flex h-5 w-full overflow-hidden rounded">
              {buckets.map((b) => {
                const pct = total > 0 ? (b.total_amount / total) * 100 : 0
                return (
                  <button
                    key={b.aging_bucket}
                    className={`${BUCKET_COLORS[b.aging_bucket] ?? 'bg-gray-400'} hover:opacity-80 transition-opacity cursor-pointer`}
                    style={{ width: `${pct}%` }}
                    title={`${BUCKET_LABELS[b.aging_bucket] ?? b.aging_bucket}: ${b.total_amount.toLocaleString()}`}
                    onClick={() => router.push(`/outstanding?aging=${b.aging_bucket}`)}
                  />
                )
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {buckets.map((b) => (
                <button
                  key={b.aging_bucket}
                  className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
                  onClick={() => router.push(`/outstanding?aging=${b.aging_bucket}`)}
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-sm ${BUCKET_COLORS[b.aging_bucket] ?? 'bg-gray-400'}`}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {BUCKET_LABELS[b.aging_bucket] ?? b.aging_bucket}
                  </span>
                  <span className="font-mono text-[var(--text-muted)]">
                    {total > 0 ? `${((b.total_amount / total) * 100).toFixed(0)}%` : '0%'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
