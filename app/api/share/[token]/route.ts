import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { validateToken, logTokenAccess } from '@/lib/supabase/queries/share-tokens'

/**
 * GET /api/share/[token]
 * 토큰 검증 + AC 데이터 반환 (인증 불필요, adminClient 사용)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const tokenRow = await validateToken(token)

    if (!tokenRow) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 링크입니다.' },
        { status: 404 }
      )
    }

    // AC 데이터 조회 (adminClient = RLS 우회)
    const { data: ac, error: acError } = await adminClient
      .from('rs_account_currents')
      .select(`
        *,
        rs_account_current_items (*)
      `)
      .eq('id', tokenRow.target_id)
      .single()

    if (acError || !ac) {
      return NextResponse.json({ error: '정산서를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 접근 로그 기록
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined
    const ua = req.headers.get('user-agent') ?? undefined
    await logTokenAccess(tokenRow.id, 'view', ip, ua).catch(() => {})

    return NextResponse.json({
      data: {
        ac,
        token_expires_at: tokenRow.expires_at,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
