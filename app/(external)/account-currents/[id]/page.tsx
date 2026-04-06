'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AccountCurrentViewer } from '@/components/account-currents/AccountCurrentViewer'
import { ApprovalStepper } from '@/components/account-currents/ApprovalStepper'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CheckCircle, Download } from 'lucide-react'
import type { AccountCurrentRow, AccountCurrentItemRow } from '@/types'

export default function ExternalACDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ac, setAc] = useState<AccountCurrentRow | null>(null)
  const [items, setItems] = useState<AccountCurrentItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [ackLoading, setAckLoading] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/account-currents/${id}`).then((r) => r.json()),
      fetch(`/api/account-currents/${id}/items`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([acd, itemsd]) => {
      const data = acd.data ?? acd
      setAc(data)
      setItems(Array.isArray(itemsd) ? itemsd : (itemsd.data ?? []))
      setAcknowledged(data?.status === 'acknowledged')
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleAcknowledge = async () => {
    setAckLoading(true)
    try {
      const res = await fetch(`/api/account-currents/${id}/acknowledge`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '수신확인 실패')
      toast.success('수신확인이 완료되었습니다.')
      setAcknowledged(true)
      setAc((prev) => prev ? { ...prev, status: 'acknowledged' as any } : prev)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAckLoading(false)
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
  }
  if (!ac) {
    return <div className="p-12 text-center text-sm text-[var(--text-muted)]">정산서를 찾을 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            정산서 {(ac as any).ac_no ?? (ac as any).ac_number ?? id.slice(0, 8)}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {ac.period_from} ~ {ac.period_to}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={ac.status} />
          <Button variant="default" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          {ac.status === 'issued' && !acknowledged && (
            <Button size="sm" onClick={handleAcknowledge} disabled={ackLoading}>
              <CheckCircle className="h-4 w-4 mr-1" />
              {ackLoading ? '처리 중...' : '수신확인'}
            </Button>
          )}
          {acknowledged && (
            <div className="flex items-center gap-1 text-sm text-[var(--success)]">
              <CheckCircle className="h-4 w-4" />
              수신확인 완료
            </div>
          )}
        </div>
      </div>

      <ApprovalStepper currentStatus={ac.status} />
      <AccountCurrentViewer ac={ac} items={items} />
    </div>
  )
}
