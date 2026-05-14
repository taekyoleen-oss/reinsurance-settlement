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
  Shield,
} from 'lucide-react'
import type {
  LossReceiptRow,
  LossScheduleReceiptSummary,
} from '@/lib/supabase/queries/loss-receipts'

interface Counterparty {
  id: string
  company_name_ko: string
  company_type: string
}

interface Props {
  contractId: string
  settlementCurrency: string
}

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
  pending: { label: '회수 대기', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  overdue: {
    label: '연체',
    variant: 'destructive',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  partially_received: {
    label: '일부 회수',
    variant: 'warning',
    icon: <Clock className="h-3 w-3" />,
  },
  overdue_partial: {
    label: '연체·일부회수',
    variant: 'destructive',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  fully_received: {
    label: '회수 완료',
    variant: 'success',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
}

export function LossScheduleCard({ contractId, settlementCurrency }: Props) {
  const [summaries, setSummaries] = useState<LossScheduleReceiptSummary[]>([])
  const [receiptsMap, setReceiptsMap] = useState<Record<string, LossReceiptRow[]>>({})
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [dueDates, setDueDates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])

  // 수동 추가 폼
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({
    period_label: '',
    period_from: '',
    period_to: '',
    due_date: '',
    expected_amount: '',
  })
  const [creatingManual, setCreatingManual] = useState(false)

  // 수령 입력 다이얼로그(인라인 간단 폼)
  const [dialogSchedule, setDialogSchedule] = useState<LossScheduleReceiptSummary | null>(null)
  const [recForm, setRecForm] = useState({
    direction: 'inbound' as 'inbound' | 'outbound',
    counterparty_id: '',
    received_date: format(new Date(), 'yyyy-MM-dd'),
    received_amount: '',
    bank_reference: '',
    receipt_note: '',
  })
  const [savingReceipt, setSavingReceipt] = useState(false)

  const fetchCounterparties = useCallback(async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/contracts/${contractId}`),
        fetch(`/api/contracts/${contractId}/shares`),
      ])
      const cJson = await cRes.json()
      const sJson = await sRes.json()
      const list: Counterparty[] = []
      const cedant = cJson.data?.cedant
      if (cedant) {
        list.push({
          id: cJson.data.cedant_id,
          company_name_ko: cedant.company_name_ko,
          company_type: 'cedant',
        })
      }
      const shares: Array<{ reinsurer_id: string; reinsurer_name?: string }> = sJson.data ?? []
      shares.forEach((s) => {
        if (s.reinsurer_name && !list.find((x) => x.id === s.reinsurer_id)) {
          list.push({
            id: s.reinsurer_id,
            company_name_ko: s.reinsurer_name,
            company_type: 'reinsurer',
          })
        }
      })
      setCounterparties(list)
    } catch {
      // 무시
    }
  }, [contractId])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedules?schedule_type=loss`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j?.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      const json = await res.json()
      const scheduleList: Array<{
        id: string
        period_label: string
        period_from: string
        period_to: string
        due_date: string | null
        expected_amount: number | null
        currency_code: string | null
        status: string
      }> = json.schedules ?? []

      const sumRes = await fetch(`/api/contracts/${contractId}/loss-receipt-summaries`).catch(
        () => null
      )
      let summaryList: LossScheduleReceiptSummary[] = []
      if (sumRes?.ok) {
        const sumJson = await sumRes.json()
        summaryList = sumJson.summaries ?? []
      } else {
        // fallback
        summaryList = scheduleList.map((s) => ({
          schedule_id: s.id,
          contract_id: contractId,
          schedule_type: 'loss',
          period_label: s.period_label,
          period_from: s.period_from,
          period_to: s.period_to,
          due_date: s.due_date,
          expected_amount: s.expected_amount,
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
      const initA: Record<string, string> = {}
      const initD: Record<string, string> = {}
      summaryList.forEach((s) => {
        initA[s.schedule_id] = s.expected_amount != null ? String(s.expected_amount) : ''
        initD[s.schedule_id] = s.due_date ?? ''
      })
      setAmounts(initA)
      setDueDates(initD)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '로드 실패')
    } finally {
      setLoading(false)
    }
  }, [contractId])

  const fetchReceipts = useCallback(
    async (sid: string) => {
      try {
        const res = await fetch(`/api/contracts/${contractId}/schedules/${sid}/loss-receipts`)
        const json = await res.json()
        setReceiptsMap((p) => ({ ...p, [sid]: json.receipts ?? [] }))
      } catch {
        // 무시
      }
    },
    [contractId]
  )

  useEffect(() => {
    fetchData()
    fetchCounterparties()
  }, [fetchData, fetchCounterparties])

  const handleSave = async (s: LossScheduleReceiptSummary) => {
    setSavingId(s.schedule_id)
    try {
      const expected = amounts[s.schedule_id] !== '' ? parseFloat(amounts[s.schedule_id]) : null
      const due = dueDates[s.schedule_id] || null
      const res = await fetch(`/api/contracts/${contractId}/schedules/${s.schedule_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expected_amount: expected, due_date: due }),
      })
      if (!res.ok) {
        toast.error('저장 실패')
        return
      }
      toast.success('저장되었습니다.')
      await fetchData()
    } finally {
      setSavingId(null)
    }
  }

  const handleManualCreate = async () => {
    if (!manual.period_label || !manual.period_from || !manual.period_to) {
      toast.error('기간 라벨/시작/종료일은 필수입니다.')
      return
    }
    setCreatingManual(true)
    try {
      const payload: Record<string, unknown> = {
        schedule_type: 'loss',
        period_label: manual.period_label,
        period_from: manual.period_from,
        period_to: manual.period_to,
        currency_code: settlementCurrency,
      }
      if (manual.expected_amount !== '')
        payload.expected_amount = parseFloat(manual.expected_amount)

      const res = await fetch(`/api/contracts/${contractId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(typeof e?.error === 'string' ? e.error : '추가 실패')
        return
      }
      const created = await res.json()
      const newId = created?.schedule?.id
      if (newId && manual.due_date) {
        await fetch(`/api/contracts/${contractId}/schedules/${newId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ due_date: manual.due_date }),
        })
      }
      toast.success('손해 정산 기간이 추가되었습니다.')
      setManual({
        period_label: '',
        period_from: '',
        period_to: '',
        due_date: '',
        expected_amount: '',
      })
      setShowManual(false)
      await fetchData()
    } finally {
      setCreatingManual(false)
    }
  }

  const handleToggleExpand = async (sid: string) => {
    const next = new Set(expandedIds)
    if (next.has(sid)) {
      next.delete(sid)
    } else {
      next.add(sid)
      if (!receiptsMap[sid]) await fetchReceipts(sid)
    }
    setExpandedIds(next)
  }

  const handleDeleteReceipt = async (sid: string, rid: string) => {
    if (!confirm('이 회수 내역을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/schedules/${sid}/loss-receipts/${rid}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        toast.error('삭제 실패')
        return
      }
      toast.success('삭제되었습니다.')
      await Promise.all([fetchData(), fetchReceipts(sid)])
    } catch {
      toast.error('서버 오류')
    }
  }

  const handleSubmitReceipt = async () => {
    if (!dialogSchedule) return
    if (!recForm.counterparty_id) {
      toast.error('거래상대방을 선택하세요.')
      return
    }
    const amt = parseFloat(recForm.received_amount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('금액을 올바르게 입력하세요.')
      return
    }
    setSavingReceipt(true)
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/schedules/${dialogSchedule.schedule_id}/loss-receipts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            counterparty_id: recForm.counterparty_id,
            direction: recForm.direction,
            received_date: recForm.received_date,
            received_amount: amt,
            received_currency: settlementCurrency,
            exchange_rate: 1,
            bank_reference: recForm.bank_reference || undefined,
            receipt_note: recForm.receipt_note || undefined,
          }),
        }
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(typeof e?.error === 'string' ? e.error : '저장 실패')
        return
      }
      toast.success('회수/지급이 저장되었습니다.')
      const sid = dialogSchedule.schedule_id
      setDialogSchedule(null)
      setRecForm((f) => ({ ...f, received_amount: '', bank_reference: '', receipt_note: '' }))
      await Promise.all([fetchData(), fetchReceipts(sid)])
    } finally {
      setSavingReceipt(false)
    }
  }

  const totalExpected = summaries.reduce((s, x) => s + (x.expected_amount ?? 0), 0)
  const totalInbound = summaries.reduce((s, x) => s + x.total_inbound, 0)
  const totalOutbound = summaries.reduce((s, x) => s + x.total_outbound, 0)
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-purple-500" />
            보험금(Loss) 정산 일정 &amp; 회수·지급 현황
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            손해 명세에 따른 회수(수재사→브로커) · 지급(브로커→출재사) 흐름 관리
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowManual((v) => !v)}>
            <PlusCircle className="mr-1 h-3.5 w-3.5" />
            {showManual ? '취소' : '기간 추가'}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            새로고침
          </Button>
        </div>
      </CardHeader>

      {errorMsg && (
        <div className="mx-4 mb-3 rounded border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40 p-2 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
          {errorMsg}
          <p className="mt-0.5 text-[10px] opacity-80">
            step14_loss_receipts.sql 적용 여부와 broker 권한을 확인하세요.
          </p>
        </div>
      )}

      {showManual && (
        <div className="mx-4 mb-3 rounded border border-border bg-[var(--surface-elevated)] p-3 space-y-2">
          <p className="text-xs font-medium text-[var(--text-secondary)]">손해 정산 기간 추가</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)]">기간 라벨</label>
              <Input
                type="text"
                placeholder="2026Q2-LOSS"
                value={manual.period_label}
                onChange={(e) => setManual((p) => ({ ...p, period_label: e.target.value }))}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)]">시작일</label>
              <Input
                type="date"
                value={manual.period_from}
                onChange={(e) => setManual((p) => ({ ...p, period_from: e.target.value }))}
                className="h-7 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)]">종료일</label>
              <Input
                type="date"
                value={manual.period_to}
                onChange={(e) => setManual((p) => ({ ...p, period_to: e.target.value }))}
                className="h-7 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)]">납입 기한</label>
              <Input
                type="date"
                value={manual.due_date}
                onChange={(e) => setManual((p) => ({ ...p, due_date: e.target.value }))}
                className="h-7 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)]">예상 회수액</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={manual.expected_amount}
                onChange={(e) => setManual((p) => ({ ...p, expected_amount: e.target.value }))}
                className="h-7 text-xs font-mono text-right"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleManualCreate}
              disabled={creatingManual}
              className="h-7 text-xs"
            >
              <Save className="mr-1 h-3 w-3" />
              {creatingManual ? '추가 중...' : '기간 추가'}
            </Button>
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {loading ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)] animate-pulse">
            불러오는 중...
          </div>
        ) : summaries.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)] space-y-1">
            <p>아직 손해 정산 기간이 없습니다.</p>
            <p className="text-[11px]">
              <strong>기간 추가</strong> 로 손해 회수 기간을 만든 뒤 예상 금액·납입 기한을
              입력하세요.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-20">기간</TableHead>
                <TableHead>정산 기간</TableHead>
                <TableHead className="w-28">납입 기한</TableHead>
                <TableHead className="text-right">예상 회수액</TableHead>
                <TableHead className="text-right">회수액(↓)</TableHead>
                <TableHead className="text-right">지급액(↑)</TableHead>
                <TableHead className="text-right">잔액</TableHead>
                <TableHead className="w-28 text-center">상태</TableHead>
                <TableHead className="w-20 text-right">저장</TableHead>
                <TableHead className="w-16 text-center">입력</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s) => {
                const isExpanded = expandedIds.has(s.schedule_id)
                const cfg = RECEIPT_STATUS_CONFIG[s.receipt_status] ?? RECEIPT_STATUS_CONFIG.pending
                const isOverdue =
                  s.due_date != null && s.due_date < today && s.outstanding_amount > 0
                const receipts = receiptsMap[s.schedule_id] ?? []
                const isClosed = s.schedule_status === 'closed' || s.schedule_status === 'cancelled'

                return (
                  <Fragment key={s.schedule_id}>
                    <TableRow className={isOverdue ? 'bg-red-50/40 dark:bg-red-950/20' : undefined}>
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
                      <TableCell className="font-mono text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {s.period_label}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {s.period_from} ~ {s.period_to}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={dueDates[s.schedule_id] ?? ''}
                          onChange={(e) =>
                            setDueDates((p) => ({ ...p, [s.schedule_id]: e.target.value }))
                          }
                          disabled={isClosed}
                          className={`h-6 w-28 text-xs font-mono ${isOverdue ? 'border-red-400' : ''}`}
                        />
                      </TableCell>
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
                              setAmounts((p) => ({ ...p, [s.schedule_id]: e.target.value }))
                            }
                            disabled={isClosed}
                            className="w-28 h-6 font-mono text-right text-xs text-[var(--text-number)]"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600">
                        {s.total_inbound > 0 ? s.total_inbound.toLocaleString() : '–'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600">
                        {s.total_outbound > 0 ? s.total_outbound.toLocaleString() : '–'}
                      </TableCell>
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
                          {s.outstanding_amount !== 0 ? s.outstanding_amount.toLocaleString() : '–'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cfg.variant} className="gap-1 text-[10px]">
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </TableCell>
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
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => {
                            setRecForm({
                              direction: 'inbound',
                              counterparty_id:
                                counterparties.find((c) => c.company_type === 'reinsurer')?.id ??
                                counterparties[0]?.id ??
                                '',
                              received_date: format(new Date(), 'yyyy-MM-dd'),
                              received_amount:
                                s.outstanding_amount > 0 ? String(s.outstanding_amount) : '',
                              bank_reference: '',
                              receipt_note: '',
                            })
                            setDialogSchedule(s)
                          }}
                          disabled={isClosed}
                        >
                          <PlusCircle className="mr-0.5 h-3 w-3" />
                          입력
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-[var(--surface-elevated)]">
                        <TableCell colSpan={11} className="px-4 py-2">
                          {receipts.length === 0 ? (
                            <p className="py-1 text-xs text-[var(--text-muted)]">
                              회수/지급 내역이 없습니다.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <p className="mb-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                                회수/지급 내역 ({receipts.length}건)
                              </p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[10px] text-[var(--text-muted)]">
                                    <th className="pb-1 text-left font-normal">날짜</th>
                                    <th className="pb-1 text-left font-normal">구분</th>
                                    <th className="pb-1 text-left font-normal">거래상대방</th>
                                    <th className="pb-1 text-right font-normal">금액</th>
                                    <th className="pb-1 pl-3 text-left font-normal">참조번호</th>
                                    <th className="pb-1 pl-3 text-left font-normal">연결</th>
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
                                          {r.direction === 'inbound' ? '회수' : '지급'}
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
                                      <td className="py-1 pl-3 text-[10px]">
                                        {r.linked_ac_id ? (
                                          <a
                                            href={`/account-currents/${r.linked_ac_id}`}
                                            className="text-blue-600 hover:underline"
                                          >
                                            AC {r.linked_ac_no ?? r.linked_ac_id.slice(0, 6)}
                                          </a>
                                        ) : (
                                          <span className="text-[var(--text-muted)]">–</span>
                                        )}
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
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}

              {/* 합계 */}
              <TableRow className="bg-[var(--surface-elevated)] font-medium">
                <TableCell colSpan={4} className="text-sm">
                  합계
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                  {totalExpected.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-emerald-600">
                  {totalInbound > 0 ? totalInbound.toLocaleString() : '–'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-amber-600">
                  {totalOutbound > 0 ? totalOutbound.toLocaleString() : '–'}
                </TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* 회수/지급 입력 인라인 다이얼로그 */}
      {dialogSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                보험금 회수/지급 입력 — {dialogSchedule.period_label}
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDialogSchedule(null)}
                className="h-6 px-2"
              >
                ✕
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)]">구분</label>
                <select
                  value={recForm.direction}
                  onChange={(e) =>
                    setRecForm((f) => ({
                      ...f,
                      direction: e.target.value as 'inbound' | 'outbound',
                    }))
                  }
                  className="h-7 w-full rounded border border-border bg-background px-2 text-xs"
                >
                  <option value="inbound">회수 (수재사 → 브로커)</option>
                  <option value="outbound">지급 (브로커 → 출재사)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)]">거래상대방</label>
                <select
                  value={recForm.counterparty_id}
                  onChange={(e) => setRecForm((f) => ({ ...f, counterparty_id: e.target.value }))}
                  className="h-7 w-full rounded border border-border bg-background px-2 text-xs"
                >
                  {counterparties.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name_ko}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)]">날짜</label>
                <Input
                  type="date"
                  value={recForm.received_date}
                  onChange={(e) => setRecForm((f) => ({ ...f, received_date: e.target.value }))}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)]">금액</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={recForm.received_amount}
                  onChange={(e) => setRecForm((f) => ({ ...f, received_amount: e.target.value }))}
                  className="h-7 text-xs font-mono text-right"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-[var(--text-muted)]">은행 참조번호</label>
                <Input
                  type="text"
                  value={recForm.bank_reference}
                  onChange={(e) => setRecForm((f) => ({ ...f, bank_reference: e.target.value }))}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-[var(--text-muted)]">비고</label>
                <Input
                  type="text"
                  value={recForm.receipt_note}
                  onChange={(e) => setRecForm((f) => ({ ...f, receipt_note: e.target.value }))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialogSchedule(null)}
                disabled={savingReceipt}
              >
                취소
              </Button>
              <Button size="sm" onClick={handleSubmitReceipt} disabled={savingReceipt}>
                {savingReceipt ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
