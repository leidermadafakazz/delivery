export type Role = 'CLIENT' | 'DELIVERY' | 'BUSINESS' | 'ADMIN'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface BusinessProfileSummary {
  id: number
  businessName: string
  status: ApprovalStatus
}

export interface DeliveryProfileSummary {
  id: number
  documentNumber: string
  status: ApprovalStatus
}

export interface AuthUser {
  id: number
  name: string
  email: string
  phone: string | null
  roles: Role[]
  businessProfile?: BusinessProfileSummary | null
  deliveryProfile?: DeliveryProfileSummary | null
}

export interface AuthResponse {
  success: boolean
  message?: string
  token: string
  user: AuthUser
}

export interface MeResponse {
  success: boolean
  user: AuthUser
}

export interface ApiErrorResponse {
  success: false
  message: string
}
