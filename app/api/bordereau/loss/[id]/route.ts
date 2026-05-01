import { NextRequest, NextResponse } from 'next/server'
import {
  getLossBordereauById,
  updateLossBordereau,
  deleteLossBordereau,
} from '@/lib/supabase/queries/bordereau'
import { handleApiError, NotFoundError } from '@/lib/api/error-handler'
import { withUserAuth } from '@/lib/api/handler'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await getLossBordereauById(id)
    if (!data) throw new NotFoundError('손해 명세를 찾을 수 없습니다.')
    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}

export const PATCH = withUserAuth(async (_auth, req, ctx) => {
  const { id } = await ctx.params
  const body = await req.json()
  const data = await updateLossBordereau(id, body)
  return NextResponse.json({ data })
})

export const DELETE = withUserAuth(async (_auth, _req, ctx) => {
  const { id } = await ctx.params
  await deleteLossBordereau(id)
  return NextResponse.json({ success: true })
})
