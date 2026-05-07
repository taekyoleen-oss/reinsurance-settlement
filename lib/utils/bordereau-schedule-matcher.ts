import { createClient } from '@/lib/supabase/server'

/**
 * 명세의 period_yyyyqn과 contract_id를 받아 매칭되는 settlement_schedule_id를 반환.
 * 명세 저장 직전에 호출해 FK를 자동으로 채운다.
 */
export async function findScheduleId(params: {
  contractId: string
  scheduleType: 'premium' | 'loss' | 'commission'
  periodLabel: string // '2026Q1', '2026H1', '2026', 'AD-...' 등
}): Promise<string | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('rs_contract_settlement_schedules')
    .select('id')
    .eq('contract_id', params.contractId)
    .eq('schedule_type', params.scheduleType)
    .eq('period_label', params.periodLabel)
    .single()
  return data?.id ?? null
}

/**
 * period_yyyyqn 형식(예: '2026Q1')을 period_label 후보로 변환.
 * rs_premium_bordereau의 period_yyyyqn 컬럼 값을 그대로 쓸 수 있다.
 */
export function normalizePeriodLabel(raw: string): string {
  return raw.trim().toUpperCase()
}
