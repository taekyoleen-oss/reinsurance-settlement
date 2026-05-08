import { createClient } from '@/lib/supabase/server'
import { generateSchedules } from '@/lib/utils/settlement-schedule'
import type { PeriodType } from '@/types'

export async function getSchedulesByContract(contractId: string, scheduleType?: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  let q = db
    .from('rs_contract_settlement_schedules')
    .select('*')
    .eq('contract_id', contractId)
    .order('period_from', { ascending: true })

  if (scheduleType) q = q.eq('schedule_type', scheduleType)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getOpenSchedules(contractId: string, scheduleType: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_contract_settlement_schedules')
    .select('id, period_label, period_from, period_to, expected_amount, currency_code, status')
    .eq('contract_id', contractId)
    .eq('schedule_type', scheduleType)
    .neq('status', 'closed')
    .neq('status', 'cancelled')
    .order('period_from', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createSchedule(params: {
  contractId: string
  scheduleType: 'premium' | 'loss' | 'commission'
  periodLabel: string
  periodFrom: string
  periodTo: string
  expectedAmount?: number
  currencyCode?: string
  notes?: string
  createdBy: string
}) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_contract_settlement_schedules')
    .insert({
      contract_id: params.contractId,
      schedule_type: params.scheduleType,
      period_label: params.periodLabel,
      period_from: params.periodFrom,
      period_to: params.periodTo,
      expected_amount: params.expectedAmount ?? null,
      currency_code: params.currencyCode ?? null,
      notes: params.notes ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function generateAndInsertSchedules(params: {
  contractId: string
  scheduleType: 'premium' | 'loss' | 'commission'
  period: PeriodType
  inceptionDate: string
  expiryDate: string
  currencyCode?: string
  createdBy: string
}) {
  const instances = generateSchedules({
    scheduleType: params.scheduleType,
    period: params.period,
    inceptionDate: params.inceptionDate,
    expiryDate: params.expiryDate,
  })

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const rows = instances.map((inst) => ({
    contract_id: params.contractId,
    schedule_type: inst.schedule_type,
    period_label: inst.period_label,
    period_from: inst.period_from,
    period_to: inst.period_to,
    currency_code: params.currencyCode ?? null,
    created_by: params.createdBy,
  }))

  const { data, error } = await db
    .from('rs_contract_settlement_schedules')
    .upsert(rows, { onConflict: 'contract_id,schedule_type,period_label', ignoreDuplicates: true })
    .select()
  if (error) throw error
  return data ?? []
}

export async function updateSchedule(
  id: string,
  updates: {
    status?: 'open' | 'in_progress' | 'closed' | 'cancelled'
    expectedAmount?: number | null
    notes?: string
  }
) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_contract_settlement_schedules')
    .update({
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.expectedAmount !== undefined && { expected_amount: updates.expectedAmount }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSchedule(id: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('rs_contract_settlement_schedules').delete().eq('id', id)
  if (error) throw error
}
