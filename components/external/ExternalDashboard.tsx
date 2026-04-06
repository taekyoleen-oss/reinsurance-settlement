'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import type { AccountCurrentWithRelations } from '@/types'
import type { UserRole } from '@/types'

interface ExternalDashboardProps {
  role: Extract<UserRole, 'cedant_viewer' | 'reinsurer_viewer'>
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function ExternalDashboard({ role }: ExternalDashboardProps) {
  const [acs, setAcs] = useState<AccountCurrentWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const title = role === 'cedant_viewer' ? '출재사 정산 현황' : '수재사 정산 현황'

  useEffect(() => {
    fetch('/api/account-currents?status=issued,acknowledged,disputed')
      .then((r) => r.json())
      .then((d) => setAcs(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {role === 'cedant_viewer' ? '출재사' : '수재사'}로서 발행된 정산서를 확인하세요.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['issued', 'acknowledged', 'disputed'] as const).map((status) => {
          const count = acs.filter((a) => a.status === status).length
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">{count}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* AC List */}
      <Card>
        <CardHeader>
          <CardTitle>정산서 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
          ) : acs.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--text-muted)]">정산서 없음</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated">
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">정산서번호</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">계약</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">기간</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)]">순잔액</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">방향</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">상태</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)]">액션</th>
                </tr>
              </thead>
              <tbody>
                {acs.map((ac) => (
                  <tr key={ac.id} className="border-b border-border hover:bg-surface-elevated">
                    <td className="px-4 py-2 font-mono text-xs text-[var(--text-secondary)]">{ac.ac_no}</td>
                    <td className="px-4 py-2 text-xs">{ac.contract?.contract_no ?? ac.contract_id.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-xs text-[var(--text-secondary)]">
                      {format(new Date(ac.period_from), 'yyyy-MM-dd')} ~{' '}
                      {format(new Date(ac.period_to), 'yyyy-MM-dd')}
                    </td>
                    <td className="px-4 py-2 font-mono text-right text-[var(--text-number)] font-semibold">
                      {fmt(ac.net_balance)} {ac.currency_code}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={ac.direction === 'to_reinsurer' ? 'accent' : 'success'}>
                        {ac.direction === 'to_reinsurer' ? '→수재사' : '→출재사'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={ac.status} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/external/account-currents/${ac.id}`}>
                        <span className="text-accent text-xs hover:underline cursor-pointer">
                          상세 보기
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
