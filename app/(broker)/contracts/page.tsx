'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { TableExportButton } from '@/components/shared/TableExportButton'
import { ClipboardList, Plus } from 'lucide-react'
import { CedantFilterSelect } from '@/components/contracts/CedantFilterSelect'
import type { ContractWithCedantRow } from '@/types'

const STATUS_LABELS: Record<string, string> = { active: '활성', expired: '만료', cancelled: '취소' }
const TYPE_LABELS: Record<string, string> = { treaty: 'Treaty', facultative: 'Facultative' }

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((d) => d.data ?? [])

export default function ContractsPage() {
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterCedantId, setFilterCedantId] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const contractsUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterType !== 'all') params.set('contract_type', filterType)
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (filterCedantId) params.set('cedant_id', filterCedantId)
    const qs = params.toString()
    return qs ? `/api/contracts?${qs}` : '/api/contracts'
  }, [filterStatus, filterType, debouncedSearch, filterCedantId])

  const {
    data: contracts = [],
    isLoading,
    error,
  } = useSWR<ContractWithCedantRow[]>(contractsUrl, fetcher, { revalidateOnFocus: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">계약 관리</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            DB에 등록된 계약이 표시됩니다. 다음 단계 명세 입력에서 동일 계약을 선택·조회할 수
            있습니다.
          </p>
        </div>
        <Link href="/contracts/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            계약 등록
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <CedantFilterSelect
          value={filterCedantId}
          onChange={setFilterCedantId}
          triggerClassName="h-9 w-[min(100%,14rem)]"
        />
        <Input
          placeholder="계약번호·출재사명·코드·설명 검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="expired">만료</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="treaty">Treaty</SelectItem>
            <SelectItem value="facultative">Facultative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded border border-warning-urgent/40 bg-warning-urgent/10 px-4 py-3 text-sm text-warning-urgent">
          계약 목록을 불러오지 못했습니다.
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
          로딩 중...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end">
            <TableExportButton
              headers={['계약번호', '유형', '출재사', '개시일', '만기일', '정산통화', '상태']}
              rows={contracts.map((c) => [
                c.contract_no,
                TYPE_LABELS[c.contract_type] ?? c.contract_type,
                c.cedant?.company_name_ko ?? '',
                format(new Date(c.inception_date), 'yyyy-MM-dd'),
                c.expiry_date ? format(new Date(c.expiry_date), 'yyyy-MM-dd') : '',
                c.settlement_currency,
                STATUS_LABELS[c.status] ?? c.status,
              ])}
              filename="계약목록"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>계약번호</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>출재사</TableHead>
                <TableHead>명세</TableHead>
                <TableHead>개시일</TableHead>
                <TableHead>만기일</TableHead>
                <TableHead>정산통화</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {c.contract_no}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={c.contract_type === 'treaty' ? 'accent' : 'default'}>
                      {TYPE_LABELS[c.contract_type]}
                      {c.treaty_type &&
                        ` / ${c.treaty_type === 'proportional' ? 'Prop' : 'Non-Prop'}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap min-w-[120px] text-sm text-[var(--text-primary)]">
                    {c.cedant?.company_name_ko ?? `(${c.cedant_id.slice(0, 8)}…)`}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/bordereau?contractId=${c.id}`}>
                        <ClipboardList className="h-3.5 w-3.5 mr-1" />
                        명세 입력
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-[var(--text-secondary)]">
                    {format(new Date(c.inception_date), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-[var(--text-secondary)]">
                    {c.expiry_date ? format(new Date(c.expiry_date), 'yyyy-MM-dd') : '-'}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{c.settlement_currency}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === 'active'
                          ? 'success'
                          : c.status === 'expired'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {STATUS_LABELS[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/contracts/${c.id}`}>
                      <Button size="sm" variant="ghost">
                        상세
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-[var(--text-muted)] py-8">
                    {filterCedantId ||
                    debouncedSearch ||
                    filterStatus !== 'all' ||
                    filterType !== 'all'
                      ? '조건에 맞는 계약이 없습니다. 출재사·검색어·필터를 바꿔 보세요.'
                      : '등록된 계약이 없습니다. 시드 SQL 적용 여부를 확인하거나 우측 상단에서 계약을 등록하세요.'}
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
