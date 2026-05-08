'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Banknote, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import type { SettlementRow } from '@/types'

type SettlementDetail = SettlementRow & {
  remit_status?: string | null
  remitted_by?: string | null
  remitted_at?: string | null
  remitter_name?: string | null
  remitter_email?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  reviewer_name?: string | null
  reviewer_email?: string | null
  counterparty?: { company_name_ko: string } | null
}

type Match = {
  id: string
  account_current_id: string
  matched_amount: number
  matched_at: string
  account_current?: { ac_no: string | null } | null
}

const REMIT_STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  remitted: '송금완료',
  verified: '검수완료',
  failed: '실패',
}

const REMIT_STATUS_VARIANT: Record<
  string,
  'muted' | 'default' | 'success' | 'destructive' | 'warning'
> = {
  pending: 'muted',
  remitted: 'default',
  verified: 'success',
  failed: 'destructive',
}

function formatDt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [settlement, setSettlement] = useState<SettlementDetail | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [userRole, setUserRole] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/settlements/${id}`).then((r) => r.json()),
      fetch(`/api/settlements/${id}/matches`)
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ])
      .then(([sd, md]) => {
        setSettlement(sd.data ?? sd.settlement ?? null)
        setMatches(md.data ?? md.matches ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setUserRole(d.role ?? ''))
      .catch(() => {})
  }, [load])

  const doAction = async (action: 'remit' | 'verify-remit') => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/settlements/${id}/${action}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '처리 실패')
      toast.success(action === 'remit' ? '송금 완료 처리됨' : '송금 검수 완료')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
        로딩 중...
      </div>
    )
  }
  if (!settlement) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">
        결제를 찾을 수 없습니다.
      </div>
    )
  }

  const remitStatus = settlement.remit_status ?? 'pending'
  const canRemit =
    remitStatus === 'pending' &&
    ['broker_technician', 'broker_manager', 'reviewer', 'admin'].includes(userRole)
  const canVerifyRemit =
    remitStatus === 'remitted' && ['reviewer', 'broker_manager', 'admin'].includes(userRole)

  const remaining = (settlement.amount ?? 0) - (settlement.matched_amount ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/settlements">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            결제 상세 — {settlement.settlement_no ?? id.slice(0, 8)}
          </h1>
        </div>
        <Badge variant={REMIT_STATUS_VARIANT[remitStatus] ?? 'muted'}>
          {REMIT_STATUS_LABEL[remitStatus] ?? remitStatus}
        </Badge>
      </div>

      {/* 액션 버튼 */}
      {(canRemit || canVerifyRemit) && (
        <div className="flex gap-2">
          {canRemit && (
            <Button size="sm" onClick={() => doAction('remit')} disabled={actionLoading}>
              <Banknote className="h-4 w-4 mr-1" />
              송금 완료
            </Button>
          )}
          {canVerifyRemit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => doAction('verify-remit')}
              disabled={actionLoading}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              송금 검수
            </Button>
          )}
        </div>
      )}

      {/* 결제 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">결제 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">결제번호</dt>
              <dd className="text-sm mt-0.5 font-mono">{settlement.settlement_no ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">결제일</dt>
              <dd className="text-sm mt-0.5 font-mono">
                {settlement.settlement_date
                  ? format(new Date(settlement.settlement_date), 'yyyy-MM-dd')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">유형</dt>
              <dd className="text-sm mt-0.5">
                {settlement.settlement_type === 'receipt' ? '수취(입금)' : '지급(출금)'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">금액</dt>
              <dd className="text-sm mt-0.5 font-mono text-[var(--text-number)]">
                {settlement.amount?.toLocaleString()} {settlement.currency_code}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">매칭 금액</dt>
              <dd className="text-sm mt-0.5 font-mono">
                {(settlement.matched_amount ?? 0).toLocaleString()} {settlement.currency_code}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">잔액</dt>
              <dd className="text-sm mt-0.5 font-mono text-[var(--text-secondary)]">
                {remaining.toLocaleString()} {settlement.currency_code}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">매칭 상태</dt>
              <dd className="text-sm mt-0.5">
                <Badge
                  variant={
                    settlement.match_status === 'fully_matched'
                      ? 'success'
                      : settlement.match_status === 'partial'
                        ? 'warning'
                        : 'muted'
                  }
                >
                  {settlement.match_status === 'fully_matched'
                    ? '완전매칭'
                    : settlement.match_status === 'partial'
                      ? '부분매칭'
                      : '미매칭'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">은행 참조번호</dt>
              <dd className="text-sm mt-0.5 font-mono">{settlement.bank_reference ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">등록일</dt>
              <dd className="text-sm mt-0.5 font-mono">
                {settlement.created_at
                  ? format(new Date(settlement.created_at), 'yyyy-MM-dd HH:mm')
                  : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 송금 메타 */}
      {(settlement.remitter_name || settlement.reviewer_name) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">송금 처리 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {settlement.remitter_name && (
              <div className="grid grid-cols-2 gap-1 text-[var(--text-secondary)]">
                <span>송금 처리자</span>
                <span className="text-[var(--text-primary)]">{settlement.remitter_name}</span>
                <span>이메일</span>
                <span className="text-[var(--text-primary)]">
                  {settlement.remitter_email ?? '—'}
                </span>
                <span>처리 일시</span>
                <span className="font-mono">{formatDt(settlement.remitted_at)}</span>
              </div>
            )}
            {settlement.reviewer_name && (
              <>
                <div className="border-t border-border" />
                <div className="grid grid-cols-2 gap-1 text-[var(--text-secondary)]">
                  <span>검수자</span>
                  <span className="text-[var(--text-primary)]">{settlement.reviewer_name}</span>
                  <span>이메일</span>
                  <span className="text-[var(--text-primary)]">
                    {settlement.reviewer_email ?? '—'}
                  </span>
                  <span>검수 일시</span>
                  <span className="font-mono">{formatDt(settlement.reviewed_at)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 매칭된 정산서 */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">매칭된 정산서</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="text-left pb-2">정산서 번호</th>
                  <th className="text-right pb-2">매칭 금액</th>
                  <th className="text-right pb-2">매칭 일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matches.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 font-mono text-xs">
                      <Link
                        href={`/account-currents/${m.account_current_id}`}
                        className="text-primary hover:underline"
                      >
                        {m.account_current?.ac_no ?? m.account_current_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-2 text-right font-mono text-[var(--text-number)]">
                      {m.matched_amount.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-xs text-[var(--text-secondary)] font-mono">
                      {formatDt(m.matched_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
