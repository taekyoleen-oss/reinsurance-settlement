'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Plus } from 'lucide-react'
import type { AccountCurrentRow } from '@/types'

export default function AccountCurrentsPage() {
  const [acs, setAcs] = useState<AccountCurrentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)

    setLoading(true)
    fetch(`/api/account-currents?${params}`)
      .then((r) => r.json())
      .then((d) => setAcs(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus])

  const filtered = acs.filter(
    (ac) =>
      !search ||
      ac.ac_no?.toLowerCase().includes(search.toLowerCase()) ||
      ac.id.toLowerCase().includes(search.toLowerCase())
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

      <div className="flex flex-wrap gap-3">
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

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>정산서 번호</TableHead>
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
                <TableCell className="font-mono text-xs">{ac.ac_no ?? ac.id.slice(0, 8)}</TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">
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
                    <Button size="sm" variant="ghost">상세</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-[var(--text-muted)] py-8">
                  정산서 없음
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
