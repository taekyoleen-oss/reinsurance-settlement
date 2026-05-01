'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Upload, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import { PremiumBordereauTable, LossBordereauTable } from '@/components/bordereau/BordereauTable'
import { useContracts } from '@/hooks/use-reference-data'
import type { PremiumBordereauRow, LossBordereauRow } from '@/types/database'

export function BordereauPageClient() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'premium' | 'loss'>('premium')
  const [premiumRows, setPremiumRows] = useState<PremiumBordereauRow[]>([])
  const [lossRows, setLossRows] = useState<LossBordereauRow[]>([])
  const [loading, setLoading] = useState(false)
  const allContracts = useContracts()
  const [contractId, setContractId] = useState('')
  const [filterCedantId, setFilterCedantId] = useState('')
  const [period, setPeriod] = useState('')

  const contracts = useMemo(
    () => allContracts.filter((c) => !filterCedantId || c.cedant_id === filterCedantId),
    [allContracts, filterCedantId]
  )

  useEffect(() => {
    if (!contractId || contracts.length === 0) return
    if (!contracts.some((c) => c.id === contractId)) {
      setContractId('')
    }
  }, [contracts, contractId])

  useEffect(() => {
    const q = searchParams.get('contractId')
    if (q) setContractId(q)
    const tab = searchParams.get('tab')
    if (tab === 'loss' || tab === 'premium') setActiveTab(tab)
  }, [searchParams])

  const loadPremium = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (contractId) params.set('contractId', contractId)
      if (period) params.set('periodYyyyqn', period)
      const res = await fetch(`/api/bordereau/premium?${params}`)
      const json = await res.json()
      setPremiumRows(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [contractId, period])

  const loadLoss = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (contractId) params.set('contractId', contractId)
      if (period) params.set('periodYyyyqn', period)
      const res = await fetch(`/api/bordereau/loss?${params}`)
      const json = await res.json()
      setLossRows(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [contractId, period])

  useEffect(() => {
    if (activeTab === 'premium') loadPremium()
    else loadLoss()
  }, [activeTab, loadPremium, loadLoss])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">명세 입력 (Bordereau)</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            2단계 — 출재사·계약을 고른 뒤 명세를 조회·추가합니다. 계약 관리 등에서 본 페이지의
            「명세 입력」으로 들어오면 해당 계약이 자동으로 선택됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/bordereau/upload">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              CSV 업로드
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link
              href={
                contractId
                  ? `${activeTab === 'premium' ? '/bordereau/premium/new' : '/bordereau/loss/new'}?contractId=${encodeURIComponent(contractId)}`
                  : activeTab === 'premium'
                    ? '/bordereau/premium/new'
                    : '/bordereau/loss/new'
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {activeTab === 'premium' ? '보험료 명세 추가' : '손해 명세 추가'}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-elevated p-3">
        <CedantFilterSelect
          value={filterCedantId}
          onChange={setFilterCedantId}
          triggerClassName="h-9 w-[min(100%,14rem)]"
        />
        <div className="flex min-w-[220px] max-w-md flex-1 flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">계약</Label>
          <Select
            value={contractId || '__all__'}
            onValueChange={(v) => setContractId(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="h-9 text-left text-sm">
              <SelectValue placeholder="계약을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">전체 계약</SelectItem>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-mono text-xs">{c.contract_no}</span>
                  {' · '}
                  {c.cedant?.company_name_ko ?? '출재사'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">회계기간</Label>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="예: 2026Q1"
            className="h-9 w-32 rounded border border-border bg-background px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (activeTab === 'premium' ? loadPremium() : loadLoss())}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            조회
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'premium' | 'loss')}
        className="rounded-lg border border-border bg-surface"
      >
        <div className="border-b border-border px-4 pt-3">
          <TabsList className="h-8 gap-1 bg-transparent p-0">
            <TabsTrigger
              value="premium"
              className="rounded px-3 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              보험료 명세 ({premiumRows.length})
            </TabsTrigger>
            <TabsTrigger
              value="loss"
              className="rounded px-3 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              손해 명세 ({lossRows.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="premium" className="mt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              불러오는 중...
            </div>
          ) : (
            <PremiumBordereauTable rows={premiumRows} />
          )}
        </TabsContent>

        <TabsContent value="loss" className="mt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              불러오는 중...
            </div>
          ) : (
            <LossBordereauTable rows={lossRows} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
