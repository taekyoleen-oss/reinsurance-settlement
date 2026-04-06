import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  updateTransaction,
  softDeleteTransaction,
} from '@/lib/supabase/queries/transactions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const tx = await updateTransaction(id, { ...body, updated_by: user.id })
    return NextResponse.json({ data: tx })
  } catch (err: any) {
    if (err.code === 'TRANSACTION_LOCKED') {
      return NextResponse.json({ error: '잠긴 거래', is_locked: true }, { status: 409 })
    }
    if (err.code === 'EXCHANGE_RATE_NOT_FOUND') {
      return NextResponse.json(
        { error: '환율 미등록', currency: err.currency, date: err.date },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const { id } = await params
    await softDeleteTransaction(id, user.id)
    return NextResponse.json({ data: { success: true } })
  } catch (err: any) {
    if (err.code === 'TRANSACTION_LOCKED') {
      return NextResponse.json({ error: '잠긴 거래', is_locked: true }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
