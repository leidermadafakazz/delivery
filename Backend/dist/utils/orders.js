"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderError = exports.orderDetailInclude = exports.orderListInclude = exports.TERMINAL_ORDER_STATUSES = exports.PAYMENT_METHODS = exports.ORDER_STATUSES = void 0;
exports.serializeOrder = serializeOrder;
exports.serializeOrders = serializeOrders;
exports.parseQuantity = parseQuantity;
exports.parseMoney = parseMoney;
exports.toCents = toCents;
exports.centsToMoney = centsToMoney;
exports.restoreOrderStock = restoreOrderStock;
const client_1 = require("@prisma/client");
/**
 * Utilidades compartidas por los controladores del Módulo 4.
 */
exports.ORDER_STATUSES = [
    client_1.OrderStatus.PENDING,
    client_1.OrderStatus.ACCEPTED,
    client_1.OrderStatus.PREPARING,
    client_1.OrderStatus.READY,
    client_1.OrderStatus.ON_THE_WAY,
    client_1.OrderStatus.DELIVERED,
    client_1.OrderStatus.REJECTED,
    client_1.OrderStatus.CANCELLED
];
exports.PAYMENT_METHODS = [
    client_1.PaymentMethod.CASH,
    client_1.PaymentMethod.CARD,
    client_1.PaymentMethod.TRANSFER
];
exports.TERMINAL_ORDER_STATUSES = [
    client_1.OrderStatus.DELIVERED,
    client_1.OrderStatus.REJECTED,
    client_1.OrderStatus.CANCELLED
];
const MAX_MONEY = 99999999.99;
const MAX_QUANTITY = 99;
const userSummarySelect = {
    id: true,
    name: true,
    email: true,
    phone: true
};
const businessSummarySelect = {
    id: true,
    businessName: true,
    logoUrl: true,
    address: true,
    city: true,
    contactPhone: true,
    deliveryFee: true
};
const deliverySummarySelect = {
    id: true,
    vehicleType: true,
    vehiclePlate: true,
    city: true,
    user: {
        select: {
            id: true,
            name: true,
            phone: true
        }
    }
};
exports.orderListInclude = {
    client: {
        select: userSummarySelect
    },
    business: {
        select: businessSummarySelect
    },
    delivery: {
        select: deliverySummarySelect
    },
    items: {
        orderBy: {
            id: "asc"
        }
    },
    ratings: {
        orderBy: {
            createdAt: "asc"
        },
        select: {
            id: true,
            raterId: true,
            targetType: true,
            score: true,
            comment: true,
            createdAt: true,
            rater: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    }
};
exports.orderDetailInclude = {
    ...exports.orderListInclude,
    history: {
        orderBy: {
            createdAt: "asc"
        },
        select: {
            id: true,
            status: true,
            note: true,
            createdAt: true,
            changedBy: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    }
};
function serializeOrder(order) {
    return {
        ...order,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        ...(order.items
            ? {
                items: order.items.map(item => ({
                    ...item,
                    unitPrice: Number(item.unitPrice),
                    total: Number(item.total)
                }))
            }
            : {})
    };
}
function serializeOrders(orders) {
    return orders.map(serializeOrder);
}
/**
 * Cantidad válida: entero entre 1 y 99.
 */
function parseQuantity(value) {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) ||
        numeric < 1 ||
        numeric > MAX_QUANTITY) {
        return null;
    }
    return numeric;
}
/**
 * Dinero con dos decimales. null = campo omitido/vacío;
 * undefined = valor inválido.
 */
function parseMoney(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const numeric = typeof value === "number"
        ? value
        : typeof value === "string"
            ? Number(value)
            : NaN;
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > MAX_MONEY) {
        return undefined;
    }
    return Math.round(numeric * 100) / 100;
}
function toCents(value) {
    return Math.round(Number(value) * 100);
}
function centsToMoney(cents) {
    return (cents / 100).toFixed(2);
}
/**
 * Devuelve las unidades al stock cuando un pedido se rechaza o cancela.
 * Los productos con stock null se consideran ilimitados.
 */
async function restoreOrderStock(tx, orderId) {
    const items = await tx.orderItem.findMany({
        where: { orderId },
        select: {
            productId: true,
            quantity: true
        }
    });
    for (const item of items) {
        if (!item.productId) {
            continue;
        }
        const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true }
        });
        if (!product || product.stock === null) {
            continue;
        }
        await tx.product.update({
            where: { id: item.productId },
            data: {
                stock: {
                    increment: item.quantity
                }
            }
        });
    }
}
/**
 * Error controlado de pedidos: permite responder con el estado HTTP correcto.
 */
class OrderError extends Error {
    constructor(message, status = 409) {
        super(message);
        this.name = "OrderError";
        this.status = status;
    }
}
exports.OrderError = OrderError;
