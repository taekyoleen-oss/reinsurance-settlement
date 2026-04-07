# 스킬: account-current-generator

## 목적
Account Current(정산서) 생성 — 4가지 주기별 기간 계산, B/F 이월, 거래 집계, direction 자동결정, 스냅샷 저장 로직을 제공한다.

## 핵심 규칙
- **B/F**: 순 미청산 잔액 이월 = `직전 AC net_balance - 직전 AC에 매칭된 settlement 합계`
- **Direction**: `net_balance > 0 → to_reinsurer`, `≤ 0 → to_cedant`
- **스냅샷**: AC `issued` 전환 시 `rs_account_current_items`에 거래 내역 저장
- **Parent TX 제외**: `is_allocation_parent=false` 레코드만 집계
- **중복 체크**: 동일 contract+counterparty+period 중복 AC 존재 시 경고 (차단 아님)

## 구현

### `lib/utils/period.ts`

```typescript
export type PeriodType = 'quarterly' | 'semiannual' | 'annual' | 'adhoc'

export function getDefaultPeriod(
  type: PeriodType,
  referenceDate: Date
): { from: Date; to: Date } {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()  // 0-indexed

  switch (type) {
    case 'quarterly': {
      const q = Math.floor(month / 3)
      return {
        from: new Date(year, q * 3, 1),
        to: new Date(year, q * 3 + 3, 0),
      }
    }
    case 'semiannual': {
      const half = month < 6 ? 0 : 1
      return {
        from: new Date(year, half * 6, 1),
        to: new Date(year, half * 6 + 6, 0),
      }
    }
    case 'annual':
      return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) }
    case 'adhoc':
      return { from: referenceDate, to: referenceDate }
  }
}

export function formatPeriodLabel(type: PeriodType, from: Date, to: Date): string {
  const year = from.getFullYear()
  switch (type) {
    case 'quarterly':
      return `${year} Q${Math.floor(from.getMonth() / 3) + 1}`
    case 'semiannual':
      return `${year} ${from.getMonth() < 6 ? 'H1' : 'H2'}`
    case 'annual':
      return `${year}`
    case 'adhoc':
      return `수시 (${from.toLocaleDateString('ko-KR')} ~ ${to.toLocaleDateString('ko-KR')})`
  }
}
```

### `lib/utils/account-current.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

/**
 * B/F 계산: 직전 AC net_balance - 직전 AC 매칭 settlement 합계
 */
export async function calculateBF(
  contractId: string,
  counterpartyId: string,
  currentPeriodFrom: Date
): Promise<number> {
  const supabase = await createClient()

  // 직전 AC 조회 (cancelled 제외)
  const { data: prevAC } = await supabase
    .from('rs_account_currents')
    .select('id, net_balance')
    .eq('contract_id', contractId)
    .eq('counterparty_id', counterpartyId)
    .lt('period_to', currentPeriodFrom.toISOString().split('T')[0])
    .in('status', ['issued', 'acknowledged', 'settled'])
    .order('period_to', { ascending: false })
    .limit(1)
    .single()

  if (!prevAC) return 0

  // 직전 AC에 매칭된 settlement 합계
  const { data: matches } = await supabase
    .from('rs_settlement_matches')
    .select('matched_amount')
    .eq('ac_id', prevAC.id)

  const matchedSum = (matches ?? []).reduce((s, m) => s + m.matched_amount, 0)
  return (prevAC.net_balance ?? 0) - matchedSum
}

/**
 * AC 집계: transaction_type별 합산 + direction 자동결정
 */
