import type { LucideIcon } from 'lucide-react'
import {
  Bike,
  Building2,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { getPrimaryRole, ROLE_LABELS } from '../../lib/roles'
import { useAuthStore } from '../../store/auth.store'
import { Brand } from '../ui/Brand'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  const primaryRole = getPrimaryRole(user.roles)
  const navigation: NavItem[] = [
    { to: '/panel', label: 'Panel', icon: LayoutDashboard },
    { to: '/catalogo', label: 'Catálogo', icon: Store },
  ]

  if (user.roles.includes('CLIENT')) {
    navigation.push({ to: '/pedidos', label: 'Mis pedidos', icon: ReceiptText })
  }

  if (user.roles.includes('BUSINESS')) {
    navigation.push({ to: '/empresa', label: 'Mi empresa', icon: Building2 })
  }

  if (user.roles.includes('DELIVERY')) {
    navigation.push({ to: '/domiciliario', label: 'Domicilios', icon: Bike })
  }

  if (user.roles.includes('ADMIN')) {
    navigation.push({ to: '/admin', label: 'Administración', icon: ShieldCheck })
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
      isActive
        ? 'bg-orange-50 text-orange-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    )

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">
                {user.name}
              </p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[primaryRole]}</p>
            </div>

            <span
              className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white"
              title={user.name}
            >
              {getInitials(user.name)}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden"
          aria-label="Principal móvil"
        >
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>FastDelivery © 2026</p>
          <p>Fase 1 del frontend · Autenticación y roles</p>
        </div>
      </footer>
    </div>
  )
}
