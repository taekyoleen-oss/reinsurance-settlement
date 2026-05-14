import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/error-handler'
import { getLossReceiptSummariesByContract } from '@/lib/supabase/queries/loss-receipts'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const summaries = await getLossReceiptSummariesByContract(id)
    return NextResponse.json({ summaries })
  } catch (err) {
    return handleApiError(err)
  }
}
