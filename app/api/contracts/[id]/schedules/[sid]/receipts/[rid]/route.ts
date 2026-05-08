import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { updatePremiumReceipt, deletePremiumReceipt } from '@/lib/supabase/queries/premium-receipts'
import { z } from 'zod'

const UpdateReceiptSchema = z.object({
  received_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  received_amount: z.number().positive().optional(),
  exchange_rate: z.number().positive().optional(),
  bank_reference: z.string().nullable().optional(),
  receipt_note: z.string().nullable().optional(),
  linked_transaction_id: z.string().uuid().nullable().optional(),
  linked_ac_id: z.string().uuid().nullable().optional(),
  match_status: z.enum(['unmatched', 'partial', 'matched']).optional(),
})

type Params = { params: Promise<{ id: string; sid: string; rid: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { rid } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = UpdateReceiptSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const d = parsed.data
    const receipt = await updatePremiumReceipt(rid, {
      receivedDate: d.received_date,
      receivedAmount: d.received_amount,
      exchangeRate: d.exchange_rate,
      bankReference: d.bank_reference,
      receiptNote: d.receipt_note,
      linkedTransactionId: d.linked_transaction_id,
      linkedAcId: d.linked_ac_id,
      matchStatus: d.match_status,
    })
    return NextResponse.json({ receipt })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { rid } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    await deletePremiumReceipt(rid)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
