import type { RatingStats } from './ratings'

export type BusinessType = 'RESTAURANT' | 'STORE'

export interface BusinessCatalogSummary {
  id: number
  businessName: string
  description: string | null
  businessType: BusinessType
  address: string
  city: string
  department: string | null
  contactPhone: string | null
  logoUrl: string | null
  deliveryFee: string | number
  createdAt: string
  productCount: number
  rating: RatingStats
}

export interface ProductSummary {
  id: number
  categoryId: number | null
  name: string
  description: string | null
  price: string | number
  imageUrl: string | null
  sku: string | null
  stock: number | null
  isAvailable: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CategoryWithProducts {
  id: number
  name: string
  description: string | null
  sortOrder: number
  products: ProductSummary[]
}

export interface BusinessCatalogDetail {
  business: BusinessCatalogSummary
  categories: CategoryWithProducts[]
  uncategorized: ProductSummary[]
}

export interface CatalogBusinessesResponse {
  success: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  businesses: BusinessCatalogSummary[]
}

export interface BusinessCatalogResponse {
  success: boolean
  business: BusinessCatalogSummary
  categories: CategoryWithProducts[]
  uncategorized: ProductSummary[]
}

