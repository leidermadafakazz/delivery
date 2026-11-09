import { api } from './api'
import type {
  BusinessCatalogResponse,
  CatalogBusinessesResponse,
} from '../types/catalog'

export interface ListBusinessesParams {
  search?: string
  businessType?: 'RESTAURANT' | 'STORE' | ''
  city?: string
  page?: number
  limit?: number
}

export async function fetchBusinesses(
  params: ListBusinessesParams = {},
): Promise<CatalogBusinessesResponse> {
  const queryParams: Record<string, string | number> = {}

  if (params.search?.trim()) {
    queryParams.search = params.search.trim()
  }

  if (params.businessType) {
    queryParams.businessType = params.businessType
  }

  if (params.city?.trim()) {
    queryParams.city = params.city.trim()
  }

  if (params.page) {
    queryParams.page = params.page
  }

  if (params.limit) {
    queryParams.limit = params.limit
  }

  const response = await api.get<CatalogBusinessesResponse>(
    '/api/catalog/businesses',
    { params: queryParams },
  )

  return response.data
}

export async function fetchBusinessCatalog(
  businessId: number,
): Promise<BusinessCatalogResponse> {
  const response = await api.get<BusinessCatalogResponse>(
    `/api/catalog/businesses/${businessId}`,
  )

  return response.data
}

