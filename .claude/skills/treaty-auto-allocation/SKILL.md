# 스킬: treaty-auto-allocation

## 목적
Treaty Proportional 계약에서 총 보험료/보험금을 수재사 지분율로 자동 배분하는 로직을 제공한다.

## 핵심 규칙
- **Non-Proportional(XL)**: v1에서 자동 배분 미지원 → `allocation_type='manual'` 강제
- **지분율 유효기간**: `transaction_date` 기준으로 effective 지분율 조회 (Endorsement 지원)
- **소수점 오차**: 1순위 수재사(`order_of_priority=1`) 레코드에 흡수
- **Parent TX**: `is_allocation_parent=true`로 생성, Outstanding 계산에서 제외

## 구현

### `lib/utils/treaty-allocation.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

export interface ShareEntry {
  reinsurer_id: string
  signed_line: number  // % 단위 (예: 30.000)
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
 */
export async function getEffectiveShares(
  contractId: string,
  transactionDate: Date
): Promise<ShareEntry[]> {
  const supabase = await createClient()
  const dateStr = transactionDate.toISOString().split('T')[0]

  const { data, error } = await supabase
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
  const total = data.reduce((sum, s) => sum + s.signed_line, 0)
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`지분율 합계 오류: ${total}% (100% 필요)`)
  }

  return data as ShareEntry[]
}

/**
 * 총액을 지분율로 배분 (소수점 오차 → 1순위 흡수)
 */
export function allocateTreatyTransaction(
  totalAmount: number,
  shares: ShareEntry[]
): AllocatedAmount[] {
  const allocated = shares.map(s => ({
    reinsurer_id: s.reinsurer_id,
    signed_line: s.signed_line,
    amount: Math.round(totalAmount * (s.signed_line / 100) * 100) / 100,
  }))

  // 오차 보정: 합계와 총액의 차이를 1순위에 흡수
  const sumAllocated = allocated.reduce((sum, a) => sum + a.amount, 0)
  const diff = Math.round((totalAmount - sumAllocated) * 100) / 100
  if (diff !== 0) {
    const firstIdx = allocated.findIndex(
      (_, i) => shares[i].order_of_priority === Math.min(...shares.map(s => s.order_of_priority))
    )
    allocated[firstIdx].amount = Math.round((allocated[firstIdx].amount + diff) * 100) / 100
  }

  return allocated
}

/**
 * Treaty 자동 배분 실행:
 * 1. getEffectiveShares로 유효 지분율 조회
 * 2. allocateTreatyTransaction으로 금액 배분
 * 3. Parent TX(is_allocation_parent=true) + 자식 TX 레코드 생성
 */
export async function executeTreatyAllocation(params: {
  parentTxId: string
  contractId: string
  transactionDate: Date
  totalAmount: number
  currencyCode: string
  transactionType: string
  direction: string
  exchangeRate: number
  description?: string
  periodFrom?: string
  periodTo?: string
  dueDate?: string
}): Promise<string[]> {  // 생성된 자식 TX ID 목록 반환
  const shares = await getEffectiveShares(params.contractId, params.transactionDate)
  const allocated = allocateTreatyTransaction(params.totalAmount, shares)

  const supabase = await createClient()
  const childIds: string[] = []

  for (const alloc of allocated) {
    const { data, error } = await supabase
      .from('rs_transactions')
      .insert({
        contract_id: params.contractId,
        parent_tx_id: params.parentTxId,
        counterparty_id: alloc.reinsurer_id,
        allocation_type: 'auto',
        is_allocation_parent: false,
        transaction_type: params.transactionType,
        direction: params.direction,
        amount_original: alloc.amount,
        currency_code: params.currencyCode,
        exchange_rate: params.exchangeRate,
        amount_krw: Math.round(alloc.amount * params.exchangeRate),
        transaction_date: params.transactionDate.toISOString().split('T')[0],
        period_from: params.periodFrom,
        period_to: params.periodTo,
        due_date: params.dueDate,
        description: params.description,
        status: 'confirmed',
      })
      .select('id')
      .single()

    if (error) throw error
    childIds.push(data.id)
  }

  return childIds
}
```

## UI: TreatyAllocationPreview 컴포넌트

```typescript
// Non-Proportional 계약이면 자동 배분 비활성화
const isAutoAllocationAvailable =
  contract.treaty_type === 'proportional' &&
  contract.contract_type === 'treaty'

// XL 안내 문구
if (!isAutoAllocationAvailable) {
  return (
    <div className="text-text-secondary text-sm">
      Non-Proportional(XL) 계약은 자동 배분을 지원하지 않습니다.
      수재사별 금액을 직접 입력하세요.
    </div>
  )
}
```
