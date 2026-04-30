import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // /share/* — 인증 불필요 (토큰으로만 접근)
  if (pathname.startsWith('/share/')) {
    return supabaseResponse
  }

  // /api/* — API는 각 Route Handler에서 인증 처리
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // 비인증 사용자 → 로그인 페이지로 리다이렉트 (로그인 페이지 자체는 제외)
  if (!user && !pathname.startsWith('/login')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 인증된 사용자의 역할 조회
  if (user) {
    const { data: profile } = await supabase
      .from('rs_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role ?? ''

    // /admin/* → admin만
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // /external/* → cedant_viewer / reinsurer_viewer / admin만
    if (pathname.startsWith('/external')) {
      const allowedExternal = ['cedant_viewer', 'reinsurer_viewer', 'admin']
      if (!allowedExternal.includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // 브로커 전용 경로 (dashboard, contracts, transactions, account-currents, settlements, reconciliation, reports)
    const brokerPaths = [
      '/dashboard',
      '/contracts',
      '/bordereau',
      '/transactions',
      '/account-currents',
      '/settlements',
      '/outstanding',
      '/reconciliation',
      '/reports',
      '/exchange-rates',
      '/counterparties',
    ]
    const isBrokerPath = brokerPaths.some((p) => pathname.startsWith(p))
    if (isBrokerPath) {
      const allowedBroker = ['broker_technician', 'broker_manager', 'admin']
      if (!allowedBroker.includes(role)) {
        return NextResponse.redirect(new URL('/external/dashboard', request.url))
      }
    }

    // 로그인된 사용자가 /login 접근 시 역할에 맞게 리다이렉트
    if (pathname.startsWith('/login')) {
      if (['cedant_viewer', 'reinsurer_viewer'].includes(role)) {
        return NextResponse.redirect(new URL('/external/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 적용:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico, 이미지, 폰트 등
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)',
  ],
}
