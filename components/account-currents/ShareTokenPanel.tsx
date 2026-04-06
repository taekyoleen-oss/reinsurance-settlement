'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, Link2, Plus } from 'lucide-react'

interface ShareToken {
  token: string
  expires_at: string
  created_at: string
}

interface ShareTokenPanelProps {
  acId: string
}

export function ShareTokenPanel({ acId }: ShareTokenPanelProps) {
  const [tokens, setTokens] = useState<ShareToken[]>([])
  const [loading, setLoading] = useState(false)

  const createToken = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/account-currents/${acId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_days: 30 }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? '토큰 생성 실패')
        return
      }
      const data = await res.json()
      setTokens((prev) => [data.token ?? data, ...prev])
      toast.success('공유 링크가 생성되었습니다.')
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyUrl = (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    toast.success('링크가 복사되었습니다.')
  }

  const getShareUrl = (token: string) => `${window.location.origin}/share/${token}`

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          공유 링크 관리
        </CardTitle>
        <Button size="sm" variant="outline" onClick={createToken} disabled={loading}>
          <Plus className="h-3 w-3 mr-1" />
          링크 생성
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {tokens.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-2">
            생성된 공유 링크가 없습니다. 위 버튼을 클릭하여 생성하세요.
          </p>
        )}
        {tokens.map((t, idx) => (
          <div key={idx} className="rounded border border-border bg-surface-elevated p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={getShareUrl(t.token)}
                className="text-xs font-mono"
              />
              <Button size="icon" variant="outline" onClick={() => copyUrl(t.token)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              만료: {format(new Date(t.expires_at), 'yyyy-MM-dd HH:mm')} ·
              생성: {format(new Date(t.created_at), 'yyyy-MM-dd')}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
