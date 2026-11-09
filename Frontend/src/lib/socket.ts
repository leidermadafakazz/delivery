import { io, type Socket } from 'socket.io-client'
import type { RatingNotificationPayload } from '../types/ratings'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

let socket: Socket | null = null

export function connectRealtime(
  token: string,
  onRating: (payload: RatingNotificationPayload) => void,
): Socket {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  socket = io(baseURL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  })

  socket.on('rating:new', onRating)

  return socket
}

export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}
