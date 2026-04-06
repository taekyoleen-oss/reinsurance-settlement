import { NextRequest, NextResponse } from 'next/server'
import { getAccountCurrentById } from '@/lib/supabase/queries/account-currents'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await getAccountCurrentById(id)
    if (!data) return NextResponse.json({ error: '정산서를 찾을 수 없습니다.' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
