import { NextRequest, NextResponse } from 'next/server'
import { getAccountCurrentById } from '@/lib/supabase/queries/account-currents'
import { handleApiError, NotFoundError } from '@/lib/api/error-handler'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await getAccountCurrentById(id)
    if (!data) throw new NotFoundError('정산서를 찾을 수 없습니다.')
    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}
