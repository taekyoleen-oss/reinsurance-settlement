'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RefreshCw,
  Save,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CircleDashed,
} from 'lucide-react'
import { ReceiptConfirmDialog } from './ReceiptConfirmDialog'
import type {
  PremiumReceiptRow,
  ScheduleReceiptSummary,
} from '@/lib/supabase/queries/premium-receipts'

interface Counterparty {
  id: string
  company_name_ko: string
  company_type: string
}

interface Props {
  contractId: string
  premiumSettlementPeriod: string
  settlementCurrency: string
}

// 수령 상태 → 배지 설정
const RECEIPT_STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: 'default' | 'success' | 'warning' | 'muted' | 'destructive'
    icon: React.ReactNode
  }
> = {
  no_schedule: {
    label: '금액 미설정',
    variant: 'muted',
    icon: <CircleDashed className="h-3 w-3" />,
  },
  pending: { label: '수령 대기', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  overdue: { label: '연체', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
  partially_received: {
    label: '일부 수령',
    variant: 'warning',
    icon: <Clock className="h-3 w-3" />,
  },
  overdue_partial: {
    label: '연체·일부수령',
    variant: 'destructive',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  fully_received: {
    label: '수령 완료',
    variant: 'success',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
}

const MATCH_STATUS_LABEL: Record<string, string> = {
  unmatched: '미연결',
  partial: '일부연결',
  matched: '연결완료',
}

const PERIOD_LABEL: Record<string, string> = {
  quarterly: '분기',
  semiannual: '반기',
  annual: '연간',
  adhoc: '수시',
}

export function PremiumScheduleCard({
  contractId,
  premiumSettlementPeriod,
  settlementCurrency,
}: Props) {
  const [summaries, setSummaries] = useState<ScheduleReceiptSummary[]>([])
  const [receiptsMap, setReceiptsMap] = useState<Record<string, PremiumReceiptRow[]>>({})
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [dueDates, setDueDates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [dialogSchedule, setDialogSchedule] = useState<ScheduleReceiptSummary | null>(null)

  // 계약의 거래상대방 목록 (출재사 + 수재사)
  const fetchCounterparties = useCallback(async () => {
    try {
      const [contractRes, sharesRes] = await Promise.all([
        fetch(`/api/contracts/${contractId}`),
        fetch(`/api/contracts/${contractId}/shares`),
      ])
      const contractJson = await contractRes.json()
      const sharesJson = await sharesRes.json()

      const list: Counterparty[] = []
      const cedant = contractJson.data?.cedant
      if (cedant)
        list.push({
          id: contractJson.data.cedant_id,
          company_name_ko: cedant.company_name_ko,
          company_type: 'cedant',
        })

      const shares: Array<{ reinsurer_id: string; reinsurer_name?: string }> = sharesJson.data ?? []
      shares.forEach((s) => {
        if (s.reinsurer_name && !list.find((c) => c.id === s.reinsurer_id)) {
          list.push({
            id: s.reinsurer_id,
            company_name_ko: s.reinsurer_name,
            company_type: 'reinsurer',
          })
        }
      })
      setCounterparties(list)
    } catch {
      // 거래상대방 목록 없어도 폼 진행 가능
    }
  }, [contractId])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedules?schedule_type=premium`)
      const json = await res.json()
      const scheduleList: Array<{
        id: string
        period_label: string
        period_from: string
        period_to: string
        due_date: string | null
        expected_amount: number | null
        minimum_premium: number | null
        currency_code: string | null
        status: string
      }> = json.schedules ?? []

      // 수령 집계는 뷰에서 직접 가져옴
      const sumRes = await fetch(
        `/api/contracts/${contractId}/receipt-summaries?schedule_type=premium`
      ).catch(() => null)
      let summaryList: ScheduleReceiptSummary[] = []
      if (sumRes?.ok) {
        const sumJson = await sumRes.json()
        summaryList = sumJson.summaries ?? []
      } else {
        // 뷰 API가 없으면 스케줄 데이터로 빌드 (수령 0으로 가정)
        summaryList = scheduleList.map((s) => ({
          schedule_id: s.id,
          contract_id: contractId,
          schedule_type: 'premium',
          period_label: s.period_label,
          period_from: s.period_from,
          period_to: s.period_to,
          due_date: s.due_date,
          expected_amount: s.expected_amount,
          minimum_premium: s.minimum_premium,
          currency_code: s.currency_code,
          schedule_status: s.status,
          receipt_count: 0,
          total_inbound: 0,
          total_outbound: 0,
          net_received: 0,
          last_received_date: null,
          receipt_status: s.expected_amount == null ? 'no_schedule' : 'pending',
          outstanding_amount: s.expected_amount ?? 0,
        }))
      }

      setSummaries(summaryList)

      const initAmounts: Record<string, string> = {}
      const initDues: Record<string, string> = {}
      summaryList.forEach((s) => {
        initAmounts[s.schedule_id] = s.expected_amount != null ? String(s.expected_amount) : ''
        initDues[s.schedule_id] = s.due_date ?? ''
      })
      setAmounts(initAmounts)
      setDueDates(initDues)
    } catch {
      toast.error('보험료 일정을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [contractId])

  const fetchReceipts = useCallback(
    async (scheduleId: string) => {
      try {
        const res = await fetch(`/api/contracts/${contractId}/schedules/${scheduleId}/receipts`)
        const json = await res.json()
        setReceiptsMap((prev) => ({ ...prev, [scheduleId]: json.receipts ?? [] }))
      } catch {
        // 수령 내역 로드 실패는 조용히 처리
      }
    },
    [contractId]
  )

  useEffect(() => {
    fetchData()
    fetchCounterparties()
  }, [fetchData, fetchCounterparties])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedules/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_type: 'premium',
          period: premiumSettlementPeriod,
          currency_code: settlementCurrency,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? '기간 생성 실패')
        return
      }
      toast.success('보험료 정산 기간이 생성되었습니다.')
      await fetchData()
    } catch {
      toast.error('서버 오류')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (s: ScheduleReceiptSummary) => {
    setSavingId(s.schedule_id)
    try {
      const expectedAmount =
        amounts[s.schedule_id] !== '' ? parseFloat(amounts[s.schedule_id]) : null
      const dueDate = dueDates[s.schedule_id] || null
      const res = await fetch(`/api/contracts/${contractId}/schedules/${s.schedule_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expected_amount: expectedAmount, due_date: dueDate }),
      })
      if (!res.ok) {
        toast.error('저장 실패')
        return
      }
      toast.success('저장되었습니다.')
      await fetchData()
    } catch {
      toast.error('서버 오류')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleExpand = async (scheduleId: string) => {
    const next = new Set(expandedIds)
    if (next.has(scheduleId)) {
      next.delete(scheduleId)
    } else {
      next.add(scheduleId)
      if (!receiptsMap[scheduleId]) await fetchReceipts(scheduleId)
    }
    setExpandedIds(next)
  }

  const handleDeleteReceipt = async (scheduleId: string, receiptId: string) => {
    if (!confirm('이 수령 확인 내역을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/schedules/${scheduleId}/receipts/${receiptId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        toast.error('삭제 실패')
        return
      }
      toast.success('삭제되었습니다.')
      await Promise.all([fetchData(), fetchReceipts(scheduleId)])
    } catch {
      toast.error('서버 오류')
    }
  }

  const totalExpected = summaries.reduce((sum, s) => sum + (s.expected_amount ?? 0), 0)
  const totalReceived = summaries.reduce((sum, s) => sum + s.total_inbound, 0)
  const totalOutstanding = summaries.reduce((sum, s) => sum + Math.max(0, s.outstanding_amount), 0)
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div>
            <CardTitle className="text-base">보험료 정산 일정 &amp; 수령 현황</CardTitle>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              정산 주기:{' '}
              <span className="font-medium">
                {PERIOD_LABEL[premiumSettlementPeriod] ?? premiumSettlementPeriod}
              </span>{' '}
              — 기간별 예상 보험료와 납입 기한을 설정하고, 실제 수령을 확인하세요.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${generating ? 'animate-spin' : ''}`} />
            {summaries.length === 0 ? '기간 자동생성' : '기간 재생성'}
          </Button>
        </CardHeader>

        <CardContent className="space-y-0 p-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
              불러오는 중...
            </div>
          ) : summaries.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              기간이 없습니다. 계약 만기일이 설정된 후 &apos;기간 자동생성&apos;을 클릭하세요.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="w-20">기간</TableHead>
                  <TableHead>정산 기간</TableHead>
                  <TableHead className="w-28">납입 기한</TableHead>
                  <TableHead className="text-right">예상 보험료</TableHead>
                  <TableHead className="text-right">수령 확인액</TableHead>
                  <TableHead className="text-right">잔액</TableHead>
                  <TableHead className="w-28 text-center">수령 상태</TableHead>
                  <TableHead className="w-28 text-right">저장</TableHead>
                  <TableHead className="w-16 text-center">수령입력</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s) => {
                  const isExpanded = expandedIds.has(s.schedule_id)
                  const statusCfg =
                    RECEIPT_STATUS_CONFIG[s.receipt_status] ?? RECEIPT_STATUS_CONFIG.pending
                  const isOverdue =
                    s.due_date != null && s.due_date < today && s.outstanding_amount > 0
                  const receipts = receiptsMap[s.schedule_id] ?? []
                  const isClosed =
                    s.schedule_status === 'closed' || s.schedule_status === 'cancelled'

                  return (
                    <Fragment key={s.schedule_id}>
                      <TableRow
                        className={isOverdue ? 'bg-red-50/40 dark:bg-red-950/20' : undefined}
                      >
                        {/* 펼치기 */}
                        <TableCell className="p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleToggleExpand(s.schedule_id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>

                        {/* 기간 라벨 */}
                        <TableCell className="font-mono text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {s.period_label}
                        </TableCell>

                        {/* 정산 기간 */}
                        <TableCell className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                          {s.period_from} ~ {s.period_to}
                        </TableCell>

                        {/* 납입 기한 (편집 가능) */}
                        <TableCell>
                          <Input
                            type="date"
                            value={dueDates[s.schedule_id] ?? ''}
                            onChange={(e) =>
                              setDueDates((prev) => ({ ...prev, [s.schedule_id]: e.target.value }))
                            }
                            disabled={isClosed}
                            className={`h-6 text-xs font-mono w-28 ${isOverdue ? 'border-red-400' : ''}`}
                          />
                        </TableCell>

                        {/* 예상 보험료 (편집 가능) */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {s.currency_code ?? settlementCurrency}
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={amounts[s.schedule_id] ?? ''}
                              onChange={(e) =>
                                setAmounts((prev) => ({ ...prev, [s.schedule_id]: e.target.value }))
                              }
                              disabled={isClosed}
                              className="w-28 h-6 font-mono text-right text-xs text-[var(--text-number)]"
                            />
                          </div>
                        </TableCell>

                        {/* 수령 확인액 */}
                        <TableCell className="text-right font-mono text-xs text-[var(--text-number)]">
                          {s.total_inbound > 0 ? s.total_inbound.toLocaleString() : '–'}
                        </TableCell>

                        {/* 잔액 */}
                        <TableCell className="text-right font-mono text-xs">
                          <span
                            className={
                              s.outstanding_amount > 0
                                ? 'text-amber-600'
                                : s.outstanding_amount < 0
                                  ? 'text-blue-600'
                                  : 'text-[var(--text-muted)]'
                            }
                          >
                            {s.outstanding_amount !== 0
                              ? s.outstanding_amount.toLocaleString()
                              : '–'}
                          </span>
                        </TableCell>

                        {/* 수령 상태 배지 */}
                        <TableCell className="text-center">
                          <Badge variant={statusCfg.variant} className="gap-1 text-[10px]">
                            {statusCfg.icon}
                            {statusCfg.label}
                          </Badge>
                        </TableCell>

                        {/* 저장 버튼 */}
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => handleSave(s)}
                            disabled={savingId === s.schedule_id || isClosed}
                          >
                            <Save
                              className={`h-3.5 w-3.5 ${savingId === s.schedule_id ? 'animate-pulse' : ''}`}
                            />
                          </Button>
                        </TableCell>

                        {/* 수령 확인 입력 버튼 */}
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => setDialogSchedule(s)}
                            disabled={isClosed}
                          >
                            <PlusCircle className="h-3 w-3 mr-0.5" />
                            확인
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* 수령 이력 (펼침) */}
                      {isExpanded && (
                        <TableRow className="bg-[var(--surface-elevated)]">
                          <TableCell colSpan={10} className="py-2 px-4">
                            {receipts.length === 0 ? (
                              <p className="text-xs text-[var(--text-muted)] py-1">
                                수령 확인 내역이 없습니다. &apos;확인&apos; 버튼으로 추가하세요.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-[10px] font-medium text-[var(--text-muted)] mb-1.5">
                                  수령 확인 내역 ({receipts.length}건)
                                </p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-[10px] text-[var(--text-muted)]">
                                      <th className="text-left font-normal pb-1">날짜</th>
                                      <th className="text-left font-normal pb-1">구분</th>
                                      <th className="text-left font-normal pb-1">거래상대방</th>
                                      <th className="text-right font-normal pb-1">금액</th>
                                      <th className="text-left font-normal pb-1 pl-3">
                                        은행참조번호
                                      </th>
                                      <th className="text-center font-normal pb-1">연결상태</th>
                                      <th className="w-8" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {receipts.map((r) => (
                                      <tr
                                        key={r.id}
                                        className="border-t border-[var(--border-subtle)]"
                                      >
                                        <td className="py-1 font-mono text-[var(--text-secondary)]">
                                          {r.received_date}
                                        </td>
                                        <td className="py-1">
                                          <Badge
                                            variant={
                                              r.direction === 'inbound' ? 'success' : 'warning'
                                            }
                                            className="text-[9px] py-0"
                                          >
                                            {r.direction === 'inbound' ? '수령' : '송금'}
                                          </Badge>
                                        </td>
                                        <td className="py-1 text-[var(--text-secondary)]">
                                          {r.counterparty_name ?? '–'}
                                        </td>
                                        <td className="py-1 text-right font-mono text-[var(--text-number)]">
                                          {r.received_currency} {r.received_amount.toLocaleString()}
                                        </td>
                                        <td className="py-1 pl-3 font-mono text-[var(--text-muted)]">
                                          {r.bank_reference ?? '–'}
                                        </td>
                                        <td className="py-1 text-center">
                                          <Badge
                                            variant={
                                              r.match_status === 'matched'
                                                ? 'success'
                                                : r.match_status === 'partial'
                                                  ? 'warning'
                                                  : 'muted'
                                            }
                                            className="text-[9px] py-0"
                                          >
                                            {MATCH_STATUS_LABEL[r.match_status]}
                                          </Badge>
                                        </td>
                                        <td className="py-1 text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 text-[var(--text-muted)] hover:text-red-500"
                                            onClick={() => handleDeleteReceipt(s.schedule_id, r.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {s.total_outbound > 0 && (
                                  <p className="text-[10px] text-[var(--text-muted)] pt-1">
                                    * 수령 {s.total_inbound.toLocaleString()} / 송금{' '}
                                    {s.total_outbound.toLocaleString()} / 순수령{' '}
                                    {s.net_received.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}

                {/* 합계 행 */}
                <TableRow className="bg-[var(--surface-elevated)] font-medium">
                  <TableCell colSpan={4} className="text-sm">
                    합계
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                    {totalExpected.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-emerald-600">
                    {totalReceived > 0 ? totalReceived.toLocaleString() : '–'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-amber-600">
                    {totalOutstanding > 0 ? totalOutstanding.toLocaleString() : '–'}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 수령 확인 다이얼로그 */}
      {dialogSchedule && (
        <ReceiptConfirmDialog
          open={true}
          onClose={() => setDialogSchedule(null)}
          contractId={contractId}
          schedule={{
            id: dialogSchedule.schedule_id,
            period_label: dialogSchedule.period_label,
            period_from: dialogSchedule.period_from,
            period_to: dialogSchedule.period_to,
            due_date: dialogSchedule.due_date,
            expected_amount: dialogSchedule.expected_amount,
            currency_code: dialogSchedule.currency_code,
          }}
          settlementCurrency={settlementCurrency}
          counterparties={counterparties}
          totalAlreadyReceived={dialogSchedule.total_inbound}
          onSuccess={() => {
            fetchData()
            if (expandedIds.has(dialogSchedule.schedule_id)) {
              fetchReceipts(dialogSchedule.schedule_id)
            }
          }}
        />
      )}
    </>
  )
}
