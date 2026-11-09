export type RatingTargetType = 'BUSINESS' | 'DELIVERY' | 'CLIENT'

export interface RatingStats {
  average: number
  count: number
}

export interface Rating {
  id: number
  orderId: number
  raterId: number
  targetType: RatingTargetType
  score: number
  comment: string | null
  createdAt: string
  rater: {
    id: number
    name: string
  }
  targetUser: {
    id: number
    name: string
  }
}

export interface OrderRating {
  id: number
  raterId: number
  targetType: RatingTargetType
  score: number
  comment: string | null
  createdAt: string
  rater: {
    id: number
    name: string
  }
}

export interface OrderRatingsResponse {
  success: boolean
  ratings: Rating[]
}

export interface MyRatingsResponse {
  success: boolean
  stats: {
    client: RatingStats
    business: RatingStats
    delivery: RatingStats
  }
  recent: Rating[]
}

export interface RatingNotificationPayload {
  id: number
  orderId: number
  targetType: RatingTargetType
  score: number
  comment: string | null
  average: number
  count: number
  from: {
    id: number
    name: string
  }
  createdAt: string
}

export const TARGET_LABELS: Record<RatingTargetType, string> = {
  BUSINESS: 'Negocio',
  DELIVERY: 'Domiciliario',
  CLIENT: 'Cliente',
}

export function emptyStats(): RatingStats {
  return { average: 0, count: 0 }
}
