import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { getSchedulesByContract, createSchedule } from '@/lib/supabase/queries/contract-schedules'
import { z } from 'zod'

const CreateSchema = z.object({
  schedule_type: z.enum(['premium', 'loss', 'commission']),
  period_label: z.string().min(1),
  period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expected_amount: z.number().positive().optional(),
  currency_code: z.string().length(3).optional(),
  notes: z.string().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(_req.url)
    const scheduleType = searchParams.get('schedule_type') ?? undefined
    const data = await getSchedulesByContract(id, scheduleType)
    return NextResponse.json({ schedules: data })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const schedule = await createSchedule({
      contractId: id,
      scheduleType: parsed.data.schedule_type,
      periodLabel: parsed.data.period_label,
      periodFrom: parsed.data.period_from,
      periodTo: parsed.data.period_to,
      expectedAmount: parsed.data.expected_amount,
      currencyCode: parsed.data.currency_code,
      notes: parsed.data.notes,
      createdBy: user.id,
    })
    return NextResponse.json({ schedule }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
