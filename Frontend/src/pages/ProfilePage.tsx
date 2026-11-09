import { useEffect, useState } from 'react'
import {
  Bike,
  Building2,
  IdCard,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Star,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { RoleBadge } from '../components/ui/RoleBadge'
import { StatusBadge } from '../components/ui/StatusBadge'
import { StarRating } from '../components/ratings/StarRating'
import { fetchMyRatings } from '../lib/ratings-api'
import { fetchMyProfileChange } from '../lib/profile-api'
import { formatOrderDate } from '../lib/order-status'
import { cn } from '../lib/cn'
import { ROLE_DESCRIPTIONS } from '../lib/roles'
import { secondaryButtonClass } from '../lib/styles'
import { useAuthStore } from '../store/auth.store'
import type { ProfileChangeRequest } from '../types/profile-change'
import type { MyRatingsResponse } from '../types/ratings'

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const [change, setChange] = useState<ProfileChangeRequest | null>(null)
  const [ratingsData, setRatingsData] = useState<MyRatingsResponse | null>(null)

  useEffect(() => {
    let active = true

    async function loadChange() {
      try {
        const data = await fetchMyProfileChange()

        if (active) {
          setChange(data)
        }
      } catch {
        // Si falla, la página sigue mostrando los datos de la cuenta.
      }
    }

    async function loadRatings() {
      try {
        const data = await fetchMyRatings()
        if (active) {
          setRatingsData(data)
        }
      } catch {
        // Silencioso
      }
    }

    void refreshUser()
    void loadChange()
    void loadRatings()

    const interval = window.setInterval(() => {
      void refreshUser()
      void loadChange()
      void loadRatings()
    }, 20000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [refreshUser])

  if (!user) {
    return null
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Mi perfil
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta los datos de tu cuenta y el estado de tus solicitudes.
          </p>
        </div>

        <Link to="/perfil/editar" className={secondaryButtonClass}>
          <Pencil className="size-4" aria-hidden="true" />
          Editar perfil
        </Link>
      </div>

      {change && change.status !== 'APPROVED' && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm',
            change.status === 'PENDING'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-rose-200 bg-rose-50 text-rose-800',
          )}
        >
          <p>
            {change.status === 'PENDING'
              ? 'Tienes un cambio de datos pendiente de aprobación por el administrador.'
              : `Tu cambio de datos fue rechazado${
                  change.rejectionReason ? `: ${change.rejectionReason}` : '.'
                }`}
          </p>
          <Link
            to="/perfil/editar"
            className="text-xs font-bold underline underline-offset-2"
          >
            Ver solicitud
          </Link>
        </div>
      )}

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

        {user.businessProfile && (
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
        )}

        {user.deliveryProfile && (
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
        )}

        {!user.businessProfile && !user.deliveryProfile && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            No tienes solicitudes registradas. Puedes solicitar una cuenta de
            empresa o de domiciliario.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(user.businessProfile || !user.deliveryProfile) && (
            <Link to="/solicitud/empresa" className={secondaryButtonClass}>
              <Building2 className="size-4" aria-hidden="true" />
              {user.businessProfile
                ? 'Ver solicitud de empresa'
                : 'Solicitar cuenta de empresa'}
            </Link>
          )}

          {(user.deliveryProfile || !user.businessProfile) && (
            <Link to="/solicitud/domiciliario" className={secondaryButtonClass}>
              <Bike className="size-4" aria-hidden="true" />
              {user.deliveryProfile
                ? 'Ver solicitud de domiciliario'
                : 'Solicitar cuenta de domiciliario'}
            </Link>
          )}
        </div>

        {user.businessProfile && !user.deliveryProfile && (
          <p className="text-[11px] text-slate-400">
            Tu cuenta está registrada como empresa. Para repartir necesitas otra
            cuenta.
          </p>
        )}

        {user.deliveryProfile && !user.businessProfile && (
          <p className="text-[11px] text-slate-400">
            Tu cuenta está registrada como domiciliario. Para vender necesitas
            otra cuenta.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              Reputación y Calificaciones
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Tu puntuación en FastDelivery
            </h2>
            <p className="text-xs text-slate-500">
              Puntuaciones y comentarios recibidos de otros usuarios al completar pedidos.
            </p>
          </div>
        </div>

        {ratingsData ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {user.roles.includes('CLIENT') && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Como Cliente
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {ratingsData.stats.client.average > 0
                        ? ratingsData.stats.client.average.toFixed(1)
                        : '—'}
                    </span>
                    <StarRating value={ratingsData.stats.client.average} size={16} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {ratingsData.stats.client.count}{' '}
                    {ratingsData.stats.client.count === 1
                      ? 'calificación recibida'
                      : 'calificaciones recibidas'}
                  </p>
                </div>
              )}

              {user.roles.includes('BUSINESS') && (
                <div className="rounded-2xl border border-orange-200/70 bg-orange-50/40 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
                    Como Empresa
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {ratingsData.stats.business.average > 0
                        ? ratingsData.stats.business.average.toFixed(1)
                        : '—'}
                    </span>
                    <StarRating value={ratingsData.stats.business.average} size={16} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {ratingsData.stats.business.count}{' '}
                    {ratingsData.stats.business.count === 1
                      ? 'opinión de clientes'
                      : 'opiniones de clientes'}
                  </p>
                </div>
              )}

              {user.roles.includes('DELIVERY') && (
                <div className="rounded-2xl border border-sky-200/70 bg-sky-50/40 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
                    Como Domiciliario
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {ratingsData.stats.delivery.average > 0
                        ? ratingsData.stats.delivery.average.toFixed(1)
                        : '—'}
                    </span>
                    <StarRating value={ratingsData.stats.delivery.average} size={16} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {ratingsData.stats.delivery.count}{' '}
                    {ratingsData.stats.delivery.count === 1
                      ? 'opinión de entregas'
                      : 'opiniones de entregas'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Comentarios y opiniones recientes
              </h3>
              {ratingsData.recent.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                  Aún no has recibido opiniones. Las calificaciones aparecerán aquí cuando finalices pedidos.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ratingsData.recent.map((rating) => (
                    <div
                      key={rating.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">
                            {rating.rater.name}
                          </span>
                          <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            Rol: {rating.targetType === 'CLIENT' ? 'Cliente' : rating.targetType === 'BUSINESS' ? 'Negocio' : 'Repartidor'}
                          </span>
                        </div>
                        <StarRating value={rating.score} size={14} showValue />
                      </div>
                      {rating.comment && (
                        <p className="text-xs text-slate-700 italic">"{rating.comment}"</p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        {formatOrderDate(rating.createdAt)} · Pedido #{rating.orderId}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        )}
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
