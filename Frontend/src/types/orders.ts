import type { OrderRating, RatingStats } from './ratings'

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'

export interface OrderBusinessSummary {
  id: number
  businessName: string
  logoUrl: string | null
  address: string
  city: string
  contactPhone: string | null
  deliveryFee: number | string
}

export interface OrderDeliverySummary {
  id: number
  vehicleType: string
  vehiclePlate: string | null
  city: string
  user: {
    id: number
    name: string
    phone: string | null
  }
}

export interface OrderClientSummary {
  id: number
  name: string
  email?: string
  phone: string | null
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number | null
  productName: string
  unitPrice: number | string
  quantity: number
  total: number | string
  createdAt: string
}

export interface OrderStatusChange {
  id: number
  status: OrderStatus
  note: string | null
  createdAt: string
  changedBy: {
    id: number
    name: string
  } | null
}

export interface Order {
  id: number
  clientId: number
  businessId: number
  deliveryId: number | null
  status: OrderStatus
  paymentMethod: PaymentMethod
  subtotal: number | string
  deliveryFee: number | string
  total: number | string
  address: string
  city: string
  department: string | null
  contactPhone: string | null
  notes: string | null
  rejectionReason: string | null
  cancellationReason: string | null
  acceptedAt: string | null
  readyAt: string | null
  assignedAt: string | null
  dispatchedAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  rejectedAt: string | null
  createdAt: string
  updatedAt: string
  business: OrderBusinessSummary
  delivery: OrderDeliverySummary | null
  client?: OrderClientSummary
  items: OrderItem[]
  history?: OrderStatusChange[]
  ratings?: OrderRating[]
}

export interface OrdersPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface OrdersResponse {
  success: boolean
  pagination: OrdersPagination
  orders: Order[]
}

export interface OrderResponse {
  success: boolean
  message?: string
  order: Order
}

export interface CreateOrderPayload {
  businessId: number
  items: Array<{ productId: number; quantity: number }>
  address: string
  city: string
  department?: string
  contactPhone?: string
  paymentMethod?: PaymentMethod
  notes?: string
}

export interface CartBusiness {
  id: number
  businessName: string
  logoUrl: string | null
  city: string
  deliveryFee: number
}

export interface CartItem {
  productId: number
  name: string
  price: number
  imageUrl: string | null
  quantity: number
  stock: number | null
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type BusinessType = 'RESTAURANT' | 'STORE'

export interface BusinessProfile {
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
  deliveryFee: number | string
  status: ApprovalStatus
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  rating?: RatingStats
}

export interface BusinessProfileResponse {
  success: boolean
  business: BusinessProfile
}

export interface ProductCategory {
  id: number
  businessId: number
  name: string
  description: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  _count?: {
    products: number
  }
}

export interface CategoriesResponse {
  success: boolean
  categories: ProductCategory[]
}

export interface CategoryResponse {
  success: boolean
  message?: string
  category: ProductCategory
}

export interface BusinessProduct {
  id: number
  businessId: number
  categoryId: number | null
  name: string
  description: string | null
  price: number | string
  imageUrl: string | null
  sku: string | null
  stock: number | null
  isAvailable: boolean
  isActive: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  category: {
    id: number
    name: string
  } | null
}

export interface ProductsResponse {
  success: boolean
  pagination: OrdersPagination
  products: BusinessProduct[]
}

export interface ProductResponse {
  success: boolean
  message?: string
  errors?: string[]
  product: BusinessProduct
}

export interface ProductPayload {
  name: string
  description?: string
  categoryId?: number | null
  price: number | string
  imageUrl?: string
  sku?: string
  stock?: number | null
  isAvailable?: boolean
}

export interface CategoryPayload {
  name: string
  description?: string
  sortOrder?: number
}
