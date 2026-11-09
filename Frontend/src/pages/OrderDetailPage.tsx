import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Star,
  XCircle,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { OrderDetailBody } from '../components/orders/OrderDetailBody'
import { OrderStatusBadge } from '../components/orders/OrderStatusBadge'
import { neutralActionClass } from '../components/orders/action-styles'
import { RatingDialog } from '../components/ratings/RatingDialog'
import { StarRating } from '../components/ratings/StarRating'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { getErrorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCurrency } from '../lib/format'
import {
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
  canClientCancel,
  formatOrderDate,
} from '../lib/order-status'
import { cancelMyOrder, fetchMyOrder } from '../lib/orders-api'
import { useAuthStore } from '../store/auth.store'
import type { Order, OrderStatus } from '../types/orders'
import type { OrderRating, Rating, RatingTargetType } from '../types/ratings'

function OrderProgress({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER_FLOW.indexOf(status)

  if (currentIndex === -1) {
    return null
  }

  return (
    <ol className="flex w-full items-start gap-1">
      {ORDER_FLOW.map((step, index) => {
        const done = index <= currentIndex
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full text-[10px] font-bold transition',
                  done
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                    : 'bg-slate-200 text-slate-500',
                )}
              >
                {done ? <CheckCircle2 className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden max-w-20 text-center text-[10px] font-semibold leading-tight sm:block',
                  done ? 'text-slate-800' : 'text-slate-400',
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </div>

            {index < ORDER_FLOW.length - 1 && (
              <span
                className={cn(
                  'mx-1 mt-3.5 h-0.5 flex-1 rounded-full',
                  index < currentIndex ? 'bg-orange-400' : 'bg-slate-200',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const orderId = Number(id)
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const justCreated = Boolean(
    (location.state as { created?: boolean } | null)?.created,
  )

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const [ratingDialog, setRatingDialog] = useState<{
    targetType: RatingTargetType
    targetName: string
    existing: Rating | OrderRating | null
  } | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!orderId || Number.isNaN(orderId)) {
        setError('El pedido indicado no es válido.')
        setLoading(false)
        return
      }

      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await fetchMyOrder(orderId)
        setOrder(data.order)
        setError(null)
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudo cargar el pedido.'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [orderId],
  )

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(true), 20000)

    return () => window.clearInterval(interval)
  }, [load])

  async function handleCancel() {
    if (!order) {
      return
    }

    if (cancelReason.trim().length < 5) {
      setCancelError('Escribe un motivo de al menos 5 caracteres.')
      return
    }

    setCancelling(true)
    setCancelError(null)

    try {
      const data = await cancelMyOrder(order.id, cancelReason.trim())
      setOrder(data.order)
      setCancelOpen(false)
      setCancelReason('')
    } catch (err) {
      setCancelError(getErrorMessage(err, 'No se pudo cancelar el pedido.'))
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-36 animate-pulse rounded-3xl bg-slate-200/80" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200/80" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to="/pedidos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a mis pedidos
        </Link>
        <ErrorAlert message={error ?? 'Pedido no encontrado.'} />
      </div>
    )
  }

  const myBusinessRating =
    order.ratings?.find(
      (rating) => rating.raterId === user?.id && rating.targetType === 'BUSINESS',
    ) ?? null
  const myDeliveryRating =
    order.ratings?.find(
      (rating) => rating.raterId === user?.id && rating.targetType === 'DELIVERY',
    ) ?? null

  function handleRatingSaved(rating: Rating) {
    setOrder((current) =>
      current
        ? {
            ...current,
            ratings: [
              ...(current.ratings ?? []).filter(
                (item) =>
                  !(
                    item.raterId === rating.raterId &&
                    item.targetType === rating.targetType
                  ),
              ),
              rating,
            ],
          }
        : current,
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/pedidos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Mis pedidos
        </Link>

        <button
          type="button"
          onClick={() => void load(true)}
          className={neutralActionClass}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn('size-3.5', refreshing && 'animate-spin')}
            aria-hidden="true"
          />
          Actualizar
        </button>
      </div>

      {justCreated && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">¡Pedido enviado!</p>
            <p className="text-emerald-700">
              El negocio lo revisará y te avisaremos cuando cambie de estado.
            </p>
          </div>
        </div>
      )}

      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/catalogo/${order.businessId}`)}
              className="shrink-0"
              aria-label={`Ir a ${order.business.businessName}`}
            >
              {order.business.logoUrl ? (
                <img
                  src={order.business.logoUrl}
                  alt={order.business.businessName}
                  className="size-12 rounded-2xl border border-slate-200 object-cover"
                />
              ) : (
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-black text-white">
                  {order.business.businessName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pedido #{order.id}
              </p>
              <h1 className="text-lg font-black tracking-tight text-slate-900">
                {order.business.businessName}
              </h1>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="size-3" aria-hidden="true" />
                {formatOrderDate(order.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
            <OrderStatusBadge status={order.status} />
            <p className="text-xl font-black text-slate-900">
              {formatCurrency(order.total)}
            </p>
          </div>
        </div>

        <div className="p-5">
          {order.status === 'REJECTED' || order.status === 'CANCELLED' ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                {order.status === 'REJECTED'
                  ? 'El negocio rechazó este pedido.'
                  : 'Este pedido fue cancelado.'}{' '}
                {order.rejectionReason ?? order.cancellationReason}
              </p>
            </div>
          ) : (
            <>
              <OrderProgress status={order.status} />
              {order.status === 'ON_THE_WAY' && (
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Tu pedido va en camino. Mantente pendiente del teléfono.
                </p>
              )}
            </>
          )}
        </div>

        {canClientCancel(order.status) && (
          <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-3">
            <button
              type="button"
              onClick={() => {
                setCancelOpen(true)
                setCancelReason('')
                setCancelError(null)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
            >
              <XCircle className="size-3.5" aria-hidden="true" />
              Cancelar pedido
            </button>
          </div>
        )}
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <OrderDetailBody order={order} showHistory />
      </section>

      {order.status === 'DELIVERED' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            Califica tu pedido
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tu opinión ayuda a otros clientes y mejora el servicio.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Negocio
              </p>
              <p className="text-sm font-bold text-slate-900">
                {order.business.businessName}
              </p>

              {myBusinessRating ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StarRating
                    value={myBusinessRating.score}
                    count={undefined}
                    showValue
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRatingDialog({
                        targetType: 'BUSINESS',
                        targetName: order.business.businessName,
                        existing: myBusinessRating,
                      })
                    }
                    className="text-xs font-bold text-orange-600 hover:underline"
                  >
                    Editar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setRatingDialog({
                      targetType: 'BUSINESS',
                      targetName: order.business.businessName,
                      existing: null,
                    })
                  }
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  <Star className="size-3.5" aria-hidden="true" />
                  Calificar negocio
                </button>
              )}
            </div>

            {order.delivery && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Domiciliario
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {order.delivery.user.name}
                </p>

                {myDeliveryRating ? (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <StarRating value={myDeliveryRating.score} showValue />
                    <button
                      type="button"
                      onClick={() =>
                        setRatingDialog({
                          targetType: 'DELIVERY',
                          targetName: order.delivery!.user.name,
                          existing: myDeliveryRating,
                        })
                      }
                      className="text-xs font-bold text-orange-600 hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setRatingDialog({
                        targetType: 'DELIVERY',
                        targetName: order.delivery!.user.name,
                        existing: null,
                      })
                    }
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600"
                  >
                    <Star className="size-3.5" aria-hidden="true" />
                    Calificar domiciliario
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <RatingDialog
        open={ratingDialog !== null}
        orderId={order.id}
        targetType={ratingDialog?.targetType ?? 'BUSINESS'}
        targetName={ratingDialog?.targetName ?? ''}
        existing={ratingDialog?.existing ?? null}
        onClose={() => setRatingDialog(null)}
        onSaved={handleRatingSaved}
      />

      <Modal
        open={cancelOpen}
        title="Cancelar pedido"
        description={`Pedido #${order.id} de ${order.business.businessName}`}
        onClose={() => {
          if (!cancelling) {
            setCancelOpen(false)
          }
        }}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Confirmar cancelación
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <label
            htmlFor="detail-cancel-reason"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Motivo de la cancelación
          </label>
          <textarea
            id="detail-cancel-reason"
            rows={3}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Cuéntanos por qué cancelas el pedido…"
            className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
          {cancelError && <ErrorAlert message={cancelError} />}
        </div>
      </Modal>
    </div>
  )
}
