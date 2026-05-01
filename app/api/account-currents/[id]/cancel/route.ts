import { NextRequest, NextResponse } from 'next/server'
import { updateACStatus } from '@/lib/supabase/queries/account-currents'
import { handleApiError, NotFoundError, ConflictError } from '@/lib/api/error-handler'
import { withBrokerAuth } from '@/lib/api/handler'

/** POST /api/account-currents/[id]/cancel — 취소: DB 트리거가 is_locked=false 처리 */
export const POST = withBrokerAuth(async ({ user, supabase }, req, ctx) => {
  const { id } = await ctx.params
  const db = supabase as any
  const body = await req.json().catch(() => ({}))

  const { data: acData } = await db
    .from('rs_account_currents')
    .select('status')
    .eq('id', id)
    .single()
  const ac = acData as { status: string } | null

  if (!ac) throw new NotFoundError('정산서를 찾을 수 없습니다.')
  if (ac.status === 'cancelled') throw new ConflictError('이미 취소된 정산서입니다.')

  const data = await updateACStatus(id, 'cancelled', user.id, {
    notes: body.reason ?? null,
  })
  return NextResponse.json({ data })
})

export type { NextRequest }
