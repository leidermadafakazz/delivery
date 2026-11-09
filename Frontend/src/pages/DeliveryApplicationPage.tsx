import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Bike,
  Car,
  CircleAlert,
  Footprints,
  IdCard,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Save,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBanner } from '../components/applications/StatusBanner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { getErrorMessage } from '../lib/api'
import {
  fetchMyDeliveryApplication,
  getValidationErrors,
  registerDeliveryApplication,
  updateDeliveryApplication,
} from '../lib/applications-api'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { inputClass, labelClass, secondaryButtonClass } from '../lib/styles'
import { useAuthStore } from '../store/auth.store'
import type {
  ApprovalStatus,
  DeliveryApplication,
  DeliveryApplicationPayload,
  VehicleType,
} from '../types/applications'

interface DeliveryFormState {
  documentType: string
  documentNumber: string
  birthDate: string
  address: string
  city: string
  vehicleType: VehicleType
  vehiclePlate: string
  licenseNumber: string
  emergencyContactName: string
  emergencyContactPhone: string
  documentUrl: string
  licenseUrl: string
}

const EMPTY_FORM: DeliveryFormState = {
  documentType: 'CC',
  documentNumber: '',
  birthDate: '',
  address: '',
  city: '',
  vehicleType: 'MOTORCYCLE',
  vehiclePlate: '',
  licenseNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  documentUrl: '',
  licenseUrl: '',
}

const DOCUMENT_TYPES = ['CC', 'CE', 'Pasaporte', 'Otro']

const VEHICLE_TYPES: Array<{
  value: VehicleType
  label: string
  description: string
  icon: typeof Bike
}> = [
  {
    value: 'MOTORCYCLE',
    label: 'Moto',
    description: 'Rápido para distancias largas.',
    icon: Bike,
  },
  {
    value: 'BICYCLE',
    label: 'Bicicleta',
    description: 'Ideal para trayectos cortos.',
    icon: Footprints,
  },
  {
    value: 'CAR',
    label: 'Auto',
    description: 'Mayor capacidad de carga.',
    icon: Car,
  },
  {
    value: 'OTHER',
    label: 'Otro',
    description: 'Cuéntanos cuál usas.',
    icon: Truck,
  },
]

function toForm(profile: DeliveryApplication): DeliveryFormState {
  return {
    documentType: profile.documentType,
    documentNumber: profile.documentNumber,
    birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
    address: profile.address,
    city: profile.city,
    vehicleType: profile.vehicleType,
    vehiclePlate: profile.vehiclePlate ?? '',
    licenseNumber: profile.licenseNumber ?? '',
    emergencyContactName: profile.emergencyContactName ?? '',
    emergencyContactPhone: profile.emergencyContactPhone ?? '',
    documentUrl: profile.documentUrl ?? '',
    licenseUrl: profile.licenseUrl ?? '',
  }
}

