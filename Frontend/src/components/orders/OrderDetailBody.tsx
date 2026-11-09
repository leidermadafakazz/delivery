import type { ReactNode } from 'react'
import {
  Bike,
  CircleAlert,
  Clock,
  MapPin,
  Phone,
  ReceiptText,
  Star,
  StickyNote,
  UserRound,
  Wallet,
} from 'lucide-react'
import { StarRating } from '../ratings/StarRating'
import { TARGET_LABELS } from '../../types/ratings'
import { formatCurrency } from '../../lib/format'
import {
  PAYMENT_METHOD_LABELS,
  formatOrderDate,
  orderNumber,
} from '../../lib/order-status'
import type { Order } from '../../types/orders'
import { OrderStatusBadge } from './OrderStatusBadge'

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="text-sm text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export function OrderDetailBody({
  order,
  showClient = false,
  showHistory = true,
}: {
  order: Order
  showClient?: boolean
  showHistory?: boolean
}) {
  const reason = order.rejectionReason ?? order.cancellationReason
  const history = order.history ?? []

  return (
    <div className="space-y-5">
      {reason && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {order.rejectionReason ? 'Motivo del rechazo' : 'Motivo de la cancelación'}
            </p>
            <p className="text-rose-600">{reason}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Entrega
          </p>
          <InfoRow
            icon={<MapPin className="size-4" />}
            label="Dirección"
            value={
              <>
                {order.address}
                <span className="block text-xs text-slate-500">
                  {order.city}
                  {order.department ? `, ${order.department}` : ''}
                </span>
              </>
            }
          />
          <InfoRow
            icon={<Phone className="size-4" />}
            label="Teléfono de contacto"
            value={order.contactPhone ?? 'No indicado'}
          />
          <InfoRow
            icon={<Clock className="size-4" />}
            label="Creado"
            value={formatOrderDate(order.createdAt)}
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pedido
          </p>
          <InfoRow
            icon={<ReceiptText className="size-4" />}
            label="Número"
            value={orderNumber(order.id)}
          />
          <InfoRow
            icon={<Wallet className="size-4" />}
            label="Método de pago"
            value={PAYMENT_METHOD_LABELS[order.paymentMethod]}
          />
          {showClient && order.client && (
            <InfoRow
              icon={<UserRound className="size-4" />}
              label="Cliente"
              value={
                <>
                  {order.client.name}
                  {order.client.phone ? (
                    <span className="block text-xs text-slate-500">
                      {order.client.phone}
                    </span>
                  ) : null}
                </>
              }
            />
          )}
          {order.delivery && (
            <InfoRow
              icon={<Bike className="size-4" />}
              label="Domiciliario"
              value={
                <>
                  {order.delivery.user.name}
                  <span className="block text-xs text-slate-500">
                    {order.delivery.vehiclePlate ?? order.delivery.vehicleType}
                    {order.delivery.user.phone
                      ? ` · ${order.delivery.user.phone}`
                      : ''}
                  </span>
                </>
              }
            />
          )}
        </div>
      </div>

      {order.notes && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          <StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Notas del cliente</p>
            <p>{order.notes}</p>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Productos
        </p>
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {item.quantity}× {item.productName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(item.unitPrice)} c/u
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-slate-900">
                {formatCurrency(item.total)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>Subtotal</dt>
            <dd>{formatCurrency(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Domicilio</dt>
            <dd>
              {Number(order.deliveryFee) === 0
                ? 'Gratis'
                : formatCurrency(order.deliveryFee)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-extrabold text-slate-900">
            <dt>Total</dt>
            <dd>{formatCurrency(order.total)}</dd>
          </div>
        </dl>
      </div>

      {order.ratings && order.ratings.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            Calificaciones registradas ({order.ratings.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {order.ratings.map((rating) => (
              <div
                key={rating.id}
                className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">
                    A: {TARGET_LABELS[rating.targetType] ?? rating.targetType}
                  </span>
                  <StarRating value={rating.score} size={14} showValue />
                </div>
                {rating.comment && (
                  <p className="text-slate-600 italic">"{rating.comment}"</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Por {rating.rater?.name ?? 'Usuario'}</span>
                  <span>{formatOrderDate(rating.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Historial
          </p>
          <ol className="space-y-0">
            {history.map((change, index) => (
              <li key={change.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-orange-400 ring-4 ring-orange-100" />
                  {index < history.length - 1 && (
                    <span className="w-px flex-1 bg-slate-200" />
                  )}
                </div>
                <div className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={change.status} />
                    <span className="text-[11px] text-slate-400">
                      {formatOrderDate(change.createdAt)}
                    </span>
                  </div>
                  {change.note && (
                    <p className="mt-1 text-xs text-slate-600">{change.note}</p>
                  )}
                  {change.changedBy && (
                    <p className="text-[11px] text-slate-400">
                      por {change.changedBy.name}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
