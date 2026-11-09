import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProfileChangeCard } from '../components/admin/ProfileChangeCard'
import { RejectRequestModal } from '../components/admin/RejectRequestModal'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { getErrorMessage } from '../lib/api'
import {
  approveProfileChange,
  fetchAdminProfileChanges,
  rejectProfileChange,
} from '../lib/profile-api'
import { cn } from '../lib/cn'
import type { ApprovalStatus } from '../types/applications'
import type { ProfileChangeRequest } from '../types/profile-change'

type StatusFilter = ApprovalStatus | 'ALL'

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'APPROVED', label: 'Aprobados' },
  { id: 'REJECTED', label: 'Rechazados' },
  { id: 'ALL', label: 'Todos' },
]

const PAGE_SIZE = 8

export function AdminProfileChangesPage() {
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
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
  const [rejectTarget, setRejectTarget] = useState<ProfileChangeRequest | null>(null)

  const load = useCallback(
    async (options: { page?: number; append?: boolean } = {}) => {
      const targetPage = options.page ?? 1

      if (options.append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await fetchAdminProfileChanges({
          status: statusFilter,
          page: targetPage,
          limit: PAGE_SIZE,
        })

        setRequests((current) =>
          options.append ? [...current, ...data.requests] : data.requests,
        )
        setPage(data.pagination.page)
        setTotal(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
        setError(null)
      } catch (err) {
        setError(
          getErrorMessage(err, 'No se pudieron cargar los cambios de perfil.'),
        )
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [statusFilter],
  )

  useEffect(() => {
    void load()
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function handleApprove(request: ProfileChangeRequest) {
    setBusyId(request.id)
    setActionError(null)
    setActionSuccess(null)

    try {
      const updated = await approveProfileChange(request.id)
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setActionSuccess(
        `Cambio aprobado: ${updated.user.name} ya tiene los nuevos datos aplicados.`,
      )
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'No se pudo aprobar el cambio de perfil.'),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) {
      return
    }

    const updated = await rejectProfileChange(rejectTarget.id, reason)

    setRequests((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )
    setRejectTarget(null)
    setActionError(null)
    setActionSuccess('Cambio rechazado. El usuario podrá corregirlo y reenviarlo.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-orange-600"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Volver a administración
          </Link>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Cambios de perfil
          </h1>
          <p className="text-sm text-slate-500">
            Aprueba o rechaza los cambios de nombre, correo y teléfono que
            solicitan los usuarios.
          </p>
        </div>

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

      {error && <ErrorAlert message={error} />}
      {actionError && <ErrorAlert message={actionError} />}

      {actionSuccess && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{actionSuccess}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              'rounded-xl px-3.5 py-2 text-xs font-semibold transition',
              statusFilter === tab.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-2xl bg-slate-200/70"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            statusFilter === 'PENDING'
              ? 'No hay cambios de perfil pendientes'
              : 'No hay solicitudes en esta vista'
          }
          description={
            statusFilter === 'PENDING'
              ? 'Cuando un usuario pida cambiar sus datos aparecerá aquí y en la campana de notificaciones.'
              : 'Prueba con otro estado.'
          }
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <ProfileChangeCard
              key={request.id}
              request={request}
              busy={busyId === request.id}
              onApprove={() => void handleApprove(request)}
              onReject={() => setRejectTarget(request)}
            />
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
          <p>
            Mostrando {requests.length} de {total} · página {page} de {totalPages}
          </p>
          {page < totalPages && (
            <button
              type="button"
              onClick={() => void load({ page: page + 1, append: true })}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingMore && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              Cargar más
            </button>
          )}
        </div>
      )}

      <RejectRequestModal
        open={rejectTarget !== null}
        title="Rechazar cambio de perfil"
        description={
          rejectTarget ? `${rejectTarget.user.name} · ${rejectTarget.user.email}` : undefined
        }
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </div>
  )
}
