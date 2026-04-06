'use client'

import { Badge } from '@/components/ui/badge'
import type { ACStatus, TransactionStatus } from '@/types'

type StatusType = ACStatus | TransactionStatus

interface StatusBadgeProps {
  status: StatusType
}

const STATUS_CONFIG: Record<StatusType, { label: string; variant: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'destructive' | 'pending' | 'muted' }> = {
  // ACStatus
  draft: { label: '초안', variant: 'default' },
  pending_approval: { label: '승인대기', variant: 'pending' },
  approved: { label: '승인됨', variant: 'accent' },
  issued: { label: '발행됨', variant: 'primary' },
  acknowledged: { label: '확인됨', variant: 'success' },
  disputed: { label: '이의신청', variant: 'destructive' },
  cancelled: { label: '취소됨', variant: 'muted' },
  // TransactionStatus
  confirmed: { label: '확정', variant: 'accent' },
  billed: { label: '청구됨', variant: 'primary' },
  settled: { label: '결제완료', variant: 'success' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as const }
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
