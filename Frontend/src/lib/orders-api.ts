import { api } from './api'
import type {
  BusinessProfile,
  BusinessProfileResponse,
  CategoriesResponse,
  CategoryPayload,
  CategoryResponse,
  CreateOrderPayload,
  OrderResponse,
  OrdersResponse,
  OrderStatus,
  ProductCategory,
  ProductPayload,
  ProductResponse,
  ProductsResponse,
} from '../types/orders'

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export async function createOrder(payload: CreateOrderPayload): Promise<OrderResponse> {
  const { data } = await api.post<OrderResponse>('/api/orders', payload)
  return data
}

export interface ListOrdersParams {
  status?: OrderStatus | ''
  page?: number
  limit?: number
}

export async function fetchMyOrders(params: ListOrdersParams = {}): Promise<OrdersResponse> {
  const query: Record<string, string | number> = {}
  if (params.status) query.status = params.status
  if (params.page) query.page = params.page
  if (params.limit) query.limit = params.limit

  const { data } = await api.get<OrdersResponse>('/api/orders', { params: query })
  return data
}

export async function fetchMyOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await api.get<OrderResponse>(`/api/orders/${orderId}`)
  return data
}

export async function cancelMyOrder(orderId: number, reason: string): Promise<OrderResponse> {
  const { data } = await api.patch<OrderResponse>(`/api/orders/${orderId}/cancel`, { reason })
  return data
}

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

export async function fetchMyBusiness(): Promise<BusinessProfile> {
  const { data } = await api.get<BusinessProfileResponse>('/api/businesses/me')
  return data.business
}

export async function fetchBusinessOrders(
  params: ListOrdersParams & { search?: string } = {},
): Promise<OrdersResponse> {
  const query: Record<string, string | number> = {}
  if (params.status) query.status = params.status
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.page) query.page = params.page
  if (params.limit) query.limit = params.limit

  const { data } = await api.get<OrdersResponse>('/api/businesses/me/orders', {
    params: query,
  })
  return data
}

export async function fetchBusinessOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await api.get<OrderResponse>(`/api/businesses/me/orders/${orderId}`)
  return data
}

export async function acceptBusinessOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await api.patch<OrderResponse>(
    `/api/businesses/me/orders/${orderId}/accept`,
  )
  return data
}

export async function rejectBusinessOrder(
  orderId: number,
  reason: string,
): Promise<OrderResponse> {
  const { data } = await api.patch<OrderResponse>(
    `/api/businesses/me/orders/${orderId}/reject`,
    { reason },
  )
  return data
}

export async function updateBusinessOrderStatus(
  orderId: number,
  status: Extract<OrderStatus, 'PREPARING' | 'READY'>,
): Promise<OrderResponse> {
  const { data } = await api.patch<OrderResponse>(
    `/api/businesses/me/orders/${orderId}/status`,
    { status },
  )
  return data
}

// ---------------------------------------------------------------------------
// Catálogo de la empresa
// ---------------------------------------------------------------------------

export async function fetchMyCategories(): Promise<ProductCategory[]> {
  const { data } = await api.get<CategoriesResponse>('/api/businesses/me/categories')
  return data.categories
}

export async function createCategory(payload: CategoryPayload): Promise<CategoryResponse> {
  const { data } = await api.post<CategoryResponse>(
    '/api/businesses/me/categories',
    payload,
  )
  return data
}

export async function updateCategory(
  categoryId: number,
  payload: CategoryPayload,
): Promise<CategoryResponse> {
  const { data } = await api.put<CategoryResponse>(
    `/api/businesses/me/categories/${categoryId}`,
    payload,
  )
  return data
}

export async function deleteCategory(categoryId: number): Promise<void> {
  await api.delete(`/api/businesses/me/categories/${categoryId}`)
}

export interface ListProductsParams {
  search?: string
  categoryId?: number | ''
  includeDeleted?: boolean
  page?: number
  limit?: number
}

export async function fetchMyProducts(
  params: ListProductsParams = {},
): Promise<ProductsResponse> {
  const query: Record<string, string | number | boolean> = {}
  if (params.search?.trim()) query.search = params.search.trim()
  if (params.categoryId) query.categoryId = params.categoryId
  if (params.includeDeleted) query.includeDeleted = true
  if (params.page) query.page = params.page
  if (params.limit) query.limit = params.limit

  const { data } = await api.get<ProductsResponse>('/api/businesses/me/products', {
    params: query,
  })
  return data
}

export async function createProduct(payload: ProductPayload): Promise<ProductResponse> {
  const { data } = await api.post<ProductResponse>(
    '/api/businesses/me/products',
    payload,
  )
  return data
}

export async function updateProduct(
  productId: number,
  payload: ProductPayload,
): Promise<ProductResponse> {
  const { data } = await api.put<ProductResponse>(
    `/api/businesses/me/products/${productId}`,
    payload,
  )
  return data
}

export async function deleteProduct(productId: number): Promise<ProductResponse> {
  const { data } = await api.delete<ProductResponse>(
    `/api/businesses/me/products/${productId}`,
  )
  return data
}

export async function restoreProduct(productId: number): Promise<ProductResponse> {
  const { data } = await api.patch<ProductResponse>(
    `/api/businesses/me/products/${productId}/restore`,
  )
  return data
}

export async function setProductAvailability(
  productId: number,
  isAvailable: boolean,
): Promise<ProductResponse> {
  const { data } = await api.patch<ProductResponse>(
    `/api/businesses/me/products/${productId}/availability`,
    { isAvailable },
  )
  return data
}

// ---------------------------------------------------------------------------
// Domiciliario
// ---------------------------------------------------------------------------

export async function fetchAvailableOrders(): Promise<OrdersResponse> {
  const { data } = await api.get<OrdersResponse>('/api/deliveries/me/available-orders', {
    params: { limit: 50 },
  })
  return data
}

export async function fetchDeliveryOrders(
  params: ListOrdersParams = {},
): Promise<OrdersResponse> {
  const query: Record<string, string | number> = {}
  if (params.status) query.status = params.status
  if (params.page) query.page = params.page
  if (params.limit) query.limit = params.limit

  const { data } = await api.get<OrdersResponse>('/api/deliveries/me/orders', {
    params: query,
  })
  return data
}

export async function acceptAvailableOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await api.patch<OrderResponse>(
    `/api/deliveries/me/orders/${orderId}/accept`,
  )
  return data
}

export async function pickupOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await api.patch<OrderResponse>(
    `/api/deliveries/me/orders/${orderId}/pickup`,
  )
  return data
}

export async function deliverOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await api.patch<OrderResponse>(
    `/api/deliveries/me/orders/${orderId}/deliver`,
  )
  return data
}
