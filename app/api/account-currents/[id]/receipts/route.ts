import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { getReceiptsByAC, setReceiptACLink } from '@/lib/supabase/queries/premium-receipts'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await getReceiptsByAC(id)
    return NextResponse.json({ data })
  } catch (err) {
    const e = err as { message?: string; code?: string; details?: string; hint?: string }
    return NextResponse.json(
      {
        error: e?.message ?? 'AC 연결 수령 내역 조회 실패',
        diagnostics: { code: e?.code ?? null, details: e?.details ?? null, hint: e?.hint ?? null },
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/account-currents/[id]/receipts
 * body: { receipt_id: string, action: 'link' | 'unlink' }
 * 수동으로 receipt 를 이 AC 에 연결/해제
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as {
      receipt_id?: string
      action?: 'link' | 'unlink'
    }
    if (!body.receipt_id || !body.action) {
      return NextResponse.json({ error: 'receipt_id, action 필수' }, { status: 400 })
    }
    const updated = await setReceiptACLink(body.receipt_id, body.action === 'link' ? id : null)
    return NextResponse.json({ data: updated })
  } catch (err) {
    return handleApiError(err)
  }
}
