import { createClient } from '@/lib/supabase/server'
import type {
  AccountCurrentRow,
  AccountCurrentInsert,
  AccountCurrentItemRow,
  ACStatus,
} from '@/types/database'
import {
  aggregateAccountCurrent,
  checkDuplicateAC,
} from '@/lib/utils/account-current'
import type { PaginationParams, PagedResult } from './types'

export type { PaginationParams, PagedResult }

export interface ACFilters {
  contractId?: string
  /** 출재사(cedant) — 해당 출재사 소속 계약의 정산서만 (contractId 미지정 시) */
  cedantId?: string
  counterpartyId?: string
  status?: string
  periodType?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * 정산서 목록 조회 (필터 + 페이지네이션 지원)
 */
export async function getAccountCurrents(
  filters: ACFilters = {},
  pagination?: PaginationParams
): Promise<PagedResult<AccountCurrentRow>> {
  const supabase = await createClient()
  const db = supabase as any

  let contractIdsForCedant: string[] | null = null
  if (filters.cedantId && !filters.contractId) {
    const { data: crs, error: cErr } = await db
      .from('rs_contracts')
      .select('id')
      .eq('cedant_id', filters.cedantId)
    if (cErr) throw cErr
    const ids = ((crs ?? []) as { id: string }[]).map((r) => r.id)
    if (ids.length === 0) return { data: [], total: 0 }
    contractIdsForCedant = ids
  }

  if (filters.contractId && filters.cedantId) {
    const { data: c, error: oneErr } = await db
      .from('rs_contracts')
      .select('cedant_id')
      .eq('id', filters.contractId)
      .maybeSingle()
    if (oneErr) throw oneErr
    const row = c as { cedant_id: string } | null
    if (!row || row.cedant_id !== filters.cedantId) return { data: [], total: 0 }
  }

  let query = db
    .from('rs_account_currents')
    .select('*', { count: 'exact' })
    .order('period_from', { ascending: false })

  if (filters.contractId) query = query.eq('contract_id', filters.contractId)
  else if (contractIdsForCedant) query = query.in('contract_id', contractIdsForCedant)
  if (filters.counterpartyId) query = query.eq('counterparty_id', filters.counterpartyId)
  if (filters.status)     query = query.eq('status', filters.status)
  if (filters.periodType) query = query.eq('period_type', filters.periodType)
  if (filters.dateFrom)   query = query.gte('period_from', filters.dateFrom)
  if (filters.dateTo)     query = query.lte('period_to', filters.dateTo)

  if (pagination) {
    const from = (pagination.page - 1) * pagination.pageSize
    query = query.range(from, from + pagination.pageSize - 1)
  }

  const { data, count, error } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? (data?.length ?? 0) }
}

/**
 * 정산서 단건 조회 (items 포함)
 */
export async function getAccountCurrentById(id: string): Promise<
  | (AccountCurrentRow & {
      items: AccountCurrentItemRow[]
    })
  | null
> {
  const supabase = await createClient()
  const db = supabase as any

  const { data: ac, error: acError } = await db
    .from('rs_account_currents')
    .select('*')
    .eq('id', id)
    .single()

  if (acError || !ac) return null

  const { data: items } = await db
    .from('rs_account_current_items')
    .select('*')
    .eq('ac_id', id)
    .order('transaction_type')

  return { ...(ac as AccountCurrentRow), items: (items ?? []) as AccountCurrentItemRow[] }
}

/**
 * 정산서 생성 (B/F 자동계산, 중복체크)
 * 반환: { ac, isDuplicate }
 */
export async function createAccountCurrent(
  data: Omit<
    AccountCurrentInsert,
    | 'balance_bf'
    | 'subtotal_premium'
    | 'subtotal_loss'
    | 'subtotal_commission'
    | 'subtotal_other'
    | 'net_balance'
    | 'direction'
  > & {
    settlementCurrency: string
  }
): Promise<{ ac: AccountCurrentRow; isDuplicate: boolean }> {
  const supabase = await createClient()
  const db = supabase as any

  const periodFrom = new Date(data.period_from)
  const periodTo = new Date(data.period_to)

  // 중복 체크 (차단 아님, 경고용)
  const isDuplicate = await checkDuplicateAC(
    data.contract_id,
    data.counterparty_id,
    data.period_from,
    data.period_to
  )

  // B/F + 집계 자동 계산
  const aggregate = await aggregateAccountCurrent({
    contractId: data.contract_id,
    counterpartyId: data.counterparty_id,
    periodFrom,
    periodTo,
    settlementCurrency: data.settlementCurrency,
  })

  const { data: ac, error } = await db
    .from('rs_account_currents')
    .insert({
      contract_id: data.contract_id,
      counterparty_id: data.counterparty_id,
      period_type: data.period_type,
      period_from: data.period_from,
      period_to: data.period_to,
      currency_code: data.currency_code,
      due_date: data.due_date ?? null,
      notes: data.notes ?? null,
      created_by: data.created_by,
      status: 'draft',
      direction: aggregate.direction,
      balance_bf: aggregate.balance_bf,
      subtotal_premium: aggregate.subtotal_premium,
      subtotal_loss: aggregate.subtotal_loss,
      subtotal_commission: aggregate.subtotal_commission,
      subtotal_other: aggregate.subtotal_other,
      net_balance: aggregate.net_balance,
    })
    .select()
    .single()

  if (error) throw error
  return { ac, isDuplicate }
}

/**
 * AC 상태 업데이트 (워크플로우)
 */
export async function updateACStatus(
  id: string,
  status: ACStatus,
  userId: string,
  extra?: Partial<AccountCurrentRow>
): Promise<AccountCurrentRow> {
  const supabase = await createClient()
  const db = supabase as any

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  }

  if (status === 'approved') {
    updates.approved_by = userId
    updates.approved_at = new Date().toISOString()
  }
  if (status === 'issued') {
    updates.issued_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from('rs_account_currents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as AccountCurrentRow
}
