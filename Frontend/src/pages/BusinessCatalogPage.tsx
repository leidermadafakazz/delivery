import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import {
  ArrowLeft,
  CircleAlert,
  FolderTree,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Store,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { getErrorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCurrency } from '../lib/format'
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  fetchMyBusiness,
  fetchMyCategories,
  fetchMyProducts,
  restoreProduct,
  setProductAvailability,
  updateCategory,
  updateProduct,
} from '../lib/orders-api'
import { inputClass, labelClass, secondaryButtonClass } from '../lib/styles'
import type {
  ApprovalStatus,
  BusinessProduct,
  ProductCategory,
  ProductPayload,
} from '../types/orders'

const solidButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60'

interface ProductFormState {
  name: string
  description: string
  categoryId: string
  price: string
  stock: string
  sku: string
  imageUrl: string
  isAvailable: boolean
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  description: '',
  categoryId: '',
  price: '',
  stock: '',
  sku: '',
  imageUrl: '',
  isAvailable: true,
}

function productToForm(product: BusinessProduct): ProductFormState {
  return {
    name: product.name,
    description: product.description ?? '',
    categoryId: product.categoryId ? String(product.categoryId) : '',
    price: String(product.price),
    stock: product.stock === null ? '' : String(product.stock),
    sku: product.sku ?? '',
    imageUrl: product.imageUrl ?? '',
    isAvailable: product.isAvailable,
  }
}

