import { NextResponse } from 'next/server'
import { apiLogger } from '@/lib/logger'

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  constructor(message = '입력 데이터가 올바르지 않습니다.') {
    super(400, message, 'VALIDATION_ERROR')
  }
}

export class AuthError extends AppError {
  constructor(message = '인증이 필요합니다.') {
    super(401, message, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '권한이 없습니다.') {
    super(403, message, 'FORBIDDEN')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT')
  }
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status }
    )
  }

  const e = err as Record<string, unknown>

  // 환율 미등록 커스텀 에러
  if (e?.code === 'EXCHANGE_RATE_NOT_FOUND') {
    return NextResponse.json(
      { error: '환율이 등록되지 않았습니다.', currency: e.currency, date: e.date },
      { status: 422 }
    )
  }

  // PostgreSQL unique constraint
  if (e?.code === '23505') {
    return NextResponse.json(
      { error: '이미 존재하는 데이터입니다.', code: 'CONFLICT' },
      { status: 409 }
    )
  }

  // PostgreSQL FK constraint
  if (e?.code === '23503') {
    return NextResponse.json(
      { error: '참조 데이터가 존재하지 않습니다.', code: 'REFERENCE_ERROR' },
      { status: 422 }
    )
  }

  // 내부 에러는 서버 로그에만 기록, 외부에는 일반 메시지 반환
  apiLogger.error({ err }, 'Unhandled API error')

  const isDev = process.env.NODE_ENV === 'development'
  const message =
    isDev && typeof e?.message === 'string' ? e.message : '서버 오류가 발생했습니다.'

  return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 })
}
