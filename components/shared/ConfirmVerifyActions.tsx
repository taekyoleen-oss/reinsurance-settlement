'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { ReviewStatus } from './ReviewMetaCard'

interface Props {
  entityId: string
  entityType: 'transaction' | 'premium_bordereau' | 'loss_bordereau'
  reviewStatus: ReviewStatus
  userRole: string
  onSuccess: () => void
}

const CONFIRM_PATHS: Record<Props['entityType'], string> = {
  transaction: 'transactions',
  premium_bordereau: 'bordereau/premium',
  loss_bordereau: 'bordereau/loss',
}

export function ConfirmVerifyActions({
  entityId,
  entityType,
  reviewStatus,
  userRole,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [showReject, setShowReject] = useState(false)

  const basePath = CONFIRM_PATHS[entityType]
  const canConfirm =
    reviewStatus === 'unconfirmed' &&
    ['broker_technician', 'broker_manager', 'reviewer', 'admin'].includes(userRole)
  const canVerify =
    reviewStatus === 'confirmed' && ['reviewer', 'broker_manager', 'admin'].includes(userRole)

  async function doAction(action: 'confirm' | 'verify' | 'reject') {
    setLoading(true)
    try {
      const url = `/api/${basePath}/${entityId}/${action === 'confirm' ? 'confirm' : 'verify'}`
      const body: Record<string, string | boolean> = {}
      if (action === 'verify') body.approved = true
      if (action === 'reject') {
        body.approved = false
        body.notes = notes
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? '처리 실패')
        return
      }
      toast.success(
        action === 'confirm' ? '확정 완료' : action === 'verify' ? '검수 완료' : '반려 처리'
      )
      setShowReject(false)
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  if (!canConfirm && !canVerify) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {canConfirm && (
          <Button size="sm" onClick={() => doAction('confirm')} disabled={loading}>
            확정
          </Button>
        )}
        {canVerify && (
          <>
            <Button size="sm" onClick={() => doAction('verify')} disabled={loading}>
              검수 완료
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowReject((v) => !v)}
              disabled={loading}
            >
              반려
            </Button>
          </>
        )}
      </div>

      {showReject && (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="반려 사유"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => doAction('reject')}
            disabled={loading || !notes.trim()}
          >
            반려 확정
          </Button>
        </div>
      )}
    </div>
  )
}
