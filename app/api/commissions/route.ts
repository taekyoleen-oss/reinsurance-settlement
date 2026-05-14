import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { withBrokerAuth } from '@/lib/api/handler'

export interface CommissionByContract {
  contract_id: string
  contract_no: string
  cedant_name: string | null
  settlement_currency: string
  ceding_commission_rate: number | null
  brokerage_rate: number | null
  total_inbound: number
  estimated_ceding_commission: number
  estimated_brokerage: number
  ac_commission_total: number
}

export interface CommissionsResponse {
  data: CommissionByContract[]
  totals_by_currency: Array<{
    currency: string
    total_inbound: number
    estimated_ceding_commission: number
    estimated_brokerage: number
    ac_commission_total: number
  }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = adminClient as any

export const GET = withBrokerAuth(async () => {
  // 1) 모든 active 계약 + 출재사 정보
  const { data: contracts, error: cErr } = await db
    .from('rs_contracts')
    .select(
      'id, contract_no, settlement_currency, ceding_commission_rate, brokerage_rate, cedant_id'
    )
    .eq('status', 'active')
  if (cErr) throw cErr

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cR: any[] = contracts ?? []
  if (cR.length === 0) {
    return NextResponse.json({ data: [], totals_by_currency: [] })
  }

  // 2) 출재사 이름 매핑
  const cedantIds = [...new Set(cR.map((c) => c.cedant_id))]
  const { data: cedants } = await db
    .from('rs_counterparties')
    .select('id, company_name_ko')
    .in('id', cedantIds)
  const cedantMap = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(cedants ?? []).forEach((cp: any) => cedantMap.set(cp.id, cp.company_name_ko))

  // 3) 모든 receipt (inbound 합계)
  const { data: receipts } = await db
    .from('rs_premium_receipts')
    .select('contract_id, direction, received_amount')
    .eq('direction', 'inbound')

  const inboundByContract = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(receipts ?? []).forEach((r: any) => {
    inboundByContract.set(
      r.contract_id,
      (inboundByContract.get(r.contract_id) ?? 0) + Number(r.received_amount ?? 0)
    )
  })

  // 4) AC 의 commission 항목
  const { data: acItems } = await db
    .from('rs_account_current_items')
    .select('amount, transaction_type, ac_id')
    .eq('transaction_type', 'commission')

  const acIds = [
    ...new Set(
       
      (acItems ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((it: any) => it.ac_id as string | null)
        .filter((x: string | null): x is string => Boolean(x))
    ),
  ]
  const acByContract = new Map<string, number>()
  if (acIds.length > 0) {
    const { data: acs } = await db
      .from('rs_account_currents')
      .select('id, contract_id')
      .in('id', acIds)
    const acIdToContract = new Map<string, string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(acs ?? []).forEach((a: any) => acIdToContract.set(a.id, a.contract_id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(acItems ?? []).forEach((it: any) => {
      const cid = acIdToContract.get(it.ac_id)
      if (!cid) return
      acByContract.set(cid, (acByContract.get(cid) ?? 0) + Number(it.amount ?? 0))
    })
  }

  // 5) 계약별 row 빌드
  const rows: CommissionByContract[] = cR.map((c) => {
    const inbound = inboundByContract.get(c.id) ?? 0
    const ceding = inbound * Number(c.ceding_commission_rate ?? 0)
    const broker = inbound * Number(c.brokerage_rate ?? 0)
    const acComm = acByContract.get(c.id) ?? 0
    return {
      contract_id: c.id,
      contract_no: c.contract_no,
      cedant_name: cedantMap.get(c.cedant_id) ?? null,
      settlement_currency: c.settlement_currency,
      ceding_commission_rate: c.ceding_commission_rate,
      brokerage_rate: c.brokerage_rate,
      total_inbound: inbound,
      estimated_ceding_commission: ceding,
      estimated_brokerage: broker,
      ac_commission_total: acComm,
    }
  })

  // 6) 통화별 합계
  const totalsMap = new Map<
    string,
    {
      currency: string
      total_inbound: number
      estimated_ceding_commission: number
      estimated_brokerage: number
      ac_commission_total: number
    }
  >()
  rows.forEach((r) => {
    const cur = r.settlement_currency
    const t = totalsMap.get(cur) ?? {
      currency: cur,
      total_inbound: 0,
      estimated_ceding_commission: 0,
      estimated_brokerage: 0,
      ac_commission_total: 0,
    }
    t.total_inbound += r.total_inbound
    t.estimated_ceding_commission += r.estimated_ceding_commission
    t.estimated_brokerage += r.estimated_brokerage
    t.ac_commission_total += r.ac_commission_total
    totalsMap.set(cur, t)
  })

  return NextResponse.json({
    data: rows,
    totals_by_currency: Array.from(totalsMap.values()),
  })
})
