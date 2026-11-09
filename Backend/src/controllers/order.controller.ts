import { Request, Response } from "express";
import {
    ApprovalStatus,
    OrderStatus,
    PaymentMethod
} from "@prisma/client";
import { prisma } from "../config/database";
import {
    cleanString,
    getPagination,
    parseEnumValue,
    parseId
} from "../utils/profile";
import {
    OrderError,
    ORDER_STATUSES,
    PAYMENT_METHODS,
    centsToMoney,
    orderDetailInclude,
    orderListInclude,
    parseQuantity,
    restoreOrderStock,
    serializeOrder,
    serializeOrders,
    toCents
} from "../utils/orders";

const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED
];

interface ParsedItem {
    productId: number;
    quantity: number;
}

function parseItems(value: unknown):
    | { error: string; items: null }
    | { error: null; items: ParsedItem[] } {
    if (!Array.isArray(value) || value.length === 0) {
        return {
            error: "Debes enviar al menos un producto en el pedido",
            items: null
        };
    }

    if (value.length > 50) {
        return {
            error: "El pedido no puede tener más de 50 productos distintos",
            items: null
        };
    }

    const quantities = new Map<number, number>();

    for (const rawItem of value) {
        if (!rawItem || typeof rawItem !== "object") {
            return {
                error: "Cada ítem debe tener productId y quantity",
                items: null
            };
        }

        const item = rawItem as Record<string, unknown>;
        const productId = parseId(item.productId);
        const quantity = parseQuantity(item.quantity);

        if (!productId) {
            return {
                error: "El productId de un ítem no es válido",
                items: null
            };
        }

        if (!quantity) {
            return {
                error: "La cantidad debe ser un entero entre 1 y 99",
                items: null
            };
        }

        const merged = (quantities.get(productId) ?? 0) + quantity;

        if (merged > 99) {
            return {
                error: "La cantidad total por producto no puede superar 99",
                items: null
            };
        }

        quantities.set(productId, merged);
    }

    return {
        error: null,
        items: [...quantities.entries()].map(([productId, quantity]) => ({
            productId,
            quantity
        }))
    };
}

