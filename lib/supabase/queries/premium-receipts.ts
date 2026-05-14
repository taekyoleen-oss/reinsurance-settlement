import { createClient } from '@/lib/supabase/server'

export interface PremiumReceiptRow {
  id: string
  schedule_id: string
  contract_id: string
  counterparty_id: string
  direction: 'inbound' | 'outbound'
  received_date: string
  received_amount: number
  received_currency: string
  exchange_rate: number
  received_amount_krw: number | null
  bank_reference: string | null
  receipt_note: string | null
  linked_transaction_id: string | null
  linked_ac_id: string | null
  match_status: 'unmatched' | 'partial' | 'matched'
  confirmed_by: string | null
  created_at: string
  updated_at: string
  // joined fields
  counterparty_name?: string
  linked_transaction_no?: string
  linked_ac_no?: string
}

export interface ScheduleReceiptSummary {
  schedule_id: string
  contract_id: string
  schedule_type: string
  period_label: string
  period_from: string
  period_to: string
  due_date: string | null
  expected_amount: number | null
  minimum_premium: number | null
  currency_code: string | null
  schedule_status: string
  receipt_count: number
  total_inbound: number
  total_outbound: number
  net_received: number
  last_received_date: string | null
  receipt_status:
    | 'no_schedule'
    | 'pending'
    | 'overdue'
    | 'partially_received'
    | 'overdue_partial'
    | 'fully_received'
  outstanding_amount: number
}

export async function getReceiptsBySchedule(scheduleId: string): Promise<PremiumReceiptRow[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_premium_receipts')
    .select(
      `*, counterparty:rs_counterparties(company_name_ko),
       linked_transaction:rs_transactions(transaction_no),
       linked_ac:rs_account_currents(ac_no)`
    )
    .eq('schedule_id', scheduleId)
    .order('received_date', { ascending: false })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    counterparty_name: r.counterparty?.company_name_ko ?? null,
    linked_transaction_no: r.linked_transaction?.transaction_no ?? null,
    linked_ac_no: r.linked_ac?.ac_no ?? null,
  })) as PremiumReceiptRow[]
}

export async function getReceiptSummariesByContract(
  contractId: string,
  scheduleType?: string
): Promise<ScheduleReceiptSummary[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  let q = db
    .from('rs_v_schedule_receipt_summary')
    .select('*')
    .eq('contract_id', contractId)
    .order('period_from', { ascending: true })
  if (scheduleType) q = q.eq('schedule_type', scheduleType)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function createPremiumReceipt(params: {
  scheduleId: string
  contractId: string
  counterpartyId: string
  direction: 'inbound' | 'outbound'
  receivedDate: string
  receivedAmount: number
  receivedCurrency: string
  exchangeRate: number
  bankReference?: string
  receiptNote?: string
  linkedTransactionId?: string | null
  linkedAcId?: string | null
  confirmedBy: string
}): Promise<PremiumReceiptRow> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_premium_receipts')
    .insert({
      schedule_id: params.scheduleId,
      contract_id: params.contractId,
      counterparty_id: params.counterpartyId,
      direction: params.direction,
      received_date: params.receivedDate,
      received_amount: params.receivedAmount,
      received_currency: params.receivedCurrency,
      exchange_rate: params.exchangeRate,
      bank_reference: params.bankReference ?? null,
      receipt_note: params.receiptNote ?? null,
      linked_transaction_id: params.linkedTransactionId ?? null,
      linked_ac_id: params.linkedAcId ?? null,
      confirmed_by: params.confirmedBy,
    })
    .select()
    .single()
  if (error) throw error
  return data as PremiumReceiptRow
}

