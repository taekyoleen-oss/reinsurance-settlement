import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { deleteLossReceipt } from '@/lib/supabase/queries/loss-receipts'

type Params = { params: Promise<{ id: string; sid: string; rid: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { rid } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    await deleteLossReceipt(rid)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
