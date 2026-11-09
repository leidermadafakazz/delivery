import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const base = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const adminEmail = process.env.ADMIN_EMAIL || "admin@fastdelivery.com";
const adminPassword = process.env.ADMIN_PASSWORD || "Admin1234!";
const password = "Test1234!";

const createdEmails = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(`FALLÓ: ${message}`);
    }

    console.log(`OK: ${message}`);
}

async function api(path, { method = "GET", token, body } = {}) {
    const response = await fetch(`${base}${path}`, {
        method,
        headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });

    const data = await response.json().catch(() => null);

    return { status: response.status, data };
}

async function waitForServer() {
    for (let attempt = 0; attempt < 30; attempt++) {
        try {
            const response = await fetch(`${base}/api/health`);

            if (response.ok) {
                return;
            }
        } catch {
            // El servidor todavía no está listo.
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`El servidor no respondió en ${base}`);
}

async function registerUser(label) {
    const email = `${label}.${stamp}@test.com`;

    const response = await api("/api/auth/register", {
        method: "POST",
        body: {
            name: `Usuario ${label}`,
            email,
            password
        }
    });

    if (response.status !== 201) {
        throw new Error(
            `No se pudo registrar ${label}: ${JSON.stringify(response.data)}`
        );
    }

    createdEmails.push(email);

    return {
        id: response.data.user.id,
        email,
        token: response.data.token
    };
}

async function createApprovedBusiness(adminToken, label) {
    const user = await registerUser(label);
    const slug = `${label}-${stamp}`;

    const apply = await api("/api/businesses/register", {
        method: "POST",
        token: user.token,
        body: {
            businessName: `Negocio ${label} ${stamp}`,
            legalName: `Negocio ${label} SAS`,
            taxId: `NIT-${slug}`,
            businessType: "RESTAURANT",
            description: `Negocio de prueba ${label}`,
            address: "Calle 1 #2-3",
            city: "Bogotá",
            department: "Cundinamarca",
            contactPhone: "3001234567",
            contactEmail: `contacto.${slug}@test.com`,
            deliveryFee: 3000
        }
    });

    if (apply.status !== 201) {
        throw new Error(
            `No se pudo registrar la empresa ${label}: ${JSON.stringify(apply.data)}`
        );
    }

    const businessId = apply.data.business.id;

    const approve = await api(`/api/businesses/${businessId}/approve`, {
        method: "PATCH",
        token: adminToken
    });

    if (approve.status !== 200) {
        throw new Error(
            `No se pudo aprobar la empresa ${label}: ${JSON.stringify(approve.data)}`
        );
    }

    return {
        ...user,
        businessId
    };
}

async function createApprovedDelivery(adminToken, label) {
    const user = await registerUser(label);

    const apply = await api("/api/deliveries/register", {
        method: "POST",
        token: user.token,
        body: {
            documentType: "CC",
            documentNumber: `CC-${label}-${stamp}`,
            birthDate: "1995-05-20",
            address: "Carrera 10 #20-30",
            city: "Bogotá",
            vehicleType: "MOTORCYCLE",
            vehiclePlate: "ABC12D",
            licenseNumber: `LIC-${label}-${stamp}`
        }
    });

    if (apply.status !== 201) {
        throw new Error(
            `No se pudo registrar el domiciliario ${label}: ${JSON.stringify(apply.data)}`
        );
    }

    const deliveryId = apply.data.delivery.id;

    const approve = await api(`/api/deliveries/${deliveryId}/approve`, {
        method: "PATCH",
        token: adminToken
    });

    if (approve.status !== 200) {
        throw new Error(
            `No se pudo aprobar el domiciliario ${label}: ${JSON.stringify(approve.data)}`
        );
    }

    return {
        ...user,
        deliveryId
    };
}

async function createProduct(token, overrides) {
    const response = await api("/api/businesses/me/products", {
        method: "POST",
        token,
        body: {
            name: "Producto de prueba",
            price: 10000,
            isAvailable: true,
            ...overrides
        }
    });

    if (response.status !== 201) {
        throw new Error(
            `No se pudo crear el producto: ${JSON.stringify(response.data)}`
        );
    }

    return response.data.product;
}

async function getStock(token, productId) {
    const response = await api(`/api/businesses/me/products/${productId}`, {
        token
    });

    return response.data.product.stock;
}

async function createOrder(clientToken, body) {
    return api("/api/orders", {
        method: "POST",
        token: clientToken,
        body
    });
}

async function main() {
    await waitForServer();
    console.log(`Servidor disponible en ${base}`);

    const adminLogin = await api("/api/auth/login", {
        method: "POST",
        body: {
            email: adminEmail,
            password: adminPassword
        }
    });

    assert(adminLogin.status === 200, "Administrador inicia sesión");
    const adminToken = adminLogin.data.token;

    // ---------- PREPARACIÓN ----------
    const businessA = await createApprovedBusiness(adminToken, "empresaA");
    const businessB = await createApprovedBusiness(adminToken, "empresaB");
    const client = await registerUser("cliente");
    const deliveryOne = await createApprovedDelivery(adminToken, "domiciliario1");
    const deliveryTwo = await createApprovedDelivery(adminToken, "domiciliario2");

    const productA1 = await createProduct(businessA.token, {
        name: "Hamburguesa",
        price: 20000,
        sku: `HAMB-${stamp}`,
        stock: 10
    });

    const productA2 = await createProduct(businessA.token, {
        name: "Jugo natural",
        price: 5000,
        sku: `JUGO-${stamp}`,
        stock: null
    });

    const productB1 = await createProduct(businessB.token, {
        name: "Pizza",
        price: 15000,
        sku: `PIZZA-${stamp}`,
        stock: 5
    });

    // ---------- CREACIÓN DEL PEDIDO ----------
    const orderOne = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [
            { productId: productA1.id, quantity: 2 },
            { productId: productA2.id, quantity: 1 }
        ],
        address: "Calle 100 #20-30",
        city: "Bogotá",
        department: "Cundinamarca",
        contactPhone: "3001112233",
        paymentMethod: "CASH",
        notes: "Sin cebolla"
    });

    assert(
        orderOne.status === 201 &&
            orderOne.data.order.status === "PENDING",
        "El cliente crea un pedido pendiente"
    );

    const orderOneId = orderOne.data.order.id;

    assert(
        orderOne.data.order.subtotal === 45000 &&
            orderOne.data.order.deliveryFee === 3000 &&
            orderOne.data.order.total === 48000,
        "El pedido calcula subtotal, domicilio y total"
    );

    assert(
        orderOne.data.order.items.length === 2 &&
            orderOne.data.order.items.every(
                item => typeof item.unitPrice === "number"
            ),
        "Los ítems guardan precio unitario numérico"
    );

    assert(
        orderOne.data.order.client.id === client.id &&
            orderOne.data.order.business.id === businessA.businessId,
        "El pedido queda asociado al cliente y a la empresa"
    );

    assert(
        (await getStock(businessA.token, productA1.id)) === 8 &&
            (await getStock(businessA.token, productA2.id)) === null,
        "Al crear el pedido se descuenta el stock disponible"
    );

    const emptyItems = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [],
        address: "Calle 1",
        city: "Bogotá"
    });

    assert(emptyItems.status === 400, "Se rechaza un pedido sin productos");

    const crossBusinessProduct = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productB1.id, quantity: 1 }],
        address: "Calle 1",
        city: "Bogotá"
    });

    assert(
        crossBusinessProduct.status === 400,
        "No se puede pedir un producto de otra empresa"
    );

    const insufficientStock = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA1.id, quantity: 9 }],
        address: "Calle 1",
        city: "Bogotá"
    });

    assert(
        insufficientStock.status === 409,
        "Se rechaza un pedido sin stock suficiente"
    );

    const invalidPayment = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA1.id, quantity: 1 }],
        address: "Calle 1",
        city: "Bogotá",
        paymentMethod: "BITCOIN"
    });

    assert(
        invalidPayment.status === 400,
        "Se rechaza un método de pago inválido"
    );

    await api(
        `/api/businesses/me/products/${productA2.id}/availability`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { isAvailable: false }
        }
    );

    const unavailableProduct = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA2.id, quantity: 1 }],
        address: "Calle 1",
        city: "Bogotá"
    });

    assert(
        unavailableProduct.status === 409,
        "No se puede pedir un producto no disponible"
    );

    await api(
        `/api/businesses/me/products/${productA2.id}/availability`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { isAvailable: true }
        }
    );

    const anonymousOrder = await createOrder(null, {
        businessId: businessA.businessId,
        items: [{ productId: productA1.id, quantity: 1 }],
        address: "Calle 1",
        city: "Bogotá"
    });

    assert(
        anonymousOrder.status === 401,
        "Sin token no se puede crear un pedido"
    );

    // ---------- CONSULTA DEL CLIENTE ----------
    const clientOrders = await api("/api/orders", {
        token: client.token
    });

    assert(
        clientOrders.status === 200 &&
            clientOrders.data.pagination.total === 1,
        "El cliente lista sus pedidos"
    );

    const clientOrderDetail = await api(`/api/orders/${orderOneId}`, {
        token: client.token
    });

    assert(
        clientOrderDetail.status === 200 &&
            clientOrderDetail.data.order.history.length === 1,
        "El detalle del pedido incluye su historial"
    );

    const otherClientOrder = await api(`/api/orders/${orderOneId}`, {
        token: businessB.token
    });

    assert(
        otherClientOrder.status === 404,
        "Otro cliente no puede ver un pedido ajeno"
    );

    // ---------- ACEPTACIÓN DE LA EMPRESA ----------
    const crossAccept = await api(
        `/api/businesses/me/orders/${orderOneId}/accept`,
        {
            method: "PATCH",
            token: businessB.token
        }
    );

    assert(
        crossAccept.status === 404,
        "Otra empresa no puede aceptar un pedido ajeno"
    );

    const businessOrders = await api("/api/businesses/me/orders", {
        token: businessA.token
    });

    assert(
        businessOrders.status === 200 &&
            businessOrders.data.orders.some(order => order.id === orderOneId),
        "La empresa lista sus pedidos"
    );

    const acceptOrder = await api(
        `/api/businesses/me/orders/${orderOneId}/accept`,
        {
            method: "PATCH",
            token: businessA.token
        }
    );

    assert(
        acceptOrder.status === 200 &&
            acceptOrder.data.order.status === "ACCEPTED" &&
            acceptOrder.data.order.acceptedAt !== null,
        "La empresa acepta el pedido"
    );

    const doubleAccept = await api(
        `/api/businesses/me/orders/${orderOneId}/accept`,
        {
            method: "PATCH",
            token: businessA.token
        }
    );

    assert(
        doubleAccept.status === 409,
        "No se puede aceptar dos veces el mismo pedido"
    );

    const preparing = await api(
        `/api/businesses/me/orders/${orderOneId}/status`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { status: "PREPARING" }
        }
    );

    assert(
        preparing.status === 200 &&
            preparing.data.order.status === "PREPARING",
        "La empresa marca el pedido en preparación"
    );

    const ready = await api(
        `/api/businesses/me/orders/${orderOneId}/status`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { status: "READY" }
        }
    );

    assert(
        ready.status === 200 &&
            ready.data.order.status === "READY" &&
            ready.data.order.readyAt !== null,
        "La empresa marca el pedido listo para entrega"
    );

    const invalidBusinessStatus = await api(
        `/api/businesses/me/orders/${orderOneId}/status`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { status: "DELIVERED" }
        }
    );

    assert(
        invalidBusinessStatus.status === 400,
        "La empresa no puede usar estados fuera de su flujo"
    );

    // ---------- DOMICILIARIO ----------
    const availableOrders = await api(
        "/api/deliveries/me/available-orders",
        { token: deliveryOne.token }
    );

    assert(
        availableOrders.status === 200 &&
            availableOrders.data.orders.some(
                order => order.id === orderOneId
            ),
        "El domiciliario ve los pedidos listos disponibles"
    );

    const businessOnDeliveryRoute = await api(
        "/api/deliveries/me/available-orders",
        { token: businessA.token }
    );

    assert(
        businessOnDeliveryRoute.status === 403,
        "Una empresa no puede acceder a las rutas de domiciliario"
    );

    const takeOrder = await api(
        `/api/deliveries/me/orders/${orderOneId}/accept`,
        {
            method: "PATCH",
            token: deliveryOne.token
        }
    );

    assert(
        takeOrder.status === 200 &&
            takeOrder.data.order.status === "ON_THE_WAY" &&
            takeOrder.data.order.delivery.id === deliveryOne.deliveryId,
        "El domiciliario toma el pedido y queda en camino"
    );

    const secondTake = await api(
        `/api/deliveries/me/orders/${orderOneId}/accept`,
        {
            method: "PATCH",
            token: deliveryTwo.token
        }
    );

    assert(
        secondTake.status === 409,
        "Otro domiciliario no puede tomar un pedido ya asignado"
    );

    const myDeliveryOrders = await api("/api/deliveries/me/orders", {
        token: deliveryOne.token
    });

    assert(
        myDeliveryOrders.status === 200 &&
            myDeliveryOrders.data.orders.some(
                order => order.id === orderOneId
            ),
        "El domiciliario lista sus pedidos asignados"
    );

    const delivered = await api(
        `/api/deliveries/me/orders/${orderOneId}/deliver`,
        {
            method: "PATCH",
            token: deliveryOne.token
        }
    );

    assert(
        delivered.status === 200 &&
            delivered.data.order.status === "DELIVERED" &&
            delivered.data.order.deliveredAt !== null,
        "El domiciliario marca el pedido como entregado"
    );

    const doubleDeliver = await api(
        `/api/deliveries/me/orders/${orderOneId}/deliver`,
        {
            method: "PATCH",
            token: deliveryOne.token
        }
    );

    assert(
        doubleDeliver.status === 409,
        "No se puede entregar dos veces el mismo pedido"
    );

    const clientSeesDelivered = await api(`/api/orders/${orderOneId}`, {
        token: client.token
    });

    assert(
        clientSeesDelivered.data.order.status === "DELIVERED",
        "El cliente ve el pedido entregado"
    );

    const cancelDelivered = await api(
        `/api/orders/${orderOneId}/cancel`,
        {
            method: "PATCH",
            token: client.token,
            body: { reason: "Ya no lo necesito" }
        }
    );

    assert(
        cancelDelivered.status === 409,
        "No se puede cancelar un pedido ya entregado"
    );

    assert(
        (await getStock(businessA.token, productA1.id)) === 8,
        "El stock entregado no se restaura"
    );

    // ---------- ADMINISTRACIÓN ----------
    const adminOrders = await api(
        `/api/admin/orders?status=DELIVERED&limit=100`,
        { token: adminToken }
    );

    assert(
        adminOrders.status === 200 &&
            adminOrders.data.orders.some(order => order.id === orderOneId),
        "El administrador lista los pedidos entregados"
    );

    const adminOrderDetail = await api(`/api/admin/orders/${orderOneId}`, {
        token: adminToken
    });

    assert(
        adminOrderDetail.status === 200 &&
            adminOrderDetail.data.order.history.length === 6,
        "El detalle administrativo incluye el historial completo"
    );

    const dashboard = await api("/api/admin/dashboard", {
        token: adminToken
    });

    assert(
        dashboard.status === 200 &&
            dashboard.data.stats.orders.DELIVERED >= 1,
        "El dashboard incluye estadísticas de pedidos"
    );

    const invalidOrderFilter = await api(
        "/api/admin/orders?businessId=abc",
        { token: adminToken }
    );

    assert(
        invalidOrderFilter.status === 400,
        "Se rechazan filtros administrativos inválidos"
    );

    // ---------- RECHAZO DE LA EMPRESA ----------
    const orderTwo = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA1.id, quantity: 1 }],
        address: "Calle 2",
        city: "Bogotá"
    });

    assert(
        orderTwo.status === 201 &&
            (await getStock(businessA.token, productA1.id)) === 7,
        "El segundo pedido descuenta stock"
    );

    const rejectOrder = await api(
        `/api/businesses/me/orders/${orderTwo.data.order.id}/reject`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { reason: "Producto agotado para hoy" }
        }
    );

    assert(
        rejectOrder.status === 200 &&
            rejectOrder.data.order.status === "REJECTED" &&
            rejectOrder.data.order.rejectionReason ===
                "Producto agotado para hoy",
        "La empresa rechaza un pedido pendiente"
    );

    assert(
        (await getStock(businessA.token, productA1.id)) === 8,
        "Al rechazar el pedido se restaura el stock"
    );

    // ---------- CANCELACIÓN DEL CLIENTE ----------
    const orderThree = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA1.id, quantity: 2 }],
        address: "Calle 3",
        city: "Bogotá"
    });

    assert(
        orderThree.status === 201 &&
            (await getStock(businessA.token, productA1.id)) === 6,
        "El tercer pedido descuenta stock"
    );

    const cancelOrder = await api(
        `/api/orders/${orderThree.data.order.id}/cancel`,
        {
            method: "PATCH",
            token: client.token,
            body: { reason: "Cambié de opinión" }
        }
    );

    assert(
        cancelOrder.status === 200 &&
            cancelOrder.data.order.status === "CANCELLED",
        "El cliente cancela su pedido pendiente"
    );

    assert(
        (await getStock(businessA.token, productA1.id)) === 8,
        "Al cancelar el pedido se restaura el stock"
    );

    const doubleCancel = await api(
        `/api/orders/${orderThree.data.order.id}/cancel`,
        {
            method: "PATCH",
            token: client.token,
            body: { reason: "Otra vez" }
        }
    );

    assert(
        doubleCancel.status === 409,
        "No se puede cancelar dos veces el mismo pedido"
    );

    // ---------- CANCELACIÓN DEL ADMIN ----------
    const orderFour = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA1.id, quantity: 1 }],
        address: "Calle 4",
        city: "Bogotá"
    });

    assert(
        orderFour.status === 201 &&
            (await getStock(businessA.token, productA1.id)) === 7,
        "El cuarto pedido descuenta stock"
    );

    await api(
        `/api/businesses/me/orders/${orderFour.data.order.id}/accept`,
        {
            method: "PATCH",
            token: businessA.token
        }
    );

    const adminCancel = await api(
        `/api/admin/orders/${orderFour.data.order.id}/cancel`,
        {
            method: "PATCH",
            token: adminToken,
            body: { reason: "Pedido bloqueado por administración" }
        }
    );

    assert(
        adminCancel.status === 200 &&
            adminCancel.data.order.status === "CANCELLED",
        "El administrador cancela un pedido en curso"
    );

    assert(
        (await getStock(businessA.token, productA1.id)) === 8,
        "La cancelación administrativa restaura el stock"
    );

    // ---------- ASIGNACIÓN ADMINISTRATIVA ----------
    const orderFive = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA1.id, quantity: 1 }],
        address: "Calle 5",
        city: "Bogotá"
    });

    const orderFiveId = orderFive.data.order.id;

    await api(`/api/businesses/me/orders/${orderFiveId}/accept`, {
        method: "PATCH",
        token: businessA.token
    });
    await api(`/api/businesses/me/orders/${orderFiveId}/status`, {
        method: "PATCH",
        token: businessA.token,
        body: { status: "PREPARING" }
    });
    await api(`/api/businesses/me/orders/${orderFiveId}/status`, {
        method: "PATCH",
        token: businessA.token,
        body: { status: "READY" }
    });

    const assignDelivery = await api(
        `/api/admin/orders/${orderFiveId}/assign`,
        {
            method: "PATCH",
            token: adminToken,
            body: { deliveryId: deliveryTwo.deliveryId }
        }
    );

    assert(
        assignDelivery.status === 200 &&
            assignDelivery.data.order.delivery.id ===
                deliveryTwo.deliveryId &&
            assignDelivery.data.order.status === "READY",
        "El administrador asigna un domiciliario al pedido listo"
    );

    const wrongPickup = await api(
        `/api/deliveries/me/orders/${orderFiveId}/pickup`,
        {
            method: "PATCH",
            token: deliveryOne.token
        }
    );

    assert(
        wrongPickup.status === 403,
        "Un domiciliario no puede recoger un pedido ajeno"
    );

    const assignedOrders = await api("/api/deliveries/me/orders", {
        token: deliveryTwo.token
    });

    assert(
        assignedOrders.status === 200 &&
            assignedOrders.data.orders.some(
                order => order.id === orderFiveId
            ),
        "El domiciliario asignado ve el pedido en su lista"
    );

    const pickup = await api(
        `/api/deliveries/me/orders/${orderFiveId}/pickup`,
        {
            method: "PATCH",
            token: deliveryTwo.token
        }
    );

    assert(
        pickup.status === 200 &&
            pickup.data.order.status === "ON_THE_WAY",
        "El domiciliario asignado recoge el pedido"
    );

    const deliverAssigned = await api(
        `/api/deliveries/me/orders/${orderFiveId}/deliver`,
        {
            method: "PATCH",
            token: deliveryTwo.token
        }
    );

    assert(
        deliverAssigned.status === 200 &&
            deliverAssigned.data.order.status === "DELIVERED",
        "El domiciliario asignado entrega el pedido"
    );

    // ---------- STOCK ILIMITADO ----------
    const unlimitedOrder = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA2.id, quantity: 5 }],
        address: "Calle 6",
        city: "Bogotá"
    });

    assert(
        unlimitedOrder.status === 201 &&
            unlimitedOrder.data.order.subtotal === 25000 &&
            unlimitedOrder.data.order.total === 28000,
        "Se puede pedir un producto con stock ilimitado"
    );

    await api(`/api/orders/${unlimitedOrder.data.order.id}/cancel`, {
        method: "PATCH",
        token: client.token,
        body: { reason: "Prueba de stock ilimitado" }
    });

    assert(
        (await getStock(businessA.token, productA2.id)) === null,
        "El stock ilimitado se mantiene en null"
    );

    // ---------- PRODUCTO DESACTIVADO POR EL ADMIN ----------
    await api(`/api/admin/products/${productA2.id}/deactivate`, {
        method: "PATCH",
        token: adminToken
    });

    const inactiveProductOrder = await createOrder(client.token, {
        businessId: businessA.businessId,
        items: [{ productId: productA2.id, quantity: 1 }],
        address: "Calle 7",
        city: "Bogotá"
    });

    assert(
        inactiveProductOrder.status === 409,
        "No se puede pedir un producto desactivado por el administrador"
    );

    // ---------- PERMISOS ----------
    const clientOnBusinessOrders = await api("/api/businesses/me/orders", {
        token: client.token
    });

    assert(
        clientOnBusinessOrders.status === 403,
        "Un cliente no puede acceder a los pedidos de empresa"
    );

    const businessOnAdminOrders = await api("/api/admin/orders", {
        token: businessA.token
    });

    assert(
        businessOnAdminOrders.status === 403,
        "Una empresa no puede acceder al panel administrativo"
    );

    const deliveryOnAdminOrders = await api("/api/admin/orders", {
        token: deliveryOne.token
    });

    assert(
        deliveryOnAdminOrders.status === 403,
        "Un domiciliario no puede acceder al panel administrativo"
    );

    const anonymousOrders = await api("/api/orders");

    assert(
        anonymousOrders.status === 401,
        "Sin token no se pueden consultar pedidos"
    );

    console.log(
        "\nTodas las pruebas del Módulo 4 pasaron correctamente."
    );
}

main()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.user.deleteMany({
            where: { email: { in: createdEmails } }
        });
        await prisma.$disconnect();
    });
