'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useContracts, useCounterparties } from '@/hooks/use-reference-data'

interface AllocationItem {
  reinsurer_id: string
  reinsurer_name?: string
  signed_line: number
  allocated_amount: number
  currency_code: string
}

const INITIAL_FORM = {
  contract_id: '',
  transaction_type: 'premium',
  direction: 'receivable',
  counterparty_id: '',
  amount: '',
  currency: 'KRW',
  transaction_date: new Date().toISOString().split('T')[0],
  due_date: '',
  period_from: '',
  period_to: '',
  loss_reference: '',
  description: '',
  allocation_type: 'auto',
}

export function useTransactionForm(initialContractId?: string, initialCounterpartyId?: string) {
  const router = useRouter()
  const allContracts = useContracts()
  const counterparties = useCounterparties()
  const [allocations, setAllocations] = useState<AllocationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAlloc, setLoadingAlloc] = useState(false)
  const [filterCedantId, setFilterCedantId] = useState('')

  const [form, setForm] = useState({ ...INITIAL_FORM, contract_id: initialContractId ?? '' })

  const contracts = useMemo(
    () => allContracts.filter((c) => !filterCedantId || c.cedant_id === filterCedantId),
    [allContracts, filterCedantId]
  )

  const selectedContract = contracts.find((c) => c.id === form.contract_id)
  const isNonProp = selectedContract?.treaty_type === 'non_proportional'
  const isTreaty = selectedContract?.contract_type === 'treaty'

  useEffect(() => {
    if (!form.contract_id || contracts.length === 0) return
    if (!contracts.some((c) => c.id === form.contract_id)) {
      setForm((p) => ({ ...p, contract_id: '' }))
    }
  }, [contracts, form.contract_id])

  useEffect(() => {
    if (!initialCounterpartyId || counterparties.length === 0) return
    if (!counterparties.some((c) => c.id === initialCounterpartyId)) return
    setForm((p) =>
      p.counterparty_id === initialCounterpartyId ? p : { ...p, counterparty_id: initialCounterpartyId }
    )
  }, [initialCounterpartyId, counterparties])

  useEffect(() => {
    const c = contracts.find((x) => x.id === form.contract_id)
    if (!c?.settlement_currency) return
    setForm((p) => (p.currency === c.settlement_currency ? p : { ...p, currency: c.settlement_currency }))
  }, [form.contract_id, contracts])

  useEffect(() => {
    if (!isTreaty || isNonProp || !form.contract_id || !form.amount || parseFloat(form.amount) <= 0 || form.allocation_type !== 'auto') {
      setAllocations([])
      return
    }

    const timeout = setTimeout(async () => {
      setLoadingAlloc(true)
      try {
        const res = await fetch('/api/transactions/allocate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contract_id: form.contract_id,
            amount: parseFloat(form.amount),
            currency_code: form.currency,
            transaction_date: form.transaction_date,
          }),
        })
        const data = await res.json()
        setAllocations(data.allocations ?? [])
      } catch {
        setAllocations([])
      } finally {
        setLoadingAlloc(false)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [form.contract_id, form.amount, form.currency, form.allocation_type, isTreaty, isNonProp, form.transaction_date])

  const set = (key: string) => (value: string) => setForm((p) => ({ ...p, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contract_id || !form.counterparty_id || !form.amount) {
      toast.error('필수 항목을 입력하세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount_original: parseFloat(form.amount), allocation_type: isNonProp ? 'manual' : form.allocation_type }),
      })

      if (res.status === 422) {
        const err = await res.json()
        toast.error(err.error ?? '환율을 먼저 등록하세요.')
        return
      }
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? '저장 실패')
        return
      }

      toast.success('거래가 등록되었습니다.')
      router.push('/transactions')
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return {
    form,
    setForm,
    set,
    contracts,
    counterparties,
    selectedContract,
    isNonProp,
    isTreaty,
    allocations,
    loading,
    loadingAlloc,
    filterCedantId,
    setFilterCedantId,
    handleSubmit,
  }
}
