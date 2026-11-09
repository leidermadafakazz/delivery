import type { Order, OrderStatus, PaymentMethod } from '../types/orders'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
  PREPARING: 'En preparación',
  READY: 'Listo para entrega',
  ON_THE_WAY: 'En camino',
  DELIVERED: 'Entregado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
}

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  ACCEPTED: 'bg-sky-50 text-sky-700 ring-sky-200',
  PREPARING: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  READY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ON_THE_WAY: 'bg-orange-50 text-orange-700 ring-orange-200',
  DELIVERED: 'bg-teal-50 text-teal-700 ring-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
}

/** Estados en los que el pedido sigue vivo (no es terminal). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'ON_THE_WAY',
]

/** Pasos del flujo normal, para la línea de tiempo del cliente. */
export const ORDER_FLOW: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'ON_THE_WAY',
  'DELIVERED',
]

export function isActiveOrder(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status)
}

export function isFinishedOrder(status: OrderStatus): boolean {
  return status === 'DELIVERED'
}

export function canClientCancel(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'ACCEPTED'
}

export type BusinessAction = 'ACCEPT' | 'REJECT' | 'PREPARING' | 'READY'

export function businessActionFor(status: OrderStatus): BusinessAction | null {
  switch (status) {
    case 'PENDING':
      return 'ACCEPT'
    case 'ACCEPTED':
      return 'PREPARING'
    case 'PREPARING':
      return 'READY'
    default:
      return null
  }
}

export type DeliveryAction = 'TAKE' | 'PICKUP' | 'DELIVER'

/**
 * Acción disponible para el domiciliario. Un pedido READY sin domiciliario se
 * puede tomar; uno READY asignado a él se recoge; uno ON_THE_WAY se entrega.
 */
export function deliveryActionFor(
  order: Order,
  currentDeliveryProfileId?: number,
): DeliveryAction | null {
  if (order.status === 'READY') {
    if (order.deliveryId === null) {
      return 'TAKE'
    }

    if (
      currentDeliveryProfileId !== undefined &&
      order.deliveryId === currentDeliveryProfileId
    ) {
      return 'PICKUP'
    }

    return null
  }

  if (order.status === 'ON_THE_WAY') {
    return 'DELIVER'
  }

  return null
}

export function orderNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

export function formatOrderDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function itemCount(order: Order): number {
  return order.items.reduce((total, item) => total + item.quantity, 0)
}

export function itemsSummary(order: Order): string {
  if (order.items.length === 0) {
    return 'Sin productos'
  }

  const names = order.items.map((item) => `${item.quantity}× ${item.productName}`)
  const label = names.slice(0, 2).join(', ')

  return names.length > 2 ? `${label} +${names.length - 2}` : label
}
