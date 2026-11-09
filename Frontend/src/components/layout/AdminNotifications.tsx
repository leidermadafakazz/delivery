import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  Bell,
  BellRing,
  Bike,
  Building2,
  CheckCircle2,
  Clock3,
  UserRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { fetchAdminDashboard } from '../../lib/applications-api'
import { formatShortDate } from '../../lib/order-status'
import type {
  BusinessApplication,
  DeliveryApplication,
} from '../../types/applications'

interface PendingRequest {
  kind: 'business' | 'delivery' | 'profile'
  id: number
  name: string
  createdAt: string
}

export function AdminNotifications() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const previousCount = useRef<number | null>(null)

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const data = await fetchAdminDashboard()

        if (!active) {
          return
        }

        const businesses = data.pending.businesses.map(
          (item: BusinessApplication) => ({
            kind: 'business' as const,
            id: item.id,
            name: item.businessName,
            createdAt: item.createdAt,
          }),
        )
        const deliveries = data.pending.deliveries.map(
          (item: DeliveryApplication) => ({
            kind: 'delivery' as const,
            id: item.id,
            name: `${item.documentType} ${item.documentNumber}`,
            createdAt: item.createdAt,
          }),
        )
        const profileChanges = data.pending.profileChanges.map((item) => ({
          kind: 'profile' as const,
          id: item.id,
          name: `${item.user.name} · cambio de datos`,
          createdAt: item.createdAt,
        }))

        const total =
          data.stats.businesses.PENDING +
          data.stats.deliveries.PENDING +
          data.stats.profileChanges.PENDING

        setPending(
          [...businesses, ...deliveries, ...profileChanges].slice(0, 6),
        )
        setTotalPending(total)

        if (previousCount.current !== null && total > previousCount.current) {
          const diferencia = total - previousCount.current
          setToast(
            diferencia === 1
              ? 'Llegó una nueva solicitud por revisar.'
              : `Llegaron ${diferencia} nuevas solicitudes por revisar.`,
          )
          window.setTimeout(() => setToast(null), 7000)
        }

        previousCount.current = total
      } catch {
        // El panel sigue funcionando aunque falle una consulta puntual.
      }
    }

    void poll()
    const interval = window.setInterval(() => void poll(), 20000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null

      if (!target?.closest('[data-admin-notifications]')) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div className="relative" data-admin-notifications>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'relative grid size-10 place-items-center rounded-xl border transition',
          open
            ? 'border-orange-200 bg-orange-50 text-orange-600'
            : 'border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600',
        )}
        aria-label={`Notificaciones: ${totalPending} solicitudes pendientes`}
        aria-expanded={open}
        title="Notificaciones de solicitudes"
      >
        {totalPending > 0 ? (
          <BellRing className="size-4" aria-hidden="true" />
        ) : (
          <Bell className="size-4" aria-hidden="true" />
        )}
        {totalPending > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-5 text-white shadow-sm">
            {totalPending > 99 ? '99+' : totalPending}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Notificaciones</p>
              <p className="text-[11px] text-slate-500">
                {totalPending === 0
                  ? 'No hay solicitudes pendientes'
                  : `${totalPending} solicitud${totalPending === 1 ? '' : 'es'} por revisar`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          {pending.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
              <CheckCircle2 className="size-5 text-emerald-500" aria-hidden="true" />
              Todo al día, no hay solicitudes esperando aprobación.
            </div>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {pending.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    to={item.kind === 'profile' ? '/admin/perfiles' : '/admin'}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl',
                        item.kind === 'business'
                          ? 'bg-violet-50 text-violet-600'
                          : item.kind === 'delivery'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-sky-50 text-sky-600',
                      )}
                    >
                      {item.kind === 'business' ? (
                        <Building2 className="size-4" aria-hidden="true" />
                      ) : item.kind === 'delivery' ? (
                        <Bike className="size-4" aria-hidden="true" />
                      ) : (
                        <UserRound className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {item.name}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {item.kind === 'business'
                          ? 'Solicitud de empresa'
                          : item.kind === 'delivery'
                            ? 'Solicitud de domiciliario'
                            : 'Cambio de datos de la cuenta'}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock3 className="size-3" aria-hidden="true" />
                        {formatShortDate(item.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-bold text-orange-600 transition hover:bg-slate-100"
          >
            Ir al panel de administración
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {toast &&
        createPortal(
          <Link
            to="/admin"
            onClick={() => setToast(null)}
            className="fixed bottom-6 right-4 z-50 flex max-w-xs items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl sm:right-6"
          >
            <BellRing
              className="mt-0.5 size-5 shrink-0 text-orange-400"
              aria-hidden="true"
            />
            <span>
              <span className="block font-bold">{toast}</span>
              <span className="text-xs text-slate-300">
                Toca aquí para revisar en Administración.
              </span>
            </span>
          </Link>,
          document.body,
        )}
    </div>
  )
}
