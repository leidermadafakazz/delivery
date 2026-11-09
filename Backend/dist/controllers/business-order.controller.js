"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBusinessOrders = listBusinessOrders;
exports.getBusinessOrder = getBusinessOrder;
exports.acceptBusinessOrder = acceptBusinessOrder;
exports.rejectBusinessOrder = rejectBusinessOrder;
exports.updateBusinessOrderStatus = updateBusinessOrderStatus;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const orders_1 = require("../utils/orders");
const BUSINESS_TARGET_STATUSES = [
    client_1.OrderStatus.PREPARING,
    client_1.OrderStatus.READY
];
function currentBusiness(res) {
    return res.locals.business;
}
// LISTAR LOS PEDIDOS DE MI EMPRESA
async function listBusinessOrders(req, res) {
    try {
        const business = currentBusiness(res);
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
        const search = (0, profile_1.cleanString)(req.query.search);
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
            database_1.prisma.order.count({ where }),
            database_1.prisma.order.findMany({
                where,
                include: orders_1.orderListInclude,
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
        console.error("Error listando pedidos de la empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos"
        });
    }
}
// DETALLE DE UN PEDIDO DE MI EMPRESA
async function getBusinessOrder(req, res) {
    try {
        const business = currentBusiness(res);
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
                businessId: business.id
            },
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
        console.error("Error consultando pedido de la empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el pedido"
        });
    }
}
// ACEPTAR PEDIDO (empresa)
async function acceptBusinessOrder(req, res) {
    try {
        const business = currentBusiness(res);
        const userId = res.locals.userId;
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
                businessId: business.id
            }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }
        if (order.status !== client_1.OrderStatus.PENDING) {
            return res.status(409).json({
                success: false,
                message: "Solo se pueden aceptar pedidos pendientes"
            });
        }
        const updated = await database_1.prisma.order.update({
            where: { id: order.id },
            data: {
                status: client_1.OrderStatus.ACCEPTED,
                acceptedAt: new Date(),
                history: {
                    create: {
                        status: client_1.OrderStatus.ACCEPTED,
                        changedById: userId,
                        note: "Pedido aceptado por la empresa"
                    }
                }
            },
            include: orders_1.orderDetailInclude
        });
        return res.json({
            success: true,
            message: "Pedido aceptado correctamente",
            order: (0, orders_1.serializeOrder)(updated)
        });
    }
    catch (error) {
        console.error("Error aceptando pedido:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al aceptar el pedido"
        });
    }
}
// RECHAZAR PEDIDO (empresa)
async function rejectBusinessOrder(req, res) {
    try {
        const business = currentBusiness(res);
        const userId = res.locals.userId;
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
                message: "Debes indicar un motivo de rechazo de al menos 5 caracteres"
            });
        }
        const order = await database_1.prisma.order.findFirst({
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
        if (order.status !== client_1.OrderStatus.PENDING) {
            return res.status(409).json({
                success: false,
                message: "Solo se pueden rechazar pedidos pendientes"
            });
        }
        const rejected = await database_1.prisma.$transaction(async (tx) => {
            await (0, orders_1.restoreOrderStock)(tx, order.id);
            return tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.REJECTED,
                    rejectionReason: reason,
                    rejectedAt: new Date(),
                    history: {
                        create: {
                            status: client_1.OrderStatus.REJECTED,
                            changedById: userId,
                            note: reason
                        }
                    }
                },
                include: orders_1.orderDetailInclude
            });
        });
        return res.json({
            success: true,
            message: "Pedido rechazado correctamente",
            order: (0, orders_1.serializeOrder)(rejected)
        });
    }
    catch (error) {
        console.error("Error rechazando pedido:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al rechazar el pedido"
        });
    }
}
// ACTUALIZAR ESTADO DEL PEDIDO (empresa): PREPARING o READY
async function updateBusinessOrderStatus(req, res) {
    try {
        const business = currentBusiness(res);
        const userId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de pedido inválido"
            });
        }
        const targetStatus = (0, profile_1.parseEnumValue)(req.body.status, BUSINESS_TARGET_STATUSES);
        if (!targetStatus) {
            return res.status(400).json({
                success: false,
                message: "Estado inválido. Usa PREPARING o READY"
            });
        }
        const order = await database_1.prisma.order.findFirst({
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
        if (targetStatus === client_1.OrderStatus.PREPARING &&
            order.status !== client_1.OrderStatus.ACCEPTED) {
            return res.status(409).json({
                success: false,
                message: "Solo puedes pasar a PREPARING un pedido que ya fue aceptado"
            });
        }
        if (targetStatus === client_1.OrderStatus.READY &&
            order.status !== client_1.OrderStatus.PREPARING) {
            return res.status(409).json({
                success: false,
                message: "Solo puedes marcar como READY un pedido que está en preparación"
            });
        }
        const updated = await database_1.prisma.order.update({
            where: { id: order.id },
            data: {
                status: targetStatus,
                ...(targetStatus === client_1.OrderStatus.READY
                    ? { readyAt: new Date() }
                    : {}),
                history: {
                    create: {
                        status: targetStatus,
                        changedById: userId,
                        note: targetStatus === client_1.OrderStatus.PREPARING
                            ? "Pedido en preparación"
                            : "Pedido listo para entrega"
                    }
                }
            },
            include: orders_1.orderDetailInclude
        });
        return res.json({
            success: true,
            message: targetStatus === client_1.OrderStatus.PREPARING
                ? "Pedido marcado en preparación"
                : "Pedido marcado como listo para entrega",
            order: (0, orders_1.serializeOrder)(updated)
        });
    }
    catch (error) {
        console.error("Error actualizando estado del pedido:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar el pedido"
        });
    }
}
