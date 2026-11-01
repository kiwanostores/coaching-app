import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react'
import { brand } from '@/config/brand'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="grid h-8 w-8 place-items-center rounded-control bg-brand-gradient text-sm font-bold text-white">{brand.name[0]}</span>
      <span className="text-base font-semibold text-white">{brand.name}</span>
    </div>
  )
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition',
            isActive ? 'bg-brand-gradient text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')}>
          <Icon className="h-4 w-4" aria-hidden />{label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell({ items, roleLabel }: { items: NavItem[]; roleLabel: string }) {
  const [open, setOpen] = useState(false)
  const { session, signOut } = useAuth()
  const Side = ({ children }: { children?: ReactNode }) => (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4">
      <Brand /><NavList items={items} onNavigate={() => setOpen(false)} />{children}
      <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
        <p className="truncate px-2 text-xs text-slate-400">{session?.user.email}</p>
        <button onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
          <LogOut className="h-4 w-4" aria-hidden />Sign out
        </button>
      </div>
    </div>
  )
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block"><Side /></aside>
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <span className="font-semibold">{brand.name}</span>
        <Button variant="ghost" size="sm" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64"><Side />
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-2 top-2 text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">{roleLabel}</p>
        <Outlet />
      </main>
    </div>
  )
}
