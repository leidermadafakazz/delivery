import { create } from 'zustand'
import type { RatingNotificationPayload } from '../types/ratings'

export interface RatingNotification extends RatingNotificationPayload {
  receivedAt: string
}

interface NotificationsState {
  items: RatingNotification[]
  unread: number
  add: (payload: RatingNotificationPayload) => void
  markAllRead: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  unread: 0,

  add(payload) {
    set((state) => ({
      items: [
        { ...payload, receivedAt: new Date().toISOString() },
        ...state.items,
      ].slice(0, 30),
      unread: state.unread + 1,
    }))
  },

  markAllRead() {
    set({ unread: 0 })
  },
}))