export async function updatePremiumReceipt(
  id: string,
  updates: {
    receivedDate?: string
    receivedAmount?: number
    exchangeRate?: number
    bankReference?: string | null
    receiptNote?: string | null
    linkedTransactionId?: string | null
    linkedAcId?: string | null
    matchStatus?: 'unmatched' | 'partial' | 'matched'
  }
): Promise<PremiumReceiptRow> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const payload: Record<string, unknown> = {}
  if (updates.receivedDate !== undefined) payload.received_date = updates.receivedDate
  if (updates.receivedAmount !== undefined) payload.received_amount = updates.receivedAmount
  if (updates.exchangeRate !== undefined) payload.exchange_rate = updates.exchangeRate
  if (updates.bankReference !== undefined) payload.bank_reference = updates.bankReference
  if (updates.receiptNote !== undefined) payload.receipt_note = updates.receiptNote
  if (updates.linkedTransactionId !== undefined)
    payload.linked_transaction_id = updates.linkedTransactionId
  if (updates.linkedAcId !== undefined) payload.linked_ac_id = updates.linkedAcId
  if (updates.matchStatus !== undefined) payload.match_status = updates.matchStatus

  const { data, error } = await db
    .from('rs_premium_receipts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as PremiumReceiptRow
}

export async function deletePremiumReceipt(id: string): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('rs_premium_receipts').delete().eq('id', id)
  if (error) throw error
}

export async function getUnmatchedReceiptsForContract(
  contractId: string
): Promise<PremiumReceiptRow[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_premium_receipts')
    .select('*')
    .eq('contract_id', contractId)
    .neq('match_status', 'matched')
    .order('received_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * 정산서(AC)에 연결된 모든 수령/송금 내역
 * - linked_ac_id 가 직접 일치하거나
 * - 같은 계약·거래상대·기간 범위에 들어오는 매칭 후보까지 함께 반환 (matched 플래그)
 */
export async function getReceiptsByAC(acId: string): Promise<{
  linked: PremiumReceiptRow[]
  candidates: PremiumReceiptRow[]
  ac_period_from: string
  ac_period_to: string
  ac_contract_id: string
  ac_counterparty_id: string
}> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: ac, error: acErr } = await db
    .from('rs_account_currents')
    .select('id, contract_id, counterparty_id, period_from, period_to')
    .eq('id', acId)
    .single()
  if (acErr || !ac) throw acErr ?? new Error('AC not found')

  // (1) AC 에 직접 연결된 receipt
  const { data: linked, error: lErr } = await db
    .from('rs_premium_receipts')
    .select(
      `*, counterparty:rs_counterparties(company_name_ko),
       linked_transaction:rs_transactions(transaction_no),
       linked_ac:rs_account_currents(ac_no)`
    )
    .eq('linked_ac_id', acId)
    .order('received_date', { ascending: true })
  if (lErr) throw lErr

  // (2) 같은 계약·거래상대·기간 범위에 들어오는 미연결 후보
  const { data: candidates, error: cErr } = await db
    .from('rs_premium_receipts')
    .select(
      `*, counterparty:rs_counterparties(company_name_ko),
       linked_transaction:rs_transactions(transaction_no),
       linked_ac:rs_account_currents(ac_no)`
    )
    .eq('contract_id', ac.contract_id)
    .eq('counterparty_id', ac.counterparty_id)
    .gte('received_date', ac.period_from)
    .lte('received_date', ac.period_to)
    .is('linked_ac_id', null)
    .order('received_date', { ascending: true })
  if (cErr) throw cErr

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flatten = (rows: any[]): PremiumReceiptRow[] =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rows ?? []).map((r: any) => ({
      ...r,
      counterparty_name: r.counterparty?.company_name_ko ?? null,
      linked_transaction_no: r.linked_transaction?.transaction_no ?? null,
      linked_ac_no: r.linked_ac?.ac_no ?? null,
    }))

  return {
    linked: flatten(linked),
    candidates: flatten(candidates),
    ac_period_from: ac.period_from,
    ac_period_to: ac.period_to,
    ac_contract_id: ac.contract_id,
    ac_counterparty_id: ac.counterparty_id,
  }
}

/** 단일 receipt 의 linked_ac_id 갱신 (수동 연결/해제) */
export async function setReceiptACLink(
  receiptId: string,
  acId: string | null
): Promise<PremiumReceiptRow> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_premium_receipts')
    .update({
      linked_ac_id: acId,
      match_status: acId ? 'matched' : 'unmatched',
    })
    .eq('id', receiptId)
    .select()
    .single()
  if (error) throw error
  return data as PremiumReceiptRow
}
