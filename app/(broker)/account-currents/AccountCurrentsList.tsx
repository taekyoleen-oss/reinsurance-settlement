'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TableExportButton } from '@/components/shared/TableExportButton'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import { Plus } from 'lucide-react'
import { useContracts, useCounterparties } from '@/hooks/use-reference-data'
import type { AccountCurrentRow, ContractWithCedantRow, CounterpartyRow } from '@/types'

interface Props {
  initialContracts: ContractWithCedantRow[]
  initialCounterparties: CounterpartyRow[]
}

export function AccountCurrentsList({ initialContracts, initialCounterparties }: Props) {
  const contracts = useContracts(initialContracts)
  const counterparties = useCounterparties(initialCounterparties)

  const [acs, setAcs] = useState<AccountCurrentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCedantId, setFilterCedantId] = useState('')
  const [filterContractId, setFilterContractId] = useState('all')
  const [filterCounterpartyId, setFilterCounterpartyId] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const contractsForSelect = contracts.filter(
    (c) => !filterCedantId || c.cedant_id === filterCedantId
  )

  useEffect(() => {
    if (filterContractId !== 'all' && !contractsForSelect.some((c) => c.id === filterContractId)) {
      setFilterContractId('all')
    }
  }, [filterContractId, contractsForSelect])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterContractId !== 'all') params.set('contractId', filterContractId)
    if (filterCedantId) params.set('cedant_id', filterCedantId)
    if (filterCounterpartyId !== 'all') params.set('counterpartyId', filterCounterpartyId)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    setLoading(true)
    setLoadError('')
    fetch(`/api/account-currents?${params}`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? '정산서 목록을 불러오지 못했습니다.')
        setAcs(d.data ?? [])
      })
      .catch((e: Error) => {
        setAcs([])
        setLoadError(e.message)
      })
      .finally(() => setLoading(false))
  }, [filterStatus, filterContractId, filterCedantId, filterCounterpartyId, dateFrom, dateTo])

  const filtered = acs.filter(
    (ac) =>
      !search ||
      ac.ac_no?.toLowerCase().includes(search.toLowerCase()) ||
      ac.id.toLowerCase().includes(search.toLowerCase()) ||
      (contracts.find((c) => c.id === ac.contract_id)?.contract_no ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (counterparties.find((cp) => cp.id === ac.counterparty_id)?.company_name_ko ?? '')
        .toLowerCase()
        .includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">정산서 관리</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Account Current 발행 및 관리</p>
        </div>
        <Link href="/account-currents/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            정산서 생성
          </Button>
        </Link>
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
            회사(수재사)
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
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
            시작일
          </Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
            종료일
          </Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        <Input
          placeholder="정산서 번호 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
            <SelectItem value="pending_approval">승인 대기</SelectItem>
            <SelectItem value="approved">승인됨</SelectItem>
            <SelectItem value="issued">발행됨</SelectItem>
            <SelectItem value="acknowledged">수신확인</SelectItem>
            <SelectItem value="disputed">이의제기</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadError && (
        <div className="rounded border border-warning-urgent/40 bg-warning-urgent/10 px-4 py-3 text-sm text-warning-urgent">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
          로딩 중...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end">
            <TableExportButton
              headers={[
                '정산서 번호',
                '특약/계약',
                '회사(수재사)',
                '기간(시작)',
                '기간(종료)',
                'Net 잔액',
                '방향',
                '상태',
                '발행일',
              ]}
              rows={filtered.map((ac) => [
                ac.ac_no ?? '',
                contracts.find((c) => c.id === ac.contract_id)?.contract_no ?? '',
                counterparties.find((cp) => cp.id === ac.counterparty_id)?.company_name_ko ?? '',
                ac.period_from,
                ac.period_to,
                ac.net_balance ?? '',
                ac.direction === 'to_reinsurer' ? '→ 수재사' : '← 출재사',
                ac.status,
                ac.issued_at ? format(new Date(ac.issued_at), 'yyyy-MM-dd') : '',
              ])}
              filename="정산서목록"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>정산서 번호</TableHead>
                <TableHead>특약/계약</TableHead>
                <TableHead>회사(수재사)</TableHead>
                <TableHead>기간</TableHead>
                <TableHead className="text-right">Net 잔액</TableHead>
                <TableHead>방향</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>발행일</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ac) => (
                <TableRow key={ac.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {ac.ac_no ?? ac.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {contracts.find((c) => c.id === ac.contract_id)?.contract_no ??
                      ac.contract_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap min-w-[120px] text-xs">
                    {counterparties.find((cp) => cp.id === ac.counterparty_id)?.company_name_ko ??
                      ac.counterparty_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-[var(--text-secondary)]">
                    {ac.period_from} ~ {ac.period_to}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                    {ac.net_balance?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs">
                    {ac.direction === 'to_reinsurer' ? '→ 수재사' : '← 출재사'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ac.status} />
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">
                    {ac.issued_at ? format(new Date(ac.issued_at), 'yyyy-MM-dd') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/account-currents/${ac.id}`}>
                      <Button size="sm" variant="ghost">
                        상세
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-[var(--text-muted)] py-8">
                    {acs.length === 0
                      ? '정산서 데이터가 없습니다.'
                      : '검색/필터 조건에 맞는 정산서가 없습니다.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
