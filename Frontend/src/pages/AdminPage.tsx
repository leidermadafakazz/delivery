import { useCallback, useEffect, useState } from 'react'
import {
  Bike,
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { BusinessRequestCard, DeliveryRequestCard } from '../components/admin/RequestCard'
import { RejectRequestModal } from '../components/admin/RejectRequestModal'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { StatCard } from '../components/ui/StatCard'
import { getErrorMessage } from '../lib/api'
import {
  approveBusinessApplication,
  approveDeliveryApplication,
  fetchAdminDashboard,
  fetchAdminRequests,
  rejectBusinessApplication,
  rejectDeliveryApplication,
} from '../lib/applications-api'
import { cn } from '../lib/cn'
import type {
  AdminDashboardResponse,
  ApprovalStatus,
  BusinessApplication,
  DeliveryApplication,
} from '../types/applications'

type RequestKind = 'business' | 'delivery'
type StatusFilter = ApprovalStatus | 'ALL'

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'APPROVED', label: 'Aprobadas' },
  { id: 'REJECTED', label: 'Rechazadas' },
  { id: 'ALL', label: 'Todas' },
]

const PAGE_SIZE = 8

export function AdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null)
  const [kind, setKind] = useState<RequestKind>('business')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [items, setItems] = useState<Array<BusinessApplication | DeliveryApplication>>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [rejectTarget, setRejectTarget] = useState<{
    kind: RequestKind
    id: number
    name: string
  } | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchAdminDashboard()
      setDashboard(data)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el panel de administración.'))
    }
  }, [])

  const loadRequests = useCallback(
    async (options: { page?: number; append?: boolean } = {}) => {
      const targetPage = options.page ?? 1

      if (options.append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await fetchAdminRequests({
          type: kind,
          status: statusFilter,
          page: targetPage,
          limit: PAGE_SIZE,
        })

        const list = kind === 'business' ? data.businesses : data.deliveries

        setItems((current) => (options.append ? [...current, ...list] : list))
        setPage(data.pagination.page)
        setTotal(
          kind === 'business'
            ? data.pagination.businesses.total
            : data.pagination.deliveries.total,
        )
        setTotalPages(
          kind === 'business'
            ? data.pagination.businesses.totalPages
            : data.pagination.deliveries.totalPages,
        )
        setError(null)
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudieron cargar las solicitudes.'))
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [kind, statusFilter],
  )

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  useEffect(() => {
    const interval = window.setInterval(() => void loadDashboard(), 20000)

    return () => window.clearInterval(interval)
  }, [loadDashboard])

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([loadDashboard(), loadRequests()])
    setRefreshing(false)
  }

  async function updateItem(
    targetKind: RequestKind,
    id: number,
    updated: BusinessApplication | DeliveryApplication,
  ) {
    if (targetKind !== kind) {
      return
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? updated : item)),
    )
  }

  async function handleApprove(targetKind: RequestKind, id: number) {
    setBusyId(id)
    setActionError(null)
    setActionSuccess(null)

    try {
      const updated =
        targetKind === 'business'
          ? await approveBusinessApplication(id)
          : await approveDeliveryApplication(id)

      await updateItem(targetKind, id, updated)
      setActionSuccess(
        `Solicitud aprobada. El usuario ya tiene el rol de ${
          targetKind === 'business' ? 'empresa' : 'domiciliario'
        } y recibirá acceso a su panel.`,
      )
      await loadDashboard()
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'No se pudo aprobar la solicitud.'),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) {
      return
    }

    const updated =
      rejectTarget.kind === 'business'
        ? await rejectBusinessApplication(rejectTarget.id, reason)
        : await rejectDeliveryApplication(rejectTarget.id, reason)

    await updateItem(rejectTarget.kind, rejectTarget.id, updated)
    setRejectTarget(null)
    setActionError(null)
    setActionSuccess('Solicitud rechazada. El solicitante podrá corregir y reenviar.')
    await loadDashboard()
  }

  const pendingBusinesses = dashboard?.stats.businesses.PENDING ?? 0
  const pendingDeliveries = dashboard?.stats.deliveries.PENDING ?? 0
  const pendingProfileChanges = dashboard?.stats.profileChanges.PENDING ?? 0
  const totalPending =
    pendingBusinesses + pendingDeliveries + pendingProfileChanges

  const shownItems = items as Array<BusinessApplication | DeliveryApplication>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Administración
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Admin
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Revisa las solicitudes de empresa y domiciliario, y dale paso a quien
            cumpla los requisitos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/perfiles"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <UserRound className="size-3.5" aria-hidden="true" />
            Cambios de perfil
            {pendingProfileChanges > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingProfileChanges}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => void handleRefresh()}
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
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pendientes"
          value={totalPending}
          icon={ClipboardList}
          tone="amber"
          hint={`${pendingBusinesses} emp. · ${pendingDeliveries} dom. · ${pendingProfileChanges} perf.`}
        />
        <StatCard
          label="Empresas activas"
          value={dashboard?.stats.businesses.APPROVED ?? 0}
          icon={Building2}
          tone="emerald"
          hint={`${dashboard?.stats.businesses.total ?? 0} solicitudes en total`}
        />
        <StatCard
          label="Domiciliarios activos"
          value={dashboard?.stats.deliveries.APPROVED ?? 0}
          icon={Bike}
          tone="sky"
          hint={`${dashboard?.stats.deliveries.total ?? 0} solicitudes en total`}
        />
        <StatCard
          label="Usuarios"
          value={dashboard?.stats.users ?? 0}
          icon={Users}
          tone="indigo"
          hint={`${dashboard?.stats.orders.total ?? 0} pedidos registrados`}
        />
      </div>

      {error && <ErrorAlert message={error} />}
      {actionError && <ErrorAlert message={actionError} />}

      {actionSuccess && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{actionSuccess}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              setKind('business')
              setPage(1)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition',
              kind === 'business'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Building2 className="size-3.5" aria-hidden="true" />
            Empresas
            {pendingBusinesses > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                {pendingBusinesses}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setKind('delivery')
              setPage(1)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition',
              kind === 'delivery'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Bike className="size-3.5" aria-hidden="true" />
            Domiciliarios
            {pendingDeliveries > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                {pendingDeliveries}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-semibold transition',
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl bg-slate-200/70"
            />
          ))}
        </div>
      ) : shownItems.length === 0 ? (
        <EmptyState
          icon={kind === 'business' ? Building2 : Bike}
          title={
            statusFilter === 'PENDING'
              ? 'No hay solicitudes pendientes'
              : 'No hay solicitudes en esta vista'
          }
          description={
            statusFilter === 'PENDING'
              ? 'Cuando un usuario solicite ser empresa o domiciliario aparecerá aquí y sonará la campana de notificaciones.'
              : 'Prueba con otro estado o cambia entre empresas y domiciliarios.'
          }
        />
      ) : (
        <div className="space-y-3">
          {shownItems.map((application) =>
            kind === 'business' ? (
              <BusinessRequestCard
                key={`business-${application.id}`}
                application={application as BusinessApplication}
                busy={busyId === application.id}
                onApprove={() => void handleApprove('business', application.id)}
                onReject={() =>
                  setRejectTarget({
                    kind: 'business',
                    id: application.id,
                    name: (application as BusinessApplication).businessName,
                  })
                }
              />
            ) : (
              <DeliveryRequestCard
                key={`delivery-${application.id}`}
                application={application as DeliveryApplication}
                busy={busyId === application.id}
                onApprove={() => void handleApprove('delivery', application.id)}
                onReject={() =>
                  setRejectTarget({
                    kind: 'delivery',
                    id: application.id,
                    name: `Documento ${
                      (application as DeliveryApplication).documentNumber
                    }`,
                  })
                }
              />
            ),
          )}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
          <p>
            Mostrando {shownItems.length} de {total} solicitude
            {total === 1 ? '' : 's'} · página {page} de {totalPages}
          </p>
          {page < totalPages && (
            <button
              type="button"
              onClick={() => void loadRequests({ page: page + 1, append: true })}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingMore && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              Cargar más solicitudes
            </button>
          )}
        </div>
      )}

      <RejectRequestModal
        open={rejectTarget !== null}
        title="Rechazar solicitud"
        description={
          rejectTarget
            ? `${rejectTarget.name} · ${
                rejectTarget.kind === 'business' ? 'Empresa' : 'Domiciliario'
              }`
            : undefined
        }
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </div>
  )
}
