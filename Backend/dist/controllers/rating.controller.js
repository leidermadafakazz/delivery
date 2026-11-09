"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateOrder = rateOrder;
exports.listOrderRatings = listOrderRatings;
exports.getMyRatingSummary = getMyRatingSummary;
exports.getPublicRatingSummary = getPublicRatingSummary;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const socket_1 = require("../realtime/socket");
const ratings_1 = require("../utils/ratings");
const TARGETS = [
    client_1.RatingTarget.BUSINESS,
    client_1.RatingTarget.DELIVERY,
    client_1.RatingTarget.CLIENT
];
const ratingInclude = {
    rater: {
        select: {
            id: true,
            name: true
        }
    },
    targetUser: {
        select: {
            id: true,
            name: true
        }
    }
};
function parseScore(value) {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
        return null;
    }
    return numeric;
}
// CALIFICAR UN PEDIDO ENTREGADO
async function rateOrder(req, res) {
    try {
        const orderId = (0, profile_1.parseId)(req.params.orderId);
        const raterId = res.locals.userId;
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const targetType = (0, profile_1.parseEnumValue)(req.body.targetType, TARGETS);
        if (!targetType) {
            return res.status(400).json({
                success: false,
                message: "Debes indicar a quién calificas: BUSINESS, DELIVERY o CLIENT"
            });
        }
        const score = parseScore(req.body.score);
        if (!score) {
            return res.status(400).json({
                success: false,
                message: "La puntuación debe ser un entero entre 1 y 5"
            });
        }
        const comment = (0, profile_1.cleanString)(req.body.comment);
        if (comment && comment.length > 500) {
            return res.status(400).json({
                success: false,
                message: "El comentario no puede superar 500 caracteres"
            });
        }
        const order = await database_1.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                business: {
                    select: {
                        id: true,
                        userId: true,
                        businessName: true
                    }
                },
                delivery: {
                    select: {
                        id: true,
                        userId: true,
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                client: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }
        if (order.status !== client_1.OrderStatus.DELIVERED) {
            return res.status(409).json({
                success: false,
                message: "Solo puedes calificar pedidos entregados"
            });
        }
        let targetUserId;
        let businessId = null;
        let deliveryId = null;
        if (targetType === client_1.RatingTarget.BUSINESS) {
            if (raterId !== order.clientId) {
                return res.status(403).json({
                    success: false,
                    message: "Solo el cliente puede calificar al negocio"
                });
            }
            businessId = order.businessId;
            targetUserId = order.business.userId;
        }
        else if (targetType === client_1.RatingTarget.DELIVERY) {
            if (raterId !== order.clientId) {
                return res.status(403).json({
                    success: false,
                    message: "Solo el cliente puede calificar al domiciliario"
                });
            }
            if (!order.delivery) {
                return res.status(409).json({
                    success: false,
                    message: "Este pedido no tiene domiciliario asignado"
                });
            }
            deliveryId = order.delivery.id;
            targetUserId = order.delivery.userId;
        }
        else {
            const isBusiness = raterId === order.business.userId;
            const isDelivery = order.delivery?.userId === raterId;
            if (!isBusiness && !isDelivery) {
                return res.status(403).json({
                    success: false,
                    message: "Solo el negocio o el domiciliario pueden calificar al cliente"
                });
            }
            targetUserId = order.clientId;
        }
        if (targetUserId === raterId) {
            return res.status(400).json({
                success: false,
                message: "No puedes calificarte a ti mismo"
            });
        }
        const existing = await database_1.prisma.rating.findUnique({
            where: {
                orderId_raterId_targetType: {
                    orderId,
                    raterId,
                    targetType
                }
            }
        });
        const rating = await database_1.prisma.rating.upsert({
            where: {
                orderId_raterId_targetType: {
                    orderId,
                    raterId,
                    targetType
                }
            },
            create: {
                orderId,
                raterId,
                targetType,
                targetUserId,
                businessId,
                deliveryId,
                score,
                comment
            },
            update: {
                score,
                comment
            },
            include: ratingInclude
        });
        const stats = targetType === client_1.RatingTarget.BUSINESS && businessId
            ? await (0, ratings_1.businessRatingStats)(businessId)
            : targetType === client_1.RatingTarget.DELIVERY && deliveryId
                ? await (0, ratings_1.deliveryRatingStats)(deliveryId)
                : await (0, ratings_1.userRatingStats)(targetUserId);
        if (!existing) {
            (0, socket_1.emitToUser)(targetUserId, "rating:new", {
                id: rating.id,
                orderId,
                targetType,
                score,
                comment,
                average: stats.average,
                count: stats.count,
                from: {
                    id: raterId,
                    name: rating.rater.name
                },
                createdAt: rating.createdAt
            });
        }
        return res.status(existing ? 200 : 201).json({
            success: true,
            message: existing
                ? "Calificación actualizada correctamente"
                : "Calificación enviada correctamente",
            rating,
            stats
        });
    }
    catch (error) {
        console.error("Error calificando pedido:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al guardar la calificación"
        });
    }
}
// CALIFICACIONES DE UN PEDIDO (solo participantes)
async function listOrderRatings(req, res) {
    try {
        const orderId = (0, profile_1.parseId)(req.params.orderId);
        const userId = res.locals.userId;
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const order = await database_1.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                clientId: true,
                business: {
                    select: { userId: true }
                },
                delivery: {
                    select: { userId: true }
                }
            }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }
        const isParticipant = userId === order.clientId ||
            userId === order.business.userId ||
            userId === order.delivery?.userId;
        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "No participaste en este pedido"
            });
        }
        const ratings = await database_1.prisma.rating.findMany({
            where: { orderId },
            include: ratingInclude,
            orderBy: { createdAt: "asc" }
        });
        return res.json({
            success: true,
            ratings
        });
    }
    catch (error) {
        console.error("Error listando calificaciones:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar las calificaciones"
        });
    }
}
// MI REPUTACIÓN (recibidas como cliente, empresa y domiciliario)
async function getMyRatingSummary(req, res) {
    try {
        const userId = res.locals.userId;
        const [businessProfile, deliveryProfile] = await Promise.all([
            database_1.prisma.businessProfile.findUnique({
                where: { userId },
                select: { id: true }
            }),
            database_1.prisma.deliveryProfile.findUnique({
                where: { userId },
                select: { id: true }
            })
        ]);
        const [asClient, asBusiness, asDelivery, recent] = await Promise.all([
            (0, ratings_1.userRatingStats)(userId),
            businessProfile
                ? (0, ratings_1.businessRatingStats)(businessProfile.id)
                : Promise.resolve({ average: 0, count: 0 }),
            deliveryProfile
                ? (0, ratings_1.deliveryRatingStats)(deliveryProfile.id)
                : Promise.resolve({ average: 0, count: 0 }),
            database_1.prisma.rating.findMany({
                where: { targetUserId: userId },
                include: ratingInclude,
                orderBy: { createdAt: "desc" },
                take: 10
            })
        ]);
        return res.json({
            success: true,
            stats: {
                client: asClient,
                business: asBusiness,
                delivery: asDelivery
            },
            recent
        });
    }
    catch (error) {
        console.error("Error consultando mi reputación:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar la reputación"
        });
    }
}
// RESUMEN PÚBLICO DE UN NEGOCIO O DOMICILIARIO
async function getPublicRatingSummary(req, res) {
    try {
        const businessId = req.query.businessId
            ? (0, profile_1.parseId)(req.query.businessId)
            : null;
        const deliveryId = req.query.deliveryId
            ? (0, profile_1.parseId)(req.query.deliveryId)
            : null;
        if (businessId) {
            return res.json({
                success: true,
                targetType: client_1.RatingTarget.BUSINESS,
                stats: await (0, ratings_1.businessRatingStats)(businessId)
            });
        }
        if (deliveryId) {
            return res.json({
                success: true,
                targetType: client_1.RatingTarget.DELIVERY,
                stats: await (0, ratings_1.deliveryRatingStats)(deliveryId)
            });
        }
        return res.status(400).json({
            success: false,
            message: "Indica businessId o deliveryId"
        });
    }
    catch (error) {
        console.error("Error consultando resumen de calificaciones:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar las calificaciones"
        });
    }
}
