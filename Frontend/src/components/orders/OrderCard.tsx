import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '../../lib/format'
import {
  PAYMENT_METHOD_LABELS,
  formatOrderDate,
  itemCount,
} from '../../lib/order-status'
import type { Order } from '../../types/orders'
import { OrderStatusBadge } from './OrderStatusBadge'

interface OrderCardProps {
  order: Order
  heading: ReactNode
  subheading?: ReactNode
  actions?: ReactNode
  expanded?: boolean
  onToggle?: () => void
  children?: ReactNode
}

export function OrderCard({
  order,
  heading,
  subheading,
  actions,
  expanded = false,
  onToggle,
  children,
}: OrderCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-900">{heading}</h3>
            <OrderStatusBadge status={order.status} />
          </div>

          {subheading && (
            <div className="text-xs text-slate-600">{subheading}</div>
          )}

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>{formatOrderDate(order.createdAt)}</span>
            <span aria-hidden="true">•</span>
            <span>
              {itemCount(order)} artículo{itemCount(order) === 1 ? '' : 's'}
            </span>
            <span aria-hidden="true">•</span>
            <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total
            </p>
            <p className="text-base font-extrabold text-slate-900">
              {formatCurrency(order.total)}
            </p>
          </div>

          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              {expanded ? (
                <>
                  Ocultar detalle
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                </>
              ) : (
                <>
                  Ver detalle
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          {actions}
        </div>
      )}

      {expanded && (
        <div className="border-t border-slate-100 bg-white p-4">{children}</div>
      )}
    </article>
  )
}
