import { createClient } from '@/lib/supabase/server'
import type {
  PremiumBordereauRow,
  PremiumBordereauInsert,
  PremiumBordereauUpdate,
  LossBordereauRow,
  LossBordereauInsert,
  LossBordereauUpdate,
  ContractRow,
} from '@/types/database'
import type { BordereauFilters } from '@/types'
import {
  validatePremiumBordereau,
  validateLossBordereau,
} from '@/lib/utils/bordereau-validators'

// Supabase 클라이언트는 DB 마이그레이션 적용 후 gen types로 재생성되어야
// 정확한 타입을 제공합니다. 그 전까지는 명시적 단언으로 컴파일 오류를 방지합니다.
type AnySupabase = Awaited<ReturnType<typeof createClient>>

async function pb(supabase: AnySupabase) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('rs_premium_bordereau')
}

async function lb(supabase: AnySupabase) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('rs_loss_bordereau')
}

// ─────────────────────────────────────────────
// 보험료 명세 (Premium Bordereau)
// ─────────────────────────────────────────────

export async function getPremiumBordereau(
  filters: BordereauFilters = {}
): Promise<PremiumBordereauRow[]> {
  const supabase = await createClient()
  let query = (await pb(supabase))
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.contractId) query = query.eq('contract_id', filters.contractId)
  if (filters.periodYyyyqn) query = query.eq('period_yyyyqn', filters.periodYyyyqn)
  if (filters.validationStatus) query = query.eq('validation_status', filters.validationStatus)
  if (filters.entryType) query = query.eq('entry_type', filters.entryType)
  if (filters.dateFrom) query = query.gte('risk_period_from', filters.dateFrom)
  if (filters.dateTo) query = query.lte('risk_period_to', filters.dateTo)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PremiumBordereauRow[]
}

export async function getPremiumBordereauById(id: string): Promise<PremiumBordereauRow | null> {
  const supabase = await createClient()
  const { data, error } = await (await pb(supabase))
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as PremiumBordereauRow
}

function buildPremiumPayload(
  row: PremiumBordereauInsert,
  contract: ContractRow
): PremiumBordereauInsert {
  const { valid, errors, warnings } = validatePremiumBordereau(row, contract)
  return {
    ...row,
    validation_status: valid ? (warnings.length > 0 ? 'warning' : 'valid') : 'error',
    validation_messages:
      errors.length + warnings.length > 0
        ? [
            ...errors.map(e => ({ type: 'error', message: e })),
            ...warnings.map(w => ({ type: 'warning', message: w })),
          ]
        : null,
  }
}

export async function insertPremiumBordereau(
  row: PremiumBordereauInsert,
  contract: ContractRow
): Promise<PremiumBordereauRow> {
  const supabase = await createClient()
  const payload = buildPremiumPayload(row, contract)
  const { data, error } = await (await pb(supabase))
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as PremiumBordereauRow
}

export async function insertPremiumBordereauBatch(
  rows: PremiumBordereauInsert[],
  contract: ContractRow
): Promise<{ inserted: number; errors: Array<{ rowIndex: number; errors: string[] }> }> {
  const supabase = await createClient()
  const rowErrors: Array<{ rowIndex: number; errors: string[] }> = []
  const payloads = rows.map((row, idx) => {
    const { valid, errors } = validatePremiumBordereau(row, contract)
    if (!valid) rowErrors.push({ rowIndex: idx, errors })
    return buildPremiumPayload(row, contract)
  })

  const { error } = await (await pb(supabase)).insert(payloads)
  if (error) throw error
  return { inserted: payloads.length, errors: rowErrors }
}

export async function updatePremiumBordereau(
  id: string,
  update: PremiumBordereauUpdate
): Promise<PremiumBordereauRow> {
  const supabase = await createClient()
  const { data, error } = await (await pb(supabase))
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as PremiumBordereauRow
}

export async function deletePremiumBordereau(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await (await pb(supabase)).delete().eq('id', id)
  if (error) throw error
}

export async function linkPremiumBordereauToTransaction(
  bordereauIds: string[],
  transactionId: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await (await pb(supabase))
    .update({ transaction_id: transactionId, updated_at: new Date().toISOString() })
    .in('id', bordereauIds)
  if (error) throw error
}

// ─────────────────────────────────────────────
// 손해 명세 (Loss Bordereau)
// ─────────────────────────────────────────────

export async function getLossBordereau(
  filters: BordereauFilters = {}
): Promise<LossBordereauRow[]> {
  const supabase = await createClient()
  let query = (await lb(supabase))
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.contractId) query = query.eq('contract_id', filters.contractId)
  if (filters.periodYyyyqn) query = query.eq('period_yyyyqn', filters.periodYyyyqn)
  if (filters.validationStatus) query = query.eq('validation_status', filters.validationStatus)
  if (filters.dateFrom) query = query.gte('loss_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('loss_date', filters.dateTo)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as LossBordereauRow[]
}

export async function getLossBordereauById(id: string): Promise<LossBordereauRow | null> {
  const supabase = await createClient()
  const { data, error } = await (await lb(supabase))
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as LossBordereauRow
}

function buildLossPayload(
  row: LossBordereauInsert,
  contract: ContractRow
): LossBordereauInsert {
  const { valid, errors, warnings } = validateLossBordereau(row, contract)
  return {
    ...row,
    validation_status: valid ? (warnings.length > 0 ? 'warning' : 'valid') : 'error',
    validation_messages:
      errors.length + warnings.length > 0
        ? [
            ...errors.map(e => ({ type: 'error', message: e })),
            ...warnings.map(w => ({ type: 'warning', message: w })),
          ]
        : null,
  }
}

export async function insertLossBordereau(
  row: LossBordereauInsert,
  contract: ContractRow
): Promise<LossBordereauRow> {
  const supabase = await createClient()
  const payload = buildLossPayload(row, contract)
  const { data, error } = await (await lb(supabase))
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as LossBordereauRow
}

export async function insertLossBordereauBatch(
  rows: LossBordereauInsert[],
  contract: ContractRow
): Promise<{ inserted: number; errors: Array<{ rowIndex: number; errors: string[] }> }> {
  const supabase = await createClient()
  const rowErrors: Array<{ rowIndex: number; errors: string[] }> = []
  const payloads = rows.map((row, idx) => {
    const { valid, errors } = validateLossBordereau(row, contract)
    if (!valid) rowErrors.push({ rowIndex: idx, errors })
    return buildLossPayload(row, contract)
  })

  const { error } = await (await lb(supabase)).insert(payloads)
  if (error) throw error
  return { inserted: payloads.length, errors: rowErrors }
}

export async function updateLossBordereau(
  id: string,
  update: LossBordereauUpdate
): Promise<LossBordereauRow> {
  const supabase = await createClient()
  const { data, error } = await (await lb(supabase))
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as LossBordereauRow
}

export async function deleteLossBordereau(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await (await lb(supabase)).delete().eq('id', id)
  if (error) throw error
}

export async function linkLossBordereauToTransaction(
  bordereauIds: string[],
  transactionId: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await (await lb(supabase))
    .update({ transaction_id: transactionId, updated_at: new Date().toISOString() })
    .in('id', bordereauIds)
  if (error) throw error
}
