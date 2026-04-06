export type PeriodType = 'quarterly' | 'semiannual' | 'annual' | 'adhoc'

/**
 * 정산 주기 타입과 기준 날짜를 받아 해당 기간의 시작/종료일 반환
 */
export function getDefaultPeriod(
  type: PeriodType,
  referenceDate: Date
): { from: Date; to: Date } {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() // 0-indexed

  switch (type) {
    case 'quarterly': {
      const q = Math.floor(month / 3)
      return {
        from: new Date(year, q * 3, 1),
        to: new Date(year, q * 3 + 3, 0), // 다음 분기 첫 날 - 1 = 이번 분기 마지막 날
      }
    }
    case 'semiannual': {
      const half = month < 6 ? 0 : 1
      return {
        from: new Date(year, half * 6, 1),
        to: new Date(year, half * 6 + 6, 0),
      }
    }
    case 'annual':
      return {
        from: new Date(year, 0, 1),
        to: new Date(year, 11, 31),
      }
    case 'adhoc':
      return {
        from: referenceDate,
        to: referenceDate,
      }
  }
}

/**
 * 정산 주기 라벨 생성 (예: "2025 Q1", "2025 H2", "2025", "수시 (2025.01.01 ~ 2025.03.31)")
 */
export function formatPeriodLabel(type: PeriodType, from: Date, to: Date): string {
  const year = from.getFullYear()

  switch (type) {
    case 'quarterly':
      return `${year} Q${Math.floor(from.getMonth() / 3) + 1}`
    case 'semiannual':
      return `${year} ${from.getMonth() < 6 ? 'H1' : 'H2'}`
    case 'annual':
      return `${year}`
    case 'adhoc': {
      const fmt = (d: Date) =>
        d.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      return `수시 (${fmt(from)} ~ ${fmt(to)})`
    }
  }
}

/**
 * Date를 YYYY-MM-DD 문자열로 변환
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * YYYY-MM-DD 문자열을 Date로 변환
 */
export function fromDateString(str: string): Date {
  return new Date(`${str}T00:00:00`)
}
