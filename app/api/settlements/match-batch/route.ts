import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/api/error-handler'
import { z } from 'zod'

const Schema = z.object({
  matches: z
    .array(
      z.object({
        settlement_id: z.string().uuid(),
        account_current_id: z.string().uuid(),
        matched_amount: z.number().positive(),
      })
    )
    .min(1),
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const results: Array<{
      settlement_id: string
      account_current_id: string
      matched_amount: number
    }> = []
    const errors: Array<{ settlement_id: string; error: string }> = []

    for (const m of parsed.data.matches) {
      // 잔액 검증
      const { data: settlement } = await db
        .from('rs_settlements')
        .select('amount, matched_amount, match_status')
        .eq('id', m.settlement_id)
        .single()

      if (!settlement) {
        errors.push({ settlement_id: m.settlement_id, error: '결제 없음' })
        continue
      }

      const remaining = settlement.amount - (settlement.matched_amount ?? 0)
      if (m.matched_amount > remaining + 0.01) {
        errors.push({
          settlement_id: m.settlement_id,
          error: `매칭 금액(${m.matched_amount}) > 잔액(${remaining})`,
        })
        continue
      }

      // 매칭 row 삽입
      const { error: insertErr } = await db.from('rs_settlement_matches').insert({
        settlement_id: m.settlement_id,
        account_current_id: m.account_current_id,
        matched_amount: m.matched_amount,
        matched_by: user.id,
        matched_at: new Date().toISOString(),
      })
      if (insertErr) {
        errors.push({ settlement_id: m.settlement_id, error: insertErr.message })
        continue
      }

      // settlement matched_amount 갱신
      const newMatched = (settlement.matched_amount ?? 0) + m.matched_amount
      const fullyMatched = newMatched >= settlement.amount - 0.01
      await db
        .from('rs_settlements')
        .update({
          matched_amount: newMatched,
          match_status: fullyMatched ? 'fully_matched' : 'partial',
        })
        .eq('id', m.settlement_id)

      results.push({
        settlement_id: m.settlement_id,
        account_current_id: m.account_current_id,
        matched_amount: m.matched_amount,
      })
    }

    return NextResponse.json({ results, errors, total: parsed.data.matches.length })
  } catch (err) {
    return handleApiError(err)
  }
}
