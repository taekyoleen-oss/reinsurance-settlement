import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { generateAndInsertSchedules } from '@/lib/supabase/queries/contract-schedules'
import { z } from 'zod'

const Schema = z.object({
  schedule_type: z.enum(['premium', 'loss', 'commission']),
  period: z.enum(['quarterly', 'semiannual', 'annual', 'adhoc']),
  currency_code: z.string().length(3).optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    // 계약 기간 조회
    const { data: contract, error: cErr } = await db
      .from('rs_contracts')
      .select('inception_date, expiry_date, settlement_currency')
      .eq('id', id)
      .single()
    if (cErr || !contract) return NextResponse.json({ error: '계약 없음' }, { status: 404 })
    if (!contract.expiry_date)
      return NextResponse.json({ error: '계약 만료일 필요' }, { status: 400 })

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const schedules = await generateAndInsertSchedules({
      contractId: id,
      scheduleType: parsed.data.schedule_type,
      period: parsed.data.period,
      inceptionDate: contract.inception_date,
      expiryDate: contract.expiry_date,
      currencyCode: parsed.data.currency_code ?? contract.settlement_currency,
      createdBy: user.id,
    })
    return NextResponse.json({ schedules, count: schedules.length })
  } catch (err) {
    return handleApiError(err)
  }
}
