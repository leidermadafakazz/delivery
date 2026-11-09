import { cn } from '../../lib/cn'
import { ROLE_LABELS } from '../../lib/roles'
import type { Role } from '../../types/auth'

const ROLE_STYLES: Record<Role, string> = {
  CLIENT: 'bg-sky-50 text-sky-700 ring-sky-200',
  BUSINESS: 'bg-violet-50 text-violet-700 ring-violet-200',
  DELIVERY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ADMIN: 'bg-slate-900 text-white ring-slate-900',
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        ROLE_STYLES[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
