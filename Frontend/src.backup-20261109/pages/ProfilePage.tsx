import {
  Bike,
  Building2,
  IdCard,
  LogOut,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { RoleBadge } from '../components/ui/RoleBadge'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ROLE_DESCRIPTIONS } from '../lib/roles'
import { secondaryButtonClass } from '../lib/styles'
import { useAuthStore } from '../store/auth.store'

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulta los datos de tu cuenta y el estado de tus solicitudes.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-slate-900 text-lg font-extrabold text-white">
            {user.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join('')}
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          </div>
        </div>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <Mail className="mt-0.5 size-4 text-slate-400" aria-hidden="true" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Correo
              </dt>
              <dd className="mt-0.5 break-all text-sm font-medium text-slate-900">
                {user.email}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <Phone className="mt-0.5 size-4 text-slate-400" aria-hidden="true" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Teléfono
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {user.phone ?? 'Sin teléfono registrado'}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <IdCard className="mt-0.5 size-4 text-slate-400" aria-hidden="true" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Identificador
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                #{user.id}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <UserRound className="mt-0.5 size-4 text-slate-400" aria-hidden="true" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Roles
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <RoleBadge key={role} role={role} />
                ))}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Solicitudes
        </h2>

        {user.businessProfile ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {user.businessProfile.businessName}
                </p>
                <p className="text-xs text-slate-500">Solicitud de empresa</p>
              </div>
            </div>
            <StatusBadge status={user.businessProfile.status} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            No tienes una solicitud de empresa registrada.
          </div>
        )}

        {user.deliveryProfile ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Bike className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Documento {user.deliveryProfile.documentNumber}
                </p>
                <p className="text-xs text-slate-500">Solicitud de domiciliario</p>
              </div>
            </div>
            <StatusBadge status={user.deliveryProfile.status} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            No tienes una solicitud de domiciliario registrada.
          </div>
        )}

        <p className="text-xs text-slate-400">
          La edición de perfil y las solicitudes de empresa/domiciliario se
          habilitarán en una próxima fase.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Alcance de tus roles
        </h2>
        <ul className="mt-4 space-y-3">
          {user.roles.map((role) => (
            <li key={role} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" />
              <span>
                <strong className="font-semibold text-slate-900">
                  {role === 'CLIENT' && 'Cliente'}
                  {role === 'BUSINESS' && 'Empresa'}
                  {role === 'DELIVERY' && 'Domiciliario'}
                  {role === 'ADMIN' && 'Administrador'}
                </strong>
                <span className="text-slate-500"> — {ROLE_DESCRIPTIONS[role]}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className={`${secondaryButtonClass} text-rose-600 hover:border-rose-200 hover:bg-rose-50`}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Cerrar sesión
      </button>
    </div>
  )
}