// CREAR PEDIDO (cliente)
export async function createOrder(req: Request, res: Response) {
    try {
        const clientId = res.locals.userId as number;

        const businessId = parseId(req.body.businessId);

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: "El identificador de la empresa no es válido"
            });
        }

        const parsedItems = parseItems(req.body.items);

        if (parsedItems.items === null) {
            return res.status(400).json({
                success: false,
                message: parsedItems.error
            });
        }

        const address = cleanString(req.body.address);
        const city = cleanString(req.body.city);
        const department = cleanString(req.body.department);
        const contactPhone = cleanString(req.body.contactPhone);
        const notes = cleanString(req.body.notes);

        if (!address) {
            return res.status(400).json({
                success: false,
                message: "La dirección de entrega es obligatoria"
            });
        }

        if (!city) {
            return res.status(400).json({
                success: false,
                message: "La ciudad de entrega es obligatoria"
            });
        }

        const rawPayment = req.body.paymentMethod;
        const paymentMethod =
            rawPayment === undefined ||
            rawPayment === null ||
            rawPayment === ""
                ? PaymentMethod.CASH
                : parseEnumValue(rawPayment, PAYMENT_METHODS);

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Método de pago inválido. Usa CASH, CARD o TRANSFER"
            });
        }

        const business = await prisma.businessProfile.findFirst({
            where: {
                id: businessId,
                status: ApprovalStatus.APPROVED,
                user: { isActive: true }
            },
            select: {
                id: true,
                businessName: true,
                deliveryFee: true
            }
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Empresa no encontrada o no está aprobada"
            });
        }

        const productIds = parsedItems.items.map(item => item.productId);

        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                businessId
            },
            select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                isActive: true,
                isAvailable: true,
                deletedAt: true
            }
        });

        if (products.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message:
                    "Uno o más productos no existen o no pertenecen a la empresa indicada"
            });
        }

        const productMap = new Map(products.map(product => [product.id, product]));

        const orderItems: Array<{
            productId: number;
            productName: string;
            unitPrice: string;
            quantity: number;
            total: string;
        }> = [];

        let subtotalCents = 0;

        for (const item of parsedItems.items) {
            const product = productMap.get(item.productId);

            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: "Producto no encontrado en la empresa indicada"
                });
            }

            if (
                !product.isActive ||
                !product.isAvailable ||
                product.deletedAt !== null
            ) {
                return res.status(409).json({
                    success: false,
                    message: `El producto "${product.name}" no está disponible`
                });
            }

            if (
                product.stock !== null &&
                product.stock < item.quantity
            ) {
                return res.status(409).json({
                    success: false,
                    message: `No hay stock suficiente de "${product.name}". Disponible: ${product.stock}`
                });
            }

            const unitCents = toCents(product.price);
            const lineCents = unitCents * item.quantity;

            subtotalCents += lineCents;

            orderItems.push({
                productId: product.id,
                productName: product.name,
                unitPrice: centsToMoney(unitCents),
                quantity: item.quantity,
                total: centsToMoney(lineCents)
            });
        }

        const deliveryFeeCents = toCents(business.deliveryFee);
        const totalCents = subtotalCents + deliveryFeeCents;

        const order = await prisma.$transaction(async tx => {
            for (const item of parsedItems.items) {
                const product = productMap.get(item.productId);

                if (!product) {
                    throw new OrderError(
                        "Producto no encontrado en la empresa indicada",
                        400
                    );
                }

                if (product.stock === null) {
                    const available = await tx.product.count({
                        where: {
                            id: product.id,
                            businessId,
                            isActive: true,
                            isAvailable: true,
                            deletedAt: null
                        }
                    });

                    if (available === 0) {
                        throw new OrderError(
                            `El producto "${product.name}" ya no está disponible`
                        );
                    }

                    continue;
                }

                const updated = await tx.product.updateMany({
                    where: {
                        id: product.id,
                        businessId,
                        isActive: true,
                        isAvailable: true,
                        deletedAt: null,
                        stock: { gte: item.quantity }
                    },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });

                if (updated.count !== 1) {
                    throw new OrderError(
                        `No hay stock suficiente de "${product.name}"`
                    );
                }
            }

            return tx.order.create({
                data: {
                    clientId,
                    businessId,
                    status: OrderStatus.PENDING,
                    paymentMethod,
                    subtotal: centsToMoney(subtotalCents),
                    deliveryFee: centsToMoney(deliveryFeeCents),
                    total: centsToMoney(totalCents),
                    address,
                    city,
                    department,
                    contactPhone,
                    notes,
                    items: {
                        create: orderItems
                    },
                    history: {
                        create: {
                            status: OrderStatus.PENDING,
                            changedById: clientId,
                            note: "Pedido creado por el cliente"
                        }
                    }
                },
                include: orderDetailInclude
            });
        });

        return res.status(201).json({
            success: true,
            message: "Pedido creado correctamente",
            order: serializeOrder(order)
        });
    } catch (error) {
        if (error instanceof OrderError) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }

        console.error("Error creando pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al crear el pedido"
        });
    }
}

// LISTAR MIS PEDIDOS (cliente)
export async function listMyOrders(req: Request, res: Response) {
    try {
        const clientId = res.locals.userId as number;
        const { page, limit, skip } = getPagination(req.query);

        const rawStatus = req.query.status;
        const status = rawStatus
            ? parseEnumValue(rawStatus, ORDER_STATUSES)
            : null;

        if (rawStatus && !status) {
            return res.status(400).json({
                success: false,
                message:
                    "Estado inválido. Usa PENDING, ACCEPTED, PREPARING, READY, ON_THE_WAY, DELIVERED, REJECTED o CANCELLED"
            });
        }

        const where = {
            clientId,
            ...(status ? { status } : {})
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
        console.error("Error listando pedidos del cliente:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos"
        });
    }
}

// DETALLE DE UN PEDIDO PROPIO (cliente)
export async function getMyOrder(req: Request, res: Response) {
    try {
        const clientId = res.locals.userId as number;
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
                clientId
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
        console.error("Error consultando pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el pedido"
        });
    }
}

// CANCELAR PEDIDO (cliente)
export async function cancelMyOrder(req: Request, res: Response) {
    try {
        const clientId = res.locals.userId as number;
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

        const order = await prisma.order.findFirst({
            where: {
                id,
                clientId
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pedido no encontrado"
            });
        }

        if (!CANCELLABLE_STATUSES.includes(order.status)) {
            return res.status(409).json({
                success: false,
                message:
                    "Solo puedes cancelar un pedido pendiente o aceptado, antes de que empiece la preparación"
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
                            changedById: clientId,
                            note: reason
                        }
                    }
                },
                include: orderDetailInclude
            });
        });

        return res.json({
            success: true,
            message: "Pedido cancelado correctamente",
            order: serializeOrder(cancelled)
        });
    } catch (error) {
        console.error("Error cancelando pedido:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al cancelar el pedido"
        });
    }
}
