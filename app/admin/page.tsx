'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2 } from 'lucide-react'

interface UserProfile {
  id: string
  email?: string
  display_name?: string
  role: string
  is_active: boolean
  created_at: string
}

interface ShareToken {
  id: string
  token: string
  target_type: string
  target_id: string
  created_at: string
  expires_at: string
  is_active: boolean
  notes?: string
}

interface Currency {
  code: string
  name: string
  is_active: boolean
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  broker_manager: '브로커 매니저',
  broker_staff: '브로커 직원',
  cedant_viewer: '출재사 뷰어',
  reinsurer_viewer: '수재사 뷰어',
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [tokens, setTokens] = useState<ShareToken[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '' })
  const [currencyLoading, setCurrencyLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users')
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
      fetch('/api/admin/share-tokens')
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
      fetch('/api/currencies')
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([ud, td, cd]) => {
        setUsers(ud.data ?? [])
        setTokens(td.data ?? [])
        setCurrencies(cd.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCurrency.code || !newCurrency.name) {
      toast.error('코드와 이름을 입력하세요.')
      return
    }
    setCurrencyLoading(true)
    try {
      const res = await fetch('/api/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCurrency, is_active: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '등록 실패')
      toast.success('통화가 등록되었습니다.')
      setCurrencies((c) => [...c, data.data ?? data])
      setNewCurrency({ code: '', name: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setCurrencyLoading(false)
    }
  }

  const handleRevokeToken = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/share-tokens/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('취소 실패')
      toast.success('토큰이 취소되었습니다.')
      setTokens((t) => t.filter((tk) => tk.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">시스템 관리</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            사용자, 공유 토큰, 통화 마스터 관리
          </p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
            <TabsTrigger value="tokens">공유 토큰</TabsTrigger>
            <TabsTrigger value="currencies">통화 마스터</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">사용자 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="p-4 text-center text-sm text-[var(--text-muted)] animate-pulse">
                    로딩 중...
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이메일</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>가입일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm">{u.email ?? u.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-sm">{u.display_name ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant="default">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.is_active ? 'success' : 'muted'}>
                              {u.is_active ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--text-muted)]">
                            {u.created_at?.slice(0, 10)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-[var(--text-muted)] py-6"
                          >
                            사용자 없음
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">공유 토큰 목록</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>토큰 (앞 8자)</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>만료일</TableHead>
                      <TableHead>비고</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((tk) => (
                      <TableRow key={tk.id}>
                        <TableCell className="font-mono text-xs">
                          {tk.token?.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-xs">
                          {tk.target_type} / {tk.target_id?.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {tk.expires_at?.slice(0, 10)}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-secondary)]">
                          {tk.notes ?? '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tk.is_active && new Date(tk.expires_at) > new Date()
                                ? 'success'
                                : 'muted'
                            }
                          >
                            {tk.is_active && new Date(tk.expires_at) > new Date() ? '유효' : '만료'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {tk.is_active && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevokeToken(tk.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {tokens.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-[var(--text-muted)] py-6"
                        >
                          토큰 없음
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="currencies" className="mt-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">통화 등록</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCurrency} className="flex items-end gap-3">
                    <div className="space-y-1.5">
                      <Label>통화 코드</Label>
                      <Input
                        value={newCurrency.code}
                        onChange={(e) =>
                          setNewCurrency((c) => ({ ...c, code: e.target.value.toUpperCase() }))
                        }
                        placeholder="USD"
                        className="w-24 font-mono"
                        maxLength={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>통화명</Label>
                      <Input
                        value={newCurrency.name}
                        onChange={(e) => setNewCurrency((c) => ({ ...c, name: e.target.value }))}
                        placeholder="미국 달러"
                        className="w-40"
                      />
                    </div>
                    <Button type="submit" disabled={currencyLoading}>
                      <Plus className="h-4 w-4 mr-1" />
                      {currencyLoading ? '등록 중...' : '등록'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">통화 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>코드</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currencies.map((c) => (
                        <TableRow key={c.code}>
                          <TableCell className="font-mono font-medium">{c.code}</TableCell>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>
                            <Badge variant={c.is_active ? 'success' : 'muted'}>
                              {c.is_active ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {currencies.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-[var(--text-muted)] py-6"
                          >
                            통화 없음
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
