'use client'

import { useSearchParams } from 'next/navigation'
import { TransactionForm } from '@/components/transactions/TransactionForm'

export function TransactionNewClient() {
  const searchParams = useSearchParams()
  const contractId = searchParams.get('contractId') ?? undefined
  const counterpartyId = searchParams.get('counterpartyId') ?? undefined
  return (
    <TransactionForm initialContractId={contractId} initialCounterpartyId={counterpartyId} />
  )
}
