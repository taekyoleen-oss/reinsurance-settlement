'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface ScheduleInfo {
  id: string
  period_label: string
  period_from: string
  period_to: string
  due_date: string | null
  expected_amount: number | null
  currency_code: string | null
}

interface Counterparty {
  id: string
  company_name_ko: string
  company_type: string
}

interface Props {
  open: boolean
  onClose: () => void
  contractId: string
  schedule: ScheduleInfo
  settlementCurrency: string
  counterparties: Counterparty[] // 계약의 출재사 + 수재사 목록
  totalAlreadyReceived: number // 이미 수령 확인된 합계
  onSuccess: () => void
}

export function ReceiptConfirmDialog({
  open,
  onClose,
  contractId,
  schedule,
  settlementCurrency,
  counterparties,
  totalAlreadyReceived,
  onSuccess,
}: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const remaining = (schedule.expected_amount ?? 0) - totalAlreadyReceived

  const [receivedDate, setReceivedDate] = useState(today)
  const [receivedAmount, setReceivedAmount] = useState(remaining > 0 ? String(remaining) : '')
  const [receivedCurrency, setReceivedCurrency] = useState(
    schedule.currency_code ?? settlementCurrency
  )
  const [exchangeRate, setExchangeRate] = useState('1')
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound')
  const [counterpartyId, setCounterpartyId] = useState(counterparties[0]?.id ?? '')
  const [bankReference, setBankReference] = useState('')
  const [receiptNote, setReceiptNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!counterpartyId) {
      toast.error('거래상대방을 선택해 주세요.')
      return
    }
    const amount = parseFloat(receivedAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('수령 금액을 올바르게 입력해 주세요.')
      return
    }
    if (!receivedDate) {
      toast.error('수령 날짜를 입력해 주세요.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedules/${schedule.id}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterparty_id: counterpartyId,
          direction,
          received_date: receivedDate,
          received_amount: amount,
          received_currency: receivedCurrency,
          exchange_rate: parseFloat(exchangeRate) || 1,
          bank_reference: bankReference || undefined,
          receipt_note: receiptNote || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? '수령 확인 저장 실패')
        return
      }
      toast.success('수령 확인이 저장되었습니다.')
      onSuccess()
      onClose()
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const isOverdue = schedule.due_date != null && schedule.due_date < today && remaining > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            보험료 수령 확인 — {schedule.period_label}
          </DialogTitle>
        </DialogHeader>

        {/* 스케줄 요약 */}
        <div className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border-default)] p-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">정산 기간</span>
            <span className="font-mono text-[var(--text-secondary)]">
              {schedule.period_from} ~ {schedule.period_to}
            </span>
          </div>
          {schedule.due_date && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">납입 기한</span>
              <span
                className={`font-mono ${isOverdue ? 'text-red-500 font-semibold' : 'text-[var(--text-secondary)]'}`}
              >
                {schedule.due_date}
                {isOverdue && ' ⚠ 연체'}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">예상 보험료</span>
            <span className="font-mono text-[var(--text-number)]">
              {schedule.currency_code ?? settlementCurrency}{' '}
              {(schedule.expected_amount ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">기 수령 합계</span>
            <span className="font-mono text-[var(--text-secondary)]">
              {schedule.currency_code ?? settlementCurrency} {totalAlreadyReceived.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-[var(--text-muted)]">잔여 미수령</span>
            <span className={`font-mono ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {schedule.currency_code ?? settlementCurrency} {remaining.toLocaleString()}
            </span>
          </div>
          {isOverdue && (
            <div className="flex items-center gap-1 text-red-500 pt-0.5">
              <AlertCircle className="h-3 w-3" />
              <span>납입 기한을 초과했습니다. 출재사에 독촉 확인 필요.</span>
            </div>
          )}
        </div>

        {/* 수령 입력 폼 */}
        <div className="space-y-3">
          {/* 방향 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">수령/송금 구분</Label>
              <Select
                value={direction}
                onValueChange={(v) => setDirection(v as 'inbound' | 'outbound')}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">수령 (입금 확인)</SelectItem>
                  <SelectItem value="outbound">송금 (출금 확인)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[var(--text-muted)]">
                {direction === 'inbound'
                  ? '출재사→브로커 보험료 입금'
                  : '브로커→수재사 보험료 송금'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">거래상대방</Label>
              <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {counterparties.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name_ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 날짜 + 금액 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">수령/송금 날짜</Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                금액{' '}
                <span className="text-[var(--text-muted)] font-normal">({receivedCurrency})</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="h-8 text-xs font-mono text-right text-[var(--text-number)]"
              />
            </div>
          </div>

          {/* 통화 + 환율 (KRW가 아닌 경우) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">통화</Label>
              <Input
                type="text"
                value={receivedCurrency}
                onChange={(e) => setReceivedCurrency(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="USD"
                className="h-8 text-xs font-mono uppercase"
                maxLength={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">KRW 환율</Label>
              <Input
                type="number"
                min="0"
                step="0.000001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="h-8 text-xs font-mono text-right"
                disabled={receivedCurrency === 'KRW'}
              />
            </div>
          </div>

          {/* 은행 참조번호 */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              은행 이체 참조번호
              <span className="text-[var(--text-muted)] font-normal ml-1">(선택)</span>
            </Label>
            <Input
              type="text"
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="SWIFT ref, 전신환 번호, 이체 확인번호 등"
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* 비고 */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              비고
              <span className="text-[var(--text-muted)] font-normal ml-1">(선택)</span>
            </Label>
            <Textarea
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
              placeholder="분할 수령 사유, 특이사항 등"
              className="text-xs resize-none h-16"
            />
          </div>
        </div>

        <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-2.5 text-[10px] text-blue-700 dark:text-blue-300 flex gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            실제 입출금은 은행 계좌를 직접 확인하세요. 이 화면은 확인된 내역을 기록하는 용도이며,
            입력 후 거래 항목(Transaction)과 연결하여 정산서(AC) 생성에 활용합니다.
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? '저장 중...' : '수령 확인 저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
