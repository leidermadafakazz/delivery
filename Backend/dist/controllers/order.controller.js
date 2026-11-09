"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.listMyOrders = listMyOrders;
exports.getMyOrder = getMyOrder;
exports.cancelMyOrder = cancelMyOrder;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const orders_1 = require("../utils/orders");
const CANCELLABLE_STATUSES = [
    client_1.OrderStatus.PENDING,
    client_1.OrderStatus.ACCEPTED
];
function parseItems(value) {
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
    const quantities = new Map();
    for (const rawItem of value) {
        if (!rawItem || typeof rawItem !== "object") {
            return {
                error: "Cada ítem debe tener productId y quantity",
                items: null
            };
        }
        const item = rawItem;
        const productId = (0, profile_1.parseId)(item.productId);
        const quantity = (0, orders_1.parseQuantity)(item.quantity);
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
async function createOrder(req, res) {
    try {
        const clientId = res.locals.userId;
        const businessId = (0, profile_1.parseId)(req.body.businessId);
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
        const address = (0, profile_1.cleanString)(req.body.address);
        const city = (0, profile_1.cleanString)(req.body.city);
        const department = (0, profile_1.cleanString)(req.body.department);
        const contactPhone = (0, profile_1.cleanString)(req.body.contactPhone);
        const notes = (0, profile_1.cleanString)(req.body.notes);
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
        const paymentMethod = rawPayment === undefined ||
            rawPayment === null ||
            rawPayment === ""
            ? client_1.PaymentMethod.CASH
            : (0, profile_1.parseEnumValue)(rawPayment, orders_1.PAYMENT_METHODS);
        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Método de pago inválido. Usa CASH, CARD o TRANSFER"
            });
        }
        const business = await database_1.prisma.businessProfile.findFirst({
            where: {
                id: businessId,
                status: client_1.ApprovalStatus.APPROVED,
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
        const products = await database_1.prisma.product.findMany({
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
                message: "Uno o más productos no existen o no pertenecen a la empresa indicada"
            });
        }
        const productMap = new Map(products.map(product => [product.id, product]));
        const orderItems = [];
        let subtotalCents = 0;
        for (const item of parsedItems.items) {
            const product = productMap.get(item.productId);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: "Producto no encontrado en la empresa indicada"
                });
            }
            if (!product.isActive ||
                !product.isAvailable ||
                product.deletedAt !== null) {
                return res.status(409).json({
                    success: false,
                    message: `El producto "${product.name}" no está disponible`
                });
            }
            if (product.stock !== null &&
                product.stock < item.quantity) {
                return res.status(409).json({
                    success: false,
                    message: `No hay stock suficiente de "${product.name}". Disponible: ${product.stock}`
                });
            }
            const unitCents = (0, orders_1.toCents)(product.price);
            const lineCents = unitCents * item.quantity;
            subtotalCents += lineCents;
            orderItems.push({
                productId: product.id,
                productName: product.name,
                unitPrice: (0, orders_1.centsToMoney)(unitCents),
                quantity: item.quantity,
                total: (0, orders_1.centsToMoney)(lineCents)
            });
        }
        const deliveryFeeCents = (0, orders_1.toCents)(business.deliveryFee);
        const totalCents = subtotalCents + deliveryFeeCents;
        const order = await database_1.prisma.$transaction(async (tx) => {
            for (const item of parsedItems.items) {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new orders_1.OrderError("Producto no encontrado en la empresa indicada", 400);
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
                        throw new orders_1.OrderError(`El producto "${product.name}" ya no está disponible`);
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
                    throw new orders_1.OrderError(`No hay stock suficiente de "${product.name}"`);
                }
            }
            return tx.order.create({
                data: {
                    clientId,
                    businessId,
                    status: client_1.OrderStatus.PENDING,
                    paymentMethod,
                    subtotal: (0, orders_1.centsToMoney)(subtotalCents),
                    deliveryFee: (0, orders_1.centsToMoney)(deliveryFeeCents),
                    total: (0, orders_1.centsToMoney)(totalCents),
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
                            status: client_1.OrderStatus.PENDING,
                            changedById: clientId,
                            note: "Pedido creado por el cliente"
                        }
                    }
                },
                include: orders_1.orderDetailInclude
            });
        });
        return res.status(201).json({
            success: true,
            message: "Pedido creado correctamente",
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
        console.error("Error creando pedido:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al crear el pedido"
        });
    }
}
// LISTAR MIS PEDIDOS (cliente)
async function listMyOrders(req, res) {
    try {
        const clientId = res.locals.userId;
        const { page, limit, skip } = (0, profile_1.getPagination)(req.query);
        const rawStatus = req.query.status;
        const status = rawStatus
            ? (0, profile_1.parseEnumValue)(rawStatus, orders_1.ORDER_STATUSES)
            : null;
        if (rawStatus && !status) {
            return res.status(400).json({
                success: false,
                message: "Estado inválido. Usa PENDING, ACCEPTED, PREPARING, READY, ON_THE_WAY, DELIVERED, REJECTED o CANCELLED"
            });
        }
        const where = {
            clientId,
            ...(status ? { status } : {})
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
        console.error("Error listando pedidos del cliente:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar los pedidos"
        });
    }
}
// DETALLE DE UN PEDIDO PROPIO (cliente)
async function getMyOrder(req, res) {
    try {
        const clientId = res.locals.userId;
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
                clientId
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
        console.error("Error consultando pedido:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el pedido"
        });
    }
}
// CANCELAR PEDIDO (cliente)
async function cancelMyOrder(req, res) {
    try {
        const clientId = res.locals.userId;
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
        const order = await database_1.prisma.order.findFirst({
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
                message: "Solo puedes cancelar un pedido pendiente o aceptado, antes de que empiece la preparación"
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
                            changedById: clientId,
                            note: reason
                        }
                    }
                },
                include: orders_1.orderDetailInclude
            });
        });
        return res.json({
            success: true,
            message: "Pedido cancelado correctamente",
            order: (0, orders_1.serializeOrder)(cancelled)
        });
    }
    catch (error) {
        console.error("Error cancelando pedido:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al cancelar el pedido"
        });
    }
}
