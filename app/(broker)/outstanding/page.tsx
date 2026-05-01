import { createClient } from '@/lib/supabase/server'
import { attachCedantSummaries } from '@/lib/supabase/attach-cedant'
import { OutstandingContent } from './OutstandingContent'
import type { ContractWithCedantRow, CounterpartyRow } from '@/types'

async function getInitialData(): Promise<{
  contracts: ContractWithCedantRow[]
  counterparties: CounterpartyRow[]
}> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const [contractsRes, cpsRes] = await Promise.allSettled([
      db.from('rs_contracts').select('*').order('created_at', { ascending: false }),
      db.from('rs_counterparties').select('*').eq('is_active', true).order('company_name_ko'),
    ])
    const rawContracts = contractsRes.status === 'fulfilled' ? (contractsRes.value.data ?? []) : []
    const rawCps = cpsRes.status === 'fulfilled' ? (cpsRes.value.data ?? []) : []
    const contracts = await attachCedantSummaries(db, rawContracts)
    return {
      contracts: contracts as ContractWithCedantRow[],
      counterparties: rawCps as CounterpartyRow[],
    }
  } catch {
    return { contracts: [], counterparties: [] }
  }
}

export default async function OutstandingPage() {
  const { contracts, counterparties } = await getInitialData()
  return <OutstandingContent initialContracts={contracts} initialCounterparties={counterparties} />
}
