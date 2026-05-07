import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClaims, createClaim } from '@/lib/supabase/queries/claims'
import { z } from 'zod'

const CreateSchema = z.object({
  contract_id: z.string().uuid(),
  cedant_id: z.string().uuid(),
  loss_event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reported_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  loss_reference: z.string().optional(),
  total_claimed_amount: z.number().positive(),
  currency_code: z.string().length(3),
  description: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const data = await getClaims({
      contractId: searchParams.get('contract_id') ?? undefined,
      cedantId: searchParams.get('cedant_id') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 50),
      offset: Number(searchParams.get('offset') ?? 0),
    })
    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const {
      contract_id,
      cedant_id,
      loss_event_date,
      reported_date,
      loss_reference,
      total_claimed_amount,
      currency_code,
      description,
    } = parsed.data
    const claim = await createClaim({
      contractId: contract_id,
      cedantId: cedant_id,
      lossEventDate: loss_event_date,
      reportedDate: reported_date,
      lossReference: loss_reference,
      totalClaimedAmount: total_claimed_amount,
      currencyCode: currency_code,
      description,
      createdBy: user.id,
    })
    return NextResponse.json({ data: claim }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
