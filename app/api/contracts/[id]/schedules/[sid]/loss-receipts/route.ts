import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { getLossReceiptsBySchedule, createLossReceipt } from '@/lib/supabase/queries/loss-receipts'
import { z } from 'zod'

const CreateSchema = z.object({
  counterparty_id: z.string().uuid(),
  claim_id: z.string().uuid().nullable().optional(),
  direction: z.enum(['inbound', 'outbound']),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  received_amount: z.number().positive(),
  received_currency: z.string().length(3),
  exchange_rate: z.number().positive().default(1),
  bank_reference: z.string().optional(),
  receipt_note: z.string().optional(),
  linked_transaction_id: z.string().uuid().nullable().optional(),
  linked_ac_id: z.string().uuid().nullable().optional(),
})

type Params = { params: Promise<{ id: string; sid: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { sid } = await params
    const receipts = await getLossReceiptsBySchedule(sid)
    return NextResponse.json({ receipts })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { id, sid } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const d = parsed.data
    const receipt = await createLossReceipt({
      scheduleId: sid,
      contractId: id,
      counterpartyId: d.counterparty_id,
      claimId: d.claim_id,
      direction: d.direction,
      receivedDate: d.received_date,
      receivedAmount: d.received_amount,
      receivedCurrency: d.received_currency,
      exchangeRate: d.exchange_rate,
      bankReference: d.bank_reference,
      receiptNote: d.receipt_note,
      linkedTransactionId: d.linked_transaction_id,
      linkedAcId: d.linked_ac_id,
      confirmedBy: user.id,
    })
    return NextResponse.json({ receipt }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
