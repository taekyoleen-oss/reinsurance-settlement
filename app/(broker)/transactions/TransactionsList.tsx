'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TableExportButton } from '@/components/shared/TableExportButton'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import { Plus } from 'lucide-react'
import { useContracts, useCounterparties } from '@/hooks/use-reference-data'
import type { ContractWithCedantRow, CounterpartyRow, TransactionRow } from '@/types'

const TX_TYPE_LABELS: Record<string, string> = {
  premium: '보험료',
  return_premium: '환급보험료',
  loss: '손해',
  commission: '수수료',
  other: '기타',
}

const DIR_LABELS: Record<string, string> = {
  receivable: '수취',
  payable: '지급',
}

interface Props {
  initialContracts: ContractWithCedantRow[]
  initialCounterparties: CounterpartyRow[]
}

export function TransactionsList({ initialContracts, initialCounterparties }: Props) {
  const contracts = useContracts(initialContracts)
  const counterparties = useCounterparties(initialCounterparties)

  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCedantId, setFilterCedantId] = useState('')
  const [filterContractId, setFilterContractId] = useState('all')
  const [filterCounterpartyId, setFilterCounterpartyId] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const contractsForSelect = useMemo(
    () => contracts.filter((c) => !filterCedantId || c.cedant_id === filterCedantId),
    [contracts, filterCedantId]
  )

  useEffect(() => {
    if (filterContractId !== 'all' && !contractsForSelect.some((c) => c.id === filterContractId)) {
      setFilterContractId('all')
    }
  }, [contractsForSelect, filterContractId])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterType !== 'all') params.set('transactionType', filterType)
    if (filterContractId !== 'all') params.set('contractId', filterContractId)
    if (filterCounterpartyId !== 'all') params.set('counterpartyId', filterCounterpartyId)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    setLoading(true)
    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((d) => setTransactions(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus, filterType, filterContractId, filterCounterpartyId, dateFrom, dateTo])

  const filtered = transactions.filter(
    (tx) =>
      !search ||
      tx.description?.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      contracts
        .find((c) => c.id === tx.contract_id)
        ?.contract_no.toLowerCase()
        .includes(search.toLowerCase()) ||
      counterparties
        .find((cp) => cp.id === tx.counterparty_id)
        ?.company_name_ko.toLowerCase()
        .includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">거래 관리</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            보험료, 손해, 수수료 등 거래 내역
          </p>
        </div>
        <Link href="/transactions/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            거래 등록
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
            회사(거래상대방)
          </Label>
          <Select value={filterCounterpartyId} onValueChange={setFilterCounterpartyId}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 회사</SelectItem>
              {counterparties.map((cp) => (
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
          placeholder="설명 또는 ID 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
            <SelectItem value="confirmed">확정</SelectItem>
            <SelectItem value="billed">청구됨</SelectItem>
            <SelectItem value="settled">정산완료</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="premium">보험료</SelectItem>
            <SelectItem value="return_premium">환급보험료</SelectItem>
            <SelectItem value="loss">손해</SelectItem>
            <SelectItem value="commission">수수료</SelectItem>
            <SelectItem value="other">기타</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
          로딩 중...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end">
            <TableExportButton
              headers={[
                '거래일',
                '특약/계약',
                '회사',
                '유형',
                '방향',
                '원화금액',
                '외화금액',
                '통화',
                '상태',
                '설명',
              ]}
              rows={filtered.map((tx) => [
                format(new Date(tx.transaction_date), 'yyyy-MM-dd'),
                contracts.find((c) => c.id === tx.contract_id)?.contract_no ?? '',
                counterparties.find((cp) => cp.id === tx.counterparty_id)?.company_name_ko ?? '',
                TX_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type,
                DIR_LABELS[tx.direction] ?? tx.direction,
                tx.amount_krw ?? '',
                tx.amount_original ?? '',
                tx.currency_code,
                tx.status,
                tx.description ?? '',
              ])}
              filename="거래목록"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>거래일</TableHead>
                <TableHead>특약/계약</TableHead>
                <TableHead>회사</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>방향</TableHead>
                <TableHead className="text-right">원화금액</TableHead>
                <TableHead className="text-right">외화금액</TableHead>
                <TableHead>통화</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id} className={tx.is_allocation_parent ? 'opacity-50' : ''}>
                  <TableCell className="whitespace-nowrap text-xs font-mono text-[var(--text-secondary)]">
                    {format(new Date(tx.transaction_date), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {contracts.find((c) => c.id === tx.contract_id)?.contract_no ??
                      tx.contract_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap min-w-[120px] text-xs">
                    {counterparties.find((cp) => cp.id === tx.counterparty_id)?.company_name_ko ??
                      tx.counterparty_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="default" className="text-xs">
                      {TX_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={tx.direction === 'receivable' ? 'success' : 'warning'}>
                      {DIR_LABELS[tx.direction]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                    {tx.amount_krw?.toLocaleString('ko-KR')}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                    {tx.amount_original?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{tx.currency_code}</TableCell>
                  <TableCell>
                    <StatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)] max-w-40 truncate">
                    {tx.description ?? '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/transactions/${tx.id}`}>
                      <Button size="sm" variant="ghost">
                        상세
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-[var(--text-muted)] py-8">
                    거래 내역 없음
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
