'use client'

import { useState } from 'react'
import { OutstandingKPICard } from '@/components/dashboard/OutstandingKPICard'
import { AgingAnalysisTable } from '@/components/dashboard/AgingAnalysisTable'

type Direction = 'receivable' | 'payable'
interface Selection {
  currency: string
  direction: Direction
}

export function DashboardClient() {
  const [selected, setSelected] = useState<Selection | null>(null)

  const handleSelect = (currency: string, direction: Direction) => {
    setSelected((prev) =>
      prev?.currency === currency && prev?.direction === direction ? null : { currency, direction }
    )
  }

  return (
    <>
      <OutstandingKPICard onSelect={handleSelect} selected={selected} />
      <AgingAnalysisTable
        filterCurrency={selected?.currency}
        filterDirection={selected?.direction ?? null}
      />
    </>
  )
}
