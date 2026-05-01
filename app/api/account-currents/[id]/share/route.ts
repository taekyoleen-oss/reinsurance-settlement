import { NextRequest, NextResponse } from 'next/server'
import { createShareToken } from '@/lib/supabase/queries/share-tokens'
import { handleApiError, NotFoundError, ConflictError } from '@/lib/api/error-handler'
import { withBrokerAuth } from '@/lib/api/handler'

/** POST /api/account-currents/[id]/share — 토큰 URL 생성 (broker만 가능) */
export const POST = withBrokerAuth(async ({ user, supabase }, req, ctx) => {
  const { id } = await ctx.params
  const db = supabase as any
  const body = await req.json().catch(() => ({}))
  const expiresInDays = typeof body.expires_in_days === 'number' ? body.expires_in_days : 30

  const { data: acData } = await db
    .from('rs_account_currents')
    .select('status')
    .eq('id', id)
    .single()
  const ac = acData as { status: string } | null

  if (!ac) throw new NotFoundError('정산서를 찾을 수 없습니다.')
  if (!['issued', 'acknowledged'].includes(ac.status)) {
    throw new ConflictError('발행된 정산서만 공유할 수 있습니다.')
  }

  const tokenRow = await createShareToken(
    'account_current',
    id,
    user.id,
    expiresInDays,
    body.notes
  )

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/share/${tokenRow.token}`

  return NextResponse.json(
    { data: { token: tokenRow.token, url: shareUrl, expires_at: tokenRow.expires_at } },
    { status: 201 }
  )
})

export type { NextRequest }
