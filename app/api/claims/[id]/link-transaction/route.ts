import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { linkTransactionToClaim, unlinkTransactionFromClaim } from '@/lib/supabase/queries/claims'
import { z } from 'zod'

const LinkSchema = z.object({
  transaction_id: z.string().uuid(),
  role: z.enum(['receipt_from_reinsurer', 'payment_to_cedant', 'recovery', 'adjustment']),
  notes: z.string().optional(),
})

const UnlinkSchema = z.object({ transaction_id: z.string().uuid() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = LinkSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const link = await linkTransactionToClaim({
      claimId: id,
      transactionId: parsed.data.transaction_id,
      role: parsed.data.role,
      notes: parsed.data.notes,
    })
    return NextResponse.json({ link }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = UnlinkSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    await unlinkTransactionFromClaim(id, parsed.data.transaction_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
