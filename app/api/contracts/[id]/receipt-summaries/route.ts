import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { getReceiptSummariesByContract } from '@/lib/supabase/queries/premium-receipts'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const scheduleType = searchParams.get('schedule_type') ?? undefined
    const summaries = await getReceiptSummariesByContract(id, scheduleType)
    return NextResponse.json({ summaries })
  } catch (err) {
    return handleApiError(err)
  }
}
