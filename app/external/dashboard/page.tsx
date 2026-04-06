import { createClient } from '@/lib/supabase/server'
import { ExternalDashboard } from '@/components/external/ExternalDashboard'
import { redirect } from 'next/navigation'

export default async function ExternalDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('rs_user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = profileData?.role as string

  if (role !== 'cedant_viewer' && role !== 'reinsurer_viewer') {
    redirect('/dashboard')
  }

  return <ExternalDashboard role={role as 'cedant_viewer' | 'reinsurer_viewer'} />
}
