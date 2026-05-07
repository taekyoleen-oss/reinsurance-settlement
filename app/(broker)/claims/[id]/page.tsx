'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Link2, Unlink } from 'lucide-react'

interface Claim {
  id: string
  claim_no: string
  contract_id: string
  loss_event_date: string
  reported_date?: string
  loss_reference?: string
  total_claimed_amount: number
  currency_code: string
  collected_amount: number
  paid_amount: number
  status: string
  description?: string
  contract?: { contract_no?: string }
  cedant?: { name: string }
  transactions?: LinkedTx[]
}

interface LinkedTx {
  transaction_id: string
  role: string
  notes?: string
  transaction?: {
    transaction_no: string
    direction: string
    amount_original: number
    currency_code: string
    transaction_date: string
  }
}

const STATUS_LABELS: Record<string, string> = {
  open: '열림',
  collecting: '수금중',
  ready_to_pay: '지급준비',
  paying: '지급중',
  closed: '완료',
  disputed: '이의',
  cancelled: '취소',
}

const ROLE_LABELS: Record<string, string> = {
  receipt_from_reinsurer: '수재사 수금',
  payment_to_cedant: '출재사 지급',
  recovery: '회수',
  adjustment: '조정',
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkForm, setLinkForm] = useState({
    transaction_id: '',
    role: 'receipt_from_reinsurer',
    notes: '',
  })
  const [linking, setLinking] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/claims/${id}`)
      .then((r) => r.json())
      .then((d) => setClaim(d.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleStatusChange = async (status: string) => {
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/claims/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('상태 변경 실패')
      toast.success('상태가 변경되었습니다.')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleLinkTx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkForm.transaction_id) {
      toast.error('거래 ID를 입력하세요.')
      return
    }
    setLinking(true)
    try {
      const res = await fetch(`/api/claims/${id}/link-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '연결 실패')
      toast.success('거래가 연결되었습니다.')
      setShowLinkModal(false)
      setLinkForm({ transaction_id: '', role: 'receipt_from_reinsurer', notes: '' })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkTx = async (txId: string) => {
    try {
      const res = await fetch(`/api/claims/${id}/link-transaction`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId }),
      })
      if (!res.ok) throw new Error('연결 해제 실패')
      toast.success('연결이 해제되었습니다.')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
        로딩 중...
      </div>
    )
  if (!claim)
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">
        청구를 찾을 수 없습니다.
      </div>
    )

  const collectedPct =
    claim.total_claimed_amount > 0
      ? Math.min(100, (claim.collected_amount / claim.total_claimed_amount) * 100)
      : 0
  const paidPct =
    claim.total_claimed_amount > 0
      ? Math.min(100, (claim.paid_amount / claim.total_claimed_amount) * 100)
      : 0

  const grouped = {
    receipt_from_reinsurer:
      claim.transactions?.filter((t) => t.role === 'receipt_from_reinsurer') ?? [],
    payment_to_cedant: claim.transactions?.filter((t) => t.role === 'payment_to_cedant') ?? [],
    other:
      claim.transactions?.filter(
        (t) => !['receipt_from_reinsurer', 'payment_to_cedant'].includes(t.role)
      ) ?? [],
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-mono">
            {claim.claim_no}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">사고일 {claim.loss_event_date}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={claim.status} onValueChange={handleStatusChange} disabled={statusUpdating}>
            <SelectTrigger className="w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 헤더 정보 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-[var(--text-muted)]">청구금액</div>
            <div className="text-lg font-bold font-mono text-[var(--text-number)] mt-1">
              {claim.total_claimed_amount.toLocaleString('ko-KR')} {claim.currency_code}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-[var(--text-muted)]">수금 진행</div>
            <div className="text-lg font-bold font-mono text-blue-400 mt-1">
              {claim.collected_amount.toLocaleString('ko-KR')}
            </div>
            <div className="mt-1 h-1.5 rounded bg-surface-elevated">
              <div
                className="h-1.5 rounded bg-blue-400 transition-all"
                style={{ width: `${collectedPct}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {collectedPct.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-[var(--text-muted)]">지급 진행</div>
            <div className="text-lg font-bold font-mono text-success mt-1">
              {claim.paid_amount.toLocaleString('ko-KR')}
            </div>
            <div className="mt-1 h-1.5 rounded bg-surface-elevated">
              <div
                className="h-1.5 rounded bg-success transition-all"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{paidPct.toFixed(0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-[var(--text-muted)]">계약</div>
            <div className="text-sm font-mono mt-1">
              {claim.contract?.contract_no ?? claim.contract_id.slice(0, 8)}
            </div>
            {claim.loss_reference && (
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                ref: {claim.loss_reference}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {claim.description && (
        <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-[var(--text-secondary)]">
          {claim.description}
        </div>
      )}

      {/* 연결된 거래 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">연결된 거래</h2>
        <Button size="sm" onClick={() => setShowLinkModal(true)}>
          <Link2 className="h-4 w-4 mr-1" />
          거래 연결
        </Button>
      </div>

      {(['receipt_from_reinsurer', 'payment_to_cedant', 'other'] as const).map((role) => {
        const txs = grouped[role]
        if (txs.length === 0 && role === 'other') return null
        return (
          <Card key={role}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{ROLE_LABELS[role] ?? role}</CardTitle>
            </CardHeader>
            <CardContent>
              {txs.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] py-2">없음</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>거래번호</TableHead>
                      <TableHead>거래일</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead className="text-right">해제</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txs.map((t) => (
                      <TableRow key={t.transaction_id}>
                        <TableCell>
                          <Link
                            href={`/transactions/${t.transaction_id}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {t.transaction?.transaction_no ?? t.transaction_id.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {t.transaction?.transaction_date ?? '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-[var(--text-number)]">
                          {t.transaction?.amount_original?.toLocaleString('ko-KR') ?? '-'}{' '}
                          {t.transaction?.currency_code}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {ROLE_LABELS[t.role] ?? t.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-warning-urgent"
                            onClick={() => handleUnlinkTx(t.transaction_id)}
                          >
                            <Unlink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* 거래 연결 모달 */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>거래 연결</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLinkTx} className="space-y-4">
            <div className="space-y-1.5">
              <Label>거래 ID *</Label>
              <Input
                value={linkForm.transaction_id}
                onChange={(e) => setLinkForm((f) => ({ ...f, transaction_id: e.target.value }))}
                placeholder="거래 UUID"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>역할 *</Label>
              <Select
                value={linkForm.role}
                onValueChange={(v) => setLinkForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>메모</Label>
              <Input
                value={linkForm.notes}
                onChange={(e) => setLinkForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="선택 메모"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowLinkModal(false)}>
                취소
              </Button>
              <Button type="submit" disabled={linking}>
                {linking ? '연결 중...' : '연결'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
