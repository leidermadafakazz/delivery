import type { ReactNode } from 'react'
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  Clock3,
  Loader2,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react'
import { StatusBadge } from '../ui/StatusBadge'
import {
  dangerActionClass,
  successActionClass,
} from '../orders/action-styles'
import { formatOrderDate } from '../../lib/order-status'
import type { ProfileChangeRequest } from '../../types/profile-change'

function Value({
  icon,
  label,
  current,
  requested,
}: {
  icon: ReactNode
  label: string
  current: string
  requested: string | null
}) {
  const changed = requested !== null && requested !== current
  const currentDisplay = current === '' ? 'Sin dato' : current
  const display =
    requested === null ? current : requested === '' ? 'Sin teléfono' : requested

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>

      {changed ? (
        <div className="mt-1 space-y-0.5 text-sm">
          <p className="text-slate-400 line-through">{currentDisplay}</p>
          <p className="flex items-center gap-1 font-semibold text-emerald-700">
            <ArrowRight className="size-3.5" aria-hidden="true" />
            {display}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-800">{currentDisplay}</p>
      )}
    </div>
  )
}

export function ProfileChangeCard({
  request,
  busy,
  onApprove,
  onReject,
}: {
  request: ProfileChangeRequest
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-900">
                {request.user.name}
              </h3>
              <StatusBadge status={request.status} />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Cambio de datos
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {request.user.email} · Solicitud #{request.id} ·{' '}
              {formatOrderDate(request.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Value
            icon={<UserRound className="size-3.5" />}
            label="Nombre"
            current={request.user.name}
            requested={request.name}
          />
          <Value
            icon={<Mail className="size-3.5" />}
            label="Correo"
            current={request.user.email}
            requested={request.email}
          />
          <Value
            icon={<Phone className="size-3.5" />}
            label="Teléfono"
            current={request.user.phone ?? ''}
            requested={request.phone}
          />
        </div>

        {request.status === 'REJECTED' && request.rejectionReason && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <span className="font-bold">Motivo del rechazo: </span>
            {request.rejectionReason}
          </p>
        )}

        {request.reviewedBy && request.reviewedAt && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock3 className="size-3" aria-hidden="true" />
            Revisado por {request.reviewedBy.name} el{' '}
            {formatOrderDate(request.reviewedAt)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
        {request.status !== 'APPROVED' && (
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className={successActionClass}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CircleCheck className="size-3.5" aria-hidden="true" />
            )}
            Aprobar y aplicar
          </button>
        )}

        {request.status !== 'REJECTED' && (
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className={dangerActionClass}
          >
            <CircleX className="size-3.5" aria-hidden="true" />
            Rechazar
          </button>
        )}

        <span className="ml-auto text-[11px] text-slate-500">
          Los datos se aplican al aprobar
        </span>
      </div>
    </article>
  )
}
