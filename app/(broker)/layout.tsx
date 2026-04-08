'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  FileText,
  Layers,
  CreditCard,
  AlertCircle,
  GitMerge,
  BookOpen,
  Users,
  RefreshCw,
  BarChart3,
  LogOut,
  Menu,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/transactions', label: '거래 관리', icon: FileText },
  { href: '/account-currents', label: '정산서 관리', icon: Layers },
  { href: '/settlements', label: '결제 관리', icon: CreditCard },
  { href: '/outstanding', label: '미청산 잔액', icon: AlertCircle },
  { href: '/reconciliation', label: '대사 관리', icon: GitMerge },
  { href: '/contracts', label: '계약 관리', icon: BookOpen },
  { href: '/counterparties', label: '거래상대방', icon: Users },
  { href: '/exchange-rates', label: '환율 관리', icon: RefreshCw },
  { href: '/reports', label: '보고서', icon: BarChart3 },
]

export default function BrokerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "shrink-0 bg-surface flex flex-col transition-[width,opacity] duration-300 ease-in-out overflow-hidden border-border",
        isSidebarOpen ? "w-60 border-r opacity-100" : "w-0 border-r-0 opacity-0"
      )}>
        <div className="w-60 flex flex-col h-full min-w-[15rem]">
          <div className="px-4 py-4 border-b border-border">
            <h1 className="text-sm font-bold text-primary truncate">재보험 정청산</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Settlement System</p>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary-muted text-primary font-medium border-r-2 border-primary'
                    : 'text-[var(--text-secondary)] hover:bg-surface-elevated hover:text-[var(--text-primary)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
          </nav>
          <div className="p-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[var(--text-muted)] hover:text-warning-urgent"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "사이드바 숨기기" : "사이드바 열기"}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              재보험 정청산 관리 시스템
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
