import { useCallback, useEffect, useState } from 'react'
import {
  Bike,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Truck,
} from 'lucide-react'
import { OrderCard } from '../components/orders/OrderCard'
import { OrderDetailBody } from '../components/orders/OrderDetailBody'
import {
  primaryActionClass,
  successActionClass,
} from '../components/orders/action-styles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { StatCard } from '../components/ui/StatCard'
import { getErrorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCurrency } from '../lib/format'
import { formatOrderDate, itemCount } from '../lib/order-status'
import {
  acceptAvailableOrder,
  deliverOrder,
  fetchAvailableOrders,
  fetchDeliveryOrders,
  pickupOrder,
} from '../lib/orders-api'
import { useAuthStore } from '../store/auth.store'
import type { Order } from '../types/orders'

type Tab = 'AVAILABLE' | 'ACTIVE' | 'HISTORY'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'AVAILABLE', label: 'Disponibles' },
  { id: 'ACTIVE', label: 'Mis entregas' },
  { id: 'HISTORY', label: 'Historial' },
]

export function DeliveryPage() {
  const user = useAuthStore((state) => state.user)

  const [available, setAvailable] = useState<Order[]>([])
  const [mine, setMine] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('AVAILABLE')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [actingId, setActingId] = useState<number | null>(null)

  const deliveryProfile = user?.deliveryProfile
  const isApproved = deliveryProfile?.status === 'APPROVED'

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [availableData, mineData] = await Promise.all([
        fetchAvailableOrders(),
        fetchDeliveryOrders({ limit: 100 }),
      ])

      setAvailable(availableData.orders)
      setMine(mineData.orders)
      setError(null)
    } catch (err) {
      setError(
        getErrorMessage(err, 'No se pudieron cargar los domicilios asignados.'),
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!isApproved) {
      setLoading(false)
      return
    }

    void load()
    const interval = window.setInterval(() => void load(true), 20000)

    return () => window.clearInterval(interval)
  }, [isApproved, load])

  async function runAction(order: Order, action: 'TAKE' | 'PICKUP' | 'DELIVER') {
    setActingId(order.id)
    setActionError(null)

    try {
      if (action === 'TAKE') {
        await acceptAvailableOrder(order.id)
      } else if (action === 'PICKUP') {
        await pickupOrder(order.id)
      } else {
        await deliverOrder(order.id)
      }

      setExpandedId(null)
      await load(true)
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo actualizar la entrega.'))
    } finally {
      setActingId(null)
    }
  }

  const activeDeliveries = mine.filter(
    (order) => order.status === 'READY' || order.status === 'ON_THE_WAY',
  )
  const history = mine.filter(
    (order) =>
      order.status === 'DELIVERED' ||
      order.status === 'REJECTED' ||
      order.status === 'CANCELLED',
  )
  const deliveredCount = mine.filter((order) => order.status === 'DELIVERED').length

  const visibleOrders =
    tab === 'AVAILABLE' ? available : tab === 'ACTIVE' ? activeDeliveries : history

  if (!deliveryProfile) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="font-bold">Aún no tienes perfil de domiciliario</p>
          <p className="mt-1">
            Registra tus datos y documentos para que el administrador pueda
            aprobarte.
          </p>
        </div>
      </div>
    )
  }

  if (!isApproved) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Domicilios
        </h1>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Tu perfil está {deliveryProfile.status === 'PENDING'
                  ? 'en revisión'
                  : 'rechazado'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {deliveryProfile.status === 'PENDING'
                  ? 'Podrás tomar pedidos cuando el administrador apruebe tu solicitud.'
                  : 'Corrige tus datos y vuelve a enviar la solicitud.'}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Documento {deliveryProfile.documentNumber}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Domicilios
          </h1>
          <p className="text-sm text-slate-500">
            Toma pedidos listos, recógelos y registra cada entrega.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={cn('size-3.5', refreshing && 'animate-spin')}
            aria-hidden="true"
          />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Disponibles"
          value={available.length}
          icon={Bike}
          tone="orange"
          hint={available.length > 0 ? 'Listos para recoger' : 'Sin pedidos listos'}
        />
        <StatCard
          label="En curso"
          value={activeDeliveries.length}
          icon={Truck}
          tone="sky"
        />
        <StatCard
          label="Entregados"
          value={deliveredCount}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      {error && <ErrorAlert message={error} />}
      {actionError && <ErrorAlert message={actionError} />}

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((item) => {
          const count =
            item.id === 'AVAILABLE'
              ? available.length
              : item.id === 'ACTIVE'
                ? activeDeliveries.length
                : history.length
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
          icon={tab === 'AVAILABLE' ? PackageCheck : Bike}
          title={
            tab === 'AVAILABLE'
              ? 'No hay pedidos listos ahora'
              : tab === 'ACTIVE'
                ? 'No tienes entregas en curso'
                : 'Todavía no tienes historial'
          }
          description={
            tab === 'AVAILABLE'
              ? 'Cuando un negocio marque un pedido como listo aparecerá aquí automáticamente.'
              : tab === 'ACTIVE'
                ? 'Toma un pedido de la pestaña «Disponibles» para empezar.'
                : 'Aquí verás las entregas que completes.'
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const busy = actingId === order.id
            const expanded = expandedId === order.id
            const client = order.client

            const action =
              tab === 'AVAILABLE'
                ? 'TAKE'
                : order.status === 'ON_THE_WAY'
                  ? 'DELIVER'
                  : order.status === 'READY'
                    ? 'PICKUP'
                    : null

            return (
              <OrderCard
                key={order.id}
                order={order}
                heading={`Pedido #${order.id}`}
                subheading={
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-slate-700">
                      {order.business.businessName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3 text-slate-400" aria-hidden="true" />
                      {order.address}, {order.city}
                    </span>
                    {client && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3 text-slate-400" aria-hidden="true" />
                        {client.name}
                      </span>
                    )}
                    <span>{itemCount(order)} artículos</span>
                  </span>
                }
                expanded={expanded}
                onToggle={() =>
                  setExpandedId((current) => (current === order.id ? null : order.id))
                }
                actions={
                  <>
                    {action === 'TAKE' && (
                      <button
                        type="button"
                        onClick={() => void runAction(order, 'TAKE')}
                        disabled={busy}
                        className={primaryActionClass}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Bike className="size-3.5" aria-hidden="true" />
                        )}
                        Tomar pedido
                      </button>
                    )}

                    {action === 'PICKUP' && (
                      <button
                        type="button"
                        onClick={() => void runAction(order, 'PICKUP')}
                        disabled={busy}
                        className={primaryActionClass}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <PackageCheck className="size-3.5" aria-hidden="true" />
                        )}
                        Recoger pedido
                      </button>
                    )}

                    {action === 'DELIVER' && (
                      <button
                        type="button"
                        onClick={() => void runAction(order, 'DELIVER')}
                        disabled={busy}
                        className={successActionClass}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        )}
                        Marcar como entregado
                      </button>
                    )}

                    {client?.phone && action !== null && (
                      <a
                        href={`tel:${client.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Phone className="size-3.5" aria-hidden="true" />
                        Llamar al cliente
                      </a>
                    )}

                    {action === null && (
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        {order.status === 'DELIVERED'
                          ? `Entregado el ${formatOrderDate(order.deliveredAt)}`
                          : `Pedido ${order.status === 'REJECTED' ? 'rechazado' : 'cancelado'}`}
                      </p>
                    )}

                    <span className="ml-auto inline-flex items-center gap-2 text-[11px] text-slate-500">
                      Total
                      <span className="font-bold text-slate-900">
                        {formatCurrency(order.total)}
                      </span>
                    </span>
                  </>
                }
              >
                <OrderDetailBody order={order} showClient showHistory />
              </OrderCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
