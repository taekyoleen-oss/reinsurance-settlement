'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { RefreshCw, Save } from 'lucide-react'

interface Schedule {
  id: string
  period_label: string
  period_from: string
  period_to: string
  expected_amount: number | null
  currency_code: string | null
  status: string
}

interface Props {
  contractId: string
  premiumSettlementPeriod: string
  settlementCurrency: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '대기',
  in_progress: '진행',
  closed: '완료',
  cancelled: '취소',
}
const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  open: 'default',
  in_progress: 'warning',
  closed: 'success',
  cancelled: 'muted',
}

export function PremiumScheduleCard({
  contractId,
  premiumSettlementPeriod,
  settlementCurrency,
}: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedules?schedule_type=premium`)
      const json = await res.json()
      const list: Schedule[] = json.schedules ?? []
      setSchedules(list)
      const init: Record<string, string> = {}
      list.forEach((s) => {
        init[s.id] = s.expected_amount != null ? String(s.expected_amount) : ''
      })
      setAmounts(init)
    } catch {
      toast.error('보험료 일정을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

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
      await fetchSchedules()
    } catch {
      toast.error('서버 오류')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (id: string) => {
    setSavingId(id)
    try {
      const raw = amounts[id]
      const expectedAmount = raw !== '' ? parseFloat(raw) : null
      const res = await fetch(`/api/contracts/${contractId}/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expected_amount: expectedAmount }),
      })
      if (!res.ok) {
        toast.error('저장 실패')
        return
      }
      toast.success('보험료 금액이 저장되었습니다.')
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, expected_amount: expectedAmount } : s))
      )
    } catch {
      toast.error('서버 오류')
    } finally {
      setSavingId(null)
    }
  }

  const total = schedules.reduce((sum, s) => {
    const v = parseFloat(amounts[s.id] ?? '')
    return sum + (isNaN(v) ? 0 : v)
  }, 0)

  const PERIOD_LABEL: Record<string, string> = {
    quarterly: '분기',
    semiannual: '반기',
    annual: '연간',
    adhoc: '수시',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">보험료 정산 일정</CardTitle>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            정산 주기:{' '}
            <span className="font-medium">
              {PERIOD_LABEL[premiumSettlementPeriod] ?? premiumSettlementPeriod}
            </span>{' '}
            — 기간별 예상 보험료를 입력하세요.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${generating ? 'animate-spin' : ''}`} />
          {schedules.length === 0 ? '기간 자동생성' : '기간 재생성'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center text-sm text-[var(--text-muted)] animate-pulse">
            불러오는 중...
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--text-muted)]">
            기간이 없습니다. 계약 만기일이 설정된 후 &apos;기간 자동생성&apos;을 클릭하세요.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">기간</TableHead>
                <TableHead>시작일</TableHead>
                <TableHead>종료일</TableHead>
                <TableHead className="text-right">예상 보험료</TableHead>
                <TableHead className="w-20 text-center">상태</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                    {s.period_label}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.period_from}</TableCell>
                  <TableCell className="font-mono text-xs">{s.period_to}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs text-[var(--text-muted)]">
                        {s.currency_code ?? settlementCurrency}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={amounts[s.id] ?? ''}
                        onChange={(e) =>
                          setAmounts((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        disabled={s.status === 'closed' || s.status === 'cancelled'}
                        className="w-36 font-mono text-right h-7 text-sm text-[var(--text-number)]"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_VARIANT[s.status] ?? 'default'}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handleSave(s.id)}
                      disabled={
                        savingId === s.id || s.status === 'closed' || s.status === 'cancelled'
                      }
                    >
                      <Save className={`h-3.5 w-3.5 ${savingId === s.id ? 'animate-pulse' : ''}`} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-surface-elevated font-medium">
                <TableCell colSpan={3} className="text-sm">
                  합계
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                  {total.toLocaleString()}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
