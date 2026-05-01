'use client'

import useSWR from 'swr'
import type { ContractWithCedantRow, CounterpartyRow, CurrencyRow } from '@/types'

const jsonFetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((d) => d.data ?? [])

/**
 * 계약 목록 — SWR 캐시로 페이지 간 공유 (재fetch 방지)
 * initialData: RSC 페이지에서 서버사이드로 전달한 초기 데이터
 */
export function useContracts(initialData: ContractWithCedantRow[] = []) {
  const { data } = useSWR<ContractWithCedantRow[]>('/api/contracts', jsonFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  return data ?? initialData
}

/**
 * 거래상대방 목록 — SWR 캐시로 페이지 간 공유
 */
export function useCounterparties(initialData: CounterpartyRow[] = []) {
  const { data } = useSWR<CounterpartyRow[]>('/api/counterparties', jsonFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  return data ?? initialData
}

/**
 * 통화 목록 — 자주 바뀌지 않으므로 5분 캐시
 */
export function useCurrencies(initialData: CurrencyRow[] = []) {
  const { data } = useSWR<CurrencyRow[]>('/api/currencies', jsonFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
  })
  return data ?? initialData
}
