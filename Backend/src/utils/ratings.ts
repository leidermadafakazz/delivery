import { Prisma, RatingTarget } from "@prisma/client";
import { prisma } from "../config/database";

export interface RatingStats {
    average: number;
    count: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export async function ratingStats(
    where: Prisma.RatingWhereInput
): Promise<RatingStats> {
    const result = await prisma.rating.aggregate({
        where,
        _avg: { score: true },
        _count: { _all: true }
    });

    return {
        average: result._avg.score ? round2(result._avg.score) : 0,
        count: result._count._all
    };
}

export function businessRatingStats(businessId: number) {
    return ratingStats({
        targetType: RatingTarget.BUSINESS,
        businessId
    });
}

export function deliveryRatingStats(deliveryId: number) {
    return ratingStats({
        targetType: RatingTarget.DELIVERY,
        deliveryId
    });
}

export function userRatingStats(userId: number) {
    return ratingStats({
        targetType: RatingTarget.CLIENT,
        targetUserId: userId
    });
}
