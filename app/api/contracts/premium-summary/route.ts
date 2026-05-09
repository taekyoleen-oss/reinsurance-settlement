import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { withBrokerAuth } from '@/lib/api/handler'

export interface ContractPremiumStatus {
  contract_id: string
  worst_status: string
  overdue_count: number
  pending_count: number
  total_outstanding: number
  currency_code: string | null
}

const STATUS_SEVERITY: Record<string, number> = {
  overdue: 4,
  overdue_partial: 3,
  partially_received: 2,
  pending: 1,
  fully_received: 0,
  no_schedule: -1,
}

export const GET = withBrokerAuth(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminClient as any

  const { data: rows, error } = await db
    .from('rs_v_schedule_receipt_summary')
    .select('contract_id, receipt_status, outstanding_amount, currency_code, schedule_type')
    .eq('schedule_type', 'premium')

  if (error) throw error

  type Entry = { statuses: string[]; outstanding: number; currency: string | null }
  const byContract = new Map<string, Entry>()

  for (const row of (rows ?? []) as Array<{
    contract_id: string
    receipt_status: string
    outstanding_amount: number | null
    currency_code: string | null
  }>) {
    let entry = byContract.get(row.contract_id)
    if (!entry) {
      entry = { statuses: [], outstanding: 0, currency: row.currency_code }
      byContract.set(row.contract_id, entry)
    }
    entry.statuses.push(row.receipt_status)
    entry.outstanding += Number(row.outstanding_amount ?? 0)
  }

  const result: ContractPremiumStatus[] = []
  for (const [contract_id, { statuses, outstanding, currency }] of byContract) {
    const worstStatus = statuses.reduce((prev, curr) => {
      return (STATUS_SEVERITY[curr] ?? -1) > (STATUS_SEVERITY[prev] ?? -1) ? curr : prev
    }, 'no_schedule')

    result.push({
      contract_id,
      worst_status: worstStatus,
      overdue_count: statuses.filter((s) => s.startsWith('overdue')).length,
      pending_count: statuses.filter((s) => s === 'pending').length,
      total_outstanding: outstanding,
      currency_code: currency,
    })
  }

  return NextResponse.json({ data: result })
})
