import type { ProfileChangeRequest } from './profile-change'
import type { RatingStats } from './ratings'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type BusinessType = 'RESTAURANT' | 'STORE'
export type VehicleType = 'MOTORCYCLE' | 'BICYCLE' | 'CAR' | 'OTHER'

export interface Applicant {
  id: number
  name: string
  email: string
  phone: string | null
}

export interface Reviewer {
  id: number
  name: string
  email: string
}

export interface BusinessApplication {
  id: number
  userId: number
  businessName: string
  legalName: string | null
  taxId: string | null
  businessType: BusinessType
  description: string | null
  address: string
  city: string
  department: string | null
  contactPhone: string | null
  contactEmail: string | null
  logoUrl: string | null
  documentUrl: string | null
  deliveryFee: number | string
  status: ApprovalStatus
  rejectionReason: string | null
  reviewedById: number | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user: Applicant
  reviewedBy: Reviewer | null
}

export interface DeliveryApplication {
  id: number
  userId: number
  documentType: string
  documentNumber: string
  birthDate: string | null
  address: string
  city: string
  vehicleType: VehicleType
  vehiclePlate: string | null
  licenseNumber: string | null
  documentUrl: string | null
  licenseUrl: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  status: ApprovalStatus
  rejectionReason: string | null
  reviewedById: number | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user: Applicant
  reviewedBy: Reviewer | null
  rating?: RatingStats
}

export interface BusinessApplicationPayload {
  businessName: string
  legalName?: string
  taxId?: string
  businessType: BusinessType
  description?: string
  address: string
  city: string
  department?: string
  contactPhone?: string
  contactEmail?: string
  logoUrl?: string
  documentUrl?: string
  deliveryFee: number
}

export interface DeliveryApplicationPayload {
  documentType: string
  documentNumber: string
  birthDate?: string
  address: string
  city: string
  vehicleType: VehicleType
  vehiclePlate?: string
  licenseNumber?: string
  documentUrl?: string
  licenseUrl?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export interface ApprovalCounts {
  PENDING: number
  APPROVED: number
  REJECTED: number
  total: number
}

export interface AdminStats {
  users: number
  businesses: ApprovalCounts
  deliveries: ApprovalCounts
  profileChanges: ApprovalCounts
  orders: Record<string, number> & { total: number }
}

export interface AdminDashboardResponse {
  success: boolean
  stats: AdminStats
  pending: {
    businesses: BusinessApplication[]
    deliveries: DeliveryApplication[]
    profileChanges: ProfileChangeRequest[]
  }
}

export interface AdminRequestsResponse {
  success: boolean
  filters: {
    type: 'all' | 'business' | 'delivery'
    status: ApprovalStatus | 'ALL'
  }
  pagination: {
    page: number
    limit: number
    businesses: { total: number; totalPages: number }
    deliveries: { total: number; totalPages: number }
  }
  businesses: BusinessApplication[]
  deliveries: DeliveryApplication[]
}

export interface ApplicationResponse<T> {
  success: boolean
  message?: string
  business?: T
  delivery?: T
}
