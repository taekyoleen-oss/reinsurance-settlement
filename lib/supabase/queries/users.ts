import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function listUsers() {
  const admin = getAdminClient()
  const {
    data: { users },
    error,
  } = await admin.auth.admin.listUsers()
  if (error) throw error

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: profiles } = await db
    .from('rs_user_profiles')
    .select('*, company:rs_counterparties(company_name_ko, company_name_en)')

  const profileMap = new Map((profiles ?? []).map((p: { user_id: string }) => [p.user_id, p]))

  return users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    profile: profileMap.get(u.id) ?? null,
    created_at: u.created_at,
  }))
}

export async function createUser(params: {
  email: string
  password: string
  role: string
  fullName: string
  companyId?: string
}) {
  const admin = getAdminClient()
  const {
    data: { user },
    error: createErr,
  } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
  })
  if (createErr) throw createErr
  if (!user) throw new Error('사용자 생성 실패')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error: profileErr } = await db.from('rs_user_profiles').insert({
    user_id: user.id,
    role: params.role,
    full_name: params.fullName,
    company_id: params.companyId ?? null,
    is_active: true,
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(user.id)
    throw profileErr
  }
  return user
}

export async function updateUserProfile(
  userId: string,
  updates: {
    role?: string
    fullName?: string
    isActive?: boolean
    companyId?: string | null
  }
) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('rs_user_profiles')
    .update({
      ...(updates.role !== undefined && { role: updates.role }),
      ...(updates.fullName !== undefined && { full_name: updates.fullName }),
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
      ...(updates.companyId !== undefined && { company_id: updates.companyId }),
    })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) throw error
}

export async function deleteUser(userId: string) {
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw error
}