export async function aggregateAccountCurrent(params: {
  contractId: string
  counterpartyId: string
  periodFrom: Date
  periodTo: Date
  settlementCurrency: string
}): Promise<{
  subtotal_premium: number
  subtotal_loss: number
  subtotal_commission: number
  subtotal_other: number
  balance_bf: number
  net_balance: number
  direction: 'to_reinsurer' | 'to_cedant'
  transaction_ids: string[]
}> {
  const supabase = await createClient()
  const fromStr = params.periodFrom.toISOString().split('T')[0]
  const toStr = params.periodTo.toISOString().split('T')[0]

  // is_allocation_parent=false 레코드만 집계
  const { data: txs } = await supabase
    .from('rs_transactions')
    .select('id, transaction_type, direction, amount_original, currency_code, exchange_rate')
    .eq('contract_id', params.contractId)
    .eq('counterparty_id', params.counterpartyId)
    .eq('is_allocation_parent', false)
    .in('status', ['confirmed', 'billed'])
    .gte('period_from', fromStr)
    .lte('period_to', toStr)
    .eq('is_deleted', false)

  const items = txs ?? []
  let subtotal_premium = 0, subtotal_loss = 0
  let subtotal_commission = 0, subtotal_other = 0

  for (const tx of items) {
    // settlement_currency로 환산
    const amount = tx.amount_original * (tx.exchange_rate ?? 1)
    const signed = tx.direction === 'receivable' ? amount : -amount

    switch (tx.transaction_type) {
      case 'premium': subtotal_premium += signed; break
      case 'return_premium': subtotal_premium += signed; break
      case 'loss': subtotal_loss += signed; break
      case 'commission': subtotal_commission += signed; break
      default: subtotal_other += signed; break
    }
  }

  const balance_bf = await calculateBF(
    params.contractId, params.counterpartyId, params.periodFrom
  )

  const net_balance = balance_bf + subtotal_premium + subtotal_loss
                    + subtotal_commission + subtotal_other

  return {
    subtotal_premium,
    subtotal_loss,
    subtotal_commission,
    subtotal_other,
    balance_bf,
    net_balance,
    direction: net_balance > 0 ? 'to_reinsurer' : 'to_cedant',
    transaction_ids: items.map(t => t.id),
  }
}

/**
 * AC issued 시 스냅샷 저장
 */
export async function snapshotACItems(acId: string): Promise<void> {
  const supabase = await createClient()

  const { data: ac } = await supabase
    .from('rs_account_currents')
    .select('contract_id, counterparty_id, period_from, period_to')
    .eq('id', acId)
    .single()

  if (!ac) throw new Error('AC not found')

  const { data: txs } = await supabase
    .from('rs_transactions')
    .select('*')
    .eq('contract_id', ac.contract_id)
    .eq('counterparty_id', ac.counterparty_id)
    .eq('is_allocation_parent', false)
    .in('status', ['confirmed', 'billed'])
    .gte('period_from', ac.period_from)
    .lte('period_to', ac.period_to)
    .eq('is_deleted', false)

  const snapshotDate = new Date().toISOString()
  const items = (txs ?? []).map(tx => ({
    ac_id: acId,
    tx_id: tx.id,
    transaction_type: tx.transaction_type,
    description: tx.description,
    amount_original: tx.amount_original,
    currency_code: tx.currency_code,
    exchange_rate: tx.exchange_rate,
    amount_settlement_currency: tx.amount_original * (tx.exchange_rate ?? 1),
    direction: tx.direction,
    snapshot_date: snapshotDate,
  }))

  if (items.length > 0) {
    await supabase.from('rs_account_current_items').insert(items)
  }
}
```

## 중복 AC 체크 (DuplicateACWarningBanner)

```typescript
// AC 생성 폼에서 호출
export async function checkDuplicateAC(
  contractId: string,
  counterpartyId: string,
  periodFrom: string,
  periodTo: string
): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('rs_account_currents')
    .select('id', { count: 'exact' })
    .eq('contract_id', contractId)
    .eq('counterparty_id', counterpartyId)
    .lte('period_from', periodTo)
    .gte('period_to', periodFrom)
    .neq('status', 'cancelled')

  return (count ?? 0) > 0
}
```
