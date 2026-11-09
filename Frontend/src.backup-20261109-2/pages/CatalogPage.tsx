import { useEffect, useState, useTransition } from 'react'
import {
  ArrowRight,
  Building2,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Search,
  Store,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchBusinesses } from '../lib/catalog-api'
import { cn } from '../lib/cn'
import { formatCurrency } from '../lib/format'
import { inputClass } from '../lib/styles'
import type { BusinessCatalogSummary, BusinessType } from '../types/catalog'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const searchParam = searchParams.get('search') ?? ''
  const typeParam = (searchParams.get('type') ?? '') as BusinessType | ''
  const cityParam = searchParams.get('city') ?? ''

  const [searchInput, setSearchInput] = useState(searchParam)
  const [cityInput, setCityInput] = useState(cityParam)
  const [selectedType, setSelectedType] = useState<BusinessType | ''>(typeParam)

  const [businesses, setBusinesses] = useState<BusinessCatalogSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Sincronizar estado cuando la URL cambie
  useEffect(() => {
    setSearchInput(searchParam)
    setSelectedType(typeParam)
    setCityInput(cityParam)
  }, [searchParam, typeParam, cityParam])

  // Cargar tiendas desde el backend
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchBusinesses({
      search: searchParam || undefined,
      businessType: typeParam || undefined,
      city: cityParam || undefined,
      limit: 50,
    })
      .then((data) => {
        if (!cancelled) {
          setBusinesses(data.businesses)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.message ??
              'Error al cargar el catálogo de tiendas.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [searchParam, typeParam, cityParam])

  function handleFilterChange(
    newSearch: string,
    newType: BusinessType | '',
    newCity: string,
  ) {
    const params = new URLSearchParams()
    if (newSearch.trim()) params.set('search', newSearch.trim())
    if (newType) params.set('type', newType)
    if (newCity.trim()) params.set('city', newCity.trim())

    startTransition(() => {
      setSearchParams(params)
    })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleFilterChange(searchInput, selectedType, cityInput)
  }

  function handleTypeSelect(type: BusinessType | '') {
    setSelectedType(type)
    handleFilterChange(searchInput, type, cityInput)
  }

  function handleResetFilters() {
    setSearchInput('')
    setSelectedType('')
    setCityInput('')
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters = Boolean(
    searchParam || typeParam || cityParam,
  )

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Encabezado Principal */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-6 text-white shadow-xl shadow-orange-500/15 sm:p-10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Store className="size-3.5" />
            Catálogo Oficial de Comercios
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
            Encuentra tu tienda o restaurante favorito
          </h1>
          <p className="text-sm text-orange-100 sm:text-base">
            Explora comercios aprobados, revisa su menú y productos en tiempo
            real y recibe tu pedido en la puerta de tu casa.
          </p>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-20 size-60 rounded-full bg-orange-700/20 blur-xl" />
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar tienda, restaurante, hamburguesas, pizza..."
              className={cn(inputClass, 'pl-10 pr-9')}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  handleFilterChange('', selectedType, cityInput)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filtro de Ciudad */}
          <div className="relative sm:w-56">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Ciudad (ej. Bogotá)"
              className={cn(inputClass, 'pl-10 pr-9')}
            />
            {cityInput && (
              <button
                type="button"
                onClick={() => {
                  setCityInput('')
                  handleFilterChange(searchInput, selectedType, '')
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200"
          >
            <Search className="size-4" />
            Buscar
          </button>
        </form>

        {/* Chips de Categorías / Tipo */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tipo:
            </span>
            <button
              type="button"
              onClick={() => handleTypeSelect('')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                selectedType === ''
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
              )}
            >
              <Store className="size-3.5" />
              Todos los negocios
            </button>
            <button
              type="button"
              onClick={() => handleTypeSelect('RESTAURANT')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                selectedType === 'RESTAURANT'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
              )}
            >
              <UtensilsCrossed className="size-3.5" />
              Restaurantes
            </button>
            <button
              type="button"
              onClick={() => handleTypeSelect('STORE')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                selectedType === 'STORE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
              )}
            >
              <Building2 className="size-3.5" />
              Tiendas y Supermercados
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-orange-600"
            >
              <RotateCcw className="size-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Conteo de Resultados */}
      {!loading && !error && (
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>
            {businesses.length === 1
              ? '1 negocio disponible'
              : `${businesses.length} negocios disponibles`}
          </span>
          {hasActiveFilters && (
            <span className="text-orange-600">Filtros aplicados</span>
          )}
        </div>
      )}

      {/* Estados: Loading, Error o Listado */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-2xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-10 rounded bg-slate-100" />
              <div className="h-4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => handleFilterChange(searchInput, selectedType, cityInput)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-orange-50 text-orange-600 mb-4">
            <Store className="size-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            No se encontraron tiendas
          </h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            No encontramos comercios que coincidan con tus criterios de búsqueda.
            Prueba buscando con otro término o limpia los filtros.
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <RotateCcw className="size-4" />
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        /* Cuadrícula de Tiendas */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => {
            const isRestaurant = business.businessType === 'RESTAURANT'
            const initials = business.businessName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join('')

            return (
              <div
                key={business.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10"
              >
                <div className="p-5 space-y-4">
                  {/* Cabecera de la Tarjeta */}
                  <div className="flex items-start gap-3.5">
                    {business.logoUrl ? (
                      <img
                        src={business.logoUrl}
                        alt={business.businessName}
                        className="size-14 shrink-0 rounded-2xl border border-slate-100 object-cover shadow-sm"
                        onError={(e) => {
                          // Si falla la imagen, ocultarla
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div
                        className={cn(
                          'grid size-14 shrink-0 place-items-center rounded-2xl font-black text-white shadow-sm',
                          isRestaurant
                            ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                            : 'bg-gradient-to-br from-blue-600 to-indigo-600',
                        )}
                      >
                        <span className="text-base tracking-wider">
                          {initials || 'FD'}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            isRestaurant
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-blue-50 text-blue-700',
                          )}
                        >
                          {isRestaurant ? (
                            <UtensilsCrossed className="size-3" />
                          ) : (
                            <Building2 className="size-3" />
                          )}
                          {isRestaurant ? 'Restaurante' : 'Tienda'}
                        </span>
                      </div>
                      <h2 className="mt-1 truncate text-base font-bold text-slate-900 group-hover:text-orange-600">
                        {business.businessName}
                      </h2>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="size-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {business.city}
                          {business.address ? ` • ${business.address}` : ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Descripción */}
                  {business.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {business.description}
                    </p>
                  )}

                  {/* Insignias de Info: Domicilio y Productos */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                      <Truck className="size-3.5 text-slate-500" />
                      <span>
                        {Number(business.deliveryFee) === 0
                          ? 'Envío gratis'
                          : `Envío ${formatCurrency(business.deliveryFee)}`}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                      <Package className="size-3.5 text-slate-500" />
                      <span>
                        {business.productCount === 0
                          ? 'Sin productos aún'
                          : `${business.productCount} productos`}
                      </span>
                    </div>

                    {business.contactPhone && (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                        <Phone className="size-3.5 text-slate-500" />
                        <span>{business.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pie de Tarjeta con Botón de Acción */}
                <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                  <Link
                    to={`/catalogo/${business.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-sm border border-slate-200 transition hover:bg-orange-500 hover:border-orange-500 hover:text-white group-hover:shadow"
                  >
                    <span>Ver menú y productos</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

