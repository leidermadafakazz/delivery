import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Info,
  Loader2,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  Send,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { getErrorMessage } from '../lib/api'
import {
  fetchMyProfileChange,
  submitProfileChange,
} from '../lib/profile-api'
import { cn } from '../lib/cn'
import { inputClass, labelClass, secondaryButtonClass } from '../lib/styles'
import { useAuthStore } from '../store/auth.store'
import type { ProfileChangeRequest } from '../types/profile-change'

interface ProfileFormState {
  name: string
  email: string
  phone: string
}

export function EditProfilePage() {
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)

  const [request, setRequest] = useState<ProfileChangeRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [form, setForm] = useState<ProfileFormState>({
    name: '',
    email: '',
    phone: '',
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const statusRef = useRef<string | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true)
      }

      try {
        const current = await fetchMyProfileChange()
        setRequest(current)
        setLoadError(null)

        if (
          current &&
          statusRef.current !== null &&
          statusRef.current !== current.status
        ) {
          await refreshUser()
        }

        statusRef.current = current?.status ?? null
      } catch (error) {
        setLoadError(
          getErrorMessage(error, 'No se pudo consultar tu solicitud de cambio.'),
        )
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [refreshUser],
  )

  useEffect(() => {
    void load()
    void refreshUser()
  }, [load, refreshUser])

  useEffect(() => {
    if (!user) {
      return
    }

    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
    })
  }, [user])

  useEffect(() => {
    const interval = window.setInterval(() => void load(true), 20000)

    return () => window.clearInterval(interval)
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    await load(true)
    await refreshUser()
    setRefreshing(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!user) {
      return
    }

    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    const phone = form.phone.trim()

    if (!name) {
      setFormError('El nombre no puede quedar vacío.')
      return
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Escribe un correo electrónico válido.')
      return
    }

    if (name === user.name && email === user.email && phone === (user.phone ?? '')) {
      setFormError('No cambiaste ningún dato.')
      return
    }

    setSaving(true)

    try {
      const data = await submitProfileChange({ name, email, phone })
      setRequest(data.request)
      statusRef.current = data.request.status
      setSubmitted(true)
      setEditing(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setFormError(
        getErrorMessage(error, 'No se pudo enviar la solicitud de cambio.'),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200/80" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200/80" />
      </div>
    )
  }

  const pending = request?.status === 'PENDING'
  const approved = request?.status === 'APPROVED'
  const rejected = request?.status === 'REJECTED'
  const showForm = editing || !pending

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          to="/perfil"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver a mi perfil
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Editar perfil
        </h1>
        <p className="text-sm text-slate-500">
          Los cambios de nombre, correo o teléfono requieren la aprobación del
          administrador antes de aplicarse a tu cuenta.
        </p>
      </div>

      {loadError && <ErrorAlert message={loadError} />}

      {submitted && pending && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-bold">Cambio enviado correctamente</p>
          <p className="text-emerald-700">
            El administrador recibirá la notificación y deberá aprobarlo.
          </p>
        </div>
      )}

      {pending && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
              <Clock3 className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold">Cambio en revisión</p>
              <p className="mt-1 text-sm text-amber-800">
                El administrador debe aprobar los nuevos datos antes de que se
                apliquen.
              </p>

              <dl className="mt-3 grid gap-2 rounded-xl bg-white/70 p-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Nombre
                  </dt>
                  <dd className="text-slate-800">{request?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Correo
                  </dt>
                  <dd className="break-all text-slate-800">
                    {request?.email ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Teléfono
                  </dt>
                  <dd className="text-slate-800">
                    {request?.phone === null
                      ? '—'
                      : request?.phone === ''
                        ? 'Sin teléfono'
                        : request?.phone}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white/70 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-white"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  Modificar solicitud
                </button>
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white/70 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-white disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn('size-3.5', refreshing && 'animate-spin')}
                    aria-hidden="true"
                  />
                  Actualizar estado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {approved && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-bold">Datos actualizados</p>
              <p className="mt-1 text-sm text-emerald-800">
                Tus nuevos datos ya están aplicados a la cuenta. Si cambiaste el
                correo, úsalo en tu próximo inicio de sesión.
              </p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-white"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                Solicitar otro cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {rejected && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
              <CircleAlert className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-bold">Cambio rechazado</p>
              <p className="mt-1 text-sm text-rose-800">
                Corrige los datos y envía la solicitud de nuevo.
              </p>
              {request?.rejectionReason && (
                <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm ring-1 ring-inset ring-rose-200">
                  <span className="font-bold">Motivo: </span>
                  {request.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          {editing && pending && (
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <p className="text-sm font-semibold text-slate-700">
                Modificar solicitud pendiente
              </p>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="profile-name" className={labelClass}>
                Nombre completo
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className={`${inputClass} pl-10`}
                  placeholder="Tu nombre"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-email" className={labelClass}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  className={`${inputClass} pl-10`}
                  placeholder="tu@correo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-phone" className={labelClass}>
                Teléfono
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  className={`${inputClass} pl-10`}
                  placeholder="300 111 2233"
                />
              </div>
            </div>
          </div>

          <p className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Deja el teléfono vacío si quieres quitarlo. El cambio no se aplica
            hasta que el administrador lo apruebe.
          </p>

          {formError && <ErrorAlert message={formError} />}

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Link to="/perfil" className={secondaryButtonClass}>
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : request ? (
                <Save className="size-4" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              Enviar al administrador
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
