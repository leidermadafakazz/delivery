import { type FormEvent, useState } from 'react'
import { ArrowRight, Info, Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { getErrorMessage } from '../lib/api'
import { inputClass, labelClass, primaryButtonClass } from '../lib/styles'
import { useAuthStore } from '../store/auth.store'

export function RegisterPage() {
  const register = useAuthStore((state) => state.register)
  const loading = useAuthStore((state) => state.loading)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !password) {
      setError('Nombre, correo y contraseña son obligatorios.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    try {
      await register(name.trim(), email.trim(), password)
      navigate('/panel', { replace: true })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    }
  }

  return (
    <AuthLayout
      eyebrow="Crea tu cuenta"
      title="Empieza a pedir en minutos"
      subtitle="Regístrate para descubrir negocios y hacer pedidos a domicilio."
      footer={
        <p className="text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="font-semibold text-orange-600 hover:text-orange-700"
          >
            Iniciar sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <ErrorAlert message={error} />}

        <div>
          <label htmlFor="name" className={labelClass}>
            Nombre completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            placeholder="Tu nombre"
          />
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className={labelClass}>
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              placeholder="Repite la contraseña"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Creando cuenta…
            </>
          ) : (
            <>
              Crear cuenta
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p>
          Al registrarte obtienes el rol <strong className="text-slate-700">Cliente</strong>.
          Más adelante podrás solicitar un perfil de empresa o de domiciliario.
        </p>
      </div>
    </AuthLayout>
  )
}
