import { createClient } from '@/lib/supabase/server'

export async function getClaims(params?: {
  contractId?: string
  cedantId?: string
  status?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  let q = db
    .from('rs_loss_claims')
    .select(
      `
      *,
      contract:rs_contracts(contract_no, contract_type, class_of_business),
      cedant:rs_counterparties!cedant_id(company_name_ko, company_name_en)
    `
    )
    .order('created_at', { ascending: false })

  if (params?.contractId) q = q.eq('contract_id', params.contractId)
  if (params?.cedantId) q = q.eq('cedant_id', params.cedantId)
  if (params?.status) q = q.eq('status', params.status)
  if (params?.limit) q = q.limit(params.limit)
  if (params?.offset) q = q.range(params.offset, (params.offset ?? 0) + (params.limit ?? 50) - 1)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getClaimById(id: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_loss_claims')
    .select(
      `
      *,
      contract:rs_contracts(contract_no, contract_type, class_of_business, settlement_currency),
      cedant:rs_counterparties!cedant_id(company_name_ko, company_name_en),
      transactions:rs_loss_claim_transactions(
        role,
        notes,
        created_at,
        transaction:rs_transactions(
          id, transaction_no, transaction_type, direction,
          amount_original, currency_code, transaction_date, status,
          counterparty:rs_counterparties(company_name_ko, company_name_en)
        )
      )
    `
    )
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createClaim(params: {
  contractId: string
  cedantId: string
  lossEventDate: string
  reportedDate?: string
  lossReference?: string
  totalClaimedAmount: number
  currencyCode: string
  description?: string
  createdBy: string
}) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_loss_claims')
    .insert({
      contract_id: params.contractId,
      cedant_id: params.cedantId,
      loss_event_date: params.lossEventDate,
      reported_date: params.reportedDate ?? null,
      loss_reference: params.lossReference ?? null,
      total_claimed_amount: params.totalClaimedAmount,
      currency_code: params.currencyCode,
      description: params.description ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClaimStatus(id: string, status: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_loss_claims')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function linkTransactionToClaim(params: {
  claimId: string
  transactionId: string
  role: 'receipt_from_reinsurer' | 'payment_to_cedant' | 'recovery' | 'adjustment'
  notes?: string
}) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_loss_claim_transactions')
    .insert({
      claim_id: params.claimId,
      transaction_id: params.transactionId,
      role: params.role,
      notes: params.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unlinkTransactionFromClaim(claimId: string, transactionId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from('rs_loss_claim_transactions')
    .delete()
    .eq('claim_id', claimId)
    .eq('transaction_id', transactionId)
  if (error) throw error
}
