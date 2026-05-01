import { z, ZodSchema } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from './error-handler'
import { requireBrokerRole, requireRoles, requireUser, BrokerAuthContext, AuthContext } from './auth'

type RouteContext = { params: Promise<Record<string, string>> }

/**
 * POST/PATCH 핸들러: 브로커 역할 인증 + body zod 검증
 */
export function withBrokerSchema<T extends ZodSchema>(
  schema: T,
  handler: (
    body: z.infer<T>,
    auth: BrokerAuthContext,
    req: NextRequest,
    ctx: RouteContext
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const auth = await requireBrokerRole()
      const raw = await req.json().catch(() => ({}))
      const result = schema.safeParse(raw)
      if (!result.success) {
        return NextResponse.json(
          {
            error: '입력 데이터가 올바르지 않습니다.',
            issues: result.error.flatten().fieldErrors,
          },
          { status: 400 }
        )
      }
      return await handler(result.data, auth, req, ctx)
    } catch (err) {
      return handleApiError(err)
    }
  }
}

/**
 * 브로커 역할 인증만 필요한 핸들러 (GET, DELETE, body 없는 POST)
 */
export function withBrokerAuth(
  handler: (
    auth: BrokerAuthContext,
    req: NextRequest,
    ctx: RouteContext
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const auth = await requireBrokerRole()
      return await handler(auth, req, ctx)
    } catch (err) {
      return handleApiError(err)
    }
  }
}

/**
 * 인증만 필요한 핸들러 (외부 뷰어 포함)
 */
export function withUserAuth(
  handler: (
    auth: AuthContext,
    req: NextRequest,
    ctx: RouteContext
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const auth = await requireUser()
      return await handler(auth, req, ctx)
    } catch (err) {
      return handleApiError(err)
    }
  }
}

/**
 * 특정 역할만 허용하는 핸들러 (approve, acknowledge 등)
 */
export function withRolesAuth(
  allowedRoles: string[],
  handler: (
    auth: BrokerAuthContext,
    req: NextRequest,
    ctx: RouteContext
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const auth = await requireRoles(allowedRoles)
      return await handler(auth, req, ctx)
    } catch (err) {
      return handleApiError(err)
    }
  }
}

/**
 * 인증 없이 에러 핸들링만 적용
 */
export function withErrorHandler(
  handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      return handleApiError(err)
    }
  }
}
