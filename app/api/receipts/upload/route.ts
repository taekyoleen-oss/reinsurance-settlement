import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { withBrokerAuth } from '@/lib/api/handler'

export interface BankTxLine {
  index: number
  date: string // YYYY-MM-DD
  amount: number
  currency: string
  reference?: string
  memo?: string
  direction: 'inbound' | 'outbound'
}

export interface MatchCandidate {
  schedule_id: string
  schedule_type: 'premium' | 'loss'
  contract_id: string
  contract_no: string
  cedant_name: string | null
  period_label: string
  expected_amount: number | null
  outstanding_amount: number
  due_date: string | null
  /** 0~100 점수 (높을수록 매칭 신뢰도) */
  score: number
  reason: string[]
}

export interface MatchedLine extends BankTxLine {
  candidates: MatchCandidate[]
  best_candidate?: MatchCandidate
}

/**
 * POST /api/receipts/upload
 *   body: { lines: BankTxLine[] }
 *   각 line 마다 후보 schedule(s) 매칭. 실제 INSERT 는 client 가 confirm 후 별도 API 호출.
 */
export const POST = withBrokerAuth(async (_auth, req) => {
  const body = (await req.json().catch(() => ({}))) as { lines?: BankTxLine[] }
  const lines = body.lines ?? []
  if (lines.length === 0) {
    return NextResponse.json({ error: 'lines 배열이 필요합니다.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminClient as any

  // 모든 active 계약 + 출재사 매핑
  const { data: contracts } = await db
    .from('rs_contracts')
    .select('id, contract_no, cedant_id, settlement_currency')
    .eq('status', 'active')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cR: any[] = contracts ?? []
  const cedantIds = [...new Set(cR.map((c) => c.cedant_id))]
  const { data: cedants } = await db
    .from('rs_counterparties')
    .select('id, company_name_ko')
    .in('id', cedantIds.length > 0 ? cedantIds : ['00000000-0000-0000-0000-000000000000'])
  const cedantMap = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(cedants ?? []).forEach((cp: any) => cedantMap.set(cp.id, cp.company_name_ko))
  const contractMap = new Map<string, { contract_no: string; cedant_id: string }>()
  cR.forEach((c) => contractMap.set(c.id, { contract_no: c.contract_no, cedant_id: c.cedant_id }))

  // 모든 미완료 schedule (premium + loss) — receipt summary 뷰에서 outstanding>0 만
  const { data: premiumScheds } = await db
    .from('rs_v_schedule_receipt_summary')
    .select(
      'schedule_id, contract_id, schedule_type, period_label, expected_amount, outstanding_amount, due_date, currency_code'
    )
    .eq('schedule_type', 'premium')
    .gt('outstanding_amount', 0)

  const { data: lossScheds } = await db
    .from('rs_v_loss_schedule_receipt_summary')
    .select(
      'schedule_id, contract_id, schedule_type, period_label, expected_amount, outstanding_amount, due_date, currency_code'
    )
    .gt('outstanding_amount', 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allScheds: any[] = [...(premiumScheds ?? []), ...(lossScheds ?? [])]

  const matched: MatchedLine[] = lines.map((line) => {
    const candidates: MatchCandidate[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allScheds.forEach((s: any) => {
      const contract = contractMap.get(s.contract_id)
      if (!contract) return

      const reason: string[] = []
      let score = 0

      // 통화 일치 (필수 가까움)
      if (s.currency_code === line.currency) {
        score += 30
        reason.push('통화 일치')
      } else {
        return // 통화 다르면 후보에서 제외
      }

      // 금액 근접도 (outstanding 대비)
      const out = Number(s.outstanding_amount ?? 0)
      const ratio = out > 0 ? line.amount / out : 0
      if (ratio >= 0.99 && ratio <= 1.01) {
        score += 50
        reason.push('잔액과 정확히 일치')
      } else if (ratio >= 0.9 && ratio <= 1.1) {
        score += 30
        reason.push('잔액과 ±10% 근접')
      } else if (ratio >= 0.5 && ratio <= 1.5) {
        score += 10
        reason.push('잔액과 부분 일치')
      }

      // 계약번호 / 출재사명이 reference 또는 memo 에 포함
      const refText = `${line.reference ?? ''} ${line.memo ?? ''}`.toUpperCase()
      if (refText.includes(contract.contract_no.toUpperCase())) {
        score += 30
        reason.push('reference 에 계약번호 포함')
      }
      const cedantName = cedantMap.get(contract.cedant_id)
      if (cedantName && refText.includes(cedantName.toUpperCase())) {
        score += 15
        reason.push('reference 에 출재사명 포함')
      }

      // 납기일 근접 (±60일)
      if (s.due_date) {
        const dueT = new Date(s.due_date).getTime()
        const lineT = new Date(line.date).getTime()
        const diffDays = Math.abs(lineT - dueT) / (1000 * 60 * 60 * 24)
        if (diffDays <= 7) {
          score += 15
          reason.push('납기일 ±7일')
        } else if (diffDays <= 30) {
          score += 8
          reason.push('납기일 ±30일')
        } else if (diffDays <= 60) {
          score += 3
          reason.push('납기일 ±60일')
        }
      }

      if (score > 0) {
        candidates.push({
          schedule_id: s.schedule_id,
          schedule_type: s.schedule_type,
          contract_id: s.contract_id,
          contract_no: contract.contract_no,
          cedant_name: cedantName ?? null,
          period_label: s.period_label,
          expected_amount: s.expected_amount,
          outstanding_amount: out,
          due_date: s.due_date,
          score,
          reason,
        })
      }
    })

    candidates.sort((a, b) => b.score - a.score)
    const top3 = candidates.slice(0, 3)

    return {
      ...line,
      candidates: top3,
      best_candidate: top3[0],
    }
  })

  return NextResponse.json({ data: matched })
})
