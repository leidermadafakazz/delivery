import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { secondaryButtonClass } from '../lib/styles'

export function NotFoundPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-orange-50 text-orange-500">
        <Compass className="size-8" aria-hidden="true" />
      </span>

      <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
        Error 404
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
        Página no encontrada
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        La página que buscas no existe o fue movida a otra dirección.
      </p>

      <Link
        to={user ? '/panel' : '/login'}
        className={`${secondaryButtonClass} mt-8`}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {user ? 'Volver al panel' : 'Ir a iniciar sesión'}
      </Link>
    </div>
  )
}
