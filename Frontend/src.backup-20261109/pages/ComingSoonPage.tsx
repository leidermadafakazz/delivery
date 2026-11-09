import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Construction, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { secondaryButtonClass } from '../lib/styles'

interface ComingSoonPageProps {
  title: string
  description: string
  phase: string
  icon: LucideIcon
  features: string[]
}

export function ComingSoonPage({
  title,
  description,
  phase,
  icon: Icon,
  features,
}: ComingSoonPageProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-orange-100/70 blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-600">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              <Construction className="size-3.5" aria-hidden="true" />
              {phase}
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Lo que incluirá esta sección
            </p>
            <ul className="mt-3 space-y-2.5">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-slate-600"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Link to="/panel" className={`${secondaryButtonClass} mt-8`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al panel
          </Link>
        </div>
      </div>
    </div>
  )
}
