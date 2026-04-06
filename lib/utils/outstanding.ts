import { createClient } from '@/lib/supabase/server'

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+'

export interface OutstandingResult {
  counterparty_id: string
  currency_code: string
  receivable: number
  payable: number
  net_outstanding: number // receivable - payable
}

export interface AgingResult {
  counterparty_id: string
  currency_code: string
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  days_90_plus: number
  total: number
}

/**
 * 거래상대방별 미청산 잔액 계산
 * Outstanding = Σ(receivable) - Σ(payable) - Σ(matched_amount)
 * is_allocation_parent=false 레코드만 포함
 */
export async function calculateOutstanding(
  counterpartyId?: string,
  currencyCode?: string
): Promise<OutstandingResult[]> {
  const supabase = await createClient()
  const db = supabase as any

  let query = db
    .from('rs_transactions')
    .select(
      `
      counterparty_id,
      currency_code,
      direction,
      amount_original,
      id,
      rs_settlement_matches!rs_settlement_matches_tx_id_fkey(matched_amount)
    `
    )
    .eq('is_allocation_parent', false)
    .eq('is_deleted', false)
    .in('status', ['confirmed', 'billed'])

  if (counterpartyId) query = query.eq('counterparty_id', counterpartyId)
  if (currencyCode) query = query.eq('currency_code', currencyCode)

  const { data: txs, error } = await query
  if (error) throw error

  // counterparty + currency 단위로 집계
  const grouped = new Map<string, OutstandingResult>()

  for (const tx of (txs ?? []) as any[]) {
    const key = `${tx.counterparty_id}|${tx.currency_code}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        counterparty_id: tx.counterparty_id,
        currency_code: tx.currency_code,
        receivable: 0,
        payable: 0,
        net_outstanding: 0,
      })
    }
    const item = grouped.get(key)!
    const matchedAmount = ((tx.rs_settlement_matches as any[]) ?? []).reduce(
      (s: number, m: any) => s + (m.matched_amount ?? 0),
      0
    )
    const netAmount = tx.amount_original - matchedAmount

    if (tx.direction === 'receivable') {
      item.receivable += netAmount
    } else {
      item.payable += netAmount
    }
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    net_outstanding: item.receivable - item.payable,
  }))
}

/**
 * due_date 기준 Aging 버킷 분류
 * Current / 1-30 / 31-60 / 61-90 / 90+ 일
 */
export function classifyAging(dueDate: Date | null): AgingBucket {
  if (!dueDate) return 'current'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor(
    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays <= 0) return 'current'
  if (diffDays <= 30) return '1-30'
  if (diffDays <= 60) return '31-60'
  if (diffDays <= 90) return '61-90'
  return '90+'
}

/**
 * Aging 분석 집계
 * counterparty + currency 단위로 Aging 버킷별 금액 합산
 */
export async function getAgingAnalysis(
  counterpartyId?: string
): Promise<AgingResult[]> {
  const supabase = await createClient()
  const db = supabase as any

  let query = db
    .from('rs_transactions')
    .select('counterparty_id, currency_code, direction, amount_original, due_date')
    .eq('is_allocation_parent', false)
    .eq('is_deleted', false)
    .in('status', ['confirmed', 'billed'])

  if (counterpartyId) query = query.eq('counterparty_id', counterpartyId)

  const { data: txs, error } = await query
  if (error) throw error

  const grouped = new Map<string, AgingResult>()

  for (const tx of (txs ?? []) as any[]) {
    const key = `${tx.counterparty_id}|${tx.currency_code}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        counterparty_id: tx.counterparty_id,
        currency_code: tx.currency_code,
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_90_plus: 0,
        total: 0,
      })
    }
    const item = grouped.get(key)!
    const amount =
      tx.direction === 'receivable' ? tx.amount_original : -tx.amount_original
    const bucket = classifyAging(tx.due_date ? new Date(tx.due_date) : null)

    switch (bucket) {
      case 'current':
        item.current += amount
        break
      case '1-30':
        item.days_1_30 += amount
        break
      case '31-60':
        item.days_31_60 += amount
        break
      case '61-90':
        item.days_61_90 += amount
        break
      case '90+':
        item.days_90_plus += amount
        break
    }
    item.total += amount
  }

  return Array.from(grouped.values())
}
