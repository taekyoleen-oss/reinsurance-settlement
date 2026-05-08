'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SectionAccordion } from '@/components/shared/SectionAccordion'
import { FieldHelp } from '@/components/shared/FieldHelp'

interface TermsForm {
  ceding_commission_rate: string
  ceding_commission_amount: string
  profit_commission_rate: string
  profit_commission_amount: string
  brokerage_rate: string
  brokerage_amount: string
  premium_reserve_rate: string
  loss_reserve_rate: string
  interest_rate: string
  reserve_release_timing: string
  payment_due_days: string
  confirmation_due_days: string
  offset_allowed: boolean
  cash_loss_threshold: string
  underwriting_basis: string
}

interface Props {
  form: TermsForm
  set: (key: string) => (value: string) => void
  setForm: React.Dispatch<React.SetStateAction<TermsForm & Record<string, unknown>>>
}

function CommissionTypeRow({
  label,
  helpRate,
  helpAmount,
  rateKey,
  amountKey,
  form,
  set,
}: {
  label: string
  helpRate: string
  helpAmount: string
  rateKey: string
  amountKey: string
  form: TermsForm
  set: (key: string) => (value: string) => void
}) {
  const rateVal = (form as unknown as Record<string, string>)[rateKey]
  const amountVal = (form as unknown as Record<string, string>)[amountKey]
  const isMixed = rateVal !== '' && amountVal !== ''
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
        {isMixed && (
          <span className="text-[10px] rounded px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            혼합 (비율+금액)
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
            비율(%)
            <FieldHelp text={helpRate} />
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0.00"
            value={rateVal}
            onChange={(e) => set(rateKey)(e.target.value)}
            className="font-mono text-right text-sm h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
            고정금액
            <FieldHelp text={helpAmount} />
          </Label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={amountVal}
            onChange={(e) => set(amountKey)(e.target.value)}
            className="font-mono text-right text-sm h-8"
          />
        </div>
      </div>
    </div>
  )
}

export function ContractCommissionSection({ form, set }: Pick<Props, 'form' | 'set'>) {
  return (
    <SectionAccordion
      title="수수료 체계 (Commission)"
      description="비율(%), 고정금액, 또는 비율+금액 혼합으로 설정 가능"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CommissionTypeRow
          label="출재수수료 (Ceding Commission)"
          helpRate="수재사가 출재사에 지급하는 수수료율. 예: 25 = 25%."
          helpAmount="비율과 무관하게 지급하는 고정 수수료 금액."
          rateKey="ceding_commission_rate"
          amountKey="ceding_commission_amount"
          form={form}
          set={set}
        />
        <CommissionTypeRow
          label="이익수수료 (Profit Commission)"
          helpRate="이익 발생 시 출재사가 받는 수수료율."
          helpAmount="이익수수료 고정금액 (비율과 혼합 가능)."
          rateKey="profit_commission_rate"
          amountKey="profit_commission_amount"
          form={form}
          set={set}
        />
        <CommissionTypeRow
          label="중개수수료 (Brokerage)"
          helpRate="중개사(Broker)에게 지급하는 수수료율."
          helpAmount="중개수수료 고정금액 (비율과 혼합 가능)."
          rateKey="brokerage_rate"
          amountKey="brokerage_amount"
          form={form}
          set={set}
        />
      </div>
    </SectionAccordion>
  )
}

export function ContractReserveSection({ form, set }: Pick<Props, 'form' | 'set'>) {
  return (
    <SectionAccordion
      title="적립금 및 이자 (Reserve Deposit)"
      description="보험료·손해 적립금율, 이자율, 환급 시점"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            보험료 적립금율(%)
            <FieldHelp text="수재사가 유보하는 보험료의 비율. 통상 35~40%." />
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="35.00"
            value={form.premium_reserve_rate}
            onChange={(e) => set('premium_reserve_rate')(e.target.value)}
            className="font-mono text-right"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            손해 적립금율(%)
            <FieldHelp text="미결손해의 몇 %를 적립금으로 유보할지. 통상 100%." />
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="100.00"
            value={form.loss_reserve_rate}
            onChange={(e) => set('loss_reserve_rate')(e.target.value)}
            className="font-mono text-right"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            이자율(% 연환산)
            <FieldHelp text="적립금에 대한 연 이자율." />
          </Label>
          <Input
            type="number"
            min="0"
            step="0.001"
            placeholder="3.000"
            value={form.interest_rate}
            onChange={(e) => set('interest_rate')(e.target.value)}
            className="font-mono text-right"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            적립금 환급 시점
            <FieldHelp text="next_period: 익기 환급. period_after_next: 익익기 환급." />
          </Label>
          <Select
            value={form.reserve_release_timing}
            onValueChange={(v) => set('reserve_release_timing')(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="next_period">익기 (Next Period)</SelectItem>
              <SelectItem value="period_after_next">익익기 (Period After Next)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </SectionAccordion>
  )
}

export function ContractSettlementTermsSection({
  form,
  set,
  onOffsetChange,
}: Pick<Props, 'form' | 'set'> & { onOffsetChange: (v: boolean) => void }) {
  return (
    <SectionAccordion
      title="정산 조건 (Settlement Terms)"
      description="지급기한·확인기한·상계허용·Cash Loss 한도"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            지급기한 (SOA 후 N일)
            <FieldHelp text="SOA 발행 후 지급해야 하는 기한(일수). 통상 15일." />
          </Label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="15"
            value={form.payment_due_days}
            onChange={(e) => set('payment_due_days')(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            확인기한 (수신 후 N일)
            <FieldHelp text="수재사가 SOA 수신 후 확인해야 하는 기한(일수). 통상 14일." />
          </Label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="14"
            value={form.confirmation_due_days}
            onChange={(e) => set('confirmation_due_days')(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            Cash Loss 한도
            <FieldHelp text="이 금액을 초과하는 단일 손해는 즉시 청구(Cash Call)할 수 있습니다." />
          </Label>
          <Input
            type="number"
            min="0"
            step="1000"
            placeholder="예: 100000000"
            value={form.cash_loss_threshold}
            onChange={(e) => set('cash_loss_threshold')(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            인수 기준
            <FieldHelp text="UY: 인수년도 기준. Clean-Cut: 회계년도 기준." />
          </Label>
          <Select
            value={form.underwriting_basis}
            onValueChange={(v) => set('underwriting_basis')(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UY">인수년도 (UY)</SelectItem>
              <SelectItem value="clean_cut">회계년도 (Clean-Cut)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2">
          <input
            type="checkbox"
            id="offset_allowed"
            checked={form.offset_allowed}
            onChange={(e) => onOffsetChange(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <label
            htmlFor="offset_allowed"
            className="flex items-center gap-1 text-sm text-[var(--text-secondary)]"
          >
            상계 허용 (Offset Clause)
            <FieldHelp text="동일 거래상대방과의 출재/수재 SOA를 서로 상계할 수 있는지 여부." />
          </label>
        </div>
      </div>
    </SectionAccordion>
  )
}
