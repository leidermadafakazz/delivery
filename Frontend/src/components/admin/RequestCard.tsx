import type { ReactNode } from 'react'
import {
  Bike,
  Building2,
  CircleCheck,
  CircleX,
  Clock3,
  ExternalLink,
  FileText,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Truck,
  UserRound,
} from 'lucide-react'
import { StatusBadge } from '../ui/StatusBadge'
import {
  dangerActionClass,
  successActionClass,
} from '../orders/action-styles'
import { formatCurrency } from '../../lib/format'
import { formatOrderDate } from '../../lib/order-status'
import type {
  BusinessApplication,
  DeliveryApplication,
} from '../../types/applications'

const VEHICLE_LABELS: Record<string, string> = {
  MOTORCYCLE: 'Moto',
  BICYCLE: 'Bicicleta',
  CAR: 'Auto',
  OTHER: 'Otro',
}

function ReviewActions({
  status,
  busy,
  onApprove,
  onReject,
}: {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
      {status !== 'APPROVED' && (
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
          {status === 'REJECTED' ? 'Aprobar de nuevo' : 'Aprobar solicitud'}
        </button>
      )}

      {status !== 'REJECTED' && (
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className={dangerActionClass}
        >
          <CircleX className="size-3.5" aria-hidden="true" />
          {status === 'APPROVED' ? 'Revocar aprobación' : 'Rechazar'}
        </button>
      )}

      {status === 'APPROVED' && (
        <span className="ml-auto text-[11px] font-semibold text-emerald-700">
          Activo: ya puede operar en la plataforma
        </span>
      )}

      {status === 'REJECTED' && (
        <span className="ml-auto text-[11px] font-semibold text-rose-600">
          Puede corregir los datos y reenviar la solicitud
        </span>
      )}
    </div>
  )
}

function ApplicantRow({
  name,
  email,
  phone,
}: {
  name: string
  email: string
  phone: string | null
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
        <UserRound className="size-3.5 text-slate-400" aria-hidden="true" />
        {name}
      </span>
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center gap-1.5 hover:text-orange-600"
      >
        <Mail className="size-3.5 text-slate-400" aria-hidden="true" />
        {email}
      </a>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center gap-1.5 hover:text-orange-600"
        >
          <Phone className="size-3.5 text-slate-400" aria-hidden="true" />
          {phone}
        </a>
      )}
    </div>
  )
}

function DetailItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="text-sm text-slate-800">{children}</p>
      </div>
    </div>
  )
}

export function BusinessRequestCard({
  application,
  busy,
  onApprove,
  onReject,
}: {
  application: BusinessApplication
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-900">
                {application.businessName}
              </h3>
              <StatusBadge status={application.status} />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {application.businessType === 'RESTAURANT'
                  ? 'Restaurante'
                  : 'Tienda'}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Solicitud #{application.id} ·{' '}
              {formatOrderDate(application.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <ApplicantRow
          name={application.user.name}
          email={application.user.email}
          phone={application.user.phone}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem icon={<MapPin className="size-4" />} label="Dirección">
            {application.address}, {application.city}
            {application.department ? `, ${application.department}` : ''}
          </DetailItem>
          <DetailItem icon={<Truck className="size-4" />} label="Domicilio">
            {formatCurrency(application.deliveryFee)}
          </DetailItem>
          <DetailItem icon={<IdCard className="size-4" />} label="NIT / documento">
            {application.taxId ?? 'No indicado'}
          </DetailItem>
          <DetailItem icon={<Phone className="size-4" />} label="Teléfono">
            {application.contactPhone ?? 'No indicado'}
            {application.contactEmail ? ` · ${application.contactEmail}` : ''}
          </DetailItem>
        </div>

        {application.description && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {application.description}
          </p>
        )}

        {application.documentUrl && (
          <a
            href={application.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            <FileText className="size-3.5" aria-hidden="true" />
            Ver documento
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        )}

        {application.status === 'REJECTED' && application.rejectionReason && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <span className="font-bold">Motivo del rechazo: </span>
            {application.rejectionReason}
          </p>
        )}

        {application.reviewedBy && application.reviewedAt && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock3 className="size-3" aria-hidden="true" />
            Revisado por {application.reviewedBy.name} el{' '}
            {formatOrderDate(application.reviewedAt)}
          </p>
        )}
      </div>

      <ReviewActions
        status={application.status}
        busy={busy}
        onApprove={onApprove}
        onReject={onReject}
      />
    </article>
  )
}

export function DeliveryRequestCard({
  application,
  busy,
  onApprove,
  onReject,
}: {
  application: DeliveryApplication
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Bike className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-900">
                {application.documentType} {application.documentNumber}
              </h3>
              <StatusBadge status={application.status} />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {VEHICLE_LABELS[application.vehicleType] ?? application.vehicleType}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Solicitud #{application.id} ·{' '}
              {formatOrderDate(application.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <ApplicantRow
          name={application.user.name}
          email={application.user.email}
          phone={application.user.phone}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem icon={<MapPin className="size-4" />} label="Dirección">
            {application.address}, {application.city}
          </DetailItem>
          <DetailItem icon={<Truck className="size-4" />} label="Vehículo">
            {VEHICLE_LABELS[application.vehicleType] ?? application.vehicleType}
            {application.vehiclePlate ? ` · ${application.vehiclePlate}` : ''}
          </DetailItem>
          <DetailItem icon={<IdCard className="size-4" />} label="Licencia">
            {application.licenseNumber ?? 'No indicada'}
          </DetailItem>
          <DetailItem icon={<Phone className="size-4" />} label="Emergencia">
            {application.emergencyContactName ?? 'No indicado'}
            {application.emergencyContactPhone
              ? ` · ${application.emergencyContactPhone}`
              : ''}
          </DetailItem>
        </div>

        <div className="flex flex-wrap gap-3">
          {application.documentUrl && (
            <a
              href={application.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              <FileText className="size-3.5" aria-hidden="true" />
              Documento de identidad
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
          {application.licenseUrl && (
            <a
              href={application.licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              <FileText className="size-3.5" aria-hidden="true" />
              Licencia de conducción
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </div>

        {application.status === 'REJECTED' && application.rejectionReason && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <span className="font-bold">Motivo del rechazo: </span>
            {application.rejectionReason}
          </p>
        )}

        {application.reviewedBy && application.reviewedAt && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock3 className="size-3" aria-hidden="true" />
            Revisado por {application.reviewedBy.name} el{' '}
            {formatOrderDate(application.reviewedAt)}
          </p>
        )}
      </div>

      <ReviewActions
        status={application.status}
        busy={busy}
        onApprove={onApprove}
        onReject={onReject}
      />
    </article>
  )
}
