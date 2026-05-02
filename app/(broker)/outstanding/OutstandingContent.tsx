'use client'

import { useEffect, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OutstandingKPICard } from '@/components/dashboard/OutstandingKPICard'
import { AgingAnalysisTable } from '@/components/dashboard/AgingAnalysisTable'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useContracts, useCounterparties } from '@/hooks/use-reference-data'
import type { ContractWithCedantRow, CounterpartyRow } from '@/types'

interface OutstandingItem {
  counterparty_id: string
  counterparty_name: string
  contract_id: string
  contract_no: string
  currency_code: string
  direction: string
  amount: number
  due_date?: string
  aging_bucket: string
}

function agingBucketLabel(b: string): string {
  switch (b) {
    case 'current':
      return '정상'
    case '1-30':
      return '1–30일 경과'
    case '31-60':
      return '31–60일 경과'
    case '61-90':
      return '61–90일 경과'
    case '90+':
      return '90일 초과'
    default:
      return b
  }
}

const AGING_COLORS: Record<string, string> = {
  current: 'text-[var(--success)]',
  '1-30': 'text-[var(--warning)]',
  '31-60': 'text-orange-500',
  '61-90': 'text-red-500',
  '90+': 'text-[var(--warning-urgent)]',
}

interface Props {
  initialContracts: ContractWithCedantRow[]
  initialCounterparties: CounterpartyRow[]
}

export function OutstandingContent({ initialContracts, initialCounterparties }: Props) {
  const contracts = useContracts(initialContracts)
  const counterparties = useCounterparties(initialCounterparties)

  const [items, setItems] = useState<OutstandingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCurrency, setFilterCurrency] = useState('all')
  const [filterDirection, setFilterDirection] = useState('all')
  const [filterCedantId, setFilterCedantId] = useState('')
  const [filterContractId, setFilterContractId] = useState('all')
  const [filterCounterpartyId, setFilterCounterpartyId] = useState('all')

  const contractsForSelect = contracts.filter(
    (c) => !filterCedantId || c.cedant_id === filterCedantId
  )

  useEffect(() => {
    if (filterContractId !== 'all' && !contractsForSelect.some((c) => c.id === filterContractId)) {
      setFilterContractId('all')
    }
  }, [filterContractId, contractsForSelect])

  const scopeCounterpartyId = filterCounterpartyId !== 'all' ? filterCounterpartyId : undefined
  const scopeContractId = filterContractId !== 'all' ? filterContractId : undefined
  const scopeCedantId = filterCedantId || undefined

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setItems([])

    const params = new URLSearchParams()
    params.set('type', 'detail')
    if (scopeCounterpartyId) params.set('counterpartyId', scopeCounterpartyId)
    if (scopeContractId) params.set('contractId', scopeContractId)
    if (scopeCedantId) params.set('cedant_id', scopeCedantId)

    fetch(`/api/outstanding?${params}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        if (!cancelled) setItems(d.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scopeCounterpartyId, scopeContractId, scopeCedantId])

  const filtered = items.filter((item) => {
    if (filterCurrency !== 'all' && item.currency_code !== filterCurrency) return false
    if (filterDirection !== 'all' && item.direction !== filterDirection) return false
    return true
  })

  const currencies = Array.from(new Set(items.map((i) => i.currency_code)))

  // ── M5: 가상화 — 100행 초과 시 DOM 폭증 방지 ──
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  })
  const useVirtualRows = filtered.length > 100
  const virtualRows = rowVirtualizer.getVirtualItems()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">미청산 잔액</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          거래상대방·출재사·특약·통화별 미청산 현황 및 Aging
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <CedantFilterSelect
          value={filterCedantId}
          onChange={setFilterCedantId}
          triggerClassName="h-9 w-[min(100%,14rem)]"
        />
        <div className="flex min-w-[220px] flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
            특약/계약
          </Label>
          <Select value={filterContractId} onValueChange={setFilterContractId}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 계약</SelectItem>
              {contractsForSelect.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.contract_no} · {c.cedant?.company_name_ko ?? '출재사'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[180px] flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
            회사(거래상대방)
          </Label>
          <Select value={filterCounterpartyId} onValueChange={setFilterCounterpartyId}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 회사</SelectItem>
              {counterparties
                .filter((cp) => cp.company_type === 'reinsurer' || cp.company_type === 'both')
                .map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>
                    {cp.company_name_ko}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <OutstandingKPICard
        counterpartyId={scopeCounterpartyId}
        contractId={scopeContractId}
        cedantId={scopeCedantId}
      />
      <AgingAnalysisTable
        counterpartyId={scopeCounterpartyId}
        contractId={scopeContractId}
        cedantId={scopeCedantId}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">미청산 상세 내역</h2>
          {filtered.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">({filtered.length}건)</span>
          )}
        </div>

        <div className="flex gap-3">
          <Select value={filterCurrency} onValueChange={setFilterCurrency}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 통화</SelectItem>
              {currencies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDirection} onValueChange={setFilterDirection}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 방향</SelectItem>
              <SelectItem value="receivable">수취</SelectItem>
              <SelectItem value="payable">지급</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
            로딩 중...
          </div>
        ) : useVirtualRows ? (
          /* 가상화 테이블 (100행 초과) */
          <div
            ref={parentRef}
            className="relative overflow-auto rounded border border-border"
            style={{ height: Math.min(600, filtered.length * 40 + 40) }}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>거래상대방</TableHead>
                  <TableHead>계약번호</TableHead>
                  <TableHead>통화</TableHead>
                  <TableHead>방향</TableHead>
                  <TableHead className="text-right">미청산 금액</TableHead>
                  <TableHead>만기일</TableHead>
                  <TableHead>Aging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                {virtualRows.map((vRow) => {
                  const item = filtered[vRow.index]
                  return (
                    <TableRow
                      key={vRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: vRow.size,
                        transform: `translateY(${vRow.start}px)`,
                      }}
                    >
                      <TableCell className="whitespace-nowrap min-w-[120px] text-sm">
                        {item.counterparty_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-mono">
                        {item.contract_no}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-mono">
                        {item.currency_code}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={item.direction === 'receivable' ? 'success' : 'warning'}>
                          {item.direction === 'receivable' ? '수취' : '지급'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-sm text-[var(--text-number)]">
                        {item.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-[var(--text-secondary)]">
                        {item.due_date ?? '-'}
                      </TableCell>
                      <TableCell
                        className={`whitespace-nowrap text-xs font-medium ${AGING_COLORS[item.aging_bucket] ?? ''}`}
                      >
                        {agingBucketLabel(item.aging_bucket)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* 일반 테이블 (100행 이하) */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>거래상대방</TableHead>
                <TableHead>계약번호</TableHead>
                <TableHead>통화</TableHead>
                <TableHead>방향</TableHead>
                <TableHead className="text-right">미청산 금액</TableHead>
                <TableHead>만기일</TableHead>
                <TableHead>Aging</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap min-w-[120px] text-sm">
                    {item.counterparty_name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs font-mono">
                    {item.contract_no}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs font-mono">
                    {item.currency_code}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={item.direction === 'receivable' ? 'success' : 'warning'}>
                      {item.direction === 'receivable' ? '수취' : '지급'}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-sm text-[var(--text-number)]">
                    {item.amount?.toLocaleString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-[var(--text-secondary)]">
                    {item.due_date ?? '-'}
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap text-xs font-medium ${AGING_COLORS[item.aging_bucket] ?? ''}`}
                  >
                    {agingBucketLabel(item.aging_bucket)}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[var(--text-muted)] py-8">
                    미청산 잔액 없음
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
