import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  Search,
  Store,
  Tag,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { fetchBusinessCatalog } from '../lib/catalog-api'
import { cn } from '../lib/cn'
import { formatCurrency } from '../lib/format'
import { inputClass } from '../lib/styles'
import type {
  BusinessCatalogSummary,
  CategoryWithProducts,
  ProductSummary,
} from '../types/catalog'

export function StoreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const businessId = Number(id)

  const [business, setBusiness] = useState<BusinessCatalogSummary | null>(null)
  const [categories, setCategories] = useState<CategoryWithProducts[]>([])
  const [uncategorized, setUncategorized] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL')
  const [orderToast, setOrderToast] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId || isNaN(businessId)) {
      setError('Identificador de negocio no válido.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchBusinessCatalog(businessId)
      .then((data) => {
        if (!cancelled) {
          setBusiness(data.business)
          setCategories(data.categories)
          setUncategorized(data.uncategorized)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.message ??
              'Error al cargar el catálogo de la tienda.',
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
  }, [businessId])

  // Lista unificada de todos los productos
  const allProducts = useMemo(() => {
    const list: Array<ProductSummary & { categoryName?: string }> = []
    for (const cat of categories) {
      for (const prod of cat.products) {
        list.push({ ...prod, categoryName: cat.name })
      }
    }
    for (const prod of uncategorized) {
      list.push({ ...prod, categoryName: 'Varios' })
    }
    return list
  }, [categories, uncategorized])

  // Filtrado de productos por categoría y texto de búsqueda
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesCategory =
        selectedCategoryId === 'ALL' ||
        product.categoryId === selectedCategoryId ||
        (selectedCategoryId === -1 && !product.categoryId)

      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.description?.toLowerCase().includes(query) ?? false)

      return matchesCategory && matchesSearch
    })
  }, [allProducts, selectedCategoryId, searchQuery])

  function handleSelectProduct(product: ProductSummary) {
    setOrderToast(`"${product.name}" seleccionado`)
    setTimeout(() => {
      setOrderToast(null)
    }, 3000)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-16">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">{error ?? 'Negocio no encontrado'}</p>
          <Link
            to="/catalogo"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            <ArrowLeft className="size-4" />
            Volver a tiendas
          </Link>
        </div>
      </div>
    )
  }

  const isRestaurant = business.businessType === 'RESTAURANT'

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      {/* Botón Volver */}
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
      >
        <ArrowLeft className="size-4" />
        Volver a todas las tiendas
      </Link>

      {/* Banner / Ficha de la Tienda */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.businessName}
                className="size-24 shrink-0 rounded-2xl border-2 border-white/20 object-cover shadow-lg"
              />
            ) : (
              <div
                className={cn(
                  'grid size-24 shrink-0 place-items-center rounded-2xl font-black text-white shadow-lg text-2xl',
                  isRestaurant
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600',
                )}
              >
                {business.businessName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider',
                    isRestaurant
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
                  )}
                >
                  {isRestaurant ? (
                    <UtensilsCrossed className="size-3.5" />
                  ) : (
                    <Building2 className="size-3.5" />
                  )}
                  {isRestaurant ? 'Restaurante' : 'Tienda / Supermercado'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="size-3.5" />
                  Abierto y verificado
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {business.businessName}
              </h1>

              {business.description && (
                <p className="max-w-2xl text-sm text-slate-300 leading-relaxed">
                  {business.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Datos Rápidos de la Tienda */}
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 text-xs text-slate-700 sm:gap-8">
          <div className="flex items-center gap-2 font-medium">
            <MapPin className="size-4 text-orange-600 shrink-0" />
            <span>
              {business.city} • {business.address}
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <Truck className="size-4 text-orange-600 shrink-0" />
            <span>
              {Number(business.deliveryFee) === 0
                ? 'Envío gratuito'
                : `Domicilio: ${formatCurrency(business.deliveryFee)}`}
            </span>
          </div>

          {business.contactPhone && (
            <div className="flex items-center gap-2 font-medium">
              <Phone className="size-4 text-orange-600 shrink-0" />
              <span>{business.contactPhone}</span>
            </div>
          )}

          <div className="flex items-center gap-2 font-medium">
            <Package className="size-4 text-orange-600 shrink-0" />
            <span>{allProducts.length} productos en el menú</span>
          </div>
        </div>
      </div>

      {/* Notificación de producto seleccionado */}
      {orderToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <span>{orderToast}</span>
        </div>
      )}

      {/* Buscador y Filtro por Categorías */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Productos disponibles
          </h2>

          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en este negocio..."
              className={cn(inputClass, 'pl-10')}
            />
          </div>
        </div>

        {/* Pestañas de categorías */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('ALL')}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition',
              selectedCategoryId === 'ALL'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
            )}
          >
            Todos ({allProducts.length})
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategoryId(category.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition',
                selectedCategoryId === category.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
              )}
            >
              {category.name} ({category.products.length})
            </button>
          ))}

          {uncategorized.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategoryId(-1)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition',
                selectedCategoryId === -1
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
              )}
            >
              Otros ({uncategorized.length})
            </button>
          )}
        </div>
      </div>

      {/* Listado de Productos */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-orange-50 text-orange-600 mb-3">
            <Tag className="size-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No encontramos productos
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            No hay productos que coincidan con la búsqueda o categoría elegida.
          </p>
          {(searchQuery || selectedCategoryId !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategoryId('ALL')
              }}
              className="mt-4 text-xs font-bold text-orange-600 hover:underline"
            >
              Mostrar todos los productos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const hasStock = product.stock === null || product.stock > 0

            return (
              <div
                key={product.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-orange-300 hover:shadow-md"
              >
                <div>
                  {/* Foto del Producto o Ilustración */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="size-full object-cover transition duration-300 group-hover:scale-105"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-slate-300">
                        <Store className="size-12" />
                      </div>
                    )}

                    {product.categoryName && (
                      <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm backdrop-blur">
                        {product.categoryName}
                      </span>
                    )}
                  </div>

                  {/* Datos del Producto */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-orange-600">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="line-clamp-2 text-xs text-slate-500 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Precio, Disponibilidad y Botón de Acción */}
                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Precio
                      </p>
                      <p className="text-base font-black text-slate-900">
                        {formatCurrency(product.price)}
                      </p>
                    </div>

                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                        hasStock
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                      )}
                    >
                      {product.stock === null
                        ? 'Disponible'
                        : product.stock > 0
                          ? `${product.stock} disp.`
                          : 'Agotado'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!hasStock}
                    onClick={() => handleSelectProduct(product)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{hasStock ? 'Seleccionar producto' : 'Agotado'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

