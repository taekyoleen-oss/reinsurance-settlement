'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AccountCurrentViewer } from '@/components/account-currents/AccountCurrentViewer'
import { ApprovalStepper } from '@/components/account-currents/ApprovalStepper'
import { ShareTokenPanel } from '@/components/account-currents/ShareTokenPanel'
import { ArrowLeft, Send, CheckCircle, XCircle, Download } from 'lucide-react'
import Link from 'next/link'
import type { AccountCurrentRow, AccountCurrentItemRow } from '@/types'

export default function AccountCurrentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ac, setAc] = useState<AccountCurrentRow | null>(null)
  const [items, setItems] = useState<AccountCurrentItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAC = () => {
    setLoading(true)
    Promise.all([
      fetch(`/api/account-currents/${id}`).then((r) => r.json()),
      fetch(`/api/account-currents/${id}/items`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([acd, itemsd]) => {
      setAc(acd.data ?? acd)
      setItems(Array.isArray(itemsd) ? itemsd : (itemsd.data ?? []))
    }).catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAC() }, [id])

  const doAction = async (action: string) => {
    if (action === 'cancel' && !confirm('정산서를 취소하시겠습니까? 연결된 거래가 잠금 해제됩니다.')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/account-currents/${id}/${action}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `${action} 실패`)
      toast.success('처리되었습니다.')
      fetchAC()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">로딩 중...</div>
  }
  if (!ac) {
    return <div className="p-8 text-center text-sm text-[var(--text-muted)]">정산서를 찾을 수 없습니다.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/account-currents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            정산서 {(ac as any).ac_no ?? (ac as any).ac_number ?? id.slice(0, 8)}
          </h1>
        </div>
        <StatusBadge status={ac.status} />
        <Button variant="default" size="sm" onClick={() => window.print()}>
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button>
      </div>

      <ApprovalStepper currentStatus={ac.status} />

      <div className="flex gap-2 print:hidden flex-wrap">
        {ac.status === 'draft' && (
          <Button size="sm" onClick={() => doAction('approve')} disabled={actionLoading}>
            <CheckCircle className="h-4 w-4 mr-1" />
            승인 요청
          </Button>
        )}
        {ac.status === 'pending_approval' && (
          <Button size="sm" onClick={() => doAction('approve')} disabled={actionLoading}>
            <CheckCircle className="h-4 w-4 mr-1" />
            승인
          </Button>
        )}
        {ac.status === 'approved' && (
          <Button size="sm" onClick={() => doAction('issue')} disabled={actionLoading}>
            <Send className="h-4 w-4 mr-1" />
            발행
          </Button>
        )}
        {['draft', 'pending_approval', 'approved', 'issued', 'disputed'].includes(ac.status) && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => doAction('cancel')}
            disabled={actionLoading}
          >
            <XCircle className="h-4 w-4 mr-1" />
            취소
          </Button>
        )}
      </div>

      <AccountCurrentViewer ac={ac} items={items} />

      {['issued', 'acknowledged'].includes(ac.status) && (
        <div className="print:hidden">
          <ShareTokenPanel acId={id} />
        </div>
      )}
    </div>
  )
}
