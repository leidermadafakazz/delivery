import type { AuthUser } from '../types/auth'

const SESSION_KEY = 'fastdelivery.session'

export interface Session {
  token: string
  user: AuthUser
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<Session>

    if (typeof parsed.token !== 'string' || !parsed.user) {
      return null
    }

    return { token: parsed.token, user: parsed.user }
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getToken(): string | null {
  return loadSession()?.token ?? null
}
