'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CurrencyRow } from '@/types'

interface CurrencyAmountInputProps {
  amount: string
  currency: string
  onAmountChange: (value: string) => void
  onCurrencyChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function CurrencyAmountInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  disabled,
  placeholder = '0.00',
}: CurrencyAmountInputProps) {
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([])

  useEffect(() => {
    fetch('/api/currencies')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCurrencies(data)
        else if (data.data) setCurrencies(data.data)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex gap-2">
      <Select value={currency} onValueChange={onCurrencyChange} disabled={disabled}>
        <SelectTrigger className="w-24 shrink-0">
          <SelectValue placeholder="통화" />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="font-mono text-right text-[var(--text-number)]"
      />
    </div>
  )
}
