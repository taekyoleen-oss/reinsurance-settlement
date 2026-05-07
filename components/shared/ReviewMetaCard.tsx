'use client'

import { Badge } from '@/components/ui/badge'

export type ReviewStatus = 'unconfirmed' | 'confirmed' | 'verified' | 'rejected'

const STATUS_LABEL: Record<ReviewStatus, string> = {
  unconfirmed: '미확정',
  confirmed: '담당자 확정',
  verified: '검수 완료',
  rejected: '반려',
}

const STATUS_VARIANT: Record<ReviewStatus, 'muted' | 'default' | 'destructive' | 'success'> = {
  unconfirmed: 'muted',
  confirmed: 'default',
  verified: 'success',
  rejected: 'destructive',
}

interface Props {
  reviewStatus?: ReviewStatus | null
  confirmerName?: string | null
  confirmerEmail?: string | null
  confirmedAt?: string | null
  verifierName?: string | null
  verifierEmail?: string | null
  verifiedAt?: string | null
  reviewNotes?: string | null
}

function formatDt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export function ReviewMetaCard({
  reviewStatus,
  confirmerName,
  confirmerEmail,
  confirmedAt,
  verifierName,
  verifierEmail,
  verifiedAt,
  reviewNotes,
}: Props) {
  const status = reviewStatus ?? 'unconfirmed'

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-text-secondary font-medium">검토 상태</span>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
      </div>

      {(confirmerName || confirmedAt) && (
        <div className="grid grid-cols-2 gap-1 text-text-secondary">
          <span>확정 담당자</span>
          <span className="text-text-primary">{confirmerName ?? '—'}</span>
          <span>확정 이메일</span>
          <span className="text-text-primary">{confirmerEmail ?? '—'}</span>
          <span>확정 일시</span>
          <span className="text-text-primary font-mono">{formatDt(confirmedAt)}</span>
        </div>
      )}

      {(verifierName || verifiedAt) && (
        <>
          <div className="border-t border-border" />
          <div className="grid grid-cols-2 gap-1 text-text-secondary">
            <span>검수자</span>
            <span className="text-text-primary">{verifierName ?? '—'}</span>
            <span>검수 이메일</span>
            <span className="text-text-primary">{verifierEmail ?? '—'}</span>
            <span>검수 일시</span>
            <span className="text-text-primary font-mono">{formatDt(verifiedAt)}</span>
          </div>
        </>
      )}

      {reviewNotes && (
        <p className="text-text-secondary text-xs mt-1 border-t border-border pt-2">
          {reviewNotes}
        </p>
      )}
    </div>
  )
}
