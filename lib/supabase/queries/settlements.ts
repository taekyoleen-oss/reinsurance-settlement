import { createClient } from '@/lib/supabase/server'
import type { SettlementRow, SettlementInsert, SettlementMatchRow } from '@/types/database'
import { validateExchangeRate } from '@/lib/utils/exchange-rate'
import type { PaginationParams, PagedResult } from './types'

export type { PaginationParams, PagedResult }

export interface SettlementFilters {
  counterpartyId?: string
  currencyCode?: string
  matchStatus?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * 결제 목록 조회 (필터 + 페이지네이션 지원)
 */
export async function getSettlements(
  filters: SettlementFilters = {},
  pagination?: PaginationParams
): Promise<PagedResult<SettlementRow>> {
  const supabase = await createClient()

  let query = (supabase as any)
    .from('rs_settlements')
    .select('*', { count: 'exact' })
    .order('settlement_date', { ascending: false })

  if (filters.counterpartyId) query = query.eq('counterparty_id', filters.counterpartyId)
  if (filters.currencyCode)   query = query.eq('currency_code', filters.currencyCode)
  if (filters.matchStatus)    query = query.eq('match_status', filters.matchStatus)
  if (filters.dateFrom)       query = query.gte('settlement_date', filters.dateFrom)
  if (filters.dateTo)         query = query.lte('settlement_date', filters.dateTo)

  if (pagination) {
    const from = (pagination.page - 1) * pagination.pageSize
    query = query.range(from, from + pagination.pageSize - 1)
  }

  const { data, count, error } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? (data?.length ?? 0) }
}

/**
 * 결제 단건 조회
 */
export async function getSettlementById(id: string): Promise<SettlementRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rs_settlements')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

/**
 * 결제 등록
 */
export async function createSettlement(
  data: SettlementInsert
): Promise<SettlementRow> {
  const supabase = await createClient()
  const db = supabase as any

  const settlementDate = new Date(data.settlement_date)
  const amount = Number(data.amount)
  const rate =
    data.exchange_rate != null && Number(data.exchange_rate) > 0
      ? Number(data.exchange_rate)
      : await validateExchangeRate(data.currency_code, settlementDate)
  const amount_krw =
    data.currency_code === 'KRW' ? amount : Math.round(amount * rate)

  const { data: settlement, error } = await db
    .from('rs_settlements')
    .insert({
      settlement_type: data.settlement_type,
      counterparty_id: data.counterparty_id,
      amount,
      currency_code: data.currency_code,
      exchange_rate: rate,
      amount_krw,
      settlement_date: data.settlement_date,
      bank_reference: data.bank_reference ?? null,
      notes: data.notes ?? null,
      created_by: data.created_by,
      match_status: 'unmatched',
      matched_amount: 0,
    })
    .select()
    .single()

  if (error) throw error
  return settlement as SettlementRow
}

/**
 * 결제 ↔ 정산서 매칭 (1:1 완전 / 1:N 부분)
 */
export async function matchSettlement(
  settlementId: string,
  acId: string,
  matchedAmount: number,
  createdBy: string,
  txId?: string
): Promise<SettlementMatchRow> {
  const supabase = await createClient()
  const db = supabase as any

  // 결제 현황 조회
  const { data: settlement, error: sError } = await db
    .from('rs_settlements')
    .select('amount, matched_amount, currency_code')
    .eq('id', settlementId)
    .single()

  if (sError || !settlement) throw new Error('결제 내역을 찾을 수 없습니다.')

  const s = settlement as { amount: number; matched_amount: number | null }
  const newMatchedTotal = (s.matched_amount ?? 0) + matchedAmount
  if (newMatchedTotal > s.amount) {
    throw new Error(
      `매칭 금액 초과: 결제금액 ${s.amount}, 이미 매칭 ${s.matched_amount}, 요청 ${matchedAmount}`
    )
  }

  // 매칭 레코드 생성
  const { data: match, error: mError } = await db
    .from('rs_settlement_matches')
    .insert({
      settlement_id: settlementId,
      ac_id: acId,
      tx_id: txId ?? null,
      matched_amount: matchedAmount,
      created_by: createdBy,
    })
    .select()
    .single()

  if (mError) throw mError

  // 결제 match_status 업데이트
  const matchStatus = newMatchedTotal >= s.amount ? 'fully_matched' : 'partial'

  await db
    .from('rs_settlements')
    .update({
      matched_amount: newMatchedTotal,
      match_status: matchStatus,
    })
    .eq('id', settlementId)

  return match as SettlementMatchRow
}
