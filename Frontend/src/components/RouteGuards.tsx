import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import type { Role } from '../types/auth'
import { AccessDeniedPage } from '../pages/AccessDeniedPage'

export function RequireAuth() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}

export function PublicOnly() {
  const user = useAuthStore((state) => state.user)

  if (user) {
    return <Navigate to="/panel" replace />
  }

  return <Outlet />
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const hasAccess = roles.some((role) => user.roles.includes(role))

  if (!hasAccess) {
    return <AccessDeniedPage roles={roles} />
  }

  return <Outlet />
}
