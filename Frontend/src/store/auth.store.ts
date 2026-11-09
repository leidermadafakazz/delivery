import { create } from 'zustand'
import axios from 'axios'
import { api } from '../lib/api'
import { clearSession, loadSession, saveSession } from '../lib/auth-storage'
import type { AuthResponse, AuthUser, MeResponse } from '../types/auth'

interface AuthState {
  token: string | null
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  initialize: () => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => void
}

const storedSession = loadSession()

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedSession?.token ?? null,
  user: storedSession?.user ?? null,
  loading: false,
  initialized: false,

  async login(email, password) {
    set({ loading: true })

    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      })

      saveSession({ token: data.token, user: data.user })
      set({ token: data.token, user: data.user })
    } finally {
      set({ loading: false })
    }
  },

  async register(name, email, password) {
    set({ loading: true })

    try {
      const { data } = await api.post<AuthResponse>('/api/auth/register', {
        name,
        email,
        password,
      })

      saveSession({ token: data.token, user: data.user })
      set({ token: data.token, user: data.user })
    } finally {
      set({ loading: false })
    }
  },

  async initialize() {
    const token = get().token

    if (!token) {
      set({ initialized: true })
      return
    }

    try {
      const { data } = await api.get<MeResponse>('/api/auth/me')

      saveSession({ token, user: data.user })
      set({ user: data.user })
    } catch {
      clearSession()
      set({ token: null, user: null })
    } finally {
      set({ initialized: true })
    }
  },

  async refreshUser() {
    const token = get().token

    if (!token) {
      return
    }

    try {
      const { data } = await api.get<MeResponse>('/api/auth/me')

      saveSession({ token, user: data.user })
      set({ user: data.user })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSession()
        set({ token: null, user: null })
      }
    }
  },

  logout() {
    clearSession()
    set({ token: null, user: null })
  },
}))
