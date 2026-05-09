'use client'

import { useState } from 'react'
import { OutstandingKPICard } from '@/components/dashboard/OutstandingKPICard'
import { AgingAnalysisTable } from '@/components/dashboard/AgingAnalysisTable'
import { ExchangeRatePanel } from '@/components/dashboard/ExchangeRatePanel'
import { OutstandingSummaryCard } from '@/components/dashboard/OutstandingSummaryCard'
import { AgingMiniBar } from '@/components/dashboard/AgingMiniBar'
import { PremiumAlertCard } from '@/components/dashboard/PremiumAlertCard'

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
    <div className="space-y-4">
      {/* 상단: 환율 + KRW 환산 미청산 + 보험료 수령 현황 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ExchangeRatePanel />
        <OutstandingSummaryCard />
        <PremiumAlertCard />
      </div>

      {/* 통화별 미청산 KPI + Aging mini bar */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <OutstandingKPICard onSelect={handleSelect} selected={selected} />
        </div>
        <AgingMiniBar />
      </div>

      {/* Aging 상세 테이블 */}
      <AgingAnalysisTable
        filterCurrency={selected?.currency}
        onClearFilter={() => setSelected(null)}
      />
    </div>
  )
}
