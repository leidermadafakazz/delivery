import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency } from '../lib/format'
import { secondaryButtonClass } from '../lib/styles'
import { cartItemCount, cartSubtotal, useCartStore } from '../store/cart.store'
import type { CartItem } from '../types/orders'

function QuantityStepper({ item }: { item: CartItem }) {
  const setQuantity = useCartStore((state) => state.setQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const limit = item.stock === null ? 99 : Math.min(item.stock, 99)

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() =>
          item.quantity > 1
            ? setQuantity(item.productId, item.quantity - 1)
            : removeItem(item.productId)
        }
        className="grid size-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Quitar una unidad de ${item.name}`}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <span className="w-7 text-center text-sm font-bold text-slate-900">
        {item.quantity}
      </span>
      <button
        type="button"
        disabled={item.quantity >= limit}
        onClick={() => setQuantity(item.productId, item.quantity + 1)}
        className="grid size-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
        aria-label={`Agregar una unidad de ${item.name}`}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function CartPage() {
  const navigate = useNavigate()
  const business = useCartStore((state) => state.business)
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const clear = useCartStore((state) => state.clear)

  const subtotal = cartSubtotal(items)
  const deliveryFee = business?.deliveryFee ?? 0
  const total = subtotal + deliveryFee
  const count = cartItemCount(items)

  if (items.length === 0 || !business) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al catálogo
        </Link>
        <EmptyState
          icon={ShoppingBag}
          title="Tu carrito está vacío"
          description="Explora los restaurantes y tiendas disponibles y agrega tus productos favoritos."
          action={
            <Link to="/catalogo" className={secondaryButtonClass}>
              <Store className="size-4" aria-hidden="true" />
              Explorar tiendas
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={`/catalogo/${business.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-orange-600"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Seguir comprando en {business.businessName}
          </Link>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Tu carrito
          </h1>
          <p className="text-sm text-slate-500">
            {count} producto{count === 1 ? '' : 's'} de {business.businessName}
          </p>
        </div>

        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Vaciar carrito
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.businessName}
                className="size-10 rounded-xl border border-slate-200 object-cover"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-xs font-black text-white">
                {business.businessName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {business.businessName}
              </p>
              <p className="text-xs text-slate-500">{business.city}</p>
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-3 p-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-slate-300">
                      <Store className="size-6" aria-hidden="true" />
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(item.price)} c/u
                      {item.stock !== null && item.stock <= 5
                        ? ` · quedan ${item.stock}`
                        : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <QuantityStepper item={item} />
                    <p className="w-20 text-right text-sm font-extrabold text-slate-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Eliminar ${item.name} del carrito`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-slate-900">Resumen del pedido</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt className="inline-flex items-center gap-1.5">
                <Truck className="size-3.5 text-slate-400" aria-hidden="true" />
                Domicilio
              </dt>
              <dd>{deliveryFee === 0 ? 'Gratis' : formatCurrency(deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-extrabold text-slate-900">
              <dt>Total</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200"
          >
            Continuar con la dirección
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
            El pedido se envía a la empresa. Podrás pagar en efectivo, con tarjeta
            o por transferencia al recibirlo.
          </p>
        </aside>
      </div>
    </div>
  )
}
