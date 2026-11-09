"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAvailableOrders = listAvailableOrders;
exports.listMyDeliveryOrders = listMyDeliveryOrders;
exports.getMyDeliveryOrder = getMyDeliveryOrder;
exports.acceptAvailableOrder = acceptAvailableOrder;
exports.pickupOrder = pickupOrder;
exports.deliverOrder = deliverOrder;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const orders_1 = require("../utils/orders");
const deliveryOrderInclude = {
    ...orders_1.orderListInclude,
    client: {
        select: {
            id: true,
            name: true,
            phone: true
        }
    }
};
function currentDelivery(res) {
    return res.locals.delivery;
}
// PEDIDOS LISTOS DISPONIBLES PARA TOMAR
async function listAvailableOrders(req, res) {
    try {
        const { page, limit, skip } = (0, profile_1.getPagination)(req.query);
        const where = {
            status: client_1.OrderStatus.READY,
            deliveryId: null,
            business: {
                status: client_1.ApprovalStatus.APPROVED,
                user: { isActive: true }
            }
        };
        const [total, orders] = await Promise.all([
            database_1.prisma.order.count({ where }),
            database_1.prisma.order.findMany({
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
            orders: (0, orders_1.serializeOrders)(orders)
        });
    }
    catch (error) {
        console.error("Error listando pedidos disponibles:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos disponibles"
        });
    }
}
// MIS PEDIDOS ASIGNADOS (domiciliario)
async function listMyDeliveryOrders(req, res) {
    try {
        const delivery = currentDelivery(res);
        const { page, limit, skip } = (0, profile_1.getPagination)(req.query);
        const rawStatus = req.query.status;
        const status = rawStatus
            ? (0, profile_1.parseEnumValue)(rawStatus, orders_1.ORDER_STATUSES)
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
            database_1.prisma.order.count({ where }),
            database_1.prisma.order.findMany({
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
            orders: (0, orders_1.serializeOrders)(orders)
        });
    }
    catch (error) {
        console.error("Error listando pedidos del domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos asignados"
        });
    }
}
// DETALLE DE UN PEDIDO ASIGNADO A MÍ
async function getMyDeliveryOrder(req, res) {
    try {
        const delivery = currentDelivery(res);
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const order = await database_1.prisma.order.findFirst({
            where: {
                id,
                deliveryId: delivery.id
            },
            include: orders_1.orderDetailInclude
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado o no asignado a ti"
            });
        }
        return res.json({
            success: true,
            order: (0, orders_1.serializeOrder)(order)
        });
    }
    catch (error) {
        console.error("Error consultando pedido del domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el pedido"
        });
    }
}
// TOMAR UN PEDIDO DISPONIBLE (domiciliario)
async function acceptAvailableOrder(req, res) {
    try {
        const delivery = currentDelivery(res);
        const userId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const order = await database_1.prisma.$transaction(async (tx) => {
            const current = await tx.order.findUnique({
                where: { id }
            });
            if (!current) {
                throw new orders_1.OrderError("Pedido no encontrado", 404);
            }
            if (current.status !== client_1.OrderStatus.READY) {
                throw new orders_1.OrderError("El pedido no está listo para entrega");
            }
            if (current.deliveryId !== null) {
                throw new orders_1.OrderError("El pedido ya tiene un domiciliario asignado");
            }
            const claimed = await tx.order.updateMany({
                where: {
                    id,
                    status: client_1.OrderStatus.READY,
                    deliveryId: null
                },
                data: {
                    deliveryId: delivery.id,
                    status: client_1.OrderStatus.ON_THE_WAY,
                    assignedAt: new Date(),
                    dispatchedAt: new Date()
                }
            });
            if (claimed.count !== 1) {
                throw new orders_1.OrderError("El pedido ya no está disponible para asignación");
            }
            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: client_1.OrderStatus.ON_THE_WAY,
                    changedById: userId,
                    note: "Pedido tomado por el domiciliario"
                }
            });
            return tx.order.findUniqueOrThrow({
                where: { id },
                include: orders_1.orderDetailInclude
            });
        });
        return res.json({
            success: true,
            message: "Pedido asignado. Ya puedes iniciar la entrega.",
            order: (0, orders_1.serializeOrder)(order)
        });
    }
    catch (error) {
        if (error instanceof orders_1.OrderError) {
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
async function pickupOrder(req, res) {
    try {
        const delivery = currentDelivery(res);
        const userId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const order = await database_1.prisma.$transaction(async (tx) => {
            const current = await tx.order.findUnique({
                where: { id }
            });
            if (!current) {
                throw new orders_1.OrderError("Pedido no encontrado", 404);
            }
            if (current.deliveryId !== delivery.id) {
                throw new orders_1.OrderError("Este pedido no está asignado a ti", 403);
            }
            if (current.status !== client_1.OrderStatus.READY) {
                throw new orders_1.OrderError("El pedido no está listo para recoger");
            }
            const updated = await tx.order.updateMany({
                where: {
                    id,
                    deliveryId: delivery.id,
                    status: client_1.OrderStatus.READY
                },
                data: {
                    status: client_1.OrderStatus.ON_THE_WAY,
                    dispatchedAt: new Date()
                }
            });
            if (updated.count !== 1) {
                throw new orders_1.OrderError("El pedido ya no está listo para recoger");
            }
            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: client_1.OrderStatus.ON_THE_WAY,
                    changedById: userId,
                    note: "Pedido recogido por el domiciliario"
                }
            });
            return tx.order.findUniqueOrThrow({
                where: { id },
                include: orders_1.orderDetailInclude
            });
        });
        return res.json({
            success: true,
            message: "Pedido recogido. Ya puedes iniciar la entrega.",
            order: (0, orders_1.serializeOrder)(order)
        });
    }
    catch (error) {
        if (error instanceof orders_1.OrderError) {
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
async function deliverOrder(req, res) {
    try {
        const delivery = currentDelivery(res);
        const userId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const order = await database_1.prisma.$transaction(async (tx) => {
            const current = await tx.order.findUnique({
                where: { id }
            });
            if (!current) {
                throw new orders_1.OrderError("Pedido no encontrado", 404);
            }
            if (current.deliveryId !== delivery.id) {
                throw new orders_1.OrderError("Este pedido no está asignado a ti", 403);
            }
            if (current.status !== client_1.OrderStatus.ON_THE_WAY) {
                throw new orders_1.OrderError("El pedido no está en camino");
            }
            const updated = await tx.order.updateMany({
                where: {
                    id,
                    deliveryId: delivery.id,
                    status: client_1.OrderStatus.ON_THE_WAY
                },
                data: {
                    status: client_1.OrderStatus.DELIVERED,
                    deliveredAt: new Date()
                }
            });
            if (updated.count !== 1) {
                throw new orders_1.OrderError("El pedido ya no está en camino");
            }
            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: client_1.OrderStatus.DELIVERED,
                    changedById: userId,
                    note: "Pedido entregado al cliente"
                }
            });
            return tx.order.findUniqueOrThrow({
                where: { id },
                include: orders_1.orderDetailInclude
            });
        });
        return res.json({
            success: true,
            message: "Pedido entregado correctamente",
            order: (0, orders_1.serializeOrder)(order)
        });
    }
    catch (error) {
        if (error instanceof orders_1.OrderError) {
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
