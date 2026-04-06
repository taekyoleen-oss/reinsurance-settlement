import { createClient } from '@/lib/supabase/server'

export interface ShareEntry {
  reinsurer_id: string
  signed_line: number // % 단위 (예: 30.000)
  order_of_priority: number
}

export interface AllocatedAmount {
  reinsurer_id: string
  amount: number
  signed_line: number
}

/**
 * transaction_date 기준 유효한 signed_line 조회
 * effective_from ≤ date AND (effective_to IS NULL OR effective_to ≥ date)
 * Endorsement(지분율 변경) 지원
 */
export async function getEffectiveShares(
  contractId: string,
  transactionDate: Date
): Promise<ShareEntry[]> {
  const supabase = await createClient()
  const db = supabase as any
  const dateStr = transactionDate.toISOString().split('T')[0]

  const { data, error } = await db
    .from('rs_contract_shares')
    .select('reinsurer_id, signed_line, order_of_priority')
    .eq('contract_id', contractId)
    .lte('effective_from', dateStr)
    .or(`effective_to.is.null,effective_to.gte.${dateStr}`)
    .order('order_of_priority', { ascending: true })

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(`계약 ${contractId}의 ${dateStr} 기준 유효 지분율이 없습니다.`)
  }

  // Σ signed_line = 100% 검증 (±0.01 허용)
  const total = (data as any[]).reduce((sum: number, s: any) => sum + s.signed_line, 0)
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`지분율 합계 오류: ${total}% (100% 필요)`)
  }

  return data as ShareEntry[]
}

/**
 * 총액을 지분율로 배분
 * 소수점 오차는 1순위 수재사(order_of_priority 최솟값)에 흡수
 */
export function allocateTreatyTransaction(
  totalAmount: number,
  shares: ShareEntry[]
): AllocatedAmount[] {
  const allocated = shares.map((s) => ({
    reinsurer_id: s.reinsurer_id,
    signed_line: s.signed_line,
    amount: Math.round(totalAmount * (s.signed_line / 100) * 100) / 100,
  }))

  // 오차 보정: 합계와 총액의 차이를 1순위에 흡수
  const sumAllocated = allocated.reduce((sum, a) => sum + a.amount, 0)
  const diff = Math.round((totalAmount - sumAllocated) * 100) / 100
  if (diff !== 0) {
    const minPriority = Math.min(...shares.map((s) => s.order_of_priority))
    const firstIdx = shares.findIndex((s) => s.order_of_priority === minPriority)
    if (firstIdx !== -1) {
      allocated[firstIdx].amount =
        Math.round((allocated[firstIdx].amount + diff) * 100) / 100
    }
  }

  return allocated
}

export interface TreatyAllocationParams {
  parentTxId: string
  contractId: string
  transactionDate: Date
  totalAmount: number
  currencyCode: string
  transactionType: string
  direction: string
  exchangeRate: number
  createdBy: string
  description?: string
  periodFrom?: string
  periodTo?: string
  dueDate?: string
}

/**
 * Treaty 자동 배분 실행:
 * 1. getEffectiveShares로 유효 지분율 조회
 * 2. allocateTreatyTransaction으로 금액 배분
 * 3. 자식 TX 레코드 생성 (is_allocation_parent=false)
 * 반환: 생성된 자식 TX ID 목록
 */
export async function executeTreatyAllocation(
  params: TreatyAllocationParams
): Promise<string[]> {
  const shares = await getEffectiveShares(params.contractId, params.transactionDate)
  const allocated = allocateTreatyTransaction(params.totalAmount, shares)

  const supabase = await createClient()
  const db = supabase as any
  const childIds: string[] = []

  for (const alloc of allocated) {
    const { data, error } = await db
      .from('rs_transactions')
      .insert({
        contract_id: params.contractId,
        contract_type: 'treaty',
        parent_tx_id: params.parentTxId,
        counterparty_id: alloc.reinsurer_id,
        allocation_type: 'auto',
        is_allocation_parent: false,
        transaction_type: params.transactionType as any,
        direction: params.direction as any,
        amount_original: alloc.amount,
        currency_code: params.currencyCode,
        exchange_rate: params.exchangeRate,
        amount_krw: Math.round(alloc.amount * params.exchangeRate),
        transaction_date: params.transactionDate.toISOString().split('T')[0],
        period_from: params.periodFrom ?? null,
        period_to: params.periodTo ?? null,
        due_date: params.dueDate ?? null,
        description: params.description ?? null,
        status: 'confirmed',
        created_by: params.createdBy,
      })
      .select('id')
      .single()

    if (error) throw error
    childIds.push(data.id)
  }

  return childIds
}
