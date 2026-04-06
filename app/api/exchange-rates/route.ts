import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllRates, createRate } from '@/lib/supabase/queries/exchange-rates'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fromCurrency = searchParams.get('fromCurrency') ?? undefined
    const dateFrom = searchParams.get('dateFrom') ?? undefined
    const dateTo = searchParams.get('dateTo') ?? undefined

    const data = await getAllRates(fromCurrency, dateFrom, dateTo)
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const { data: profileData } = await (supabase as any)
      .from('rs_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string } | null

    if (!profile?.role?.startsWith('broker_') && profile?.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await req.json()
    const rate = await createRate({ ...body, created_by: user.id })
    return NextResponse.json({ data: rate }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
