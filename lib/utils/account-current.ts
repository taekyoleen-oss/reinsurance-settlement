import { createClient } from '@/lib/supabase/server'

export interface ACAggregateParams {
  contractId: string
  counterpartyId: string
  periodFrom: Date
  periodTo: Date
  settlementCurrency: string
}

export interface ACAggregate {
  subtotal_premium: number
  subtotal_loss: number
  subtotal_commission: number
  subtotal_other: number
  balance_bf: number
  net_balance: number
  direction: 'to_reinsurer' | 'to_cedant'
  transaction_ids: string[]
}

/**
 * B/F 계산: 직전 AC net_balance - 직전 AC에 매칭된 settlement 합계
 * 직전 AC가 없으면 0 반환
 */
export async function calculateBF(
  contractId: string,
  counterpartyId: string,
  currentPeriodFrom: Date
): Promise<number> {
  const supabase = await createClient()
  const db = supabase as any

  // 직전 AC 조회 (cancelled 제외, 현재 기간 시작 이전)
  const { data: prevAC } = await db
    .from('rs_account_currents')
    .select('id, net_balance')
    .eq('contract_id', contractId)
    .eq('counterparty_id', counterpartyId)
    .lt('period_to', currentPeriodFrom.toISOString().split('T')[0])
    .in('status', ['issued', 'acknowledged', 'disputed'])
    .order('period_to', { ascending: false })
    .limit(1)
    .single()

  if (!prevAC) return 0

  // 직전 AC에 매칭된 settlement 합계
  const { data: matches } = await db
    .from('rs_settlement_matches')
    .select('matched_amount')
    .eq('ac_id', prevAC.id)

  const matchedSum = (matches ?? []).reduce(
    (s: number, m: any) => s + (m.matched_amount ?? 0),
    0
  )

  return (prevAC.net_balance ?? 0) - matchedSum
}

/**
 * AC 집계: transaction_type별 합산 + direction 자동결정
 * is_allocation_parent=false 레코드만 집계 (Parent TX 제외)
 */
export async function aggregateAccountCurrent(
  params: ACAggregateParams
): Promise<ACAggregate> {
  const supabase = await createClient()
  const db = supabase as any
  const fromStr = params.periodFrom.toISOString().split('T')[0]
  const toStr = params.periodTo.toISOString().split('T')[0]

  const { data: txs } = await db
    .from('rs_transactions')
    .select('id, transaction_type, direction, amount_original, currency_code, exchange_rate')
    .eq('contract_id', params.contractId)
    .eq('counterparty_id', params.counterpartyId)
    .eq('is_allocation_parent', false)
    .eq('is_deleted', false)
    .in('status', ['confirmed', 'billed'])
    .gte('period_from', fromStr)
    .lte('period_to', toStr)

  const items = txs ?? []
  let subtotal_premium = 0
  let subtotal_loss = 0
  let subtotal_commission = 0
  let subtotal_other = 0

  for (const tx of items) {
    // settlement_currency로 환산
    const rate = tx.exchange_rate ?? 1
    const amount = tx.amount_original * rate
    const signed = tx.direction === 'receivable' ? amount : -amount

    switch (tx.transaction_type) {
      case 'premium':
        subtotal_premium += signed
        break
      case 'return_premium':
        subtotal_premium += signed
        break
      case 'loss':
        subtotal_loss += signed
        break
      case 'commission':
        subtotal_commission += signed
        break
      default:
        subtotal_other += signed
        break
    }
  }

  const balance_bf = await calculateBF(
    params.contractId,
    params.counterpartyId,
    params.periodFrom
  )

  const net_balance =
    balance_bf + subtotal_premium + subtotal_loss + subtotal_commission + subtotal_other

  return {
    subtotal_premium,
    subtotal_loss,
    subtotal_commission,
    subtotal_other,
    balance_bf,
    net_balance,
    direction: net_balance > 0 ? 'to_reinsurer' : 'to_cedant',
    transaction_ids: items.map((t: any) => t.id),
  }
}

/**
 * AC issued 시 스냅샷 저장
 * 해당 시점의 거래 항목을 rs_account_current_items에 복사
 */
export async function snapshotACItems(acId: string): Promise<void> {
  const supabase = await createClient()
  const db = supabase as any

  const { data: ac, error: acError } = await db
    .from('rs_account_currents')
    .select('contract_id, counterparty_id, period_from, period_to')
    .eq('id', acId)
    .single()

  if (acError || !ac) throw new Error('AC not found')

  const { data: txs } = await db
    .from('rs_transactions')
    .select('*')
    .eq('contract_id', ac.contract_id)
    .eq('counterparty_id', ac.counterparty_id)
    .eq('is_allocation_parent', false)
    .eq('is_deleted', false)
    .in('status', ['confirmed', 'billed'])
    .gte('period_from', ac.period_from)
    .lte('period_to', ac.period_to)

  const snapshotDate = new Date().toISOString()
  const snapshotItems = (txs ?? []).map((tx: any) => ({
    ac_id: acId,
    tx_id: tx.id,
    transaction_type: tx.transaction_type,
    description: tx.description,
    amount_original: tx.amount_original,
    currency_code: tx.currency_code,
    exchange_rate: tx.exchange_rate,
    amount_settlement_currency: tx.amount_original * (tx.exchange_rate ?? 1),
    direction: tx.direction,
    snapshot_date: snapshotDate,
  }))

  if (snapshotItems.length > 0) {
    const { error } = await db
      .from('rs_account_current_items')
      .insert(snapshotItems)
    if (error) throw error
  }
}

/**
 * 중복 AC 체크
 * 동일 contract+counterparty+기간 겹치는 AC가 존재하면 true (cancelled 제외)
 */
export async function checkDuplicateAC(
  contractId: string,
  counterpartyId: string,
  periodFrom: string,
  periodTo: string
): Promise<boolean> {
  const supabase = await createClient()
  const db = supabase as any

  const { count } = await db
    .from('rs_account_currents')
    .select('id', { count: 'exact', head: true })
    .eq('contract_id', contractId)
    .eq('counterparty_id', counterpartyId)
    .lte('period_from', periodTo)
    .gte('period_to', periodFrom)
    .neq('status', 'cancelled')

  return (count ?? 0) > 0
}
