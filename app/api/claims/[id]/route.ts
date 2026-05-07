import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { getClaimById } from '@/lib/supabase/queries/claims'
import { z } from 'zod'

const UpdateSchema = z.object({
  status: z
    .enum(['open', 'collecting', 'ready_to_pay', 'paying', 'closed', 'disputed', 'cancelled'])
    .optional(),
  description: z.string().optional(),
  total_claimed_amount: z.number().positive().optional(),
  reported_date: z.string().optional(),
})

type ClaimUpdate = {
  status?: string
  description?: string
  total_claimed_amount?: number
  reported_date?: string
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const claim = await getClaimById(id)
    if (!claim) return NextResponse.json({ error: '청구 없음' }, { status: 404 })
    return NextResponse.json({ data: claim })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const updateData: ClaimUpdate = {}
    if (parsed.data.status) updateData.status = parsed.data.status
    if (parsed.data.description) updateData.description = parsed.data.description
    if (parsed.data.total_claimed_amount)
      updateData.total_claimed_amount = parsed.data.total_claimed_amount
    if (parsed.data.reported_date) updateData.reported_date = parsed.data.reported_date

    const { data, error } = await db
      .from('rs_loss_claims')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data: profile } = await db
      .from('rs_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const { error } = await db.from('rs_loss_claims').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
