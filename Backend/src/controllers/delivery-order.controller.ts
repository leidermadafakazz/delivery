import { Request, Response } from "express";
import { ApprovalStatus, OrderStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { getPagination, parseEnumValue, parseId } from "../utils/profile";
import {
    OrderError,
    ORDER_STATUSES,
    orderDetailInclude,
    orderListInclude,
    serializeOrder,
    serializeOrders
} from "../utils/orders";

const deliveryOrderInclude = {
    ...orderListInclude,
    client: {
        select: {
            id: true,
            name: true,
            phone: true
        }
    }
} as const;

function currentDelivery(res: Response): { id: number } {
    return res.locals.delivery as { id: number };
}

// PEDIDOS LISTOS DISPONIBLES PARA TOMAR
export async function listAvailableOrders(req: Request, res: Response) {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const where = {
            status: OrderStatus.READY,
            deliveryId: null,
            business: {
                status: ApprovalStatus.APPROVED,
                user: { isActive: true }
            }
        };

        const [total, orders] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                include: deliveryOrderInclude,
                orderBy: { createdAt: "asc" },
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
        console.error("Error listando pedidos disponibles:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos disponibles"
        });
    }
}

// MIS PEDIDOS ASIGNADOS (domiciliario)
export async function listMyDeliveryOrders(req: Request, res: Response) {
    try {
        const delivery = currentDelivery(res);
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

        const where = {
            deliveryId: delivery.id,
            ...(status ? { status } : {})
        };

        const [total, orders] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                include: deliveryOrderInclude,
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
        console.error("Error listando pedidos del domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos asignados"
        });
    }
}

// DETALLE DE UN PEDIDO ASIGNADO A MÍ
export async function getMyDeliveryOrder(req: Request, res: Response) {
    try {
        const delivery = currentDelivery(res);
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
                deliveryId: delivery.id
            },
            include: orderDetailInclude
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado o no asignado a ti"
            });
        }

        return res.json({
            success: true,
            order: serializeOrder(order)
        });
    } catch (error) {
        console.error("Error consultando pedido del domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el pedido"
        });
    }
}

// TOMAR UN PEDIDO DISPONIBLE (domiciliario)
export async function acceptAvailableOrder(req: Request, res: Response) {
    try {
        const delivery = currentDelivery(res);
        const userId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const order = await prisma.$transaction(async tx => {
            const current = await tx.order.findUnique({
                where: { id }
            });

            if (!current) {
                throw new OrderError("Pedido no encontrado", 404);
            }

            if (current.status !== OrderStatus.READY) {
                throw new OrderError(
                    "El pedido no está listo para entrega"
                );
            }

            if (current.deliveryId !== null) {
                throw new OrderError(
                    "El pedido ya tiene un domiciliario asignado"
                );
            }

            const claimed = await tx.order.updateMany({
                where: {
                    id,
                    status: OrderStatus.READY,
                    deliveryId: null
                },
                data: {
                    deliveryId: delivery.id,
                    status: OrderStatus.ON_THE_WAY,
                    assignedAt: new Date(),
                    dispatchedAt: new Date()
                }
            });

            if (claimed.count !== 1) {
                throw new OrderError(
                    "El pedido ya no está disponible para asignación"
                );
            }

            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: OrderStatus.ON_THE_WAY,
                    changedById: userId,
                    note: "Pedido tomado por el domiciliario"
                }
            });

            return tx.order.findUniqueOrThrow({
                where: { id },
                include: orderDetailInclude
            });
        });

        return res.json({
            success: true,
            message: "Pedido asignado. Ya puedes iniciar la entrega.",
            order: serializeOrder(order)
        });
    } catch (error) {
        if (error instanceof OrderError) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }

        console.error("Error tomando pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al tomar el pedido"
        });
    }
}

// RECOGER UN PEDIDO ASIGNADO POR EL ADMINISTRADOR
export async function pickupOrder(req: Request, res: Response) {
    try {
        const delivery = currentDelivery(res);
        const userId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const order = await prisma.$transaction(async tx => {
            const current = await tx.order.findUnique({
                where: { id }
            });

            if (!current) {
                throw new OrderError("Pedido no encontrado", 404);
            }

            if (current.deliveryId !== delivery.id) {
                throw new OrderError(
                    "Este pedido no está asignado a ti",
                    403
                );
            }

            if (current.status !== OrderStatus.READY) {
                throw new OrderError(
                    "El pedido no está listo para recoger"
                );
            }

            const updated = await tx.order.updateMany({
                where: {
                    id,
                    deliveryId: delivery.id,
                    status: OrderStatus.READY
                },
                data: {
                    status: OrderStatus.ON_THE_WAY,
                    dispatchedAt: new Date()
                }
            });

            if (updated.count !== 1) {
                throw new OrderError(
                    "El pedido ya no está listo para recoger"
                );
            }

            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: OrderStatus.ON_THE_WAY,
                    changedById: userId,
                    note: "Pedido recogido por el domiciliario"
                }
            });

            return tx.order.findUniqueOrThrow({
                where: { id },
                include: orderDetailInclude
            });
        });

        return res.json({
            success: true,
            message: "Pedido recogido. Ya puedes iniciar la entrega.",
            order: serializeOrder(order)
        });
    } catch (error) {
        if (error instanceof OrderError) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }

        console.error("Error recogiendo pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al recoger el pedido"
        });
    }
}

// MARCAR PEDIDO COMO ENTREGADO (domiciliario)
export async function deliverOrder(req: Request, res: Response) {
    try {
        const delivery = currentDelivery(res);
        const userId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }

        const order = await prisma.$transaction(async tx => {
            const current = await tx.order.findUnique({
                where: { id }
            });

            if (!current) {
                throw new OrderError("Pedido no encontrado", 404);
            }

            if (current.deliveryId !== delivery.id) {
                throw new OrderError(
                    "Este pedido no está asignado a ti",
                    403
                );
            }

            if (current.status !== OrderStatus.ON_THE_WAY) {
                throw new OrderError(
                    "El pedido no está en camino"
                );
            }

            const updated = await tx.order.updateMany({
                where: {
                    id,
                    deliveryId: delivery.id,
                    status: OrderStatus.ON_THE_WAY
                },
                data: {
                    status: OrderStatus.DELIVERED,
                    deliveredAt: new Date()
                }
            });

            if (updated.count !== 1) {
                throw new OrderError(
                    "El pedido ya no está en camino"
                );
            }

            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: OrderStatus.DELIVERED,
                    changedById: userId,
                    note: "Pedido entregado al cliente"
                }
            });

            return tx.order.findUniqueOrThrow({
                where: { id },
                include: orderDetailInclude
            });
        });

        return res.json({
            success: true,
            message: "Pedido entregado correctamente",
            order: serializeOrder(order)
        });
    } catch (error) {
        if (error instanceof OrderError) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }

        console.error("Error entregando pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al entregar el pedido"
        });
    }
}
