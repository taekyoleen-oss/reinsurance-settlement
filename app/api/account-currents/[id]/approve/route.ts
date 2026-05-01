import { NextRequest, NextResponse } from 'next/server'
import { updateACStatus } from '@/lib/supabase/queries/account-currents'
import { handleApiError, NotFoundError, ConflictError } from '@/lib/api/error-handler'
import { withRolesAuth } from '@/lib/api/handler'

/** POST /api/account-currents/[id]/approve — broker_manager 또는 admin만 가능 */
export const POST = withRolesAuth(
  ['broker_manager', 'admin'],
  async ({ user, supabase }, _req, ctx) => {
    const { id } = await ctx.params
    const db = supabase as any

    const { data: acData } = await db
      .from('rs_account_currents')
      .select('status')
      .eq('id', id)
      .single()
    const ac = acData as { status: string } | null

    if (!ac) throw new NotFoundError('정산서를 찾을 수 없습니다.')
    if (ac.status !== 'pending_approval') {
      throw new ConflictError(`승인 대기 상태가 아닙니다. 현재 상태: ${ac.status}`)
    }

    const data = await updateACStatus(id, 'approved', user.id)
    return NextResponse.json({ data })
  }
)

export type { NextRequest }
