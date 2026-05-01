'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CounterpartyRow } from '@/types'

interface ContractForm {
  contract_no: string
  contract_type: string
  treaty_type: string
  class_of_business: string
  cedant_id: string
  inception_date: string
  expiry_date: string
  settlement_currency: string
  settlement_period: string
  description: string
}

interface Props {
  form: ContractForm
  cedants: CounterpartyRow[]
  set: (key: string) => (value: string) => void
}

export function ContractBasicFields({ form, cedants, set }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>계약번호 *</Label>
          <Input value={form.contract_no} onChange={(e) => set('contract_no')(e.target.value)} placeholder="예: TR-2026-001" required />
        </div>
        <div className="space-y-1.5">
          <Label>계약 유형 *</Label>
          <Select value={form.contract_type} onValueChange={set('contract_type')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="treaty">Treaty</SelectItem>
              <SelectItem value="facultative">Facultative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.contract_type === 'treaty' && (
          <div className="space-y-1.5">
            <Label>Treaty 유형</Label>
            <Select value={form.treaty_type} onValueChange={set('treaty_type')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proportional">Proportional</SelectItem>
                <SelectItem value="non_proportional">Non-Proportional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>사업 종류 (COB)</Label>
          <Select value={form.class_of_business} onValueChange={set('class_of_business')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fire">화재</SelectItem>
              <SelectItem value="marine">해상</SelectItem>
              <SelectItem value="liability">배상책임</SelectItem>
              <SelectItem value="engineering">공사</SelectItem>
              <SelectItem value="misc">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>출재사 *</Label>
          <Select value={form.cedant_id} onValueChange={set('cedant_id')}>
            <SelectTrigger><SelectValue placeholder="출재사 선택" /></SelectTrigger>
            <SelectContent>
              {cedants.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company_name_ko}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>개시일 *</Label>
          <Input type="date" value={form.inception_date} onChange={(e) => set('inception_date')(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>만기일</Label>
          <Input type="date" value={form.expiry_date} onChange={(e) => set('expiry_date')(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>정산 통화 *</Label>
          <Input value={form.settlement_currency} onChange={(e) => set('settlement_currency')(e.target.value)} placeholder="KRW" />
        </div>
        <div className="space-y-1.5">
          <Label>정산 주기 *</Label>
          <Select value={form.settlement_period} onValueChange={set('settlement_period')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quarterly">분기</SelectItem>
              <SelectItem value="semiannual">반기</SelectItem>
              <SelectItem value="annual">연간</SelectItem>
              <SelectItem value="adhoc">수시</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>설명</Label>
          <Input value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="계약 설명" />
        </div>
      </CardContent>
    </Card>
  )
}
