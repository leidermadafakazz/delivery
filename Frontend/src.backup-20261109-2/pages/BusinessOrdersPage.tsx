import { useCallback, useEffect, useState } from 'react'
import {
  Bike,
  ChefHat,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock3,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  Store,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { OrderCard } from '../components/orders/OrderCard'
import { OrderDetailBody } from '../components/orders/OrderDetailBody'
import {
  dangerActionClass,
  neutralActionClass,
  primaryActionClass,
  successActionClass,
} from '../components/orders/action-styles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { getErrorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCurrency } from '../lib/format'
import { businessActionFor, formatOrderDate } from '../lib/order-status'
import {
  acceptBusinessOrder,
  fetchBusinessOrder,
  fetchBusinessOrders,
  fetchMyBusiness,
  rejectBusinessOrder,
  updateBusinessOrderStatus,
} from '../lib/orders-api'
import { inputClass, secondaryButtonClass } from '../lib/styles'
import type { BusinessProfile, Order } from '../types/orders'

type Tab = 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'ON_WAY' | 'CLOSED'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'PENDING', label: 'Por aceptar' },
  { id: 'PREPARING', label: 'En preparación' },
  { id: 'READY', label: 'Listos' },
  { id: 'ON_WAY', label: 'En camino' },
  { id: 'CLOSED', label: 'Finalizados' },
]

function matchesTab(order: Order, tab: Tab): boolean {
  switch (tab) {
    case 'PENDING':
      return order.status === 'PENDING'
    case 'PREPARING':
      return order.status === 'ACCEPTED' || order.status === 'PREPARING'
    case 'READY':
      return order.status === 'READY'
    case 'ON_WAY':
      return order.status === 'ON_THE_WAY'
    case 'CLOSED':
      return (
        order.status === 'DELIVERED' ||
        order.status === 'REJECTED' ||
        order.status === 'CANCELLED'
      )
    default:
      return true
  }
}

