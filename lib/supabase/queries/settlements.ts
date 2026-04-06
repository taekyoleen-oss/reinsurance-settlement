import { createClient } from '@/lib/supabase/server'
import type { SettlementRow, SettlementInsert, SettlementMatchRow } from '@/types/database'

export interface SettlementFilters {
  counterpartyId?: string
  currencyCode?: string
  matchStatus?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * 결제 목록 조회
 */
export async function getSettlements(
  filters: SettlementFilters = {}
): Promise<SettlementRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from('rs_settlements')
    .select('*')
    .order('settlement_date', { ascending: false })

  if (filters.counterpartyId)
    query = query.eq('counterparty_id', filters.counterpartyId)
  if (filters.currencyCode)
    query = query.eq('currency_code', filters.currencyCode)
  if (filters.matchStatus)
    query = query.eq('match_status', filters.matchStatus)
  if (filters.dateFrom) query = query.gte('settlement_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('settlement_date', filters.dateTo)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
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

  const { data: settlement, error } = await db
    .from('rs_settlements')
    .insert({
      ...data,
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
