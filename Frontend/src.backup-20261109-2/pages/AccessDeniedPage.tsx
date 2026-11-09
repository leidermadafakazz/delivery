import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RoleBadge } from '../components/ui/RoleBadge'
import { secondaryButtonClass } from '../lib/styles'
import type { Role } from '../types/auth'

export function AccessDeniedPage({ roles = [] }: { roles?: Role[] }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-12 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-rose-50 text-rose-500">
        <ShieldAlert className="size-8" aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">
        No tienes acceso a esta sección
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Tu cuenta no cuenta con los permisos necesarios. Si crees que es un
        error, contacta con un administrador.
      </p>

      {roles.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Roles requeridos
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </div>
        </div>
      )}

      <Link to="/panel" className={`${secondaryButtonClass} mt-8`}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al panel
      </Link>
    </div>
  )
}
