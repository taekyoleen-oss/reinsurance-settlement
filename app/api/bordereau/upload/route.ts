import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  insertPremiumBordereauBatch,
  insertLossBordereauBatch,
} from '@/lib/supabase/queries/bordereau'
import {
  parsePremiumCsvRow,
  parseLossCsvRow,
} from '@/lib/utils/bordereau-validators'
import { handleApiError } from '@/lib/api/error-handler'
import { requireUser } from '@/lib/api/auth'
import type { PremiumBordereauInsert, LossBordereauInsert } from '@/types/database'

/** CSV 텍스트를 헤더+행 배열로 파싱 */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.split(',')
    return headers.reduce<Record<string, string>>((acc, header, i) => {
      acc[header] = (values[i] ?? '').trim()
      return acc
    }, {})
  })
}

/**
 * POST /api/bordereau/upload
 * multipart/form-data:
 *   file: CSV 파일
 *   type: 'premium' | 'loss'
 *   contract_id: UUID
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser()
    const supabase = await createClient()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null
    const contractId = formData.get('contract_id') as string | null

    if (!file) return NextResponse.json({ error: 'CSV 파일이 없습니다.' }, { status: 400 })
    if (!type || !['premium', 'loss'].includes(type)) {
      return NextResponse.json({ error: 'type은 premium 또는 loss이어야 합니다.' }, { status: 400 })
    }
    if (!contractId) return NextResponse.json({ error: 'contract_id가 필요합니다.' }, { status: 400 })

    // 계약 조회
    const { data: contract, error: contractError } = await supabase
      .from('rs_contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 })
    }

    const csvText = await file.text()
    const rawRows = parseCsv(csvText)

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'CSV에 데이터 행이 없습니다.' }, { status: 400 })
    }

    if (type === 'premium') {
      const parseResults = rawRows.map((raw, idx) => {
        const { parsed, parseErrors } = parsePremiumCsvRow(raw)
        return { rowIndex: idx + 2, parsed, parseErrors }
      })

      const criticalErrors = parseResults.filter(r => r.parseErrors.length > 0)
      if (criticalErrors.length > 0) {
        return NextResponse.json({
          error: '파싱 오류가 있는 행이 있습니다.',
          parseErrors: criticalErrors.map(r => ({
            row: r.rowIndex,
            errors: r.parseErrors,
          })),
        }, { status: 422 })
      }

      const rows: PremiumBordereauInsert[] = parseResults.map(r => ({
        ...(r.parsed as PremiumBordereauInsert),
        contract_id: contractId,
        created_by: user.id,
      }))

      const result = await insertPremiumBordereauBatch(rows, contract)
      return NextResponse.json({
        data: {
          total: rawRows.length,
          inserted: result.inserted,
          validationErrors: result.errors,
        }
      }, { status: 201 })

    } else {
      const parseResults = rawRows.map((raw, idx) => {
        const { parsed, parseErrors } = parseLossCsvRow(raw)
        return { rowIndex: idx + 2, parsed, parseErrors }
      })

      const criticalErrors = parseResults.filter(r => r.parseErrors.length > 0)
      if (criticalErrors.length > 0) {
        return NextResponse.json({
          error: '파싱 오류가 있는 행이 있습니다.',
          parseErrors: criticalErrors.map(r => ({
            row: r.rowIndex,
            errors: r.parseErrors,
          })),
        }, { status: 422 })
      }

      const rows: LossBordereauInsert[] = parseResults.map(r => ({
        ...(r.parsed as LossBordereauInsert),
        contract_id: contractId,
        created_by: user.id,
      }))

      const result = await insertLossBordereauBatch(rows, contract)
      return NextResponse.json({
        data: {
          total: rawRows.length,
          inserted: result.inserted,
          validationErrors: result.errors,
        }
      }, { status: 201 })
    }
  } catch (err) {
    return handleApiError(err)
  }
}
