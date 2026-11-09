"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllOrders = listAllOrders;
exports.getOrderById = getOrderById;
exports.assignOrderDelivery = assignOrderDelivery;
exports.cancelOrder = cancelOrder;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const orders_1 = require("../utils/orders");
const adminOrderListInclude = {
    ...orders_1.orderListInclude,
    client: {
        select: {
            id: true,
            name: true,
            email: true,
            phone: true
        }
    }
};
async function listAllOrders(req, res) {
    try {
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
        let businessId;
        let clientId;
        let deliveryId;
        if (req.query.businessId !== undefined) {
            const parsed = (0, profile_1.parseId)(req.query.businessId);
            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro businessId no es válido"
                });
            }
            businessId = parsed;
        }
        if (req.query.clientId !== undefined) {
            const parsed = (0, profile_1.parseId)(req.query.clientId);
            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro clientId no es válido"
                });
            }
            clientId = parsed;
        }
        if (req.query.deliveryId !== undefined) {
            const parsed = (0, profile_1.parseId)(req.query.deliveryId);
            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro deliveryId no es válido"
                });
            }
            deliveryId = parsed;
        }
        const search = (0, profile_1.cleanString)(req.query.search);
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
            database_1.prisma.order.count({ where }),
            database_1.prisma.order.findMany({
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
            orders: (0, orders_1.serializeOrders)(orders)
        });
    }
    catch (error) {
        console.error("Error listando pedidos (admin):", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos"
        });
    }
}
async function getOrderById(req, res) {
    try {
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const order = await database_1.prisma.order.findUnique({
            where: { id },
            include: orders_1.orderDetailInclude
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }
        return res.json({
            success: true,
            order: (0, orders_1.serializeOrder)(order)
        });
    }
    catch (error) {
        console.error("Error consultando pedido (admin):", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el pedido"
        });
    }
}
// ASIGNAR DOMICILIARIO 
async function assignOrderDelivery(req, res) {
    try {
        const adminId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        const deliveryId = (0, profile_1.parseId)(req.body.deliveryId);
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
        const order = await database_1.prisma.order.findUnique({
            where: { id }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }
        if (order.status !== client_1.OrderStatus.READY) {
            return res.status(409).json({
                success: false,
                message: "Solo se pueden asignar pedidos que estén listos para entrega"
            });
        }
        if (order.deliveryId !== null) {
            return res.status(409).json({
                success: false,
                message: "El pedido ya tiene un domiciliario asignado"
            });
        }
        const delivery = await database_1.prisma.deliveryProfile.findFirst({
            where: {
                id: deliveryId,
                status: client_1.ApprovalStatus.APPROVED,
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
        const updated = await database_1.prisma.order.update({
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
            include: orders_1.orderDetailInclude
        });
        return res.json({
            success: true,
            message: "Domiciliario asignado. El pedido sigue listo hasta que sea recogido.",
            order: (0, orders_1.serializeOrder)(updated)
        });
    }
    catch (error) {
        console.error("Error asignando domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al asignar el domiciliario"
        });
    }
}
// CANCELAR PEDIDO 
async function cancelOrder(req, res) {
    try {
        const adminId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const reason = (0, profile_1.cleanString)(req.body.reason);
        if (!reason || reason.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Debes indicar un motivo de cancelación de al menos 5 caracteres"
            });
        }
        const order = await database_1.prisma.order.findUnique({
            where: { id }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }
        if (orders_1.TERMINAL_ORDER_STATUSES.includes(order.status)) {
            return res.status(409).json({
                success: false,
                message: "Este pedido ya está finalizado"
            });
        }
        const cancelled = await database_1.prisma.$transaction(async (tx) => {
            await (0, orders_1.restoreOrderStock)(tx, order.id);
            return tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.CANCELLED,
                    cancellationReason: reason,
                    cancelledAt: new Date(),
                    history: {
                        create: {
                            status: client_1.OrderStatus.CANCELLED,
                            changedById: adminId,
                            note: reason
                        }
                    }
                },
                include: orders_1.orderDetailInclude
            });
        });
        return res.json({
            success: true,
            message: "Pedido cancelado por el administrador",
            order: (0, orders_1.serializeOrder)(cancelled)
        });
    }
    catch (error) {
        console.error("Error cancelando pedido (admin):", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al cancelar el pedido"
        });
    }
}
