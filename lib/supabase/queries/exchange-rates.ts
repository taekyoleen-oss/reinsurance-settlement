import { createClient } from '@/lib/supabase/server'
import type { ExchangeRateRow, ExchangeRateInsert } from '@/types/database'

/**
 * 날짜 기준 환율 조회 (from_currency → KRW)
 * 정확한 날짜 없으면 해당일 이전 가장 최근 환율 반환
 */
export async function getRateByDate(
  fromCurrency: string,
  date: string
): Promise<ExchangeRateRow | null> {
  if (fromCurrency === 'KRW') return null

  const supabase = await createClient()

  // 1) 정확한 날짜
  const { data: exact } = await supabase
    .from('rs_exchange_rates')
    .select('*')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', 'KRW')
    .eq('rate_date', date)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (exact) return exact

  // 2) 이전 가장 최근 환율
  const { data: recent } = await supabase
    .from('rs_exchange_rates')
    .select('*')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', 'KRW')
    .lte('rate_date', date)
    .order('rate_date', { ascending: false })
    .limit(1)
    .single()

  return recent ?? null
}

/**
 * 통화의 최근 환율 목록 조회
 */
export async function getRecentRates(
  currencyCode: string,
  limit: number = 10
): Promise<ExchangeRateRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rs_exchange_rates')
    .select('*')
    .eq('from_currency', currencyCode)
    .eq('to_currency', 'KRW')
    .order('rate_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

/**
 * 전체 환율 목록 조회 (필터: 통화, 날짜 범위)
 */
export async function getAllRates(
  fromCurrency?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ExchangeRateRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from('rs_exchange_rates')
    .select('*')
    .order('rate_date', { ascending: false })

  if (fromCurrency) query = query.eq('from_currency', fromCurrency)
  if (dateFrom) query = query.gte('rate_date', dateFrom)
  if (dateTo) query = query.lte('rate_date', dateTo)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * 환율 등록
 */
export async function createRate(data: ExchangeRateInsert): Promise<ExchangeRateRow> {
  const supabase = await createClient()
  const db = supabase as any

  const { data: rate, error } = await db
    .from('rs_exchange_rates')
    .insert({
      ...data,
      to_currency: data.to_currency ?? 'KRW',
    })
    .select()
    .single()

  if (error) throw error
  return rate as ExchangeRateRow
}
