import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { resetUserPassword } from '@/lib/supabase/queries/users'
import { z } from 'zod'

const Schema = z.object({ password: z.string().min(8) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    const { data: profile } = await db
      .from('rs_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    await resetUserPassword(id, parsed.data.password)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
