import type { ReactNode } from 'react'
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import type { ApprovalStatus } from '../../types/applications'

interface StatusBannerProps {
  status: ApprovalStatus
  rejectionReason?: string | null
  kind: 'business' | 'delivery'
  approvedHref: string
  approvedLabel: string
  onRefresh?: () => void
  refreshing?: boolean
  children?: ReactNode
}

const KIND_LABEL = {
  business: 'empresa',
  delivery: 'domiciliario',
} as const

export function StatusBanner({
  status,
  rejectionReason,
  kind,
  approvedHref,
  approvedLabel,
  onRefresh,
  refreshing = false,
  children,
}: StatusBannerProps) {
  const label = KIND_LABEL[kind]

  if (status === 'APPROVED') {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold">¡Solicitud aprobada!</p>
            <p className="mt-1 text-sm text-emerald-800">
              Tu perfil de {label} está activo. Ya tienes acceso al panel de{' '}
              {kind === 'business' ? 'tu empresa' : 'domicilios'}.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                to={approvedHref}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                {approvedLabel}
              </Link>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white/70 px-3 py-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-white disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn('size-3.5', refreshing && 'animate-spin')}
                    aria-hidden="true"
                  />
                  Actualizar estado
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'REJECTED') {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
            <CircleAlert className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold">Solicitud rechazada</p>
            <p className="mt-1 text-sm text-rose-800">
              El administrador no aprobó tu solicitud de {label}. Corrige los
              datos y envíala de nuevo para que vuelva a revisión.
            </p>
            {rejectionReason && (
              <p className="mt-3 rounded-xl bg-white/70 px-3.5 py-2.5 text-sm font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
                <span className="font-bold">Motivo: </span>
                {rejectionReason}
              </p>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white/70 px-3 py-2 text-xs font-semibold text-rose-800 transition hover:bg-white disabled:opacity-60"
              >
                <RefreshCw
                  className={cn('size-3.5', refreshing && 'animate-spin')}
                  aria-hidden="true"
                />
                Actualizar estado
              </button>
            )}
          </div>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
          <Clock3 className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">Solicitud en revisión</p>
          <p className="mt-1 text-sm text-amber-800">
            Recibimos tu solicitud de {label}. El administrador la revisará y te
            asignará el rol cuando la apruebe. Normalmente toma menos de 24 horas.
          </p>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white/70 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-white disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden="true" />
              )}
              Actualizar estado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
