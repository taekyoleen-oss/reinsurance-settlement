import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { withBrokerAuth } from '@/lib/api/handler'

export interface ContractWorkflowSummary {
  contract: {
    id: string
    contract_no: string
    status: string
    settlement_currency: string
    premium_settlement_period: string | null
    inception_date: string
    expiry_date: string | null
    ceding_commission_rate: number | null
    brokerage_rate: number | null
  }
  shares: { count: number; total_signed_line: number }
  schedules: {
    count: number
    expected_total: number
    inbound_total: number
    outbound_total: number
    outstanding_total: number
    overdue_count: number
    pending_count: number
    fully_received_count: number
    partial_count: number
  }
  bordereau: { count: number; ceded_premium_total: number }
  receipts: {
    count: number
    inbound_total: number
    outbound_total: number
    matched_count: number
    unmatched_count: number
  }
  account_currents: {
    count: number
    by_status: Record<string, number>
    total_net_balance: number
  }
  settlements: {
    count: number
    by_status: Record<string, number>
    remitted_total: number
  }
  three_way: {
    schedule_expected: number
    bordereau_ceded: number
    receipts_inbound: number
    /** 명세 vs 계약, 수령 vs 계약, 명세 vs 수령 의 일치율 (오차 1% 내 매치) */
    schedule_vs_bordereau_pct: number
    schedule_vs_receipts_pct: number
    bordereau_vs_receipts_pct: number
  }
  estimates: {
    /** 누적 인바운드 수령액 × ceding_commission_rate (브로커 보유 수수료 추정) */
    brokerage_estimate: number
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = adminClient as any

function pct(numer: number, denom: number): number {
  if (denom === 0) return 0
  return Math.round((numer / denom) * 1000) / 10
}

export const GET = withBrokerAuth(async (_auth, _req, ctx) => {
  const { id } = await ctx.params

  // 1) 계약 본체
  const { data: contract, error: cErr } = await db
    .from('rs_contracts')
    .select(
      'id, contract_no, status, settlement_currency, premium_settlement_period, inception_date, expiry_date, ceding_commission_rate, brokerage_rate'
    )
    .eq('id', id)
    .single()
  if (cErr || !contract) {
    return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 2) shares
  const { data: shares } = await db
    .from('rs_contract_shares')
    .select('signed_line')
    .eq('contract_id', id)
    .is('effective_to', null)

  const sharesAgg = {
    count: shares?.length ?? 0,
    total_signed_line:
      (shares ?? []).reduce(
        (sum: number, s: { signed_line: number }) => sum + Number(s.signed_line ?? 0),
        0
      ) ?? 0,
  }

  // 3) schedules + receipt summary view
  const { data: scheds } = await db
    .from('rs_v_schedule_receipt_summary')
    .select(
      'schedule_id, expected_amount, total_inbound, total_outbound, outstanding_amount, receipt_status'
    )
    .eq('contract_id', id)
    .eq('schedule_type', 'premium')

  type ScheduleRow = {
    expected_amount: number | null
    total_inbound: number | null
    total_outbound: number | null
    outstanding_amount: number | null
    receipt_status: string
  }
  const sR = (scheds ?? []) as ScheduleRow[]
  const schedulesAgg = {
    count: sR.length,
    expected_total: sR.reduce((s, r) => s + Number(r.expected_amount ?? 0), 0),
    inbound_total: sR.reduce((s, r) => s + Number(r.total_inbound ?? 0), 0),
    outbound_total: sR.reduce((s, r) => s + Number(r.total_outbound ?? 0), 0),
    outstanding_total: sR.reduce((s, r) => s + Math.max(0, Number(r.outstanding_amount ?? 0)), 0),
    overdue_count: sR.filter((r) => r.receipt_status?.startsWith('overdue')).length,
    pending_count: sR.filter((r) => r.receipt_status === 'pending').length,
    fully_received_count: sR.filter((r) => r.receipt_status === 'fully_received').length,
    partial_count: sR.filter((r) => r.receipt_status === 'partially_received').length,
  }

  // 4) premium bordereau
  const { data: bord } = await db
    .from('rs_premium_bordereau')
    .select('ceded_premium')
    .eq('contract_id', id)

  type BordRow = { ceded_premium: number | null }
  const bR = (bord ?? []) as BordRow[]
  const bordereauAgg = {
    count: bR.length,
    ceded_premium_total: bR.reduce((s, r) => s + Number(r.ceded_premium ?? 0), 0),
  }

  // 5) receipts (raw)
  const { data: recs } = await db
    .from('rs_premium_receipts')
    .select('direction, received_amount, match_status')
    .eq('contract_id', id)

  type RecRow = { direction: string; received_amount: number; match_status: string }
  const rR = (recs ?? []) as RecRow[]
  const receiptsAgg = {
    count: rR.length,
    inbound_total: rR
      .filter((r) => r.direction === 'inbound')
      .reduce((s, r) => s + Number(r.received_amount ?? 0), 0),
    outbound_total: rR
      .filter((r) => r.direction === 'outbound')
      .reduce((s, r) => s + Number(r.received_amount ?? 0), 0),
    matched_count: rR.filter((r) => r.match_status === 'matched').length,
    unmatched_count: rR.filter((r) => r.match_status === 'unmatched').length,
  }

  // 6) account_currents
  const { data: acs } = await db
    .from('rs_account_currents')
    .select('status, net_balance')
    .eq('contract_id', id)

  type AcRow = { status: string; net_balance: number | null }
  const acR = (acs ?? []) as AcRow[]
  const acByStatus: Record<string, number> = {}
  acR.forEach((a) => {
    acByStatus[a.status] = (acByStatus[a.status] ?? 0) + 1
  })
  const acAgg = {
    count: acR.length,
    by_status: acByStatus,
    total_net_balance: acR.reduce((s, a) => s + Number(a.net_balance ?? 0), 0),
  }

  // 7) settlements (계약 기반 — settlements 의 contract_id 가 있다면)
  const { data: setl } = await db
    .from('rs_settlements')
    .select('remit_status, settled_amount, contract_id')
    .eq('contract_id', id)

  type SetlRow = { remit_status: string; settled_amount: number | null }
  const sR2 = (setl ?? []) as SetlRow[]
  const setlByStatus: Record<string, number> = {}
  sR2.forEach((s) => {
    setlByStatus[s.remit_status] = (setlByStatus[s.remit_status] ?? 0) + 1
  })
  const setlAgg = {
    count: sR2.length,
    by_status: setlByStatus,
    remitted_total: sR2
      .filter((s) => s.remit_status === 'remitted' || s.remit_status === 'verified')
      .reduce((s, x) => s + Number(x.settled_amount ?? 0), 0),
  }

  // 8) 3-way matching
  const threeWay = {
    schedule_expected: schedulesAgg.expected_total,
    bordereau_ceded: bordereauAgg.ceded_premium_total,
    receipts_inbound: receiptsAgg.inbound_total,
    schedule_vs_bordereau_pct: pct(bordereauAgg.ceded_premium_total, schedulesAgg.expected_total),
    schedule_vs_receipts_pct: pct(receiptsAgg.inbound_total, schedulesAgg.expected_total),
    bordereau_vs_receipts_pct: pct(receiptsAgg.inbound_total, bordereauAgg.ceded_premium_total),
  }

  // 9) brokerage estimate (누적 inbound × ceding_commission_rate)
  const brokerage = receiptsAgg.inbound_total * Number(contract.ceding_commission_rate ?? 0)

  const summary: ContractWorkflowSummary = {
    contract,
    shares: sharesAgg,
    schedules: schedulesAgg,
    bordereau: bordereauAgg,
    receipts: receiptsAgg,
    account_currents: acAgg,
    settlements: setlAgg,
    three_way: threeWay,
    estimates: { brokerage_estimate: brokerage },
  }

  return NextResponse.json({ data: summary })
})
