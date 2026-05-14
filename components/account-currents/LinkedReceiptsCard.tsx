'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
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
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  Link2,
  Unlink,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import type { PremiumReceiptRow } from '@/lib/supabase/queries/premium-receipts'

interface Props {
  acId: string
  acNo?: string | null
  acNetBalance: number
  acCurrency: string
  acDirection: 'to_reinsurer' | 'to_cedant' | string
  contractId: string
}

const MATCH_STATUS_LABEL: Record<string, string> = {
  unmatched: '미연결',
  partial: '일부연결',
  matched: '연결완료',
}

export function LinkedReceiptsCard({
  acId,
  acNetBalance,
  acCurrency,
  acDirection,
  contractId,
}: Props) {
  const [linked, setLinked] = useState<PremiumReceiptRow[]>([])
  const [candidates, setCandidates] = useState<PremiumReceiptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/account-currents/${acId}/receipts`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j?.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      const json = await res.json()
      setLinked(json.data?.linked ?? [])
      setCandidates(json.data?.candidates ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '로드 실패')
    } finally {
      setLoading(false)
    }
  }, [acId])

  useEffect(() => {
    load()
  }, [load])

  const handleLink = async (receiptId: string, action: 'link' | 'unlink') => {
    setBusyId(receiptId)
    try {
      const res = await fetch(`/api/account-currents/${acId}/receipts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_id: receiptId, action }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j?.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      toast.success(action === 'link' ? '연결되었습니다.' : '연결 해제되었습니다.')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '처리 실패')
    } finally {
      setBusyId(null)
    }
  }

  // 입출금 합계
  const totalInbound = linked
    .filter((r) => r.direction === 'inbound')
    .reduce((sum, r) => sum + Number(r.received_amount || 0), 0)
  const totalOutbound = linked
    .filter((r) => r.direction === 'outbound')
    .reduce((sum, r) => sum + Number(r.received_amount || 0), 0)
  const netReceived = totalInbound - totalOutbound

  // AC 잔액 vs 실제 수령 net 비교
  // direction = 'to_reinsurer' (수재사 송금이어야) → outbound 가 채워져야 정상
  // direction = 'to_cedant'   (출재사 환급)      → 보통 별도 settlement 처리
  const expected = Math.abs(acNetBalance)
  const actualMagnitude = Math.abs(netReceived)
  const matchPct = expected > 0 ? Math.round((actualMagnitude / expected) * 100) : 0
  const isFullyCovered = expected > 0 && actualMagnitude >= expected
  const isOverpaid = expected > 0 && actualMagnitude > expected * 1.01

  return (
    <Card className="print:hidden">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-emerald-600" />
            은행 수령·송금 연결
            <Badge variant="muted" className="text-[10px]">
              {linked.length}건 연결 / {candidates.length}건 후보
            </Badge>
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            이 정산서에 연결된 실제 은행 입출금 내역입니다. 같은 계약·기간·거래상대 범위에 들어오는
            후보가 있으면 수동으로 연결할 수 있습니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300 flex gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">수령 내역을 불러오지 못했습니다.</p>
              <p className="text-[11px]">{error}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)] animate-pulse">
            불러오는 중...
          </div>
        ) : (
          <>
            {/* 요약 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border border-border p-2">
                <p className="text-[10px] text-[var(--text-muted)]">정산서 net 잔액</p>
                <p className="font-mono text-sm font-medium text-[var(--text-number)]">
                  {acCurrency} {Math.abs(acNetBalance).toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {acDirection === 'to_reinsurer' ? '→ 수재사 지급' : '→ 출재사 환급'}
                </p>
              </div>
              <div className="rounded-md border border-border p-2">
                <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3 text-emerald-600" />
                  입금 합계
                </p>
                <p className="font-mono text-sm font-medium text-emerald-600">
                  {totalInbound > 0 ? totalInbound.toLocaleString() : '–'}
                </p>
              </div>
              <div className="rounded-md border border-border p-2">
                <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <ArrowUpFromLine className="h-3 w-3 text-amber-600" />
                  송금 합계
                </p>
                <p className="font-mono text-sm font-medium text-amber-600">
                  {totalOutbound > 0 ? totalOutbound.toLocaleString() : '–'}
                </p>
              </div>
              <div className="rounded-md border border-border p-2">
                <p className="text-[10px] text-[var(--text-muted)]">정산 충족률</p>
                <p
                  className={`font-mono text-sm font-medium ${
                    isOverpaid
                      ? 'text-amber-600'
                      : isFullyCovered
                        ? 'text-emerald-600'
                        : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {matchPct}%
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {isOverpaid ? '초과 수령/송금' : isFullyCovered ? '완전 충족' : '미완료'}
                </p>
              </div>
            </div>

            {/* 연결된 receipt */}
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                연결된 입출금 내역 ({linked.length}건)
              </p>
              {linked.length === 0 ? (
                <p className="rounded border border-dashed border-border p-3 text-center text-[11px] text-[var(--text-muted)]">
                  아직 연결된 수령/송금이 없습니다. 아래 후보가 있으면 연결하거나, 계약 상세에서
                  &apos;확인&apos; 버튼으로 새로 등록하세요.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">날짜</TableHead>
                      <TableHead className="w-16">구분</TableHead>
                      <TableHead>거래상대방</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>은행 참조번호</TableHead>
                      <TableHead className="w-20 text-center">매칭</TableHead>
                      <TableHead className="w-20 text-center">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linked.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-[11px]">{r.received_date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.direction === 'inbound' ? 'success' : 'warning'}
                            className="text-[9px]"
                          >
                            {r.direction === 'inbound' ? '입금' : '송금'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-secondary)]">
                          {r.counterparty_name ?? '–'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-[var(--text-number)]">
                          {r.received_currency} {Number(r.received_amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-[var(--text-muted)]">
                          {r.bank_reference ?? '–'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              r.match_status === 'matched'
                                ? 'success'
                                : r.match_status === 'partial'
                                  ? 'warning'
                                  : 'muted'
                            }
                            className="text-[9px]"
                          >
                            {MATCH_STATUS_LABEL[r.match_status] ?? r.match_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => handleLink(r.id, 'unlink')}
                            disabled={busyId === r.id}
                            title="이 AC 와의 연결 해제"
                          >
                            <Unlink className="h-3 w-3 mr-0.5" />
                            해제
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* 미연결 후보 */}
            {candidates.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  연결 가능 후보 ({candidates.length}건) — 같은 계약·거래상대·기간 범위
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">날짜</TableHead>
                      <TableHead className="w-16">구분</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>은행 참조번호</TableHead>
                      <TableHead className="w-20 text-center">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((r) => (
                      <TableRow key={r.id} className="bg-[var(--surface-elevated)]">
                        <TableCell className="font-mono text-[11px]">{r.received_date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.direction === 'inbound' ? 'success' : 'warning'}
                            className="text-[9px]"
                          >
                            {r.direction === 'inbound' ? '입금' : '송금'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-[var(--text-number)]">
                          {r.received_currency} {Number(r.received_amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-[var(--text-muted)]">
                          {r.bank_reference ?? '–'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => handleLink(r.id, 'link')}
                            disabled={busyId === r.id}
                          >
                            <Link2 className="h-3 w-3 mr-0.5" />
                            연결
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 계약 상세로 이동 */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-[11px] text-[var(--text-muted)]">
                새 수령 확인은 해당 계약의 보험료 정산 일정에서 등록하세요.
              </p>
              <Link href={`/contracts/${contractId}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  계약 상세로 이동
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
