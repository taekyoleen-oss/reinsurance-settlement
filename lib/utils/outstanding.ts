import { adminClient } from '@/lib/supabase/admin'

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+'

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
 * 거래별 미청산 상세 목록 (OutstandingPage 전용)
 */
export async function getOutstandingDetail(
  counterpartyId?: string,
  currencyCode?: string
): Promise<OutstandingDetailItem[]> {
  const db = adminClient as any

  let query = db
    .from('rs_transactions')
    .select(`
      counterparty_id,
      contract_id,
      currency_code,
      direction,
      amount_original,
      due_date,
      rs_counterparties!rs_transactions_counterparty_id_fkey(company_name_ko),
      rs_contracts!rs_transactions_contract_id_fkey(contract_no)
    `)
    .eq('is_allocation_parent', false)
    .eq('is_deleted', false)
    .in('status', ['confirmed', 'billed'])
    .order('due_date', { ascending: true, nullsFirst: false })

  if (counterpartyId) query = query.eq('counterparty_id', counterpartyId)
  if (currencyCode)   query = query.eq('currency_code', currencyCode)

  const { data: txs, error } = await query
  if (error) throw error

  return (txs ?? []).map((tx: any) => {
    const bucket = classifyAging(tx.due_date ? new Date(tx.due_date) : null)
    return {
      counterparty_id:   tx.counterparty_id,
      counterparty_name: tx.rs_counterparties?.company_name_ko ?? tx.counterparty_id,
      contract_id:       tx.contract_id,
      contract_no:       tx.rs_contracts?.contract_no ?? tx.contract_id,
      currency_code:     tx.currency_code,
      direction:         tx.direction,
      amount:            Number(tx.amount_original),
      due_date:          tx.due_date ?? undefined,
      aging_bucket:      bucket,
    }
  })
}

/**
 * 통화별 미청산 잔액 계산
 * 대상: is_allocation_parent=false, status IN ('confirmed','billed'), is_deleted=false
 * status='settled' 거래는 이미 제외되므로 별도 settlement 차감 불필요
 */
export async function calculateOutstanding(
  counterpartyId?: string,
  currencyCode?: string
): Promise<OutstandingResult[]> {
  const db = adminClient as any

  let query = db
    .from('rs_transactions')
    .select('currency_code, direction, amount_original')
    .eq('is_allocation_parent', false)
    .eq('is_deleted', false)
    .in('status', ['confirmed', 'billed'])

  if (counterpartyId) query = query.eq('counterparty_id', counterpartyId)
  if (currencyCode)   query = query.eq('currency_code', currencyCode)

  const { data: txs, error } = await query
  if (error) throw error

  const grouped = new Map<string, OutstandingResult>()

  for (const tx of (txs ?? []) as any[]) {
    if (!grouped.has(tx.currency_code)) {
      grouped.set(tx.currency_code, {
        currency: tx.currency_code,
        receivable: 0,
        payable: 0,
        net: 0,
      })
    }
    const item = grouped.get(tx.currency_code)!
    if (tx.direction === 'receivable') {
      item.receivable += Number(tx.amount_original)
    } else {
      item.payable += Number(tx.amount_original)
    }
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    net: item.receivable - item.payable,
  }))
}

/**
 * due_date 기준 Aging 버킷 분류
 */
export function classifyAging(dueDate: Date | null): AgingBucket {
  if (!dueDate) return 'current'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor(
    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays <= 0)  return 'current'
  if (diffDays <= 30) return '1-30'
  if (diffDays <= 60) return '31-60'
  if (diffDays <= 90) return '61-90'
  return '90+'
}

/**
 * 거래상대방 + 통화 단위 Aging 분석
 * AgingAnalysisTable 컴포넌트 형태에 맞춰 반환
 */
export async function getAgingAnalysis(
  counterpartyId?: string
): Promise<AgingResult[]> {
  const db = adminClient as any

  let query = db
    .from('rs_transactions')
    .select(`
      counterparty_id,
      currency_code,
      direction,
      amount_original,
      due_date,
      rs_counterparties!rs_transactions_counterparty_id_fkey(company_name_ko)
    `)
    .eq('is_allocation_parent', false)
    .eq('is_deleted', false)
    .in('status', ['confirmed', 'billed'])

  if (counterpartyId) query = query.eq('counterparty_id', counterpartyId)

  const { data: txs, error } = await query
  if (error) throw error

  const grouped = new Map<string, AgingResult>()

  for (const tx of (txs ?? []) as any[]) {
    const counterpartyName: string =
      tx.rs_counterparties?.company_name_ko ?? tx.counterparty_id
    const key = `${tx.counterparty_id}|${tx.currency_code}`

    if (!grouped.has(key)) {
      grouped.set(key, {
        counterparty: counterpartyName,
        currency: tx.currency_code,
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_over_90: 0,
        total: 0,
      })
    }

    const item = grouped.get(key)!
    const amount =
      tx.direction === 'receivable'
        ? Number(tx.amount_original)
        : -Number(tx.amount_original)
    const bucket = classifyAging(tx.due_date ? new Date(tx.due_date) : null)

    switch (bucket) {
      case 'current': item.current    += amount; break
      case '1-30':    item.days_1_30  += amount; break
      case '31-60':   item.days_31_60 += amount; break
      case '61-90':   item.days_61_90 += amount; break
      case '90+':     item.days_over_90 += amount; break
    }
    item.total += amount
  }

  return Array.from(grouped.values())
}
