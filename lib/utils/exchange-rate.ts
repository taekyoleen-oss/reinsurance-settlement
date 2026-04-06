import { createClient } from '@/lib/supabase/server'

/**
 * 환율 조회 (from_currency → KRW, 날짜 기준)
 * 정확한 날짜 → 없으면 가장 최근 날짜 순으로 검색
 */
export async function getExchangeRate(
  currencyCode: string,
  date: Date
): Promise<number | null> {
  // KRW는 환율 1 (기준 통화)
  if (currencyCode === 'KRW') return 1

  const supabase = await createClient()
  const db = supabase as any
  const dateStr = date.toISOString().split('T')[0]

  // 1) 정확한 날짜 우선 조회
  const { data: exact } = await db
    .from('rs_exchange_rates')
    .select('rate')
    .eq('from_currency', currencyCode)
    .eq('to_currency', 'KRW')
    .eq('rate_date', dateStr)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (exact) return exact.rate

  // 2) 해당 날짜 이전 가장 최근 환율
  const { data: recent } = await db
    .from('rs_exchange_rates')
    .select('rate')
    .eq('from_currency', currencyCode)
    .eq('to_currency', 'KRW')
    .lte('rate_date', dateStr)
    .order('rate_date', { ascending: false })
    .limit(1)
    .single()

  return recent?.rate ?? null
}

/**
 * 환율 검증 — 미등록 시 throw (거래 저장 블로킹)
 * 환율이 등록되어 있으면 해당 환율값 반환
 */
export async function validateExchangeRate(
  currencyCode: string,
  transactionDate: Date
): Promise<number> {
  if (currencyCode === 'KRW') return 1

  const rate = await getExchangeRate(currencyCode, transactionDate)
  if (rate === null) {
    const dateStr = transactionDate.toISOString().split('T')[0]
    throw Object.assign(
      new Error(`환율 미등록: ${currencyCode} (${dateStr})`),
      { code: 'EXCHANGE_RATE_NOT_FOUND', currency: currencyCode, date: dateStr }
    )
  }

  return rate
}
