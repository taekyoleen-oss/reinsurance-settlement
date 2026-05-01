import { createClient } from '@/lib/supabase/server'

/** OutstandingKPICard 컴포넌트가 기대하는 형태 */
export interface OutstandingResult {
  currency: string
  receivable: number
  payable: number
  net: number
}

/** AgingAnalysisTable 컴포넌트가 기대하는 형태 */
export interface AgingResult {
  counterparty: string
  currency: string
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  days_over_90: number
  total: number
}

/** OutstandingPage 상세 테이블이 기대하는 형태 */
export interface OutstandingDetailItem {
  counterparty_id: string
  counterparty_name: string
  contract_id: string
  contract_no: string
  currency_code: string
  direction: string
  amount: number
  due_date?: string
  aging_bucket: string
}

/**
 * 통화별 미청산 잔액 (rs_calc_outstanding RPC)
 * SECURITY DEFINER 함수가 RLS를 우회하므로 adminClient 불필요
 */
export async function calculateOutstanding(
  counterpartyId?: string,
  currencyCode?: string,
  contractId?: string,
  cedantId?: string
): Promise<OutstandingResult[]> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('rs_calc_outstanding', {
    p_counterparty_id: counterpartyId ?? null,
    p_currency_code:   currencyCode   ?? null,
    p_contract_id:     contractId     ?? null,
    p_cedant_id:       cedantId       ?? null,
  })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    currency:   row.currency,
    receivable: Number(row.receivable),
    payable:    Number(row.payable),
    net:        Number(row.net),
  }))
}

/**
 * 거래상대방 + 통화 단위 Aging 분석 (rs_calc_aging RPC)
 */
export async function getAgingAnalysis(
  counterpartyId?: string,
  contractId?: string,
  cedantId?: string
): Promise<AgingResult[]> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('rs_calc_aging', {
    p_counterparty_id: counterpartyId ?? null,
    p_contract_id:     contractId     ?? null,
    p_cedant_id:       cedantId       ?? null,
  })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    counterparty: row.counterparty,
    currency:     row.currency,
    current:      Number(row.current_amount),
    days_1_30:    Number(row.days_1_30),
    days_31_60:   Number(row.days_31_60),
    days_61_90:   Number(row.days_61_90),
    days_over_90: Number(row.days_over_90),
    total:        Number(row.total),
  }))
}

/**
 * 거래별 미청산 상세 목록 (rs_calc_outstanding_detail RPC)
 */
export async function getOutstandingDetail(
  counterpartyId?: string,
  currencyCode?: string,
  contractId?: string,
  cedantId?: string
): Promise<OutstandingDetailItem[]> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('rs_calc_outstanding_detail', {
    p_counterparty_id: counterpartyId ?? null,
    p_currency_code:   currencyCode   ?? null,
    p_contract_id:     contractId     ?? null,
    p_cedant_id:       cedantId       ?? null,
  })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    counterparty_id:   row.counterparty_id,
    counterparty_name: row.counterparty_name,
    contract_id:       row.contract_id,
    contract_no:       row.contract_no,
    currency_code:     row.currency_code,
    direction:         row.direction,
    amount:            Number(row.amount),
    due_date:          row.due_date ?? undefined,
    aging_bucket:      row.aging_bucket,
  }))
}

/** @deprecated classifyAging는 rs_calc_aging / rs_calc_outstanding_detail RPC 내부에서 처리됨 */
export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+'
