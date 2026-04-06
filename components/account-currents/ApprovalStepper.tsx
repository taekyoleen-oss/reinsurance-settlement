'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ACStatus } from '@/types'

interface ApprovalStepperProps {
  currentStatus: ACStatus
}

const STEPS: { status: ACStatus; label: string }[] = [
  { status: 'draft', label: '초안' },
  { status: 'pending_approval', label: '승인대기' },
  { status: 'approved', label: '승인됨' },
  { status: 'issued', label: '발행됨' },
  { status: 'acknowledged', label: '확인됨' },
]

const STATUS_ORDER: Record<ACStatus, number> = {
  draft: 0,
  pending_approval: 1,
  approved: 2,
  issued: 3,
  acknowledged: 4,
  disputed: -1,
  cancelled: -1,
}

export function ApprovalStepper({ currentStatus }: ApprovalStepperProps) {
  const currentOrder = STATUS_ORDER[currentStatus]
  const isSpecial = currentStatus === 'disputed' || currentStatus === 'cancelled'

  return (
    <div className="relative">
      {isSpecial && (
        <div
          className={cn(
            'mb-4 rounded border px-3 py-2 text-sm',
            currentStatus === 'disputed'
              ? 'border-warning-urgent/50 bg-warning-urgent/10 text-warning-urgent'
              : 'border-border bg-surface-elevated text-[var(--text-muted)]'
          )}
        >
          {currentStatus === 'disputed' ? '이의신청 상태: 정산서를 취소하고 재발행하세요.' : '취소된 정산서입니다.'}
        </div>
      )}

      <div className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const stepOrder = idx
          const isDone = currentOrder > stepOrder
          const isCurrent = currentOrder === stepOrder && !isSpecial
          const isPending = currentOrder < stepOrder || isSpecial

          return (
            <div key={step.status} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                    isDone && 'border-success bg-success text-white',
                    isCurrent && 'border-primary bg-primary-muted text-primary',
                    isPending && 'border-border bg-surface text-[var(--text-muted)]'
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-xs whitespace-nowrap',
                    isDone && 'text-success',
                    isCurrent && 'text-primary font-semibold',
                    isPending && 'text-[var(--text-muted)]'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px w-12 mx-1 mb-5 transition-colors',
                    isDone ? 'bg-success' : 'bg-border'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
