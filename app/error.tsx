'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-semibold text-foreground">오류가 발생했습니다</h1>
          <p className="text-muted-foreground text-sm">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="text-left text-xs bg-muted p-4 rounded-md overflow-auto max-w-lg">
              {error.message}
            </pre>
          )}
          <Button onClick={reset} variant="outline">
            다시 시도
          </Button>
        </div>
      </body>
    </html>
  )
}
