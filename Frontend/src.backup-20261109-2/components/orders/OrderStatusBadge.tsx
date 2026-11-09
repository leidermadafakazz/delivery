import { cn } from '../../lib/cn'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
} from '../../lib/order-status'
import type { OrderStatus } from '../../types/orders'

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        ORDER_STATUS_STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}
