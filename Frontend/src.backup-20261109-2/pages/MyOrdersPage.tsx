import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  ClipboardList,
  Loader2,
  ReceiptText,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { OrderCard } from '../components/orders/OrderCard'
import { dangerActionClass, neutralActionClass } from '../components/orders/action-styles'
import { getErrorMessage } from '../lib/api'
import { formatCurrency } from '../lib/format'
import {
  canClientCancel,
  formatOrderDate,
  isActiveOrder,
  itemCount,
} from '../lib/order-status'
import { cancelMyOrder, fetchMyOrders } from '../lib/orders-api'
import { cn } from '../lib/cn'
import type { Order } from '../types/orders'

type Tab = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'FINISHED'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'ACTIVE', label: 'En curso' },
  { id: 'DELIVERED', label: 'Entregados' },
  { id: 'FINISHED', label: 'Rechazados y cancelados' },
]

function matchesTab(order: Order, tab: Tab): boolean {
  switch (tab) {
    case 'ACTIVE':
      return isActiveOrder(order.status)
    case 'DELIVERED':
      return order.status === 'DELIVERED'
    case 'FINISHED':
      return order.status === 'REJECTED' || order.status === 'CANCELLED'
    default:
      return true
  }
}

export function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('ALL')

  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchMyOrders({ limit: 100 })
      setOrders(data.orders)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar tus pedidos.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(true), 25000)

    return () => window.clearInterval(interval)
  }, [load])

  async function handleCancel() {
    if (!cancelTarget) {
      return
    }

    if (cancelReason.trim().length < 5) {
      setCancelError('Escribe un motivo de al menos 5 caracteres.')
      return
    }

    setCancelling(true)
    setCancelError(null)

    try {
      const { order } = await cancelMyOrder(cancelTarget.id, cancelReason.trim())
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? order : item)),
      )
      setCancelTarget(null)
      setCancelReason('')
    } catch (err) {
      setCancelError(getErrorMessage(err, 'No se pudo cancelar el pedido.'))
    } finally {
      setCancelling(false)
    }
  }

  const visibleOrders = orders.filter((order) => matchesTab(order, tab))
  const activeCount = orders.filter((order) => isActiveOrder(order.status)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Mis pedidos
          </h1>
          <p className="text-sm text-slate-500">
            Sigue el estado de cada pedido en tiempo real.{' '}
            {activeCount > 0 && (
              <span className="font-semibold text-orange-600">
                {activeCount} en curso.
              </span>
            )}
          </p>
        </div>

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

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((item) => {
          const count = orders.filter((order) => matchesTab(order, item.id)).length
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition',
                tab === item.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {item.label}
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  tab === item.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-slate-200/70"
            />
          ))}
        </div>
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          icon={tab === 'ALL' ? ReceiptText : ClipboardList}
          title={
            tab === 'ALL'
              ? 'Todavía no tienes pedidos'
              : 'No hay pedidos en esta sección'
          }
          description={
            tab === 'ALL'
              ? 'Cuando hagas tu primer pedido aparecerá aquí con su estado y su historial.'
              : 'Prueba con otra pestaña o actualiza la lista.'
          }
          action={
            tab === 'ALL' ? (
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600"
              >
                Pedir algo rico
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              heading={
                <Link
                  to={`/pedidos/${order.id}`}
                  className="transition hover:text-orange-600"
                >
                  {order.business.businessName}
                </Link>
              }
              subheading={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold text-slate-700">
                    Pedido #{order.id}
                  </span>
                  <span className="text-slate-400" aria-hidden="true">
                    •
                  </span>
                  <span>
                    {order.address}, {order.city}
                  </span>
                  <span className="text-slate-400" aria-hidden="true">
                    •
                  </span>
                  <span>{itemCount(order)} artículos</span>
                  <span className="text-slate-400" aria-hidden="true">
                    •
                  </span>
                  <span>{formatOrderDate(order.createdAt)}</span>
                </span>
              }
              actions={
                <>
                  <Link to={`/pedidos/${order.id}`} className={neutralActionClass}>
                    Ver seguimiento
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                  {canClientCancel(order.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelTarget(order)
                        setCancelReason('')
                        setCancelError(null)
                      }}
                      className={dangerActionClass}
                    >
                      <XCircle className="size-3.5" aria-hidden="true" />
                      Cancelar pedido
                    </button>
                  )}
                  <span className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
                    {order.status === 'ON_THE_WAY' && (
                      <Loader2 className="size-3.5 animate-spin text-orange-500" aria-hidden="true" />
                    )}
                    {order.status === 'ON_THE_WAY'
                      ? 'Tu pedido va en camino'
                      : order.status === 'DELIVERED'
                        ? 'Entregado'
                        : 'Total:'}
                    {order.status !== 'DELIVERED' && order.status !== 'ON_THE_WAY' && (
                      <span className="font-bold text-slate-900">
                        {formatCurrency(order.total)}
                      </span>
                    )}
                  </span>
                </>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={cancelTarget !== null}
        title="Cancelar pedido"
        description={
          cancelTarget
            ? `Pedido #${cancelTarget.id} de ${cancelTarget.business.businessName}`
            : undefined
        }
        onClose={() => {
          if (!cancelling) {
            setCancelTarget(null)
          }
        }}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Confirmar cancelación
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Solo puedes cancelar pedidos pendientes o aceptados. El negocio
            recibirá el motivo y el stock volverá a estar disponible.
          </p>
          <label
            htmlFor="cancel-reason"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Motivo de la cancelación
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Ej. Cambié de opinión, ya no estoy en la dirección…"
            className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
          {cancelError && <ErrorAlert message={cancelError} />}
        </div>
      </Modal>
    </div>
  )
}
