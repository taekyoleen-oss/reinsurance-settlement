'use client'

import useSWR from 'swr'
import type { ContractWithCedantRow, CounterpartyRow, CurrencyRow } from '@/types'

const jsonFetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((d) => d.data ?? [])

export function useContracts(initialData: ContractWithCedantRow[] = []) {
  const { data } = useSWR<ContractWithCedantRow[]>('/api/contracts', jsonFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  return data ?? initialData
}

export function useCounterparties(initialData: CounterpartyRow[] = []) {
  const { data } = useSWR<CounterpartyRow[]>('/api/counterparties', jsonFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  return data ?? initialData
}

export function useCounterpartiesByType(type: 'cedant' | 'reinsurer' | 'broker') {
  const { data } = useSWR<CounterpartyRow[]>(
    `/api/counterparties?company_type=${type}`,
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  )
  return data ?? []
}

export function useCurrencies(initialData: CurrencyRow[] = []) {
  const { data } = useSWR<CurrencyRow[]>('/api/currencies', jsonFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
  })
  return data ?? initialData
}