export function BusinessCatalogPage() {
  const [approved, setApproved] = useState(true)
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('APPROVED')
  const [businessName, setBusinessName] = useState('')
  const [deliveryFee, setDeliveryFee] = useState<number | string>(0)

  const [products, setProducts] = useState<BusinessProduct[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [includeDeleted, setIncludeDeleted] = useState(false)

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BusinessProduct | null>(null)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  const [busyProductId, setBusyProductId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const profile = await fetchMyBusiness()

      setBusinessName(profile.businessName)
      setDeliveryFee(profile.deliveryFee)
      setApproved(profile.status === 'APPROVED')
      setApprovalStatus(profile.status)

      if (profile.status !== 'APPROVED') {
        return
      }

      const [categoryList, productData] = await Promise.all([
        fetchMyCategories(),
        fetchMyProducts({ limit: 100, includeDeleted: true }),
      ])

      setCategories(categoryList)
      setProducts(productData.products)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar tu catálogo.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter((product) => {
      if (!includeDeleted && product.deletedAt) {
        return false
      }

      if (categoryFilter === 'NONE') {
        if (product.categoryId !== null) {
          return false
        }
      } else if (categoryFilter !== 'ALL') {
        if (product.categoryId !== Number(categoryFilter)) {
          return false
        }
      }

      if (!query) {
        return true
      }

      return (
        product.name.toLowerCase().includes(query) ||
        (product.sku ?? '').toLowerCase().includes(query)
      )
    })
  }, [products, search, categoryFilter, includeDeleted])

  const activeProducts = products.filter((product) => !product.deletedAt)
  const availableCount = activeProducts.filter(
    (product) => product.isAvailable,
  ).length
  const outOfStockCount = activeProducts.filter(
    (product) => product.stock !== null && product.stock <= 0,
  ).length

  function openCreateModal() {
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setProductModalOpen(true)
  }

  function openEditModal(product: BusinessProduct) {
    setEditingProduct(product)
    setForm(productToForm(product))
    setFormError(null)
    setProductModalOpen(true)
  }

  async function handleSaveProduct(event: FormEvent) {
    event.preventDefault()

    if (!form.name.trim()) {
      setFormError('El nombre del producto es obligatorio.')
      return
    }

    const price = Number(form.price)
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('El precio debe ser mayor que cero.')
      return
    }

    const stock = form.stock.trim() === '' ? null : Number(form.stock)
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      setFormError('El stock debe ser un entero mayor o igual a 0.')
      return
    }

    const payload: ProductPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      price,
      stock,
      sku: form.sku.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      isAvailable: form.isAvailable,
    }

    setSaving(true)
    setFormError(null)

    try {
      const data = editingProduct
        ? await updateProduct(editingProduct.id, payload)
        : await createProduct(payload)

      setProducts((current) => {
        const exists = current.some((product) => product.id === data.product.id)
        return exists
          ? current.map((product) =>
              product.id === data.product.id ? data.product : product,
            )
          : [data.product, ...current]
      })

      setProductModalOpen(false)
      setEditingProduct(null)
    } catch (err) {
      setFormError(
        getErrorMessage(err, 'No se pudo guardar el producto. Revisa los datos.'),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleAvailability(product: BusinessProduct) {
    setBusyProductId(product.id)

    try {
      const data = await setProductAvailability(
        product.id,
        !product.isAvailable,
      )
      setProducts((current) =>
        current.map((item) => (item.id === data.product.id ? data.product : item)),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar la disponibilidad.'))
    } finally {
      setBusyProductId(null)
    }
  }

  async function handleDeleteProduct(product: BusinessProduct) {
    if (
      !window.confirm(
        `¿Eliminar "${product.name}"? Dejará de mostrarse en el catálogo del cliente.`,
      )
    ) {
      return
    }

    setBusyProductId(product.id)

    try {
      const data = await deleteProduct(product.id)
      setProducts((current) =>
        current.map((item) => (item.id === data.product.id ? data.product : item)),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el producto.'))
    } finally {
      setBusyProductId(null)
    }
  }

  async function handleRestoreProduct(product: BusinessProduct) {
    setBusyProductId(product.id)

    try {
      const data = await restoreProduct(product.id)
      setProducts((current) =>
        current.map((item) => (item.id === data.product.id ? data.product : item)),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo restaurar el producto.'))
    } finally {
      setBusyProductId(null)
    }
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault()

    if (!newCategoryName.trim()) {
      setCategoryError('Escribe un nombre para la categoría.')
      return
    }

    setCategorySaving(true)
    setCategoryError(null)

    try {
      const data = await createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      })
      setCategories((current) => [...current, data.category])
      setNewCategoryName('')
      setNewCategoryDescription('')
    } catch (err) {
      setCategoryError(getErrorMessage(err, 'No se pudo crear la categoría.'))
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleRenameCategory(category: ProductCategory) {
    if (!editingCategoryName.trim()) {
      setCategoryError('El nombre no puede estar vacío.')
      return
    }

    setCategorySaving(true)
    setCategoryError(null)

    try {
      const data = await updateCategory(category.id, {
        name: editingCategoryName.trim(),
        description: category.description ?? undefined,
        sortOrder: category.sortOrder,
      })
      setCategories((current) =>
        current.map((item) => (item.id === data.category.id ? data.category : item)),
      )
      setEditingCategoryId(null)
      setEditingCategoryName('')
    } catch (err) {
      setCategoryError(getErrorMessage(err, 'No se pudo renombrar la categoría.'))
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleDeleteCategory(category: ProductCategory) {
    if (
      !window.confirm(
        `¿Eliminar la categoría "${category.name}"? Sus productos quedarán sin categoría.`,
      )
    ) {
      return
    }

    setCategorySaving(true)
    setCategoryError(null)

    try {
      await deleteCategory(category.id)
      setCategories((current) => current.filter((item) => item.id !== category.id))
      setProducts((current) =>
        current.map((product) =>
          product.categoryId === category.id
            ? { ...product, categoryId: null, category: null }
            : product,
        ),
      )
    } catch (err) {
      setCategoryError(getErrorMessage(err, 'No se pudo eliminar la categoría.'))
    } finally {
      setCategorySaving(false)
    }
  }

  if (!loading && !approved) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to="/empresa"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a mi empresa
        </Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="font-bold">Tu empresa aún no está aprobada</p>
          <p className="mt-1">
            El catálogo se habilita cuando el administrador aprueba tu solicitud.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/empresa"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-orange-600"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Volver a pedidos
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Catálogo
            </h1>
            <StatusBadge status={approvalStatus} />
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{businessName}</span>
            <span className="inline-flex items-center gap-1">
              <Truck className="size-3.5 text-slate-400" aria-hidden="true" />
              Domicilio {formatCurrency(deliveryFee)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCategoryModalOpen(true)
              setCategoryError(null)
            }}
            className={secondaryButtonClass}
          >
            <FolderTree className="size-4" aria-hidden="true" />
            Categorías
          </button>
          <button type="button" onClick={openCreateModal} className={solidButtonClass}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo producto
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Productos" value={activeProducts.length} icon={Store} tone="orange" />
        <StatCard
          label="Disponibles"
          value={availableCount}
          icon={Tag}
          tone="emerald"
        />
        <StatCard
          label="Agotados"
          value={outOfStockCount}
          icon={CircleAlert}
          tone="rose"
        />
        <StatCard
          label="Categorías"
          value={categories.length}
          icon={FolderTree}
          tone="indigo"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto o SKU…"
              className={cn(inputClass, 'pl-10')}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className={cn(inputClass, 'sm:w-56')}
            aria-label="Filtrar por categoría"
          >
            <option value="ALL">Todas las categorías</option>
            <option value="NONE">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(event) => setIncludeDeleted(event.target.checked)}
            className="size-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
          />
          Mostrar eliminados
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl bg-slate-200/70"
            />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No hay productos en esta vista"
          description="Crea tu primer producto o ajusta los filtros para ver otros resultados."
          action={
            <button type="button" onClick={openCreateModal} className={solidButtonClass}>
              <Plus className="size-4" aria-hidden="true" />
              Crear producto
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const busy = busyProductId === product.id
            const deleted = Boolean(product.deletedAt)
            const outOfStock = product.stock !== null && product.stock <= 0

            return (
              <article
                key={product.id}
                className={cn(
                  'rounded-2xl border bg-white p-4 shadow-sm transition',
                  deleted
                    ? 'border-slate-200 opacity-70'
                    : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-slate-300">
                          <ImageIcon className="size-6" aria-hidden="true" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {product.name}
                        </p>
                        {deleted && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Eliminado
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold',
                            deleted
                              ? 'bg-slate-100 text-slate-500'
                              : product.isAvailable
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700',
                          )}
                        >
                          {deleted
                            ? 'Oculto'
                            : product.isAvailable
                              ? 'Disponible'
                              : 'No disponible'}
                        </span>
                      </div>

                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="size-3" aria-hidden="true" />
                          {product.category?.name ?? 'Sin categoría'}
                        </span>
                        <span>{formatCurrency(product.price)}</span>
                        <span>
                          {product.stock === null
                            ? 'Stock ilimitado'
                            : outOfStock
                              ? 'Agotado'
                              : `${product.stock} en stock`}
                        </span>
                        {product.sku && <span>SKU {product.sku}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {deleted ? (
                      <button
                        type="button"
                        onClick={() => void handleRestoreProduct(product)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <RotateCcw className="size-3.5" aria-hidden="true" />
                        )}
                        Restaurar
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleToggleAvailability(product)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {busy ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : product.isAvailable ? (
                            <CircleAlert className="size-3.5" aria-hidden="true" />
                          ) : (
                            <Tag className="size-3.5" aria-hidden="true" />
                          )}
                          {product.isAvailable ? 'Marcar no disponible' : 'Marcar disponible'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                          aria-label={`Editar ${product.name}`}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteProduct(product)}
                          disabled={busy}
                          className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                          aria-label={`Eliminar ${product.name}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal producto */}
      <Modal
        open={productModalOpen}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
        description={
          editingProduct
            ? 'Los cambios se reflejan de inmediato en el catálogo.'
            : 'Agrega un producto para que tus clientes puedan pedirlo.'
        }
        onClose={() => {
          if (!saving) {
            setProductModalOpen(false)
          }
        }}
        widthClass="max-w-2xl"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {editingProduct ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="product-name" className={labelClass}>
                Nombre *
              </label>
              <input
                id="product-name"
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={inputClass}
                placeholder="Hamburguesa doble con queso"
                required
              />
            </div>

            <div>
              <label htmlFor="product-price" className={labelClass}>
                Precio *
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="100"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                className={inputClass}
                placeholder="25000"
                required
              />
            </div>

            <div>
              <label htmlFor="product-stock" className={labelClass}>
                Stock (vacío = ilimitado)
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
                className={inputClass}
                placeholder="20"
              />
            </div>

            <div>
              <label htmlFor="product-category" className={labelClass}>
                Categoría
              </label>
              <select
                id="product-category"
                value={form.categoryId}
                onChange={(event) =>
                  setForm({ ...form, categoryId: event.target.value })
                }
                className={inputClass}
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product-sku" className={labelClass}>
                SKU
              </label>
              <input
                id="product-sku"
                type="text"
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
                className={inputClass}
                placeholder="HAM-001"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="product-image" className={labelClass}>
                URL de la imagen
              </label>
              <input
                id="product-image"
                type="url"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm({ ...form, imageUrl: event.target.value })
                }
                className={inputClass}
                placeholder="https://…/producto.jpg"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="product-description" className={labelClass}>
                Descripción
              </label>
              <textarea
                id="product-description"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className={`${inputClass} resize-none`}
                placeholder="Ingredientes, tamaño, presentación…"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(event) =>
                setForm({ ...form, isAvailable: event.target.checked })
              }
              className="size-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
            />
            Disponible para pedidos
          </label>

          {formError && <ErrorAlert message={formError} />}
        </form>
      </Modal>

      {/* Modal categorías */}
      <Modal
        open={categoryModalOpen}
        title="Categorías"
        description="Organiza tu catálogo en secciones."
        onClose={() => {
          if (!categorySaving) {
            setCategoryModalOpen(false)
          }
        }}
      >
        <form onSubmit={handleCreateCategory} className="space-y-2 border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              className={inputClass}
              placeholder="Nombre de la nueva categoría"
            />
            <button
              type="submit"
              disabled={categorySaving}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              <Plus className="size-4" aria-hidden="true" />
              Agregar
            </button>
          </div>
          <input
            type="text"
            value={newCategoryDescription}
            onChange={(event) => setNewCategoryDescription(event.target.value)}
            className={inputClass}
            placeholder="Descripción (opcional)"
          />
        </form>

        {categoryError && (
          <div className="pt-3">
            <ErrorAlert message={categoryError} />
          </div>
        )}

        {categories.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            Aún no tienes categorías. Crea la primera arriba.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 pt-2">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-2 py-2.5">
                {editingCategoryId === category.id ? (
                  <>
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(event) =>
                        setEditingCategoryName(event.target.value)
                      }
                      className={`${inputClass} py-1.5`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => void handleRenameCategory(category)}
                      disabled={categorySaving}
                      className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      aria-label="Guardar nombre"
                    >
                      <Save className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategoryId(null)}
                      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {category.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {category._count?.products ?? 0} producto
                        {(category._count?.products ?? 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(category.id)
                        setEditingCategoryName(category.name)
                        setCategoryError(null)
                      }}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Renombrar ${category.name}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCategory(category)}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Eliminar ${category.name}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
