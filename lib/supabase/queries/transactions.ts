import { createClient } from '@/lib/supabase/server'
import type { TransactionRow, TransactionInsert, TransactionUpdate } from '@/types/database'
import { validateExchangeRate } from '@/lib/utils/exchange-rate'

export interface TransactionFilters {
  counterpartyId?: string
  contractId?: string
  status?: string
  transactionType?: string
  dateFrom?: string
  dateTo?: string
  isDeleted?: boolean
}

/**
 * 거래 목록 조회 (필터 지원)
 */
export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from('rs_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.counterpartyId) {
    query = query.eq('counterparty_id', filters.counterpartyId)
  }
  if (filters.contractId) {
    query = query.eq('contract_id', filters.contractId)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.transactionType) {
    query = query.eq('transaction_type', filters.transactionType)
  }
  if (filters.dateFrom) {
    query = query.gte('transaction_date', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('transaction_date', filters.dateTo)
  }

  // 기본적으로 삭제된 항목 제외
  const showDeleted = filters.isDeleted === true
  if (!showDeleted) {
    query = query.eq('is_deleted', false)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * 거래 생성 (환율 검증 포함)
 */
export async function createTransaction(
  data: Omit<TransactionInsert, 'exchange_rate' | 'amount_krw'>
): Promise<TransactionRow> {
  const supabase = await createClient()
  const db = supabase as any

  const transactionDate = new Date(data.transaction_date)
  const rate = await validateExchangeRate(data.currency_code, transactionDate)
  const amount_krw =
    data.currency_code === 'KRW'
      ? data.amount_original
      : Math.round(data.amount_original * rate)

  const { data: tx, error } = await db
    .from('rs_transactions')
    .insert({
      ...data,
      exchange_rate: rate,
      amount_krw,
    })
    .select()
    .single()

  if (error) throw error
  return tx as TransactionRow
}

/**
 * 거래 수정 (is_locked 확인)
 */
export async function updateTransaction(
  id: string,
  updates: TransactionUpdate
): Promise<TransactionRow> {
  const supabase = await createClient()
  const db = supabase as any

  // 잠금 여부 확인
  const { data: existingData, error: fetchError } = await db
    .from('rs_transactions')
    .select('is_locked, is_deleted')
    .eq('id', id)
    .single()
  const existing = existingData as { is_locked: boolean; is_deleted: boolean } | null

  if (fetchError || !existing) throw new Error('거래를 찾을 수 없습니다.')
  if (existing.is_locked) {
    throw Object.assign(new Error('잠긴 거래는 수정할 수 없습니다.'), {
      code: 'TRANSACTION_LOCKED',
      is_locked: true,
    })
  }
  if (existing.is_deleted) throw new Error('삭제된 거래입니다.')

  // 통화/날짜 변경 시 환율 재검증
  let finalUpdates = { ...updates, updated_at: new Date().toISOString() }
  if (updates.currency_code || updates.transaction_date) {
    const { data: currentData } = await db
      .from('rs_transactions')
      .select('currency_code, transaction_date, amount_original')
      .eq('id', id)
      .single()
    const current = currentData as {
      currency_code: string
      transaction_date: string
      amount_original: number
    } | null

    if (current) {
      const currencyCode = updates.currency_code ?? current.currency_code
      const txDate = new Date(updates.transaction_date ?? current.transaction_date)
      const amount = updates.amount_original ?? current.amount_original
      const rate = await validateExchangeRate(currencyCode, txDate)
      finalUpdates = {
        ...finalUpdates,
        exchange_rate: rate,
        amount_krw:
          currencyCode === 'KRW' ? amount : Math.round(amount * rate),
      }
    }
  }

  const { data: tx, error } = await db
    .from('rs_transactions')
    .update(finalUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return tx as TransactionRow
}

/**
 * 거래 소프트 삭제
 */
export async function softDeleteTransaction(
  id: string,
  deletedBy: string
): Promise<void> {
  const supabase = await createClient()
  const db = supabase as any

  const { data: existingData } = await db
    .from('rs_transactions')
    .select('is_locked')
    .eq('id', id)
    .single()
  const existing = existingData as { is_locked: boolean } | null

  if (existing?.is_locked) {
    throw Object.assign(new Error('잠긴 거래는 삭제할 수 없습니다.'), {
      code: 'TRANSACTION_LOCKED',
      is_locked: true,
    })
  }

  const { error } = await db
    .from('rs_transactions')
    .update({
      is_deleted: true,
      updated_by: deletedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

/**
 * 거래 단건 조회
 */
export async function getTransactionById(id: string): Promise<TransactionRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rs_transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
