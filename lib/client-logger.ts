'use client'

const isDev = process.env.NODE_ENV === 'development'

export const clientLogger = {
  error: (message: string, error?: unknown) => {
    if (isDev) {
      console.error(`[${message}]`, error)
    }
    // production: 여기서 /api/logs 또는 Sentry 등 에러 수집 서비스로 전송 가능
  },
  warn: (message: string, data?: unknown) => {
    if (isDev) {
      console.warn(`[${message}]`, data)
    }
  },
}
