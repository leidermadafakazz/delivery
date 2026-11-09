import {
    OrderStatus,
    PaymentMethod,
    Prisma
} from "@prisma/client";

/**
 * Utilidades compartidas por los controladores del Módulo 4.
 */

export const ORDER_STATUSES: readonly OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.ON_THE_WAY,
    OrderStatus.DELIVERED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED
];

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
    PaymentMethod.CASH,
    PaymentMethod.CARD,
    PaymentMethod.TRANSFER
];

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
    OrderStatus.DELIVERED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED
];

const MAX_MONEY = 99_999_999.99;
const MAX_QUANTITY = 99;

const userSummarySelect = {
    id: true,
    name: true,
    email: true,
    phone: true
} as const;

const businessSummarySelect = {
    id: true,
    businessName: true,
    logoUrl: true,
    address: true,
    city: true,
    contactPhone: true,
    deliveryFee: true
} as const;

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
} as const;

export const orderListInclude = {
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
} as const;

export const orderDetailInclude = {
    ...orderListInclude,
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
} as const;

interface OrderWithMoney {
    subtotal: unknown;
    deliveryFee: unknown;
    total: unknown;
    items?: Array<{ unitPrice: unknown; total: unknown }>;
}

export function serializeOrder<T extends OrderWithMoney>(order: T) {
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

export function serializeOrders<T extends OrderWithMoney>(orders: T[]) {
    return orders.map(serializeOrder);
}

/**
 * Cantidad válida: entero entre 1 y 99.
 */
export function parseQuantity(value: unknown): number | null {
    const numeric = Number(value);

    if (
        !Number.isInteger(numeric) ||
        numeric < 1 ||
        numeric > MAX_QUANTITY
    ) {
        return null;
    }

    return numeric;
}

/**
 * Dinero con dos decimales. null = campo omitido/vacío;
 * undefined = valor inválido.
 */
export function parseMoney(value: unknown): number | null | undefined {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const numeric =
        typeof value === "number"
            ? value
            : typeof value === "string"
              ? Number(value)
              : NaN;

    if (!Number.isFinite(numeric) || numeric < 0 || numeric > MAX_MONEY) {
        return undefined;
    }

    return Math.round(numeric * 100) / 100;
}

export function toCents(value: unknown): number {
    return Math.round(Number(value) * 100);
}

export function centsToMoney(cents: number): string {
    return (cents / 100).toFixed(2);
}

/**
 * Devuelve las unidades al stock cuando un pedido se rechaza o cancela.
 * Los productos con stock null se consideran ilimitados.
 */
export async function restoreOrderStock(
    tx: Prisma.TransactionClient,
    orderId: number
) {
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
export class OrderError extends Error {
    status: number;

    constructor(message: string, status = 409) {
        super(message);
        this.name = "OrderError";
        this.status = status;
    }
}
