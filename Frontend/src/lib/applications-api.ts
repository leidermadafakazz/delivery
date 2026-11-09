import axios from 'axios'
import { api } from './api'
import type {
  AdminDashboardResponse,
  AdminRequestsResponse,
  ApprovalStatus,
  BusinessApplication,
  BusinessApplicationPayload,
  DeliveryApplication,
  DeliveryApplicationPayload,
} from '../types/applications'

async function fetchOrNull<T>(url: string, key: 'business' | 'delivery'): Promise<T | null> {
  try {
    const { data } = await api.get<Record<string, unknown>>(url)

    return (data[key] as T) ?? null
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }

    throw error
  }
}

export function getValidationErrors(error: unknown): string[] {
  if (axios.isAxiosError<{ errors?: string[] }>(error)) {
    return error.response?.data?.errors ?? []
  }

  return []
}

// ---------------------------------------------------------------------------
// Solicitud de empresa
// ---------------------------------------------------------------------------

export async function fetchMyBusinessApplication(): Promise<BusinessApplication | null> {
  return fetchOrNull<BusinessApplication>('/api/businesses/me', 'business')
}

export async function registerBusinessApplication(
  payload: BusinessApplicationPayload,
): Promise<BusinessApplication> {
  const { data } = await api.post<{ business: BusinessApplication }>(
    '/api/businesses/register',
    payload,
  )

  return data.business
}

export async function updateBusinessApplication(
  payload: BusinessApplicationPayload,
): Promise<BusinessApplication> {
  const { data } = await api.put<{ business: BusinessApplication }>(
    '/api/businesses/me',
    payload,
  )

  return data.business
}

// ---------------------------------------------------------------------------
// Solicitud de domiciliario
// ---------------------------------------------------------------------------

export async function fetchMyDeliveryApplication(): Promise<DeliveryApplication | null> {
  return fetchOrNull<DeliveryApplication>('/api/deliveries/me', 'delivery')
}

export async function registerDeliveryApplication(
  payload: DeliveryApplicationPayload,
): Promise<DeliveryApplication> {
  const { data } = await api.post<{ delivery: DeliveryApplication }>(
    '/api/deliveries/register',
    payload,
  )

  return data.delivery
}

export async function updateDeliveryApplication(
  payload: DeliveryApplicationPayload,
): Promise<DeliveryApplication> {
  const { data } = await api.put<{ delivery: DeliveryApplication }>(
    '/api/deliveries/me',
    payload,
  )

  return data.delivery
}

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

export async function fetchAdminDashboard(): Promise<AdminDashboardResponse> {
  const { data } = await api.get<AdminDashboardResponse>('/api/admin/dashboard')

  return data
}

export interface AdminRequestsParams {
  type: 'business' | 'delivery'
  status?: ApprovalStatus | 'ALL'
  page?: number
  limit?: number
}

export async function fetchAdminRequests(
  params: AdminRequestsParams,
): Promise<AdminRequestsResponse> {
  const query: Record<string, string | number> = { type: params.type }

  if (params.status && params.status !== 'ALL') {
    query.status = params.status
  }

  if (params.page) {
    query.page = params.page
  }

  if (params.limit) {
    query.limit = params.limit
  }

  const { data } = await api.get<AdminRequestsResponse>('/api/admin/requests', {
    params: query,
  })

  return data
}

export async function approveBusinessApplication(
  id: number,
): Promise<BusinessApplication> {
  const { data } = await api.patch<{ business: BusinessApplication }>(
    `/api/businesses/${id}/approve`,
  )

  return data.business
}

export async function rejectBusinessApplication(
  id: number,
  reason: string,
): Promise<BusinessApplication> {
  const { data } = await api.patch<{ business: BusinessApplication }>(
    `/api/businesses/${id}/reject`,
    { reason },
  )

  return data.business
}

export async function approveDeliveryApplication(
  id: number,
): Promise<DeliveryApplication> {
  const { data } = await api.patch<{ delivery: DeliveryApplication }>(
    `/api/deliveries/${id}/approve`,
  )

  return data.delivery
}

export async function rejectDeliveryApplication(
  id: number,
  reason: string,
): Promise<DeliveryApplication> {
  const { data } = await api.patch<{ delivery: DeliveryApplication }>(
    `/api/deliveries/${id}/reject`,
    { reason },
  )

  return data.delivery
}
