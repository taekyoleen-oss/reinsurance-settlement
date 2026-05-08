import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/api/error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { data: profile } = await db
      .from('rs_user_profiles')
      .select('role, full_name, is_active, company_id')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      id: user.id,
      email: user.email ?? '',
      role: profile?.role ?? 'broker_technician',
      fullName: profile?.full_name ?? '',
      isActive: profile?.is_active ?? true,
      companyId: profile?.company_id ?? null,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
