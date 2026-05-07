import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { createClient } from '@/lib/supabase/server'
import { updateUserProfile, deleteUser } from '@/lib/supabase/queries/users'
import { z } from 'zod'

const UpdateSchema = z.object({
  role: z
    .enum([
      'broker_technician',
      'broker_manager',
      'reviewer',
      'cedant_viewer',
      'reinsurer_viewer',
      'admin',
    ])
    .optional(),
  full_name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  company_id: z.string().uuid().nullable().optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await db
    .from('rs_user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single()
  if (!profile || profile.role !== 'admin' || !profile.is_active) return null
  return user
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const body = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { role, full_name, is_active, company_id } = parsed.data
    const profile = await updateUserProfile(id, {
      role,
      fullName: full_name,
      isActive: is_active,
      companyId: company_id,
    })
    return NextResponse.json({ profile })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    await deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
