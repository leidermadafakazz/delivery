import { Bike } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

interface BrandProps {
  compact?: boolean
  light?: boolean
  to?: string
}

export function Brand({ compact = false, light = false, to = '/panel' }: BrandProps) {
  return (
    <Link to={to} className="group flex items-center gap-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 transition-transform group-hover:-rotate-6">
        <Bike className="size-5" aria-hidden="true" />
      </span>

      {!compact && (
        <span className="leading-tight">
          <span
            className={cn(
              'block text-lg font-extrabold tracking-tight',
              light ? 'text-white' : 'text-slate-900',
            )}
          >
            FastDelivery
          </span>
          <span
            className={cn(
              'block text-[10px] font-semibold uppercase tracking-[0.18em]',
              light ? 'text-orange-200' : 'text-orange-600',
            )}
          >
            Pedidos a domicilio
          </span>
        </span>
      )}
    </Link>
  )
}
