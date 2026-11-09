import { Request, Response } from "express";
import { OrderStatus, RatingTarget } from "@prisma/client";
import { prisma } from "../config/database";
import { cleanString, parseEnumValue, parseId } from "../utils/profile";
import { emitToUser } from "../realtime/socket";
import {
    businessRatingStats,
    deliveryRatingStats,
    userRatingStats
} from "../utils/ratings";

const TARGETS: readonly RatingTarget[] = [
    RatingTarget.BUSINESS,
    RatingTarget.DELIVERY,
    RatingTarget.CLIENT
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
} as const;

function parseScore(value: unknown): number | null {
    const numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
        return null;
    }

    return numeric;
}

// CALIFICAR UN PEDIDO ENTREGADO
export async function rateOrder(req: Request, res: Response) {
    try {
        const orderId = parseId(req.params.orderId);
        const raterId = res.locals.userId as number;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const targetType = parseEnumValue(req.body.targetType, TARGETS);

        if (!targetType) {
            return res.status(400).json({
                success: false,
                message:
                    "Debes indicar a quién calificas: BUSINESS, DELIVERY o CLIENT"
            });
        }

        const score = parseScore(req.body.score);

        if (!score) {
            return res.status(400).json({
                success: false,
                message: "La puntuación debe ser un entero entre 1 y 5"
            });
        }

        const comment = cleanString(req.body.comment);

        if (comment && comment.length > 500) {
            return res.status(400).json({
                success: false,
                message: "El comentario no puede superar 500 caracteres"
            });
        }

        const order = await prisma.order.findUnique({
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

        if (order.status !== OrderStatus.DELIVERED) {
            return res.status(409).json({
                success: false,
                message: "Solo puedes calificar pedidos entregados"
            });
        }

        let targetUserId: number;
        let businessId: number | null = null;
        let deliveryId: number | null = null;

        if (targetType === RatingTarget.BUSINESS) {
            if (raterId !== order.clientId) {
                return res.status(403).json({
                    success: false,
                    message: "Solo el cliente puede calificar al negocio"
                });
            }

            businessId = order.businessId;
            targetUserId = order.business.userId;
        } else if (targetType === RatingTarget.DELIVERY) {
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
        } else {
            const isBusiness = raterId === order.business.userId;
            const isDelivery = order.delivery?.userId === raterId;

            if (!isBusiness && !isDelivery) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Solo el negocio o el domiciliario pueden calificar al cliente"
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

        const existing = await prisma.rating.findUnique({
            where: {
                orderId_raterId_targetType: {
                    orderId,
                    raterId,
                    targetType
                }
            }
        });

        const rating = await prisma.rating.upsert({
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

        const stats =
            targetType === RatingTarget.BUSINESS && businessId
                ? await businessRatingStats(businessId)
                : targetType === RatingTarget.DELIVERY && deliveryId
                  ? await deliveryRatingStats(deliveryId)
                  : await userRatingStats(targetUserId);

        if (!existing) {
            emitToUser(targetUserId, "rating:new", {
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
    } catch (error) {
        console.error("Error calificando pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al guardar la calificación"
        });
    }
}

// CALIFICACIONES DE UN PEDIDO (solo participantes)
export async function listOrderRatings(req: Request, res: Response) {
    try {
        const orderId = parseId(req.params.orderId);
        const userId = res.locals.userId as number;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const order = await prisma.order.findUnique({
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

        const isParticipant =
            userId === order.clientId ||
            userId === order.business.userId ||
            userId === order.delivery?.userId;

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "No participaste en este pedido"
            });
        }

        const ratings = await prisma.rating.findMany({
            where: { orderId },
            include: ratingInclude,
            orderBy: { createdAt: "asc" }
        });

        return res.json({
            success: true,
            ratings
        });
    } catch (error) {
        console.error("Error listando calificaciones:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar las calificaciones"
        });
    }
}

// MI REPUTACIÓN (recibidas como cliente, empresa y domiciliario)
export async function getMyRatingSummary(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const [businessProfile, deliveryProfile] = await Promise.all([
            prisma.businessProfile.findUnique({
                where: { userId },
                select: { id: true }
            }),
            prisma.deliveryProfile.findUnique({
                where: { userId },
                select: { id: true }
            })
        ]);

        const [asClient, asBusiness, asDelivery, recent] = await Promise.all([
            userRatingStats(userId),
            businessProfile
                ? businessRatingStats(businessProfile.id)
                : Promise.resolve({ average: 0, count: 0 }),
            deliveryProfile
                ? deliveryRatingStats(deliveryProfile.id)
                : Promise.resolve({ average: 0, count: 0 }),
            prisma.rating.findMany({
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
    } catch (error) {
        console.error("Error consultando mi reputación:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar la reputación"
        });
    }
}

// RESUMEN PÚBLICO DE UN NEGOCIO O DOMICILIARIO
export async function getPublicRatingSummary(req: Request, res: Response) {
    try {
        const businessId = req.query.businessId
            ? parseId(req.query.businessId)
            : null;
        const deliveryId = req.query.deliveryId
            ? parseId(req.query.deliveryId)
            : null;

        if (businessId) {
            return res.json({
                success: true,
                targetType: RatingTarget.BUSINESS,
                stats: await businessRatingStats(businessId)
            });
        }

        if (deliveryId) {
            return res.json({
                success: true,
                targetType: RatingTarget.DELIVERY,
                stats: await deliveryRatingStats(deliveryId)
            });
        }

        return res.status(400).json({
            success: false,
            message: "Indica businessId o deliveryId"
        });
    } catch (error) {
        console.error("Error consultando resumen de calificaciones:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar las calificaciones"
        });
    }
}
