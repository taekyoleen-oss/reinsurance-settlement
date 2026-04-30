'use client'

import { cn } from '@/lib/utils/cn'
import { Check } from 'lucide-react'

export interface ProcessStep {
  step: number
  label: string
  shortLabel: string
  href: string
}

export const PROCESS_STEPS: ProcessStep[] = [
  { step: 1, label: '계약 등록',       shortLabel: '계약',   href: '/contracts' },
  { step: 2, label: '명세 입력',       shortLabel: '명세',   href: '/bordereau' },
  { step: 3, label: '기술계정 산출',   shortLabel: '기술계정', href: '/account-currents/new' },
  { step: 4, label: 'SOA 작성',        shortLabel: 'SOA',    href: '/account-currents' },
  { step: 5, label: '확인·승인',       shortLabel: '승인',   href: '/account-currents' },
  { step: 6, label: '정산 처리',       shortLabel: '정산',   href: '/settlements' },
  { step: 7, label: '미수·미지급 관리', shortLabel: '잔액',   href: '/outstanding' },
  { step: 8, label: '회계·보고',       shortLabel: '보고',   href: '/reports' },
]

interface ProcessStepIndicatorProps {
  currentStep: number
  collapsed?: boolean
  className?: string
}

export function ProcessStepIndicator({
  currentStep,
  collapsed = false,
  className,
}: ProcessStepIndicatorProps) {
  if (collapsed) {
    const step = PROCESS_STEPS.find(s => s.step === currentStep)
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-0.5 rounded-md border border-border bg-surface-elevated px-1.5 py-2',
          className
        )}
        title={step ? `${step.step}단계: ${step.label}` : '프로세스'}
      >
        <span className="text-[9px] font-semibold text-[var(--text-muted)]">STEP</span>
        <span className="text-sm font-bold text-primary">{currentStep}</span>
        <span className="text-[9px] text-[var(--text-muted)]">/8</span>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        정산 프로세스
      </p>
      <ol className="space-y-0.5">
        {PROCESS_STEPS.map(({ step, label }) => {
          const isDone = step < currentStep
          const isCurrent = step === currentStep

          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors',
                isCurrent
                  ? 'bg-primary/10 text-primary font-semibold'
                  : isDone
                  ? 'text-[var(--text-muted)]'
                  : 'text-[var(--text-muted)] opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                  isCurrent
                    ? 'bg-primary text-white'
                    : isDone
                    ? 'bg-success/20 text-success'
                    : 'border border-border text-[var(--text-muted)]'
                )}
              >
                {isDone ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : step}
              </span>
              <span className="truncate">{label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** 현재 pathname에 해당하는 단계 번호 반환 */
export function getStepFromPathname(pathname: string): number {
  if (pathname.includes('/contracts')) return 1
  if (pathname.includes('/bordereau') || pathname.includes('/transactions')) return 2
  if (pathname.includes('/account-currents/new')) return 3
  if (pathname.includes('/account-currents')) return 4
  if (pathname.includes('/settlements')) return 6
  if (pathname.includes('/outstanding')) return 7
  if (pathname.includes('/reports')) return 8
  return 0
}
