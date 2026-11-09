import { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import { prisma } from "../config/database";
import {
    cleanString,
    getPagination,
    parseEnumValue,
    parseId
} from "../utils/profile";
import {
    ORDER_STATUSES,
    orderDetailInclude,
    orderListInclude,
    restoreOrderStock,
    serializeOrder,
    serializeOrders
} from "../utils/orders";

const BUSINESS_TARGET_STATUSES: readonly OrderStatus[] = [
    OrderStatus.PREPARING,
    OrderStatus.READY
];

function currentBusiness(res: Response): { id: number } {
    return res.locals.business as { id: number };
}

// LISTAR LOS PEDIDOS DE MI EMPRESA
export async function listBusinessOrders(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const { page, limit, skip } = getPagination(req.query);

        const rawStatus = req.query.status;
        const status = rawStatus
            ? parseEnumValue(rawStatus, ORDER_STATUSES)
            : null;

        if (rawStatus && !status) {
            return res.status(400).json({
                success: false,
                message: "Estado de pedido inválido"
            });
        }

        const search = cleanString(req.query.search);

        const where = {
            businessId: business.id,
            ...(status ? { status } : {}),
            ...(search
                ? {
                      OR: [
                          { client: { name: { contains: search } } },
                          { client: { email: { contains: search } } },
                          { address: { contains: search } }
                      ]
                  }
                : {})
        };

        const [total, orders] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                include: orderListInclude,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            })
        ]);

        return res.json({
            success: true,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            orders: serializeOrders(orders)
        });
    } catch (error) {
        console.error("Error listando pedidos de la empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos"
        });
    }
}

// DETALLE DE UN PEDIDO DE MI EMPRESA
export async function getBusinessOrder(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const order = await prisma.order.findFirst({
            where: {
                id,
                businessId: business.id
            },
            include: orderDetailInclude
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        return res.json({
            success: true,
            order: serializeOrder(order)
        });
    } catch (error) {
        console.error("Error consultando pedido de la empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el pedido"
        });
    }
}

// ACEPTAR PEDIDO (empresa)
export async function acceptBusinessOrder(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const userId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const order = await prisma.order.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        if (order.status !== OrderStatus.PENDING) {
            return res.status(409).json({
                success: false,
                message: "Solo se pueden aceptar pedidos pendientes"
            });
        }

        const updated = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: OrderStatus.ACCEPTED,
                acceptedAt: new Date(),
                history: {
                    create: {
                        status: OrderStatus.ACCEPTED,
                        changedById: userId,
                        note: "Pedido aceptado por la empresa"
                    }
                }
            },
            include: orderDetailInclude
        });

        return res.json({
            success: true,
            message: "Pedido aceptado correctamente",
            order: serializeOrder(updated)
        });
    } catch (error) {
        console.error("Error aceptando pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al aceptar el pedido"
        });
    }
}

// RECHAZAR PEDIDO (empresa)
export async function rejectBusinessOrder(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const userId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const reason = cleanString(req.body.reason);

        if (!reason || reason.length < 5) {
            return res.status(400).json({
                success: false,
                message:
                    "Debes indicar un motivo de rechazo de al menos 5 caracteres"
            });
        }

        const order = await prisma.order.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        if (order.status !== OrderStatus.PENDING) {
            return res.status(409).json({
                success: false,
                message: "Solo se pueden rechazar pedidos pendientes"
            });
        }

        const rejected = await prisma.$transaction(async tx => {
            await restoreOrderStock(tx, order.id);

            return tx.order.update({
                where: { id: order.id },
                data: {
                    status: OrderStatus.REJECTED,
                    rejectionReason: reason,
                    rejectedAt: new Date(),
                    history: {
                        create: {
                            status: OrderStatus.REJECTED,
                            changedById: userId,
                            note: reason
                        }
                    }
                },
                include: orderDetailInclude
            });
        });

        return res.json({
            success: true,
            message: "Pedido rechazado correctamente",
            order: serializeOrder(rejected)
        });
    } catch (error) {
        console.error("Error rechazando pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al rechazar el pedido"
        });
    }
}

// ACTUALIZAR ESTADO DEL PEDIDO (empresa): PREPARING o READY
export async function updateBusinessOrderStatus(
    req: Request,
    res: Response
) {
    try {
        const business = currentBusiness(res);
        const userId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const targetStatus = parseEnumValue(
            req.body.status,
            BUSINESS_TARGET_STATUSES
        );

        if (!targetStatus) {
            return res.status(400).json({
                success: false,
                message: "Estado inválido. Usa PREPARING o READY"
            });
        }

        const order = await prisma.order.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        if (
            targetStatus === OrderStatus.PREPARING &&
            order.status !== OrderStatus.ACCEPTED
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Solo puedes pasar a PREPARING un pedido que ya fue aceptado"
            });
        }

        if (
            targetStatus === OrderStatus.READY &&
            order.status !== OrderStatus.PREPARING
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Solo puedes marcar como READY un pedido que está en preparación"
            });
        }

        const updated = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: targetStatus,
                ...(targetStatus === OrderStatus.READY
                    ? { readyAt: new Date() }
                    : {}),
                history: {
                    create: {
                        status: targetStatus,
                        changedById: userId,
                        note:
                            targetStatus === OrderStatus.PREPARING
                                ? "Pedido en preparación"
                                : "Pedido listo para entrega"
                    }
                }
            },
            include: orderDetailInclude
        });

        return res.json({
            success: true,
            message:
                targetStatus === OrderStatus.PREPARING
                    ? "Pedido marcado en preparación"
                    : "Pedido marcado como listo para entrega",
            order: serializeOrder(updated)
        });
    } catch (error) {
        console.error("Error actualizando estado del pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar el pedido"
        });
    }
}
