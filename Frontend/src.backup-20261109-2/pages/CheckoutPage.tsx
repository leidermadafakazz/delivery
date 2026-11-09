import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShoppingBag,
  StickyNote,
  Truck,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { getErrorMessage } from '../lib/api'
import { formatCurrency } from '../lib/format'
import { createOrder } from '../lib/orders-api'
import { inputClass, labelClass } from '../lib/styles'
import { cartSubtotal, useCartStore } from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'
import type { PaymentMethod } from '../types/orders'

const PAYMENT_OPTIONS: Array<{
  value: PaymentMethod
  label: string
  description: string
  icon: typeof Banknote
}> = [
  {
    value: 'CASH',
    label: 'Efectivo',
    description: 'Pagas al recibir el pedido.',
    icon: Banknote,
  },
  {
    value: 'CARD',
    label: 'Tarjeta',
    description: 'Pago con datáfono al entregar.',
    icon: CreditCard,
  },
  {
    value: 'TRANSFER',
    label: 'Transferencia',
    description: 'Acuerdas los datos con el negocio.',
    icon: Landmark,
  },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const business = useCartStore((state) => state.business)
  const items = useCartStore((state) => state.items)
  const clear = useCartStore((state) => state.clear)

  const [address, setAddress] = useState('')
  const [city, setCity] = useState(business?.city ?? '')
  const [department, setDepartment] = useState('')
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ordered, setOrdered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = cartSubtotal(items)
  const deliveryFee = business?.deliveryFee ?? 0
  const total = subtotal + deliveryFee

  if ((items.length === 0 || !business) && !ordered) {
    return <Navigate to="/carrito" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!business) {
      return
    }

    if (!address.trim() || !city.trim()) {
      setError('La dirección y la ciudad de entrega son obligatorias.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { order } = await createOrder({
        businessId: business.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        address: address.trim(),
        city: city.trim(),
        department: department.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
      })

      setOrdered(true)
      clear()
      navigate(`/pedidos/${order.id}`, { replace: true, state: { created: true } })
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el pedido.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/carrito"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-orange-600"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver al carrito
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Confirmar pedido
        </h1>
        <p className="text-sm text-slate-500">
          Indica dónde entregamos tu pedido de {business?.businessName}.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]"
      >
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <MapPin className="size-4 text-orange-500" aria-hidden="true" />
              Dirección de entrega
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address" className={labelClass}>
                  Dirección *
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Calle 100 #20-30, torre 2, apto 401"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="city" className={labelClass}>
                  Ciudad *
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Bogotá"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="department" className={labelClass}>
                  Departamento
                </label>
                <input
                  id="department"
                  type="text"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  placeholder="Cundinamarca"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="phone" className={labelClass}>
                  Teléfono de contacto
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="300 111 2233"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className={labelClass}>
                  Notas para el negocio o el domiciliario
                </label>
                <div className="relative">
                  <StickyNote className="pointer-events-none absolute left-3.5 top-3 size-4 text-slate-400" />
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Sin cebolla, dejar en portería, llamar al llegar…"
                    className={`${inputClass} resize-none pl-10`}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <CreditCard className="size-4 text-orange-500" aria-hidden="true" />
              Método de pago
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {PAYMENT_OPTIONS.map((option) => {
                const selected = paymentMethod === option.value
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition ${
                      selected
                        ? 'border-orange-400 bg-orange-50/70 ring-4 ring-orange-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={selected}
                      onChange={() => setPaymentMethod(option.value)}
                      className="sr-only"
                    />
                    <option.icon
                      className={`size-5 ${selected ? 'text-orange-600' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {option.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {option.description}
                    </p>
                  </label>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.businessName}
                className="size-10 rounded-xl border border-slate-200 object-cover"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-xs font-black text-white">
                {business?.businessName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {business?.businessName}
              </p>
              <p className="text-xs text-slate-500">{business?.city}</p>
            </div>
          </div>

          <ul className="max-h-56 space-y-2 overflow-y-auto border-y border-slate-100 py-3">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex items-start justify-between gap-2 text-xs"
              >
                <span className="min-w-0 text-slate-600">
                  <span className="font-bold text-slate-900">{item.quantity}×</span>{' '}
                  {item.name}
                </span>
                <span className="shrink-0 font-semibold text-slate-800">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-1.5 text-sm">
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

          {error && <ErrorAlert message={error} />}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Enviando pedido…
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden="true" />
                Hacer pedido
              </>
            )}
          </button>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
            <ShoppingBag className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Al confirmar, el negocio recibe tu pedido y lo acepta o rechaza. Te
            avisaremos del estado en «Mis pedidos».
          </p>
        </aside>
      </form>
    </div>
  )
}
