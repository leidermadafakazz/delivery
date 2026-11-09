import { api } from './api'
import type {
  MyRatingsResponse,
  OrderRatingsResponse,
  Rating,
  RatingStats,
  RatingTargetType,
} from '../types/ratings'

export async function fetchOrderRatings(orderId: number): Promise<Rating[]> {
  const { data } = await api.get<OrderRatingsResponse>(
    `/api/ratings/orders/${orderId}`,
  )

  return data.ratings
}

export interface SubmitRatingPayload {
  targetType: RatingTargetType
  score: number
  comment?: string
}

export interface SubmitRatingResponse {
  success: boolean
  message: string
  rating: Rating
  stats: RatingStats
}

export async function submitRating(
  orderId: number,
  payload: SubmitRatingPayload,
): Promise<SubmitRatingResponse> {
  const { data } = await api.post<SubmitRatingResponse>(
    `/api/ratings/orders/${orderId}`,
    payload,
  )

  return data
}

export async function fetchMyRatings(): Promise<MyRatingsResponse> {
  const { data } = await api.get<MyRatingsResponse>('/api/ratings/me')

  return data
}