function Field({
  id,
  label,
  children,
  hint,
  className,
}: {
  id: string
  label: string
  children: ReactNode
  hint?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function DeliveryApplicationPage() {
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)

  const [profile, setProfile] = useState<DeliveryApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [form, setForm] = useState<DeliveryFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [validation, setValidation] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const statusRef = useRef<ApprovalStatus | null>(null)

  const loadProfile = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true)
      }

      try {
        const data = await fetchMyDeliveryApplication()
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
          getErrorMessage(
            error,
            'No se pudo consultar tu solicitud de domiciliario.',
          ),
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

    if (!form.documentNumber.trim()) {
      missing.push('El número de documento es obligatorio.')
    }

    if (!form.address.trim()) {
      missing.push('La dirección es obligatoria.')
    }

    if (!form.city.trim()) {
      missing.push('La ciudad es obligatoria.')
    }

    if (missing.length > 0) {
      setValidation(missing)
      return
    }

    const payload: DeliveryApplicationPayload = {
      documentType: form.documentType,
      documentNumber: form.documentNumber.trim(),
      birthDate: form.birthDate || undefined,
      address: form.address.trim(),
      city: form.city.trim(),
      vehicleType: form.vehicleType,
      vehiclePlate: form.vehiclePlate.trim() || undefined,
      licenseNumber: form.licenseNumber.trim() || undefined,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      documentUrl: form.documentUrl.trim() || undefined,
      licenseUrl: form.licenseUrl.trim() || undefined,
    }

    setSaving(true)

    try {
      const saved = profile
        ? await updateDeliveryApplication(payload)
        : await registerDeliveryApplication(payload)

      setProfile(saved)
      setForm(toForm(saved))
      setSubmitted(true)
      setEditing(false)
      statusRef.current = saved.status
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          'No se pudo enviar la solicitud de domiciliario.',
        ),
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
          {approved ? 'Mi perfil de domiciliario' : 'Solicitud de domiciliario'}
        </h1>
        <p className="text-sm text-slate-500">
          {approved
            ? 'Tu perfil está aprobado y puedes tomar pedidos.'
            : 'Completa tus datos y documentos. El administrador revisará la solicitud y, si todo está bien, te asignará el rol de domiciliario.'}
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
          kind="delivery"
          approvedHref="/domiciliario"
          approvedLabel="Ir a domicilios"
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
        />
      )}

      {!profile && user?.businessProfile && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-bold">Tu cuenta ya está registrada como empresa</p>
          <p className="mt-1">
            Una misma cuenta no puede ser empresa y domiciliario a la vez. Si
            quieres repartir, regístrate con otra cuenta.
          </p>
          <Link
            to="/empresa"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-600"
          >
            Ir a mi panel de empresa
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
                {profile.documentType} {profile.documentNumber}
              </h2>
              <p className="text-xs text-slate-500">
                {profile.vehicleType} · {profile.city}
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
                {profile.address}, {profile.city}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Vehículo
              </dt>
              <dd className="text-slate-800">
                {profile.vehicleType}
                {profile.vehiclePlate ? ` · ${profile.vehiclePlate}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Licencia
              </dt>
              <dd className="text-slate-800">
                {profile.licenseNumber ?? 'No indicada'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Contacto de emergencia
              </dt>
              <dd className="text-slate-800">
                {profile.emergencyContactName ?? 'No indicado'}
                {profile.emergencyContactPhone
                  ? ` · ${profile.emergencyContactPhone}`
                  : ''}
              </dd>
            </div>
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

      {!approved && !user?.businessProfile && (!profile || editing) && (
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
              <IdCard className="size-4 text-orange-500" aria-hidden="true" />
              Identificación
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="documentType" label="Tipo de documento *">
                <select
                  id="documentType"
                  value={form.documentType}
                  onChange={(event) =>
                    setForm({ ...form, documentType: event.target.value })
                  }
                  className={inputClass}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="documentNumber" label="Número de documento *">
                <input
                  id="documentNumber"
                  type="text"
                  value={form.documentNumber}
                  onChange={(event) =>
                    setForm({ ...form, documentNumber: event.target.value })
                  }
                  className={inputClass}
                  placeholder="1020304050"
                  required
                />
              </Field>

              <Field id="birthDate" label="Fecha de nacimiento">
                <input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(event) =>
                    setForm({ ...form, birthDate: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>

              <Field id="licenseNumber" label="Número de licencia de conducción">
                <input
                  id="licenseNumber"
                  type="text"
                  value={form.licenseNumber}
                  onChange={(event) =>
                    setForm({ ...form, licenseNumber: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Opcional"
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <MapPin className="size-4 text-orange-500" aria-hidden="true" />
              Ubicación
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="address" label="Dirección *">
                  <input
                    id="address"
                    type="text"
                    value={form.address}
                    onChange={(event) =>
                      setForm({ ...form, address: event.target.value })
                    }
                    className={inputClass}
                    placeholder="Carrera 15 #85-20"
                    required
                  />
                </Field>
              </div>

              <Field id="city" label="Ciudad *">
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
              </Field>

              <Field id="vehiclePlate" label="Placa del vehículo">
                <input
                  id="vehiclePlate"
                  type="text"
                  value={form.vehiclePlate}
                  onChange={(event) =>
                    setForm({ ...form, vehiclePlate: event.target.value })
                  }
                  className={inputClass}
                  placeholder="ABC12D"
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Bike className="size-4 text-orange-500" aria-hidden="true" />
              Vehículo
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {VEHICLE_TYPES.map((option) => {
                const selected = form.vehicleType === option.value
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition',
                      selected
                        ? 'border-orange-400 bg-orange-50/70 ring-4 ring-orange-100'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <input
                      type="radio"
                      name="vehicleType"
                      value={option.value}
                      checked={selected}
                      onChange={() =>
                        setForm({ ...form, vehicleType: option.value })
                      }
                      className="sr-only"
                    />
                    <option.icon
                      className={cn(
                        'mt-0.5 size-5 shrink-0',
                        selected ? 'text-orange-600' : 'text-slate-400',
                      )}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {option.label}
                      </p>
                      <p className="text-[11px] leading-snug text-slate-500">
                        {option.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldCheck className="size-4 text-orange-500" aria-hidden="true" />
              Contacto de emergencia y documentos
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="emergencyContactName" label="Nombre del contacto">
                <input
                  id="emergencyContactName"
                  type="text"
                  value={form.emergencyContactName}
                  onChange={(event) =>
                    setForm({ ...form, emergencyContactName: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Opcional"
                />
              </Field>

              <Field id="emergencyContactPhone" label="Teléfono del contacto">
                <input
                  id="emergencyContactPhone"
                  type="tel"
                  value={form.emergencyContactPhone}
                  onChange={(event) =>
                    setForm({ ...form, emergencyContactPhone: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Opcional"
                />
              </Field>

              <Field
                id="documentUrl"
                label="URL del documento de identidad"
                hint="Enlace a una imagen o PDF del documento."
              >
                <input
                  id="documentUrl"
                  type="url"
                  value={form.documentUrl}
                  onChange={(event) =>
                    setForm({ ...form, documentUrl: event.target.value })
                  }
                  className={inputClass}
                  placeholder="https://…/cedula.pdf"
                />
              </Field>

              <Field id="licenseUrl" label="URL de la licencia de conducción">
                <input
                  id="licenseUrl"
                  type="url"
                  value={form.licenseUrl}
                  onChange={(event) =>
                    setForm({ ...form, licenseUrl: event.target.value })
                  }
                  className={inputClass}
                  placeholder="https://…/licencia.pdf"
                />
              </Field>
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

          <p className="text-center text-[11px] text-slate-400">
            Solicitud enviada como {user?.name} ({user?.email}).
          </p>
        </form>
      )}
    </div>
  )
}
