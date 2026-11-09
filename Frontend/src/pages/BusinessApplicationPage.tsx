import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Building2,
  CircleAlert,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Save,
  Send,
  Store,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBanner } from '../components/applications/StatusBanner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { getErrorMessage } from '../lib/api'
import {
  fetchMyBusinessApplication,
  getValidationErrors,
  registerBusinessApplication,
  updateBusinessApplication,
} from '../lib/applications-api'
import { formatCurrency } from '../lib/format'
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
} from '../lib/styles'
import { useAuthStore } from '../store/auth.store'
import type {
  ApprovalStatus,
  BusinessApplication,
  BusinessApplicationPayload,
  BusinessType,
} from '../types/applications'

interface BusinessFormState {
  businessName: string
  legalName: string
  taxId: string
  businessType: BusinessType
  description: string
  address: string
  city: string
  department: string
  contactPhone: string
  contactEmail: string
  logoUrl: string
  documentUrl: string
  deliveryFee: string
}

const EMPTY_FORM: BusinessFormState = {
  businessName: '',
  legalName: '',
  taxId: '',
  businessType: 'RESTAURANT',
  description: '',
  address: '',
  city: '',
  department: '',
  contactPhone: '',
  contactEmail: '',
  logoUrl: '',
  documentUrl: '',
  deliveryFee: '0',
}

function toForm(profile: BusinessApplication): BusinessFormState {
  return {
    businessName: profile.businessName,
    legalName: profile.legalName ?? '',
    taxId: profile.taxId ?? '',
    businessType: profile.businessType,
    description: profile.description ?? '',
    address: profile.address,
    city: profile.city,
    department: profile.department ?? '',
    contactPhone: profile.contactPhone ?? '',
    contactEmail: profile.contactEmail ?? '',
    logoUrl: profile.logoUrl ?? '',
    documentUrl: profile.documentUrl ?? '',
    deliveryFee: String(Number(profile.deliveryFee)),
  }
}

const BUSINESS_TYPES: Array<{
  value: BusinessType
  label: string
  description: string
  icon: typeof Store
}> = [
  {
    value: 'RESTAURANT',
    label: 'Restaurante',
    description: 'Comidas, bebidas y pedidos preparados al momento.',
    icon: UtensilsCrossed,
  },
  {
    value: 'STORE',
    label: 'Tienda o supermercado',
    description: 'Productos empacados, abarrotes y domicilios.',
    icon: Store,
  },
]

