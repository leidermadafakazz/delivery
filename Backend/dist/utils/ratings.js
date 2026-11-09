"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ratingStats = ratingStats;
exports.businessRatingStats = businessRatingStats;
exports.deliveryRatingStats = deliveryRatingStats;
exports.userRatingStats = userRatingStats;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const round2 = (value) => Math.round(value * 100) / 100;
async function ratingStats(where) {
    const result = await database_1.prisma.rating.aggregate({
        where,
        _avg: { score: true },
        _count: { _all: true }
    });
    return {
        average: result._avg.score ? round2(result._avg.score) : 0,
        count: result._count._all
    };
}
function businessRatingStats(businessId) {
    return ratingStats({
        targetType: client_1.RatingTarget.BUSINESS,
        businessId
    });
}
function deliveryRatingStats(deliveryId) {
    return ratingStats({
        targetType: client_1.RatingTarget.DELIVERY,
        deliveryId
    });
}
function userRatingStats(userId) {
    return ratingStats({
        targetType: client_1.RatingTarget.CLIENT,
        targetUserId: userId
    });
}
