'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CounterpartyRow } from '@/types'

export interface CedantFilterSelectProps {
  /** 빈 문자열 = 전체 출재사 */
  value: string
  onChange: (cedantId: string) => void
  /** 라벨 (기본: 출재사) */
  label?: string
  /** SelectTrigger에 추가할 className */
  triggerClassName?: string
  disabled?: boolean
}

/**
 * 출재사(cedant) 목록을 불러와 전체/개별 필터용 콤보박스로 제공합니다.
 */
export function CedantFilterSelect({
  value,
  onChange,
  label = '출재사',
  triggerClassName = 'h-9 w-[min(100%,14rem)]',
  disabled = false,
}: CedantFilterSelectProps) {
  const [cedants, setCedants] = useState<CounterpartyRow[]>([])

  useEffect(() => {
    fetch('/api/counterparties?company_type=cedant')
      .then((r) => r.json())
      .then((d) => setCedants(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => setCedants([]))
  }, [])

  return (
    <div className="flex min-w-[10rem] flex-col gap-1.5">
      <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">{label}</Label>
      <Select
        value={value || '__all__'}
        onValueChange={(v) => onChange(v === '__all__' ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="전체 출재사" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">전체 출재사</SelectItem>
          {cedants.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.company_name_ko}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
