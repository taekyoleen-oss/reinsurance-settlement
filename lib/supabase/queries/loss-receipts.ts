import { createClient } from '@/lib/supabase/server'

export interface LossReceiptRow {
  id: string
  schedule_id: string
  contract_id: string
  counterparty_id: string
  claim_id: string | null
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
  counterparty_name?: string | null
  linked_transaction_no?: string | null
  linked_ac_no?: string | null
}

export interface LossScheduleReceiptSummary {
  schedule_id: string
  contract_id: string
  schedule_type: string
  period_label: string
  period_from: string
  period_to: string
  due_date: string | null
  expected_amount: number | null
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

export async function getLossReceiptsBySchedule(scheduleId: string): Promise<LossReceiptRow[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_loss_receipts')
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
  })) as LossReceiptRow[]
}

export async function getLossReceiptSummariesByContract(
  contractId: string
): Promise<LossScheduleReceiptSummary[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_v_loss_schedule_receipt_summary')
    .select('*')
    .eq('contract_id', contractId)
    .order('period_from', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createLossReceipt(params: {
  scheduleId: string
  contractId: string
  counterpartyId: string
  claimId?: string | null
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
}): Promise<LossReceiptRow> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_loss_receipts')
    .insert({
      schedule_id: params.scheduleId,
      contract_id: params.contractId,
      counterparty_id: params.counterpartyId,
      claim_id: params.claimId ?? null,
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
  return data as LossReceiptRow
}

export async function deleteLossReceipt(id: string): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('rs_loss_receipts').delete().eq('id', id)
  if (error) throw error
}
