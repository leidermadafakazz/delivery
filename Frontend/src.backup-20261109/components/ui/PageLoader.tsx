import { Loader2 } from 'lucide-react'
import { Brand } from './Brand'

export function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50">
      <Brand to="/panel" />
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Loader2 className="size-4 animate-spin text-orange-500" aria-hidden="true" />
        Cargando tu cuenta…
      </div>
    </div>
  )
}
