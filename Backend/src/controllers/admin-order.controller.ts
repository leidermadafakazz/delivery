import { Request, Response } from "express";
import {
    ApprovalStatus,
    OrderStatus
} from "@prisma/client";
import { prisma } from "../config/database";
import {
    cleanString,
    getPagination,
    parseEnumValue,
    parseId
} from "../utils/profile";
import {
    ORDER_STATUSES,
    TERMINAL_ORDER_STATUSES,
    orderDetailInclude,
    orderListInclude,
    restoreOrderStock,
    serializeOrder,
    serializeOrders
} from "../utils/orders";

const adminOrderListInclude = {
    ...orderListInclude,
    client: {
        select: {
            id: true,
            name: true,
            email: true,
            phone: true
        }
    }
} as const;


export async function listAllOrders(req: Request, res: Response) {
    try {
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

        let businessId: number | undefined;
        let clientId: number | undefined;
        let deliveryId: number | undefined;

        if (req.query.businessId !== undefined) {
            const parsed = parseId(req.query.businessId);

            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro businessId no es válido"
                });
            }

            businessId = parsed;
        }

        if (req.query.clientId !== undefined) {
            const parsed = parseId(req.query.clientId);

            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro clientId no es válido"
                });
            }

            clientId = parsed;
        }

        if (req.query.deliveryId !== undefined) {
            const parsed = parseId(req.query.deliveryId);

            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro deliveryId no es válido"
                });
            }

            deliveryId = parsed;
        }

        const search = cleanString(req.query.search);

        const where = {
            ...(status ? { status } : {}),
            ...(businessId ? { businessId } : {}),
            ...(clientId ? { clientId } : {}),
            ...(deliveryId ? { deliveryId } : {}),
            ...(search
                ? {
                      OR: [
                          { client: { name: { contains: search } } },
                          { client: { email: { contains: search } } },
                          {
                              business: {
                                  businessName: { contains: search }
                              }
                          },
                          { address: { contains: search } }
                      ]
                  }
                : {})
        };

        const [total, orders] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                include: adminOrderListInclude,
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
        console.error("Error listando pedidos (admin):", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos"
        });
    }
}


export async function getOrderById(req: Request, res: Response) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const order = await prisma.order.findUnique({
            where: { id },
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
        console.error("Error consultando pedido (admin):", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el pedido"
        });
    }
}

// ASIGNAR DOMICILIARIO 
export async function assignOrderDelivery(req: Request, res: Response) {
    try {
        const adminId = res.locals.userId as number;
        const id = parseId(req.params.id);
        const deliveryId = parseId(req.body.deliveryId);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        if (!deliveryId) {
            return res.status(400).json({
                success: false,
                message: "Debes indicar un deliveryId válido"
            });
        }

        const order = await prisma.order.findUnique({
            where: { id }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        if (order.status !== OrderStatus.READY) {
            return res.status(409).json({
                success: false,
                message:
                    "Solo se pueden asignar pedidos que estén listos para entrega"
            });
        }

        if (order.deliveryId !== null) {
            return res.status(409).json({
                success: false,
                message: "El pedido ya tiene un domiciliario asignado"
            });
        }

        const delivery = await prisma.deliveryProfile.findFirst({
            where: {
                id: deliveryId,
                status: ApprovalStatus.APPROVED,
                user: { isActive: true }
            },
            select: {
                id: true,
                user: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: "Domiciliario no encontrado o no aprobado"
            });
        }

        const updated = await prisma.order.update({
            where: { id },
            data: {
                deliveryId: delivery.id,
                assignedAt: new Date(),
                history: {
                    create: {
                        status: order.status,
                        changedById: adminId,
                        note: `Domiciliario asignado: ${delivery.user.name}`
                    }
                }
            },
            include: orderDetailInclude
        });

        return res.json({
            success: true,
            message:
                "Domiciliario asignado. El pedido sigue listo hasta que sea recogido.",
            order: serializeOrder(updated)
        });
    } catch (error) {
        console.error("Error asignando domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al asignar el domiciliario"
        });
    }
}

// CANCELAR PEDIDO 
export async function cancelOrder(req: Request, res: Response) {
    try {
        const adminId = res.locals.userId as number;
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
                    "Debes indicar un motivo de cancelación de al menos 5 caracteres"
            });
        }

        const order = await prisma.order.findUnique({
            where: { id }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        if (TERMINAL_ORDER_STATUSES.includes(order.status)) {
            return res.status(409).json({
                success: false,
                message: "Este pedido ya está finalizado"
            });
        }

        const cancelled = await prisma.$transaction(async tx => {
            await restoreOrderStock(tx, order.id);

            return tx.order.update({
                where: { id: order.id },
                data: {
                    status: OrderStatus.CANCELLED,
                    cancellationReason: reason,
                    cancelledAt: new Date(),
                    history: {
                        create: {
                            status: OrderStatus.CANCELLED,
                            changedById: adminId,
                            note: reason
                        }
                    }
                },
                include: orderDetailInclude
            });
        });

        return res.json({
            success: true,
            message: "Pedido cancelado por el administrador",
            order: serializeOrder(cancelled)
        });
    } catch (error) {
        console.error("Error cancelando pedido (admin):", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al cancelar el pedido"
        });
    }
}
