import { NextRequest, NextResponse } from 'next/server'
import {
  getTransactionById,
  updateTransaction,
  softDeleteTransaction,
} from '@/lib/supabase/queries/transactions'
import { handleApiError, NotFoundError, ConflictError } from '@/lib/api/error-handler'
import { withBrokerSchema, withBrokerAuth } from '@/lib/api/handler'
import { TransactionUpdateSchema } from '@/lib/api/schemas/transaction'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tx = await getTransactionById(id)
    if (!tx) throw new NotFoundError('거래를 찾을 수 없습니다.')
    return NextResponse.json({ data: tx })
  } catch (err) {
    return handleApiError(err)
  }
}

export const PATCH = withBrokerSchema(
  TransactionUpdateSchema,
  async (body, { user }, _req, ctx) => {
    const { id } = await ctx.params
    const tx = await updateTransaction(id, { ...body, updated_by: user.id })
    return NextResponse.json({ data: tx })
  }
)

export const DELETE = withBrokerAuth(async ({ user }, _req, ctx) => {
  const { id } = await ctx.params
  await softDeleteTransaction(id, user.id)
  return NextResponse.json({ data: { success: true } })
})
