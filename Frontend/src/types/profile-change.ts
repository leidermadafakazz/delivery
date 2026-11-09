import type { ApprovalStatus } from './applications'

export interface ProfileChangeRequest {
  id: number
  userId: number
  name: string | null
  email: string | null
  phone: string | null
  status: ApprovalStatus
  rejectionReason: string | null
  reviewedById: number | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: number
    name: string
    email: string
    phone: string | null
  }
  reviewedBy: {
    id: number
    name: string
    email: string
  } | null
}

export interface ProfileChangePayload {
  name?: string
  email?: string
  phone?: string
}

export interface ProfileChangeResponse {
  success: boolean
  message?: string
  request: ProfileChangeRequest
}

export interface ProfileChangesListResponse {
  success: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  requests: ProfileChangeRequest[]
}
