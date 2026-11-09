import { type FormEvent, useState } from 'react'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { getErrorMessage } from '../lib/api'
import { inputClass, labelClass, primaryButtonClass } from '../lib/styles'
import { useAuthStore } from '../store/auth.store'

export function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)
  const navigate = useNavigate()
  const location = useLocation()

  const from =
    (location.state as { from?: string } | null)?.from ?? '/panel'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    }
  }

  function fillAdminCredentials() {
    setEmail('admin@fastdelivery.com')
    setPassword('Admin1234!')
    setError(null)
  }

  return (
    <AuthLayout
      eyebrow="Bienvenido de nuevo"
      title="Inicia sesión en FastDelivery"
      subtitle="Accede para gestionar tus pedidos, tu negocio o tus entregas."
      footer={
        <p className="text-sm text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            className="font-semibold text-orange-600 hover:text-orange-700"
          >
            Crear una cuenta
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <ErrorAlert message={error} />}

        <div>
          <label htmlFor="email" className={labelClass}>
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="tu@correo.com"
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="Tu contraseña"
          />
        </div>

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Ingresando…
            </>
          ) : (
            <>
              Ingresar
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-700">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Acceso de prueba
        </div>
        <p className="mt-1.5 text-xs text-orange-900/70">
          Administrador: admin@fastdelivery.com
        </p>
        <button
          type="button"
          onClick={fillAdminCredentials}
          className="mt-2 text-xs font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-800"
        >
          Usar credenciales de administrador
        </button>
      </div>
    </AuthLayout>
  )
}
     