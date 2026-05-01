'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function BrokerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[BrokerError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4 p-8 max-w-md">
        <div className="flex justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">오류가 발생했습니다</h2>
        <p className="text-muted-foreground text-sm">
          페이지 로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-xs bg-muted p-4 rounded-md overflow-auto">
            {error.message}
          </pre>
        )}
        <Button onClick={reset} variant="outline" size="sm">
          다시 시도
        </Button>
      </div>
    </div>
  )
}
