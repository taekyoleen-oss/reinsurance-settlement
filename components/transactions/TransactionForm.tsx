'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyAmountInput } from '@/components/shared/CurrencyAmountInput'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import { TreatyAllocationPreview } from './TreatyAllocationPreview'
import { useTransactionForm } from '@/hooks/use-transaction-form'

interface TransactionFormProps {
  initialContractId?: string
  initialCounterpartyId?: string
}

export function TransactionForm({ initialContractId, initialCounterpartyId }: TransactionFormProps) {
  const {
    form, set, contracts, counterparties, selectedContract,
    isNonProp, isTreaty, allocations, loading, loadingAlloc,
    filterCedantId, setFilterCedantId, handleSubmit,
  } = useTransactionForm(initialContractId, initialCounterpartyId)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>거래 기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <CedantFilterSelect value={filterCedantId} onChange={setFilterCedantId} triggerClassName="h-9 w-[min(100%,14rem)]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>계약 *</Label>
              <Select value={form.contract_id} onValueChange={set('contract_id')}>
                <SelectTrigger><SelectValue placeholder="계약 선택" /></SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_no}{c.cedant?.company_name_ko ? ` · ${c.cedant.company_name_ko}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedContract && (
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedContract.contract_type === 'treaty' ? 'Treaty' : 'Facultative'}{' '}
                  {selectedContract.treaty_type ? `/ ${selectedContract.treaty_type}` : ''}
                  {isNonProp && <span className="ml-2 text-warning font-medium">⚠ Non-Prop: 수동배분</span>}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>거래상대방 *</Label>
              <Select value={form.counterparty_id} onValueChange={set('counterparty_id')}>
                <SelectTrigger><SelectValue placeholder="거래상대방 선택" /></SelectTrigger>
                <SelectContent>
                  {counterparties.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name_ko}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>거래 유형 *</Label>
              <Select value={form.transaction_type} onValueChange={set('transaction_type')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">보험료</SelectItem>
                  <SelectItem value="return_premium">환급보험료</SelectItem>
                  <SelectItem value="loss">보험금</SelectItem>
                  <SelectItem value="commission">수수료</SelectItem>
                  <SelectItem value="deposit_premium">예치보험료</SelectItem>
                  <SelectItem value="interest">이자</SelectItem>
                  <SelectItem value="adjustment">조정</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>방향 *</Label>
              <Select value={form.direction} onValueChange={set('direction')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receivable">수취 (Receivable)</SelectItem>
                  <SelectItem value="payable">지급 (Payable)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>금액 및 통화 *</Label>
              <CurrencyAmountInput amount={form.amount} currency={form.currency} onAmountChange={set('amount')} onCurrencyChange={set('currency')} />
            </div>

            <div className="space-y-1.5">
              <Label>거래일 *</Label>
              <Input type="date" value={form.transaction_date} onChange={(e) => set('transaction_date')(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>만기일</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set('due_date')(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>기간 시작</Label>
              <Input type="date" value={form.period_from} onChange={(e) => set('period_from')(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>기간 종료</Label>
              <Input type="date" value={form.period_to} onChange={(e) => set('period_to')(e.target.value)} />
            </div>

            {form.transaction_type === 'loss' && (
              <div className="space-y-1.5">
                <Label>손해 참조번호</Label>
                <Input value={form.loss_reference} onChange={(e) => set('loss_reference')(e.target.value)} placeholder="클레임/손해 참조번호" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>설명</Label>
            <Input value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="거래 설명 (선택)" />
          </div>

          {isTreaty && !isNonProp && (
            <div className="space-y-1.5">
              <Label>배분 방식</Label>
              <Select value={form.allocation_type} onValueChange={set('allocation_type')}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">자동 배분</SelectItem>
                  <SelectItem value="manual">수동 배분</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {isNonProp && (
            <p className="text-xs text-warning bg-warning/10 rounded px-3 py-2">
              Non-Proportional 계약은 수동 배분만 가능합니다.
            </p>
          )}
        </CardContent>
      </Card>

      {isTreaty && !isNonProp && form.allocation_type === 'auto' && (
        <div>
          {loadingAlloc ? (
            <p className="text-sm text-[var(--text-muted)] animate-pulse">배분 계산 중...</p>
          ) : (
            <TreatyAllocationPreview items={allocations} totalAmount={parseFloat(form.amount) || 0} currency={form.currency} />
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => history.back()}>취소</Button>
        <Button type="submit" disabled={loading}>{loading ? '저장 중...' : '거래 등록'}</Button>
      </div>
    </form>
  )
}
