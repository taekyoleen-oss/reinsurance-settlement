'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowLeft, ClipboardList, FileText, Layers, Plus } from 'lucide-react'
import Link from 'next/link'
import type { ContractWithCedantRow } from '@/types'

interface ShareRow {
  id: string
  reinsurer_id: string
  reinsurer_name?: string
  signed_line: number
  order_of_priority: number
  effective_from: string
  effective_to?: string
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contract, setContract] = useState<ContractWithCedantRow | null>(null)
  const [shares, setShares] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/contracts/${id}`).then((r) => r.json()),
      fetch(`/api/contracts/${id}/shares`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([cd, sd]) => {
      setContract(cd.data ?? cd)
      setShares(sd.data ?? [])
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
  }
  if (!contract) {
    return <div className="p-8 text-center text-sm text-[var(--text-muted)]">계약을 찾을 수 없습니다.</div>
  }

  const TYPE_LABELS: Record<string, string> = { treaty: 'Treaty', facultative: 'Facultative' }
  const STATUS_LABELS: Record<string, string> = { active: '활성', expired: '만료', cancelled: '취소' }
  const STATUS_VARIANTS: Record<string, any> = { active: 'success', expired: 'warning', cancelled: 'muted' }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/contracts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
        </Link>
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{contract.contract_no}</h1>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            이 계약 기준으로 명세 → 거래 → 정산서(SOA) 순으로 연결됩니다. 명세는 여러 행·기간이 가능합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/bordereau?contractId=${contract.id}`}>
              <ClipboardList className="h-3.5 w-3.5 mr-1" />
              명세 입력
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/transactions/new?contractId=${contract.id}`}>
              <FileText className="h-3.5 w-3.5 mr-1" />
              거래 등록
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/account-currents/new?contractId=${contract.id}`}>
              <Layers className="h-3.5 w-3.5 mr-1" />
              정산서 생성
            </Link>
          </Button>
        </div>
        <Badge variant={STATUS_VARIANTS[contract.status] ?? 'default'}>
          {STATUS_LABELS[contract.status] ?? contract.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">계약 기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: '계약번호', value: contract.contract_no, mono: true },
                { label: '계약 유형', value: `${TYPE_LABELS[contract.contract_type]}${contract.treaty_type ? ` / ${contract.treaty_type === 'proportional' ? '비례' : '비비례'}` : ''}` },
                {
                  label: '출재사',
                  value: contract.cedant?.company_name_ko ?? contract.cedant_id,
                  mono: !contract.cedant?.company_name_ko,
                },
                { label: '정산 통화', value: contract.settlement_currency, mono: true },
                { label: '개시일', value: format(new Date(contract.inception_date), 'yyyy-MM-dd'), mono: true },
                { label: '만기일', value: contract.expiry_date ? format(new Date(contract.expiry_date), 'yyyy-MM-dd') : '-', mono: true },
                { label: '보험업종', value: contract.class_of_business ?? '-' },
                { label: '정산 주기', value: contract.settlement_period ?? '-' },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
                  <dd className={`text-sm mt-0.5 text-[var(--text-primary)] ${mono ? 'font-mono' : ''}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">특약 조건</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <dt className="text-xs text-[var(--text-muted)]">설명</dt>
                <dd className="text-sm mt-0.5 text-[var(--text-primary)]">{contract.description ?? '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {contract.contract_type === 'treaty' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">지분율 현황 (수재사)</CardTitle>
            <Link href={`/contracts/${id}/shares/new`}>
              <Button size="sm" variant="default">
                <Plus className="h-4 w-4 mr-1" />
                지분율 추가
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {shares.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">등록된 지분율 없음</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>수재사</TableHead>
                    <TableHead className="text-right">지분율</TableHead>
                    <TableHead>유효기간 시작</TableHead>
                    <TableHead>유효기간 종료</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shares.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.order_of_priority}</TableCell>
                      <TableCell className="text-sm">{s.reinsurer_name ?? s.reinsurer_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                        {s.signed_line.toFixed(3)}%
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[var(--text-secondary)]">{s.effective_from}</TableCell>
                      <TableCell className="text-xs font-mono text-[var(--text-secondary)]">{s.effective_to ?? '–'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-surface-elevated">
                    <TableCell colSpan={2} className="text-sm font-medium">합계</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium text-[var(--text-number)]">
                      {shares.reduce((sum, s) => sum + s.signed_line, 0).toFixed(3)}%
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