export function BusinessApplicationPage() {
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)

  const [profile, setProfile] = useState<BusinessApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [form, setForm] = useState<BusinessFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [validation, setValidation] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const statusRef = useRef<ApprovalStatus | null>(null)

  const loadProfile = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      const data = await fetchMyBusinessApplication()
      setProfile(data)
      setLoadError(null)

      if (data) {
        setForm(toForm(data))

        if (statusRef.current !== null && statusRef.current !== data.status) {
          void refreshUser()
        }

        statusRef.current = data.status
      }
    } catch (error) {
      setLoadError(
        getErrorMessage(error, 'No se pudo consultar tu solicitud de empresa.'),
      )
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [refreshUser])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (!profile) {
      setEditing(true)
      return
    }

    setEditing(profile.status === 'REJECTED')
  }, [profile])

  useEffect(() => {
    const interval = window.setInterval(() => void loadProfile(true), 25000)

    return () => window.clearInterval(interval)
  }, [loadProfile])

  async function handleRefresh() {
    setRefreshing(true)
    await loadProfile(true)
    await refreshUser()
    setRefreshing(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setValidation([])

    const missing: string[] = []

    if (!form.businessName.trim()) {
      missing.push('El nombre del negocio es obligatorio.')
    }

    if (!form.address.trim()) {
      missing.push('La dirección es obligatoria.')
    }

    if (!form.city.trim()) {
      missing.push('La ciudad es obligatoria.')
    }

    const fee = Number(form.deliveryFee)

    if (!Number.isFinite(fee) || fee < 0) {
      missing.push('La tarifa de domicilio debe ser un número mayor o igual a 0.')
    }

    if (missing.length > 0) {
      setValidation(missing)
      return
    }

    const payload: BusinessApplicationPayload = {
      businessName: form.businessName.trim(),
      businessType: form.businessType,
      legalName: form.legalName.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      description: form.description.trim() || undefined,
      address: form.address.trim(),
      city: form.city.trim(),
      department: form.department.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      documentUrl: form.documentUrl.trim() || undefined,
      deliveryFee: fee,
    }

    setSaving(true)

    try {
      const saved = profile
        ? await updateBusinessApplication(payload)
        : await registerBusinessApplication(payload)

      setProfile(saved)
      setForm(toForm(saved))
      setSubmitted(true)
      setEditing(false)
      statusRef.current = saved.status
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setFormError(
        getErrorMessage(error, 'No se pudo enviar la solicitud de empresa.'),
      )
      setValidation(getValidationErrors(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200/80" />
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200/80" />
      </div>
    )
  }

  const approved = profile?.status === 'APPROVED'

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          to="/panel"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver al panel
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          {approved ? 'Mi empresa' : 'Solicitud de empresa'}
        </h1>
        <p className="text-sm text-slate-500">
          {approved
            ? 'Tu negocio está aprobado y visible en el catálogo.'
            : 'Completa los datos de tu negocio. El administrador revisará la solicitud y, si todo está bien, te asignará el rol de empresa.'}
        </p>
      </div>

      {loadError && <ErrorAlert message={loadError} />}

      {submitted && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-bold">Solicitud enviada correctamente</p>
          <p className="text-emerald-700">
            El administrador recibirá la notificación y podrá aprobarla o
            rechazarla con un motivo.
          </p>
        </div>
      )}

      {profile && (
        <StatusBanner
          status={profile.status}
          rejectionReason={profile.rejectionReason}
          kind="business"
          approvedHref="/empresa"
          approvedLabel="Ir a mi empresa"
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
        />
      )}

      {!profile && user?.deliveryProfile && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-bold">Tu cuenta ya está registrada como domiciliario</p>
          <p className="mt-1">
            Una misma cuenta no puede ser empresa y domiciliario a la vez. Si
            quieres vender, regístrate con otra cuenta.
          </p>
          <Link
            to="/domiciliario"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-600"
          >
            Ir a mi panel de domicilios
          </Link>
        </div>
      )}

      {profile && !editing && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Datos enviados
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                {profile.businessName}
              </h2>
              <p className="text-xs text-slate-500">
                {profile.businessType === 'RESTAURANT' ? 'Restaurante' : 'Tienda / supermercado'}{' '}
                · {profile.city}
              </p>
            </div>
            {profile.status !== 'APPROVED' && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={secondaryButtonClass}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar solicitud
              </button>
            )}
          </div>

          <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Dirección
              </dt>
              <dd className="text-slate-800">
                {profile.address}
                {profile.city ? `, ${profile.city}` : ''}
                {profile.department ? `, ${profile.department}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Domicilio
              </dt>
              <dd className="text-slate-800">
                {formatCurrency(profile.deliveryFee)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Contacto
              </dt>
              <dd className="text-slate-800">
                {profile.contactPhone ?? 'Sin teléfono'}
                {profile.contactEmail ? ` · ${profile.contactEmail}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                NIT / documento
              </dt>
              <dd className="text-slate-800">{profile.taxId ?? 'No indicado'}</dd>
            </div>
            {profile.description && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Descripción
                </dt>
                <dd className="text-slate-800">{profile.description}</dd>
              </div>
            )}
          </dl>

          {profile.status !== 'APPROVED' && (
            <p className="mt-4 flex items-start gap-1.5 text-[11px] text-slate-400">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Si editas los datos, la solicitud vuelve a quedar pendiente de
              revisión.
            </p>
          )}
        </section>
      )}

      {!approved && !user?.deliveryProfile && (!profile || editing) && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          {profile && (
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <p className="text-sm font-semibold text-slate-700">
                {profile.status === 'REJECTED'
                  ? 'Corrige los datos y reenvía'
                  : 'Editar solicitud'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setForm(toForm(profile))
                  setValidation([])
                  setFormError(null)
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
            </div>
          )}

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Building2 className="size-4 text-orange-500" aria-hidden="true" />
              Datos del negocio
            </h2>

            <div>
              <label htmlFor="businessName" className={labelClass}>
                Nombre del negocio *
              </label>
              <input
                id="businessName"
                type="text"
                value={form.businessName}
                onChange={(event) =>
                  setForm({ ...form, businessName: event.target.value })
                }
                className={inputClass}
                placeholder="Ej. Burger & Pizza Artesanal"
                required
              />
            </div>

            <div>
              <span className={labelClass}>Tipo de negocio *</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {BUSINESS_TYPES.map((option) => {
                  const selected = form.businessType === option.value
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition ${
                        selected
                          ? 'border-orange-400 bg-orange-50/70 ring-4 ring-orange-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="businessType"
                        value={option.value}
                        checked={selected}
                        onChange={() =>
                          setForm({ ...form, businessType: option.value })
                        }
                        className="sr-only"
                      />
                      <option.icon
                        className={`size-5 ${selected ? 'text-orange-600' : 'text-slate-400'}`}
                        aria-hidden="true"
                      />
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {option.label}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                        {option.description}
                      </p>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="legalName" className={labelClass}>
                  Razón social
                </label>
                <input
                  id="legalName"
                  type="text"
                  value={form.legalName}
                  onChange={(event) =>
                    setForm({ ...form, legalName: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label htmlFor="taxId" className={labelClass}>
                  NIT / documento
                </label>
                <input
                  id="taxId"
                  type="text"
                  value={form.taxId}
                  onChange={(event) =>
                    setForm({ ...form, taxId: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Descripción del negocio
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className={`${inputClass} resize-none`}
                placeholder="Qué vendes, especialidad, horarios…"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <MapPin className="size-4 text-orange-500" aria-hidden="true" />
              Ubicación y contacto
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address" className={labelClass}>
                  Dirección *
                </label>
                <input
                  id="address"
                  type="text"
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Calle 100 #20-30"
                  required
                />
              </div>

              <div>
                <label htmlFor="city" className={labelClass}>
                  Ciudad *
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(event) =>
                    setForm({ ...form, city: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Bogotá"
                  required
                />
              </div>

              <div>
                <label htmlFor="department" className={labelClass}>
                  Departamento
                </label>
                <input
                  id="department"
                  type="text"
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Cundinamarca"
                />
              </div>

              <div>
                <label htmlFor="contactPhone" className={labelClass}>
                  Teléfono de contacto
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(event) =>
                    setForm({ ...form, contactPhone: event.target.value })
                  }
                  className={inputClass}
                  placeholder="300 111 2233"
                />
              </div>

              <div>
                <label htmlFor="contactEmail" className={labelClass}>
                  Correo de contacto
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) =>
                    setForm({ ...form, contactEmail: event.target.value })
                  }
                  className={inputClass}
                  placeholder={user?.email ?? 'negocio@correo.com'}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Truck className="size-4 text-orange-500" aria-hidden="true" />
              Operación
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="deliveryFee" className={labelClass}>
                  Tarifa de domicilio (COP) *
                </label>
                <input
                  id="deliveryFee"
                  type="number"
                  min="0"
                  step="100"
                  value={form.deliveryFee}
                  onChange={(event) =>
                    setForm({ ...form, deliveryFee: event.target.value })
                  }
                  className={inputClass}
                  placeholder="4500"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Se sumará al total de cada pedido. Usa 0 para domicilio gratis.
                </p>
              </div>

              <div>
                <label htmlFor="logoUrl" className={labelClass}>
                  URL del logo
                </label>
                <input
                  id="logoUrl"
                  type="url"
                  value={form.logoUrl}
                  onChange={(event) =>
                    setForm({ ...form, logoUrl: event.target.value })
                  }
                  className={inputClass}
                  placeholder="https://…/logo.png"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="documentUrl" className={labelClass}>
                  URL del documento (RUT / cámara de comercio)
                </label>
                <input
                  id="documentUrl"
                  type="url"
                  value={form.documentUrl}
                  onChange={(event) =>
                    setForm({ ...form, documentUrl: event.target.value })
                  }
                  className={inputClass}
                  placeholder="https://…/documento.pdf"
                />
              </div>
            </div>
          </section>

          {formError && <ErrorAlert message={formError} />}

          {validation.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              {validation.map((message) => (
                <li key={message} className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {message}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Link to="/panel" className={secondaryButtonClass}>
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : profile ? (
                <Save className="size-4" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              {profile ? 'Actualizar solicitud' : 'Enviar solicitud al administrador'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
