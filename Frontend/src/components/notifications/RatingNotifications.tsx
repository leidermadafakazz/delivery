import { useState } from 'react'
import { ArrowRight, Star, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StarRating } from '../ratings/StarRating'
import { useNotificationsStore } from '../../store/notifications.store'
import { formatShortDate } from '../../lib/order-status'
import { TARGET_LABELS } from '../../types/ratings'
import { cn } from '../../lib/cn'

function targetHref(targetType: 'BUSINESS' | 'DELIVERY' | 'CLIENT', orderId: number) {
  if (targetType === 'BUSINESS') {
    return '/empresa'
  }

  if (targetType === 'DELIVERY') {
    return '/domiciliario'
  }

  return `/pedidos/${orderId}`
}

export function RatingNotifications() {
  const items = useNotificationsStore((state) => state.items)
  const unread = useNotificationsStore((state) => state.unread)
  const markAllRead = useNotificationsStore((state) => state.markAllRead)
  const [open, setOpen] = useState(false)

  function toggle() {
    const next = !open

    setOpen(next)

    if (next) {
      markAllRead()
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'relative grid size-10 place-items-center rounded-xl border transition',
          open
            ? 'border-amber-200 bg-amber-50 text-amber-600'
            : 'border-slate-200 text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600',
        )}
        aria-label={`Notificaciones de calificaciones: ${unread} sin leer`}
        aria-expanded={open}
        title="Calificaciones recibidas"
      >
        <Star
          className={cn('size-4', unread > 0 && 'fill-amber-400 text-amber-400')}
          aria-hidden="true"
        />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-5 text-white shadow-sm">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Calificaciones recibidas
              </p>
              <p className="text-[11px] text-slate-500">
                Llegan en tiempo real mientras estás conectado.
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

          {items.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
              <Star className="size-5 text-slate-300" aria-hidden="true" />
              Aún no has recibido calificaciones.
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => (
                <li key={`${item.id}-${item.receivedAt}`}>
                  <Link
                    to={targetHref(item.targetType, item.orderId)}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-sm font-black text-amber-700">
                      {item.score}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">
                        {item.from.name} te calificó
                      </span>
                      <StarRating value={item.score} size={13} />
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        Como {TARGET_LABELS[item.targetType].toLowerCase()} ·{' '}
                        {item.count} calificación{item.count === 1 ? '' : 'es'} ·{' '}
                        {formatShortDate(item.createdAt)}
                      </span>
                      {item.comment && (
                        <span className="mt-0.5 block truncate text-[11px] italic text-slate-400">
                          “{item.comment}”
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-bold text-orange-600">
            <Link
              to="/perfil"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1"
            >
              Ver mi reputación
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
