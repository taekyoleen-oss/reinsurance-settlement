import { Suspense } from 'react'
import { BordereauPageClient } from './BordereauPageClient'

export default function BordereauPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">명세 화면을 불러오는 중…</div>
      }
    >
      <BordereauPageClient />
    </Suspense>
  )
}
