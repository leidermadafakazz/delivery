import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Bike,
  Building2,
  MapPin,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { RoleBadge } from '../components/ui/RoleBadge'
import { StatusBadge } from '../components/ui/StatusBadge'
import { fetchBusinesses } from '../lib/catalog-api'
import { cn } from '../lib/cn'
import { formatCurrency } from '../lib/format'
import { getPrimaryRole, ROLE_LABELS } from '../lib/roles'
import { inputClass } from '../lib/styles'
import { useAuthStore } from '../store/auth.store'
import type { ApprovalStatus } from '../types/auth'
import type { BusinessCatalogSummary } from '../types/catalog'

interface SectionCard {
  title: string
  description: string
  to: string
  icon: LucideIcon
  statusText: string
  isAvailable?: boolean
}

const STATUS_MESSAGES: Record<ApprovalStatus, string> = {
  PENDING: 'Tu solicitud está en revisión por el administrador.',
  APPROVED: 'Tu perfil está aprobado y activo.',
  REJECTED: 'Tu solicitud fue rechazada. Necesitas corregirla para reenviarla.',
}

function ProfileStatusCard({
  kind,
  name,
  status,
}: {
  kind: 'business' | 'delivery'
  name: string
  status: ApprovalStatus
}) {
  const Icon = kind === 'business' ? Building2 : Bike
  const label = kind === 'business' ? 'Empresa' : 'Domiciliario'

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {label}: {name}
          </p>
          <p className="text-xs text-slate-500">{STATUS_MESSAGES[status]}</p>
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  )
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [featuredStores, setFeaturedStores] = useState<BusinessCatalogSummary[]>([])
  const [loadingStores, setLoadingStores] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchBusinesses({ limit: 4 })
      .then((data) => {
        if (!cancelled) {
          setFeaturedStores(data.businesses)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoadingStores(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!user) {
    return null
  }

  const primaryRole = getPrimaryRole(user.roles)
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  const sections: SectionCard[] = [
    {
      title: 'Catálogo de tiendas',
      description: 'Explora restaurantes, tiendas y pide tus productos.',
      to: '/catalogo',
      icon: Store,
      statusText: 'Disponible',
      isAvailable: true,
    },
  ]

  if (user.roles.includes('CLIENT')) {
    sections.push({
      title: 'Mis pedidos',
      description: 'Consulta el estado y el historial de tus pedidos.',
      to: '/pedidos',
      icon: ReceiptText,
      statusText: 'Fase 3',
    })
  }

  if (user.roles.includes('BUSINESS')) {
    sections.push({
      title: 'Mi empresa',
      description: 'Gestiona tu catálogo y los pedidos que recibes.',
      to: '/empresa',
      icon: Building2,
      statusText: 'Fase 4',
    })
  }

  if (user.roles.includes('DELIVERY')) {
    sections.push({
      title: 'Domicilios',
      description: 'Toma pedidos listos y registra tus entregas.',
      to: '/domiciliario',
      icon: Bike,
      statusText: 'Fase 4',
    })
  }

  if (user.roles.includes('ADMIN')) {
    sections.push({
      title: 'Administración',
      description: 'Aprueba solicitudes y supervisa la operación.',
      to: '/admin',
      icon: ShieldCheck,
      statusText: 'Fase 5',
    })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate('/catalogo')
    }
  }

  const isClient = user.roles.includes('CLIENT')

  return (
    <div className="space-y-8">
      {/* Banner Principal de Bienvenida */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-10 sm:py-10">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
              Panel principal
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Hola, {firstName} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Bienvenido a FastDelivery. Encuentra tus tiendas favoritas y
              disfruta de domicilios rápidos.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-orange-500 text-sm font-extrabold text-white">
              {initials}
            </span>
            <div>
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-slate-300">{ROLE_LABELS[primaryRole]}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Buscador de Tiendas Rápido para Clientes */}
      {isClient && (
        <section className="space-y-4 rounded-3xl border border-orange-200/60 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 shadow-sm sm:p-8">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-700">
              <Store className="size-3.5" />
              Búsqueda de tiendas y restaurantes
            </div>
            <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
              ¿Qué se te antoja pedir hoy?
            </h2>
            <p className="text-sm text-slate-600">
              Escribe el nombre de un restaurante, tienda o producto para
              encontrarlo de inmediato.
            </p>
          </div>

          {/* Formulario de Búsqueda Rápida */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busca tiendas, hamburguesas, pizza, abarrotes..."
                className={cn(inputClass, 'bg-white pl-10 pr-4 shadow-sm')}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 shrink-0"
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">Buscar tiendas</span>
            </button>
          </form>

          {/* Accesos directos / filtros rápidos */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-semibold text-slate-500">Filtrar por:</span>
            <button
              type="button"
              onClick={() => navigate('/catalogo?type=RESTAURANT')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold text-orange-700 border border-orange-200 shadow-sm hover:bg-orange-50 transition"
            >
              <UtensilsCrossed className="size-3.5" />
              Restaurantes
            </button>
            <button
              type="button"
              onClick={() => navigate('/catalogo?type=STORE')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold text-blue-700 border border-blue-200 shadow-sm hover:bg-blue-50 transition"
            >
              <Building2 className="size-3.5" />
              Tiendas y Supermercados
            </button>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              Ver catálogo completo
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </section>
      )}

      {/* Tiendas Destacadas Disponibles */}
      {isClient && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tiendas y restaurantes disponibles
              </h2>
              <p className="text-xs text-slate-500">
                Comercios verificados listos para recibir tu pedido.
              </p>
            </div>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
            >
              Ver todas ({featuredStores.length})
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {loadingStores ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-2xl bg-slate-200"
                />
              ))}
            </div>
          ) : featuredStores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No hay comercios aprobados disponibles en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredStores.map((store) => {
                const isRestaurant = store.businessType === 'RESTAURANT'
                return (
                  <Link
                    key={store.id}
                    to={`/catalogo/${store.id}`}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        {store.logoUrl ? (
                          <img
                            src={store.logoUrl}
                            alt={store.businessName}
                            className="size-12 shrink-0 rounded-xl object-cover border border-slate-100 shadow-sm"
                          />
                        ) : (
                          <div
                            className={cn(
                              'grid size-12 shrink-0 place-items-center rounded-xl font-bold text-white shadow-sm text-sm',
                              isRestaurant
                                ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                                : 'bg-gradient-to-br from-blue-600 to-indigo-600',
                            )}
                          >
                            {store.businessName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'inline-block text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5',
                              isRestaurant
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-blue-50 text-blue-700',
                            )}
                          >
                            {isRestaurant ? 'Restaurante' : 'Tienda'}
                          </span>
                          <h3 className="truncate font-bold text-slate-900 text-sm group-hover:text-orange-600">
                            {store.businessName}
                          </h3>
                        </div>
                      </div>

                      <p className="flex items-center gap-1 text-xs text-slate-500 truncate">
                        <MapPin className="size-3 shrink-0 text-slate-400" />
                        <span>{store.city}</span>
                      </p>

                      <div className="flex items-center justify-between text-xs font-medium text-slate-600 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Truck className="size-3 text-slate-400" />
                          {Number(store.deliveryFee) === 0
                            ? 'Gratis'
                            : formatCurrency(store.deliveryFee)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Package className="size-3" />
                          {store.productCount} prods.
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2">
                      <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-orange-50 py-1.5 text-xs font-bold text-orange-700 group-hover:bg-orange-500 group-hover:text-white transition">
                        Ver menú
                        <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Estados de Solicitudes si aplica */}
      {(user.businessProfile || user.deliveryProfile) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Estado de tus solicitudes
          </h2>
          {user.businessProfile && (
            <ProfileStatusCard
              kind="business"
              name={user.businessProfile.businessName}
              status={user.businessProfile.status}
            />
          )}
          {user.deliveryProfile && (
            <ProfileStatusCard
              kind="delivery"
              name={`Documento ${user.deliveryProfile.documentNumber}`}
              status={user.deliveryProfile.status}
            />
          )}
        </section>
      )}

      {/* Módulos de la Aplicación y Cuenta */}
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Secciones y Módulos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Accede a las diferentes áreas habilitadas según tus roles.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sections.map((section) => (
              <Link
                key={section.title}
                to={section.to}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                    <section.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      section.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {section.statusText}
                  </span>
                </div>
                <span className="mt-4 text-base font-bold text-slate-900">
                  {section.title}
                </span>
                <span className="mt-1 text-sm text-slate-500">
                  {section.description}
                </span>
                <span
                  className={cn(
                    'mt-4 inline-flex items-center gap-1 text-xs font-semibold',
                    section.isAvailable ? 'text-orange-600' : 'text-slate-400',
                  )}
                >
                  {section.isAvailable ? 'Explorar ahora' : 'Próxima fase'}
                  <ArrowRight
                    className="size-3.5 transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="text-lg font-bold text-slate-900">Tu cuenta</h2>
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nombre
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Correo
                </dt>
                <dd className="mt-0.5 break-all font-medium text-slate-900">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Teléfono
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {user.phone ?? 'Sin teléfono registrado'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Roles
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {user.roles.map((role) => (
                    <RoleBadge key={role} role={role} />
                  ))}
                </dd>
              </div>
            </dl>

            <Link
              to="/perfil"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              Ver mi perfil
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
