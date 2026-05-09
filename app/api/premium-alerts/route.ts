import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { withBrokerAuth } from '@/lib/api/handler'

export interface PremiumAlertItem {
  schedule_id: string
  contract_id: string
  contract_no: string
  cedant_name: string
  schedule_type: string
  period_label: string
  due_date: string | null
  expected_amount: number | null
  net_received: number
  outstanding_amount: number
  currency_code: string | null
  receipt_status: string
}

export const GET = withBrokerAuth(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminClient as any

  // 보험료 스케줄만, 미결(overdue / overdue_partial / pending / partially_received) 상태
  const { data: summaryRows, error } = await db
    .from('rs_v_schedule_receipt_summary')
    .select('*')
    .eq('schedule_type', 'premium')
    .neq('receipt_status', 'fully_received')
    .neq('receipt_status', 'no_schedule')

  if (error) throw error

  const rows = (summaryRows ?? []) as Array<{
    schedule_id: string
    contract_id: string
    schedule_type: string
    period_label: string
    due_date: string | null
    expected_amount: number | null
    currency_code: string | null
    net_received: number
    outstanding_amount: number
    receipt_status: string
  }>

  if (rows.length === 0) {
    return NextResponse.json({
      data: {
        overdue_count: 0,
        pending_count: 0,
        partial_count: 0,
        schedules: [],
      },
    })
  }

  // 계약 정보 조인
  const contractIds = [...new Set(rows.map((r) => r.contract_id))]
  const { data: contractRows } = await db
    .from('rs_contracts')
    .select('id, contract_no, cedant_id')
    .in('id', contractIds)

  const { data: cedantRows } = await db
    .from('rs_counterparties')
    .select('id, company_name_ko')
    .in(
      'id',
      (contractRows ?? []).map((c: { cedant_id: string }) => c.cedant_id)
    )

  const contractMap = new Map(
    (contractRows ?? []).map((c: { id: string; contract_no: string; cedant_id: string }) => [
      c.id,
      c,
    ])
  )
  const cedantMap = new Map(
    (cedantRows ?? []).map((cp: { id: string; company_name_ko: string }) => [cp.id, cp])
  )

  const schedules: PremiumAlertItem[] = rows.map((r) => {
    const contract = contractMap.get(r.contract_id) as
      | { id: string; contract_no: string; cedant_id: string }
      | undefined
    const cedant = contract ? cedantMap.get(contract.cedant_id) : undefined
    return {
      schedule_id: r.schedule_id,
      contract_id: r.contract_id,
      contract_no: contract?.contract_no ?? '',
      cedant_name: (cedant as { company_name_ko: string } | undefined)?.company_name_ko ?? '',
      schedule_type: r.schedule_type,
      period_label: r.period_label,
      due_date: r.due_date,
      expected_amount: r.expected_amount,
      net_received: Number(r.net_received ?? 0),
      outstanding_amount: Number(r.outstanding_amount ?? 0),
      currency_code: r.currency_code,
      receipt_status: r.receipt_status,
    }
  })

  // 기한 순 정렬 (overdue 먼저, 기한일 오름차순)
  schedules.sort((a, b) => {
    const isOverdueA = a.receipt_status.startsWith('overdue')
    const isOverdueB = b.receipt_status.startsWith('overdue')
    if (isOverdueA !== isOverdueB) return isOverdueA ? -1 : 1
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  })

  const overdue_count = schedules.filter((s) => s.receipt_status.startsWith('overdue')).length
  const partial_count = schedules.filter((s) => s.receipt_status === 'partially_received').length
  const pending_count = schedules.filter((s) => s.receipt_status === 'pending').length

  return NextResponse.json({
    data: { overdue_count, pending_count, partial_count, schedules },
  })
})
