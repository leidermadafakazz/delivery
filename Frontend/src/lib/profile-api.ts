import { api } from './api'
import type {
  ProfileChangePayload,
  ProfileChangeResponse,
  ProfileChangesListResponse,
  ProfileChangeRequest,
} from '../types/profile-change'
import type { ApprovalStatus } from '../types/applications'

export async function fetchMyProfileChange(): Promise<ProfileChangeRequest | null> {
  const { data } = await api.get<{
    success: boolean
    request: ProfileChangeRequest | null
  }>('/api/profile/change')

  return data.request
}

export async function submitProfileChange(
  payload: ProfileChangePayload,
): Promise<ProfileChangeResponse> {
  const { data } = await api.put<ProfileChangeResponse>(
    '/api/profile/change',
    payload,
  )

  return data
}

export interface AdminProfileChangesParams {
  status?: ApprovalStatus | 'ALL'
  page?: number
  limit?: number
}

export async function fetchAdminProfileChanges(
  params: AdminProfileChangesParams = {},
): Promise<ProfileChangesListResponse> {
  const query: Record<string, string | number> = {}

  if (params.status && params.status !== 'ALL') {
    query.status = params.status
  }

  if (params.page) {
    query.page = params.page
  }

  if (params.limit) {
    query.limit = params.limit
  }

  const { data } = await api.get<ProfileChangesListResponse>(
    '/api/admin/profile-changes',
    { params: query },
  )

  return data
}

export async function approveProfileChange(
  id: number,
): Promise<ProfileChangeRequest> {
  const { data } = await api.patch<{ request: ProfileChangeRequest }>(
    `/api/admin/profile-changes/${id}/approve`,
  )

  return data.request
}

export async function rejectProfileChange(
  id: number,
  reason: string,
): Promise<ProfileChangeRequest> {
  const { data } = await api.patch<{ request: ProfileChangeRequest }>(
    `/api/admin/profile-changes/${id}/reject`,
    { reason },
  )

  return data.request
}
