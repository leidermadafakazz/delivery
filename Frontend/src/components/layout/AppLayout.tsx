import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Bike,
  Building2,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Store,
} from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { getPrimaryRole, ROLE_LABELS } from '../../lib/roles'
import { connectRealtime } from '../../lib/socket'
import { cartItemCount, useCartStore } from '../../store/cart.store'
import { useAuthStore } from '../../store/auth.store'
import { useNotificationsStore } from '../../store/notifications.store'
import { Brand } from '../ui/Brand'
import { AdminNotifications } from './AdminNotifications'
import { RatingNotifications } from '../notifications/RatingNotifications'
import { StarRating } from '../ratings/StarRating'
import type { RatingNotificationPayload } from '../../types/ratings'

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
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const cartItems = useCartStore((state) => state.items)
  const addNotification = useNotificationsStore((state) => state.add)
  const navigate = useNavigate()
  const [toast, setToast] = useState<RatingNotificationPayload | null>(null)

  useEffect(() => {
    const interval = window.setInterval(() => void refreshUser(), 30000)

    return () => window.clearInterval(interval)
  }, [refreshUser])

  useEffect(() => {
    if (!token) {
      return
    }

    const socket = connectRealtime(token, (payload) => {
      addNotification(payload)
      setToast(payload)
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [token, addNotification])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = window.setTimeout(() => setToast(null), 6500)

    return () => window.clearTimeout(timeout)
  }, [toast])

  if (!user) {
    return null
  }

  const primaryRole = getPrimaryRole(user.roles)
  const cartCount = cartItemCount(cartItems)
  const canOrder = user.roles.includes('CLIENT')
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

          <div className="flex items-center gap-2 sm:gap-3">
            <RatingNotifications />

            {user.roles.includes('ADMIN') && <AdminNotifications />}

            {canOrder && (
              <NavLink
                to="/carrito"
                className={({ isActive }) =>
                  cn(
                    'relative grid size-10 place-items-center rounded-xl border transition',
                    isActive
                      ? 'border-orange-200 bg-orange-50 text-orange-600'
                      : 'border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600',
                  )
                }
                title="Mi carrito"
                aria-label={`Mi carrito (${cartCount} productos)`}
              >
                <ShoppingCart className="size-4" aria-hidden="true" />
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-5 text-white shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </NavLink>
            )}

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">
                {user.name}
              </p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[primaryRole]}</p>
            </div>

            <Link
              to="/perfil"
              className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white ring-offset-2 transition hover:ring-2 hover:ring-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              title="Ir a mi perfil"
              aria-label="Ir a mi perfil"
            >
              {getInitials(user.name)}
            </Link>

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
          <p>Todos los derechos reservados</p>
        </div>
      </footer>

      {toast &&
        createPortal(
          <Link
            to={
              toast.targetType === 'BUSINESS'
                ? '/empresa'
                : toast.targetType === 'DELIVERY'
                  ? '/domiciliario'
                  : `/pedidos/${toast.orderId}`
            }
            onClick={() => setToast(null)}
            className="fixed bottom-6 right-4 z-50 flex max-w-xs items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl sm:right-6"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400 text-sm font-black text-slate-900">
              {toast.score}
            </span>
            <span className="min-w-0">
              <span className="block font-bold">
                {toast.from.name} te calificó
              </span>
              <StarRating value={toast.score} size={13} />
              <span className="mt-0.5 block text-xs text-slate-300">
                {toast.comment
                  ? `“${toast.comment}”`
                  : 'Toca para ver tu reputación.'}
              </span>
            </span>
          </Link>,
          document.body,
        )}
    </div>
  )
}
