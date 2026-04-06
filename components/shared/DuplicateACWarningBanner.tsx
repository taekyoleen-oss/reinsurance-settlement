'use client'

import { AlertTriangle } from 'lucide-react'

interface DuplicateACWarningBannerProps {
  acNo?: string
  periodFrom?: string
  periodTo?: string
}

export function DuplicateACWarningBanner({ acNo, periodFrom, periodTo }: DuplicateACWarningBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded border border-yellow-500/50 bg-yellow-900/20 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
      <div>
        <p className="text-sm font-semibold text-yellow-400">중복 정산서 경고</p>
        <p className="text-xs text-yellow-500/80 mt-1">
          동일 기간에 이미 발행된 정산서가 있습니다.
          {acNo && <span className="font-mono ml-1">({acNo})</span>}
          {periodFrom && periodTo && (
            <span className="ml-1">
              [{periodFrom} ~ {periodTo}]
            </span>
          )}
        </p>
        <p className="text-xs text-yellow-500/60 mt-0.5">
          계속 진행하면 중복 정산서가 생성됩니다. 기존 정산서를 확인하세요.
        </p>
      </div>
    </div>
  )
}