export function BusinessOrdersPage() {
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [businessError, setBusinessError] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('ALL')
  const [search, setSearch] = useState('')

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, Order>>({})
  const [detailLoading, setDetailLoading] = useState<number | null>(null)

  const [actingId, setActingId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectError, setRejectError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [profile, data] = await Promise.all([
        fetchMyBusiness().catch((err: unknown) => {
          setBusinessError(
            getErrorMessage(err, 'No se pudo cargar la información de tu empresa.'),
          )
          return null
        }),
        fetchBusinessOrders({ limit: 100 }),
      ])

      if (profile) {
        setBusiness(profile)
      }

      setOrders(data.orders)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los pedidos.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(true), 15000)

    return () => window.clearInterval(interval)
  }, [load])

  function replaceOrder(updated: Order) {
    setOrders((current) =>
      current.map((order) => (order.id === updated.id ? updated : order)),
    )
    setDetails((current) =>
      current[updated.id] ? { ...current, [updated.id]: updated } : current,
    )
  }

  async function toggleExpand(order: Order) {
    if (expandedId === order.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(order.id)

    if (!details[order.id]) {
      setDetailLoading(order.id)
      try {
        const data = await fetchBusinessOrder(order.id)
        setDetails((current) => ({ ...current, [order.id]: data.order }))
      } catch (err) {
        setActionError(
          getErrorMessage(err, 'No se pudo cargar el detalle del pedido.'),
        )
      } finally {
        setDetailLoading(null)
      }
    }
  }

  async function runAction(
    order: Order,
    action: 'ACCEPT' | 'PREPARING' | 'READY',
  ) {
    setActingId(order.id)
    setActionError(null)

    try {
      const data =
        action === 'ACCEPT'
          ? await acceptBusinessOrder(order.id)
          : await updateBusinessOrderStatus(order.id, action)

      replaceOrder(data.order)
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo actualizar el pedido.'))
    } finally {
      setActingId(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) {
      return
    }

    if (rejectReason.trim().length < 5) {
      setRejectError('Escribe un motivo de al menos 5 caracteres.')
      return
    }

    setRejecting(true)
    setRejectError(null)

    try {
      const data = await rejectBusinessOrder(
        rejectTarget.id,
        rejectReason.trim(),
      )
      replaceOrder(data.order)
      setRejectTarget(null)
      setRejectReason('')
    } catch (err) {
      setRejectError(getErrorMessage(err, 'No se pudo rechazar el pedido.'))
    } finally {
      setRejecting(false)
    }
  }

  const query = search.trim().toLowerCase()
  const visibleOrders = orders.filter((order) => {
    if (!matchesTab(order, tab)) {
      return false
    }

    if (!query) {
      return true
    }

    return (
      String(order.id).includes(query) ||
      order.address.toLowerCase().includes(query) ||
      order.city.toLowerCase().includes(query) ||
      (details[order.id]?.client?.name.toLowerCase().includes(query) ?? false)
    )
  })

  const stats = {
    pending: orders.filter((order) => order.status === 'PENDING').length,
    preparing: orders.filter(
      (order) => order.status === 'ACCEPTED' || order.status === 'PREPARING',
    ).length,
    ready: orders.filter((order) => order.status === 'READY').length,
    onTheWay: orders.filter((order) => order.status === 'ON_THE_WAY').length,
  }

  const isApproved = business?.status === 'APPROVED'

  if (!loading && business && !isApproved) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Mi empresa
          </h1>
          <p className="text-sm text-slate-500">{business.businessName}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Estado de la solicitud
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {business.status === 'PENDING'
                  ? 'Tu solicitud está en revisión. Podrás recibir pedidos cuando el administrador la apruebe.'
                  : 'Tu solicitud fue rechazada. Corrige los datos y vuelve a enviarla.'}
              </p>
              {business.rejectionReason && (
                <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {business.rejectionReason}
                </p>
              )}
            </div>
            <StatusBadge status={business.status} />
          </div>

          <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Dirección
              </dt>
              <dd className="text-slate-800">
                {business.address}, {business.city}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Domicilio
              </dt>
              <dd className="text-slate-800">
                {formatCurrency(business.deliveryFee)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">
              {business?.businessName ?? 'Mi empresa'}
            </h1>
            {business && <StatusBadge status={business.status} />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UtensilsCrossed className="size-3.5 text-slate-400" aria-hidden="true" />
              {business?.businessType === 'RESTAURANT'
                ? 'Restaurante'
                : 'Tienda / supermercado'}
            </span>
            {business && (
              <>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-slate-400" aria-hidden="true" />
                  {business.address}, {business.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="size-3.5 text-slate-400" aria-hidden="true" />
                  Domicilio {formatCurrency(business.deliveryFee)}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/empresa/catalogo" className={secondaryButtonClass}>
            <Store className="size-4" aria-hidden="true" />
            Gestionar catálogo
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
      </div>

      {businessError && !business && <ErrorAlert message={businessError} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Por aceptar"
          value={stats.pending}
          icon={ClipboardList}
          tone="amber"
          hint={stats.pending > 0 ? 'Revisa y responde' : 'Sin pedidos nuevos'}
        />
        <StatCard
          label="En preparación"
          value={stats.preparing}
          icon={ChefHat}
          tone="indigo"
        />
        <StatCard
          label="Listos"
          value={stats.ready}
          icon={PackageCheck}
          tone="emerald"
          hint={stats.ready > 0 ? 'Esperando domiciliario' : undefined}
        />
        <StatCard
          label="En camino"
          value={stats.onTheWay}
          icon={Bike}
          tone="orange"
        />
      </div>

      {actionError && <ErrorAlert message={actionError} />}
      {error && <ErrorAlert message={error} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map((item) => {
            const count = orders.filter((order) => matchesTab(order, item.id)).length
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition',
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

        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por pedido o dirección…"
            className={cn(inputClass, 'pl-10')}
          />
        </div>
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
          icon={tab === 'PENDING' ? CircleCheck : ClipboardList}
          title={
            tab === 'PENDING'
              ? 'No hay pedidos por aceptar'
              : 'No hay pedidos en esta sección'
          }
          description={
            tab === 'PENDING'
              ? 'Los pedidos nuevos aparecerán aquí automáticamente.'
              : 'Cuando recibas pedidos los verás aquí con sus acciones.'
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const detail = details[order.id]
            const action = businessActionFor(order.status)
            const busy = actingId === order.id
            const expanded = expandedId === order.id

            return (
              <OrderCard
                key={order.id}
                order={order}
                heading={`Pedido #${order.id}`}
                subheading={
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {detail?.client && (
                      <>
                        <span className="font-semibold text-slate-700">
                          {detail.client.name}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">
                          •
                        </span>
                      </>
                    )}
                    <span>
                      {order.address}, {order.city}
                    </span>
                    <span className="text-slate-400" aria-hidden="true">
                      •
                    </span>
                    <span>{formatOrderDate(order.createdAt)}</span>
                  </span>
                }
                expanded={expanded}
                onToggle={() => void toggleExpand(order)}
                actions={
                  <>
                    {order.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void runAction(order, 'ACCEPT')}
                          disabled={busy}
                          className={successActionClass}
                        >
                          {busy ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <CircleCheck className="size-3.5" aria-hidden="true" />
                          )}
                          Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTarget(order)
                            setRejectReason('')
                            setRejectError(null)
                          }}
                          disabled={busy}
                          className={dangerActionClass}
                        >
                          <CircleX className="size-3.5" aria-hidden="true" />
                          Rechazar
                        </button>
                      </>
                    )}

                    {order.status === 'ACCEPTED' && (
                      <button
                        type="button"
                        onClick={() => void runAction(order, 'PREPARING')}
                        disabled={busy}
                        className={primaryActionClass}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <ChefHat className="size-3.5" aria-hidden="true" />
                        )}
                        Iniciar preparación
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        type="button"
                        onClick={() => void runAction(order, 'READY')}
                        disabled={busy}
                        className={successActionClass}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <PackageCheck className="size-3.5" aria-hidden="true" />
                        )}
                        Marcar listo para entrega
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Truck className="size-3.5" aria-hidden="true" />
                        Listo: esperando que un domiciliario lo tome
                      </p>
                    )}

                    {order.status === 'ON_THE_WAY' && (
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700">
                        <Bike className="size-3.5" aria-hidden="true" />
                        En camino
                        {order.delivery ? ` con ${order.delivery.user.name}` : ''}
                      </p>
                    )}

                    {action === null &&
                      (order.status === 'DELIVERED' ||
                        order.status === 'REJECTED' ||
                        order.status === 'CANCELLED') && (
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          Pedido finalizado el{' '}
                          {formatOrderDate(
                            order.deliveredAt ??
                              order.rejectedAt ??
                              order.cancelledAt,
                          )}
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
                {detailLoading === order.id ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Cargando detalle…
                  </div>
                ) : detail ? (
                  <OrderDetailBody order={detail} showClient showHistory />
                ) : (
                  <p className="py-4 text-center text-xs text-slate-500">
                    No se pudo cargar el detalle.
                  </p>
                )}
              </OrderCard>
            )
          })}
        </div>
      )}

      <Modal
        open={rejectTarget !== null}
        title="Rechazar pedido"
        description={
          rejectTarget ? `Pedido #${rejectTarget.id}` : undefined
        }
        onClose={() => {
          if (!rejecting) {
            setRejectTarget(null)
          }
        }}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              disabled={rejecting}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => void handleReject()}
              disabled={rejecting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rejecting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Rechazar pedido
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            El cliente verá el motivo y el stock de los productos volverá a estar
            disponible.
          </p>
          <label
            htmlFor="reject-reason"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Motivo del rechazo
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Ej. No tenemos ingredientes, estamos cerrados…"
            className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
          {rejectError && <ErrorAlert message={rejectError} />}
        </div>
      </Modal>
    </div>
  )
}
