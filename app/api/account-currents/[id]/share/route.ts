import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createShareToken } from '@/lib/supabase/queries/share-tokens'

/**
 * POST /api/account-currents/[id]/share
 * 토큰 URL 생성 (broker만 가능)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const db = supabase as any
    const { data: profileData } = await db
      .from('rs_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string } | null

    if (!profile?.role?.startsWith('broker_') && profile?.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const expiresInDays = body.expires_in_days ?? 30

    // 발행된 AC만 공유 가능
    const { data: acData } = await db
      .from('rs_account_currents')
      .select('status')
      .eq('id', id)
      .single()
    const ac = acData as { status: string } | null

    if (!ac) return NextResponse.json({ error: '정산서를 찾을 수 없습니다.' }, { status: 404 })
    if (!['issued', 'acknowledged'].includes(ac.status)) {
      return NextResponse.json(
        { error: '발행된 정산서만 공유할 수 있습니다.' },
        { status: 409 }
      )
    }

    const tokenRow = await createShareToken(
      'account_current',
      id,
      user.id,
      expiresInDays,
      body.notes
    )

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/share/${tokenRow.token}`

    return NextResponse.json({
      data: {
        token: tokenRow.token,
        url: shareUrl,
        expires_at: tokenRow.expires_at,
      },
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
