import { AccountCurrentViewer } from '@/components/account-currents/AccountCurrentViewer'
import { Button } from '@/components/ui/button'
import { Clock, Download } from 'lucide-react'
import type { AccountCurrentRow, AccountCurrentItemRow } from '@/types'

async function getShareData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/share/${token}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  return data.data ?? null
}

async function getACData(acId: string): Promise<{ ac: AccountCurrentRow | null; items: AccountCurrentItemRow[] }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const [acRes, itemsRes] = await Promise.all([
    fetch(`${baseUrl}/api/account-currents/${acId}`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/account-currents/${acId}/items`, { cache: 'no-store' }).catch(() => null),
  ])
  const acData = acRes.ok ? await acRes.json() : null
  const itemsData = itemsRes?.ok ? await itemsRes.json() : null
  return {
    ac: acData?.data ?? acData,
    items: Array.isArray(itemsData) ? itemsData : (itemsData?.data ?? []),
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const shareData = await getShareData(token)

  if (!shareData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <Clock className="h-12 w-12 text-[var(--warning)] mx-auto" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">링크가 만료되었습니다</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            이 공유 링크는 만료되었거나 유효하지 않습니다.
          </p>
        </div>
      </div>
    )
  }

  const { target_id, target_type } = shareData
  let ac: AccountCurrentRow | null = null
  let items: AccountCurrentItemRow[] = []

  if (target_type === 'account_current') {
    const result = await getACData(target_id)
    ac = result.ac
    items = result.items
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">RS</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-primary)]">재보험 정청산 시스템</h1>
              <p className="text-xs text-[var(--text-muted)]">공유 문서 뷰어</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-6 py-8">
        {target_type === 'account_current' && ac ? (
          <AccountCurrentViewer ac={ac} items={items} />
        ) : (
          <div className="text-center text-sm text-[var(--text-muted)] py-12">
            문서를 불러올 수 없습니다.
          </div>
        )}
      </main>
    </div>
  )
}
