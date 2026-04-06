'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import type { ContractRow } from '@/types'

const STATUS_LABELS = { active: '활성', expired: '만료', cancelled: '취소' }
const TYPE_LABELS = { treaty: 'Treaty', facultative: 'Facultative' }

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterType !== 'all') params.set('contract_type', filterType)

    fetch(`/api/contracts?${params}`)
      .then((r) => r.json())
      .then((d) => setContracts(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus, filterType])

  const filtered = contracts.filter((c) =>
    !search || c.contract_no.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">계약 관리</h1>
        <Link href="/contracts/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            계약 등록
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="계약번호 검색..."
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

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>계약번호</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>출재사</TableHead>
              <TableHead>개시일</TableHead>
              <TableHead>만기일</TableHead>
              <TableHead>정산통화</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.contract_no}</TableCell>
                <TableCell>
                  <Badge variant={c.contract_type === 'treaty' ? 'accent' : 'default'}>
                    {TYPE_LABELS[c.contract_type]}
                    {c.treaty_type && ` / ${c.treaty_type === 'proportional' ? 'Prop' : 'Non-Prop'}`}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">
                  {c.cedant_id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">
                  {format(new Date(c.inception_date), 'yyyy-MM-dd')}
                </TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">
                  {c.expiry_date ? format(new Date(c.expiry_date), 'yyyy-MM-dd') : '-'}
                </TableCell>
                <TableCell className="text-xs font-mono">{c.settlement_currency}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      c.status === 'active' ? 'success' : c.status === 'expired' ? 'warning' : 'muted'
                    }
                  >
                    {STATUS_LABELS[c.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/contracts/${c.id}`}>
                    <Button size="sm" variant="ghost">상세</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-[var(--text-muted)] py-8">
                  계약 없음
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
