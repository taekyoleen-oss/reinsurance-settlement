import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { updateSchedule, deleteSchedule } from '@/lib/supabase/queries/contract-schedules'
import { z } from 'zod'

const UpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'closed', 'cancelled']).optional(),
  expected_amount: z.number().positive().optional(),
  notes: z.string().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  try {
    const { sid } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const schedule = await updateSchedule(sid, {
      status: parsed.data.status,
      expectedAmount: parsed.data.expected_amount,
      notes: parsed.data.notes,
    })
    return NextResponse.json({ schedule })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  try {
    const { sid } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    await deleteSchedule(sid)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
