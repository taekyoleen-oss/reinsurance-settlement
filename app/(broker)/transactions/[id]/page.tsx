'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ArrowLeft, Trash2, Lock } from 'lucide-react'
import Link from 'next/link'
import type { TransactionRow } from '@/types'
import type { ReactNode } from 'react'

const TX_TYPE_LABELS: Record<string, string> = {
  premium: '보험료',
  return_premium: '환급보험료',
  loss: '손해',
  commission: '수수료',
  other: '기타',
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tx, setTx] = useState<TransactionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => r.json())
      .then((d) => setTx(d.data ?? d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('이 거래를 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? '삭제 실패')
      }
      toast.success('거래가 삭제되었습니다.')
      router.push('/transactions')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
        로딩 중...
      </div>
    )
  }
  if (!tx) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">
        거래를 찾을 수 없습니다.
      </div>
    )
  }

  const lossReference =
    (tx as TransactionRow & { loss_reference?: string | null }).loss_reference ?? '-'

  const fields: Array<{ label: string; value: ReactNode; mono?: boolean }> = [
    { label: '거래 ID', value: tx.id, mono: true },
    { label: '계약 ID', value: tx.contract_id, mono: true },
    { label: '거래 유형', value: TX_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type },
    { label: '방향', value: tx.direction === 'receivable' ? '수취' : '지급' },
    { label: '거래일', value: format(new Date(tx.transaction_date), 'yyyy-MM-dd') },
    { label: '원화 금액', value: tx.amount_krw?.toLocaleString('ko-KR') + ' KRW', mono: true },
    {
      label: '외화 금액',
      value: tx.amount_original?.toLocaleString() + ' ' + tx.currency_code,
      mono: true,
    },
    { label: '환율', value: tx.exchange_rate?.toFixed(4), mono: true },
    { label: '계약 유형', value: tx.contract_type },
    { label: '배분 유형', value: tx.allocation_type },
    { label: '상태', value: <StatusBadge status={tx.status} /> },
    {
      label: '청구 기간',
      value: tx.period_from && tx.period_to ? `${tx.period_from} ~ ${tx.period_to}` : '-',
    },
    { label: '만기일', value: tx.due_date ?? '-' },
    { label: '설명', value: tx.description ?? '-' },
    { label: '손해 참조번호', value: lossReference },
    { label: '잠금 여부', value: tx.is_locked ? '잠김' : '잠금 해제' },
    { label: '배분 Parent', value: tx.is_allocation_parent ? 'Yes' : 'No' },
    {
      label: '등록일',
      value: tx.created_at ? format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm') : '-',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/transactions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">거래 상세</h1>
        </div>
        {!tx.is_locked && !tx.is_deleted && (
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        )}
        {tx.is_locked && (
          <Badge variant="default" className="gap-1">
            <Lock className="h-3 w-3" />
            잠김
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">거래 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {fields.map(({ label, value, mono }) => (
              <div key={label}>
                <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
                <dd
                  className={`text-sm mt-0.5 text-[var(--text-primary)] ${mono ? 'font-mono' : ''}`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
