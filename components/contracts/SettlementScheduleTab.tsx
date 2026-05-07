'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'

type ScheduleType = 'premium' | 'loss' | 'commission'
type PeriodType = 'quarterly' | 'semiannual' | 'annual' | 'adhoc'

interface Schedule {
  id: string
  schedule_type: ScheduleType
  period_label: string
  period_from: string
  period_to: string
  expected_amount: number | null
  currency_code: string | null
  status: string
}

interface Props {
  contractId: string
  inceptionDate?: string
  expiryDate?: string
  premiumPeriod?: PeriodType
  lossPeriod?: PeriodType
  commissionPeriod?: PeriodType
}

const TYPE_LABEL: Record<ScheduleType, string> = {
  premium: '보험료',
  loss: '보험금',
  commission: '수수료',
}

const STATUS_LABEL: Record<string, string> = {
  open: '열림',
  in_progress: '진행중',
  closed: '완료',
  cancelled: '취소',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  closed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
}

const PERIOD_LABEL: Record<PeriodType, string> = {
  quarterly: '분기',
  semiannual: '반기',
  annual: '연간',
  adhoc: '수시',
}

export function SettlementScheduleTab({
  contractId,
  inceptionDate,
  expiryDate,
  premiumPeriod = 'quarterly',
  lossPeriod = 'adhoc',
  commissionPeriod = 'quarterly',
}: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [activeType, setActiveType] = useState<ScheduleType>('premium')
  const [generating, setGenerating] = useState(false)

  const defaultPeriod: Record<ScheduleType, PeriodType> = {
    premium: premiumPeriod,
    loss: lossPeriod,
    commission: commissionPeriod,
  }

  const loadSchedules = useCallback(async () => {
    const res = await fetch(`/api/contracts/${contractId}/schedules`)
    if (!res.ok) return
    const json = await res.json()
    setSchedules(json.schedules ?? [])
  }, [contractId])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  async function generate(type: ScheduleType) {
    if (!inceptionDate || !expiryDate) {
      toast.error('계약 기간이 설정되어 있지 않습니다')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedules/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_type: type, period: defaultPeriod[type] }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? '생성 실패')
        return
      }
      toast.success(`${json.count}개 인스턴스 생성 완료`)
      loadSchedules()
    } finally {
      setGenerating(false)
    }
  }

  const filtered = schedules.filter((s) => s.schedule_type === activeType)

  return (
    <div className="space-y-4">
      {/* 유형 탭 */}
      <div className="flex gap-2 flex-wrap">
        {(['premium', 'loss', 'commission'] as ScheduleType[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              activeType === t
                ? 'bg-primary text-white'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {TYPE_LABEL[t]}
            <span className="ml-1.5 text-xs opacity-70">({PERIOD_LABEL[defaultPeriod[t]]})</span>
          </button>
        ))}
      </div>

      {/* 자동 생성 */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">
          {TYPE_LABEL[activeType]} 주기: <strong>{PERIOD_LABEL[defaultPeriod[activeType]]}</strong>
        </span>
        <Button size="sm" onClick={() => generate(activeType)} disabled={generating}>
          {generating ? '생성 중...' : `인스턴스 자동 생성`}
        </Button>
      </div>

      {/* 인스턴스 표 */}
      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          인스턴스가 없습니다. 자동 생성 버튼을 눌러 생성하세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-text-secondary text-xs">
              <tr>
                <th className="px-3 py-2 text-left">기간 레이블</th>
                <th className="px-3 py-2 text-left">기간</th>
                <th className="px-3 py-2 text-right">예상 금액</th>
                <th className="px-3 py-2 text-center">상태</th>
                <th className="px-3 py-2 text-center">명세 입력</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-surface-elevated transition-colors">
                  <td className="px-3 py-2 font-mono font-medium">{s.period_label}</td>
                  <td className="px-3 py-2 text-text-secondary font-mono text-xs">
                    {s.period_from} ~ {s.period_to}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {s.expected_amount != null
                      ? `${s.expected_amount.toLocaleString()} ${s.currency_code ?? ''}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[s.status] ?? ''}`}
                    >
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Link
                      href={`/bordereau/${activeType === 'loss' ? 'loss' : 'premium'}/new?contractId=${contractId}&scheduleId=${s.id}&periodLabel=${s.period_label}`}
                      className="text-primary text-xs hover:underline"
                    >
                      입력
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
