import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type Tone = 'orange' | 'amber' | 'emerald' | 'sky' | 'indigo' | 'rose' | 'slate'

const TONES: Record<Tone, string> = {
  orange: 'bg-orange-50 text-orange-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'slate',
  hint,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: Tone
  hint?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', TONES[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="text-xl font-black leading-tight text-slate-900">{value}</p>
        {hint && <p className="truncate text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}
