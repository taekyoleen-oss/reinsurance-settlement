'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldCheck, Copy, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        setUserId(d.id ?? '')
        setEmail(d.email ?? '')
      })
      .catch(() => {})
  }, [])

  const sql = `INSERT INTO rs_user_profiles (user_id, role, full_name, is_active)
VALUES (
  '${userId || '<Supabase Auth Users 목록에서 복사한 UUID>'}',
  'admin',
  '${email ? email.split('@')[0] : '관리자'}',
  true
)
ON CONFLICT (user_id) DO UPDATE
  SET role = 'admin', is_active = true;`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCheck = async () => {
    setChecking(true)
    // 프로필이 생겼으면 /dashboard로 이동 (미들웨어가 허용), 없으면 다시 /setup으로 돌아옴
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-xl">초기 관리자 설정 필요</CardTitle>
          <CardDescription>
            로그인 계정에 역할(role)이 없습니다.
            <br />
            아래 SQL을 Supabase Dashboard에서 실행해 관리자 계정을 등록하세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Step 1 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">1단계 — SQL 복사</p>
            <div className="relative rounded-md border border-border bg-muted/40 p-3">
              <pre className="overflow-x-auto text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all">
                {sql}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 gap-1 text-xs"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    복사
                  </>
                )}
              </Button>
            </div>
            {!userId && (
              <p className="text-xs text-warning-urgent">
                * user_id를 불러오는 중입니다. 잠시 후 다시 복사하거나, Supabase Dashboard →
                Authentication → Users에서 직접 확인하세요.
              </p>
            )}
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              2단계 — Supabase SQL Editor에서 실행
            </p>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Supabase Dashboard 열기
            </a>
            <p className="text-xs text-[var(--text-muted)]">
              Dashboard → 프로젝트 선택 → SQL Editor → New query → 붙여넣기 후 Run
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">3단계 — 완료 확인</p>
            <Button className="w-full" onClick={handleCheck} disabled={checking}>
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  확인 중...
                </>
              ) : (
                '대시보드로 이동 (설정 완료 후 클릭)'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
