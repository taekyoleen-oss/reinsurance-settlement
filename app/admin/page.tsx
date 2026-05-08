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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, UserPlus, RefreshCw, Ban } from 'lucide-react'

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
  revoked: boolean
  notes?: string
}

interface Currency {
  code: string
  name_ko: string
  name_en?: string
  symbol?: string
  decimal_digits?: number
  is_active: boolean
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  broker_manager: '브로커 매니저',
  broker_technician: '브로커 담당자',
  reviewer: '검수자',
  cedant_viewer: '출재사 뷰어',
  reinsurer_viewer: '수재사 뷰어',
}

const ROLE_KEYS = Object.keys(ROLE_LABELS)

const EMPTY_USER_FORM = {
  email: '',
  password: '',
  full_name: '',
  role: 'broker_technician',
}

const EMPTY_CURRENCY = { code: '', name_ko: '', name_en: '', symbol: '', decimal_digits: 2 }

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [tokens, setTokens] = useState<ShareToken[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)

  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM)
  const [userLoading, setUserLoading] = useState(false)

  const [newCurrency, setNewCurrency] = useState(EMPTY_CURRENCY)
  const [currencyLoading, setCurrencyLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users')
        .then((r) => r.json())
        .catch(() => ({ users: [] })),
      fetch('/api/admin/share-tokens')
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
      fetch('/api/currencies')
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ])
      .then(([ud, td, cd]) => {
        setUsers(ud.users ?? [])
        setTokens(td.data ?? [])
        setCurrencies(cd.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userForm.email || !userForm.password) {
      toast.error('이메일과 비밀번호를 입력하세요.')
      return
    }
    setUserLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '등록 실패')
      toast.success('사용자가 등록되었습니다.')
      setShowUserModal(false)
      setUserForm(EMPTY_USER_FORM)
      // Refresh user list
      fetch('/api/admin/users')
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []))
        .catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setUserLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('역할 변경 실패')
      toast.success('역할이 변경되었습니다.')
      setUsers((u) => u.map((x) => (x.id === userId ? { ...x, role } : x)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDeactivate = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (!res.ok) throw new Error('상태 변경 실패')
      toast.success(isActive ? '사용자가 비활성화되었습니다.' : '사용자가 활성화되었습니다.')
      setUsers((u) => u.map((x) => (x.id === userId ? { ...x, is_active: !isActive } : x)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleResetPassword = async (userId: string) => {
    const pw = window.prompt('새 비밀번호를 입력하세요 (8자 이상):')
    if (!pw || pw.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      if (!res.ok) throw new Error('비밀번호 재설정 실패')
      toast.success('비밀번호가 재설정되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCurrency.code || !newCurrency.name_ko) {
      toast.error('코드와 통화명(한국어)을 입력하세요.')
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
      setNewCurrency(EMPTY_CURRENCY)
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

          {/* 사용자 관리 탭 */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">사용자 목록</CardTitle>
                <Button size="sm" onClick={() => setShowUserModal(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  사용자 등록
                </Button>
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
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm">{u.email ?? u.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-sm">{u.display_name ?? '-'}</TableCell>
                          <TableCell>
                            <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_KEYS.map((r) => (
                                  <SelectItem key={r} value={r} className="text-xs">
                                    {ROLE_LABELS[r]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.is_active ? 'success' : 'muted'}>
                              {u.is_active ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--text-muted)]">
                            {u.created_at?.slice(0, 10)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => handleResetPassword(u.id)}
                                title="비밀번호 재설정"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-7 text-xs ${u.is_active ? 'text-warning-urgent' : 'text-success'}`}
                                onClick={() => handleDeactivate(u.id, u.is_active)}
                                title={u.is_active ? '비활성화' : '활성화'}
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
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

          {/* 공유 토큰 탭 */}
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
                              !tk.revoked && new Date(tk.expires_at) > new Date()
                                ? 'success'
                                : 'muted'
                            }
                          >
                            {!tk.revoked && new Date(tk.expires_at) > new Date() ? '유효' : '만료'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!tk.revoked && (
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

          {/* 통화 마스터 탭 */}
          <TabsContent value="currencies" className="mt-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">통화 등록</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCurrency} className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>통화 코드 *</Label>
                      <Input
                        value={newCurrency.code}
                        onChange={(e) =>
                          setNewCurrency((c) => ({ ...c, code: e.target.value.toUpperCase() }))
                        }
                        placeholder="USD"
                        className="font-mono"
                        maxLength={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>통화명(한국어) *</Label>
                      <Input
                        value={newCurrency.name_ko}
                        onChange={(e) => setNewCurrency((c) => ({ ...c, name_ko: e.target.value }))}
                        placeholder="미국 달러"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>통화명(영어)</Label>
                      <Input
                        value={newCurrency.name_en}
                        onChange={(e) => setNewCurrency((c) => ({ ...c, name_en: e.target.value }))}
                        placeholder="US Dollar"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>기호</Label>
                      <Input
                        value={newCurrency.symbol}
                        onChange={(e) => setNewCurrency((c) => ({ ...c, symbol: e.target.value }))}
                        placeholder="$"
                        className="w-20 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>소수점 자리수</Label>
                      <Input
                        type="number"
                        min={0}
                        max={6}
                        value={newCurrency.decimal_digits}
                        onChange={(e) =>
                          setNewCurrency((c) => ({
                            ...c,
                            decimal_digits: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-24 font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={currencyLoading}>
                        <Plus className="h-4 w-4 mr-1" />
                        {currencyLoading ? '등록 중...' : '등록'}
                      </Button>
                    </div>
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
                        <TableHead>한국어명</TableHead>
                        <TableHead>기호</TableHead>
                        <TableHead>소수점</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currencies.map((c) => (
                        <TableRow key={c.code}>
                          <TableCell className="font-mono font-medium">{c.code}</TableCell>
                          <TableCell>{c.name_ko}</TableCell>
                          <TableCell className="font-mono">{c.symbol ?? '-'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {c.decimal_digits ?? 2}
                          </TableCell>
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
                            colSpan={5}
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

      {/* 사용자 등록 모달 */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>사용자 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label>이메일 *</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>임시 비밀번호 *</Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="8자 이상"
              />
            </div>
            <div className="space-y-1.5">
              <Label>이름(표시명)</Label>
              <Input
                value={userForm.full_name}
                onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-1.5">
              <Label>역할</Label>
              <Select
                value={userForm.role}
                onValueChange={(v) => setUserForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_KEYS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowUserModal(false)}>
                취소
              </Button>
              <Button type="submit" disabled={userLoading}>
                {userLoading ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
