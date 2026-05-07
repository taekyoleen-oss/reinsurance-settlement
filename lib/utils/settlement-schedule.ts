import type { PeriodType } from '@/types'

export interface ScheduleInstance {
  schedule_type: 'premium' | 'loss' | 'commission'
  period_label: string
  period_from: string // 'YYYY-MM-DD'
  period_to: string
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function lastDayOf(year: number, month: number): Date {
  return new Date(year, month, 0) // month is 1-based → day 0 = last day of prev month
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function quarterLabel(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3)
  return `${date.getFullYear()}Q${q}`
}

function halfLabel(date: Date): string {
  const h = date.getMonth() < 6 ? 1 : 2
  return `${date.getFullYear()}H${h}`
}

function quarterRange(year: number, q: number): { from: Date; to: Date } {
  const startMonth = (q - 1) * 3 + 1 // Q1→1, Q2→4, Q3→7, Q4→10
  const from = new Date(year, startMonth - 1, 1)
  const to = lastDayOf(year, startMonth + 2)
  return { from, to }
}

function halfRange(year: number, h: number): { from: Date; to: Date } {
  if (h === 1) {
    return { from: new Date(year, 0, 1), to: new Date(year, 5, 30) }
  }
  return { from: new Date(year, 6, 1), to: new Date(year, 11, 31) }
}

export function generateSchedules(params: {
  scheduleType: 'premium' | 'loss' | 'commission'
  period: PeriodType
  inceptionDate: string
  expiryDate: string
}): ScheduleInstance[] {
  const { scheduleType, period, inceptionDate, expiryDate } = params
  const start = new Date(inceptionDate)
  const end = new Date(expiryDate)
  const results: ScheduleInstance[] = []

  if (period === 'adhoc') {
    // adhoc: 계약 전체 기간 1개 인스턴스
    const label = `AD-${inceptionDate}`
    results.push({
      schedule_type: scheduleType,
      period_label: label,
      period_from: inceptionDate,
      period_to: expiryDate,
    })
    return results
  }

  if (period === 'annual') {
    let year = start.getFullYear()
    while (year <= end.getFullYear()) {
      const from = year === start.getFullYear() ? start : new Date(year, 0, 1)
      const to = year === end.getFullYear() ? end : new Date(year, 11, 31)
      if (from <= end) {
        results.push({
          schedule_type: scheduleType,
          period_label: `${year}`,
          period_from: formatDate(from),
          period_to: formatDate(to),
        })
      }
      year++
    }
    return results
  }

  if (period === 'semiannual') {
    let cursor = new Date(start.getFullYear(), start.getMonth() < 6 ? 0 : 6, 1)
    while (cursor <= end) {
      const year = cursor.getFullYear()
      const h = cursor.getMonth() < 6 ? 1 : 2
      const range = halfRange(year, h)
      const from = range.from < start ? start : range.from
      const to = range.to > end ? end : range.to
      if (from <= to) {
        results.push({
          schedule_type: scheduleType,
          period_label: halfLabel(cursor),
          period_from: formatDate(from),
          period_to: formatDate(to),
        })
      }
      cursor = addMonths(cursor, 6)
    }
    return results
  }

  // quarterly (default)
  let cursor = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1)
  while (cursor <= end) {
    const year = cursor.getFullYear()
    const q = Math.ceil((cursor.getMonth() + 1) / 3)
    const range = quarterRange(year, q)
    const from = range.from < start ? start : range.from
    const to = range.to > end ? end : range.to
    if (from <= to) {
      results.push({
        schedule_type: scheduleType,
        period_label: quarterLabel(cursor),
        period_from: formatDate(from),
        period_to: formatDate(to),
      })
    }
    cursor = addMonths(cursor, 3)
  }
  return results
}

export function periodLabelFromDate(date: string, period: PeriodType): string {
  const d = new Date(date)
  if (period === 'quarterly') return quarterLabel(d)
  if (period === 'semiannual') return halfLabel(d)
  if (period === 'annual') return `${d.getFullYear()}`
  return `AD-${date}`
}
