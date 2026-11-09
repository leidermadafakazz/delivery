import type { ReactNode } from 'react'
import { MapPinned, PackageCheck, Timer } from 'lucide-react'
import { Brand } from '../ui/Brand'

interface AuthLayoutProps {
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

const FEATURES = [
  {
    icon: MapPinned,
    title: 'Negocios cerca de ti',
    text: 'Descubre restaurantes y tiendas de tu ciudad.',
  },
  {
    icon: PackageCheck,
    title: 'Pedidos sin complicaciones',
    text: 'Elige tus productos y confirma en segundos.',
  },
  {
    icon: Timer,
    title: 'Sigue tu entrega',
    text: 'Consulta el estado de tu pedido en cada momento.',
  },
]

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-slate-950 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative">
          <Brand light to="/login" />
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
            Tu pedido, a un click
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight">
            Todos los antojos a tu puerta, sin complicaciones.
          </h2>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-orange-300">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© 2026 FastDelivery</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand to="/login" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-8">{children}</div>
          <div className="mt-8">{footer}</div>
        </div>
      </main>
    </div>
  )
}
