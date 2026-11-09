import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const base = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const stamp = Date.now();

const adminEmail = process.env.ADMIN_EMAIL || "admin@fastdelivery.com";
const adminPassword = process.env.ADMIN_PASSWORD || "Admin1234!";
const userAPassword = "Test1234!";

const businessEmail = `empresa.${stamp}@test.com`;
const deliveryEmail = `domiciliario.${stamp}@test.com`;

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

async function main() {
    await waitForServer();
    console.log(`Servidor disponible en ${base}`);

    const health = await api("/api/health");
    assert(health.status === 200, "Healthcheck responde 200");

    const adminLogin = await api("/api/auth/login", {
        method: "POST",
        body: { email: adminEmail, password: adminPassword }
    });
    assert(adminLogin.status === 200, "Administrador inicia sesión");
    const adminToken = adminLogin.data.token;

    const businessUser = await api("/api/auth/register", {
        method: "POST",
        body: {
            name: "Empresa E2E",
            email: businessEmail,
            password: userAPassword
        }
    });
    assert(businessUser.status === 201, "Se registra usuario de empresa");
    const businessToken = businessUser.data.token;

    const deliveryUser = await api("/api/auth/register", {
        method: "POST",
        body: {
            name: "Domiciliario E2E",
            email: deliveryEmail,
            password: userAPassword
        }
    });
    assert(deliveryUser.status === 201, "Se registra usuario domiciliario");
    const deliveryToken = deliveryUser.data.token;

    // ---------- EMPRESAS ----------
    const businessPayload = {
        businessName: "Restaurante E2E",
        legalName: "Restaurante E2E SAS",
        taxId: `NIT-${stamp}`,
        businessType: "RESTAURANT",
        description: "Comida de prueba",
        address: "Calle 123 #45-67",
        city: "Bogotá",
        department: "Cundinamarca",
        contactPhone: "3001234567",
        contactEmail: `contacto.${stamp}@test.com`,
        documentUrl: "https://example.com/camara-comercio.pdf"
    };

    const businessRegister = await api("/api/businesses/register", {
        method: "POST",
        token: businessToken,
        body: businessPayload
    });
    assert(
        businessRegister.status === 201 &&
            businessRegister.data.business.status === "PENDING",
        "Empresa queda en estado PENDING"
    );
    const businessId = businessRegister.data.business.id;

    const duplicateBusiness = await api("/api/businesses/register", {
        method: "POST",
        token: businessToken,
        body: businessPayload
    });
    assert(
        duplicateBusiness.status === 409,
        "No se permite duplicar la solicitud de empresa"
    );

    const forbiddenBusinessList = await api("/api/businesses", {
        token: businessToken
    });
    assert(
        forbiddenBusinessList.status === 403,
        "Un usuario BUSINESS no puede listar empresas (solo ADMIN)"
    );

    const pendingBusinesses = await api(
        "/api/businesses?status=PENDING",
        { token: adminToken }
    );
    assert(
        pendingBusinesses.status === 200 &&
            pendingBusinesses.data.businesses.some(
                item => item.id === businessId
            ),
        "El administrador ve la empresa pendiente"
    );

    const approveBusiness = await api(
        `/api/businesses/${businessId}/approve`,
        { method: "PATCH", token: adminToken }
    );
    assert(
        approveBusiness.status === 200 &&
            approveBusiness.data.business.status === "APPROVED",
        "El administrador aprueba la empresa"
    );

    const businessMe = await api("/api/auth/me", { token: businessToken });
    assert(
        businessMe.data.user.roles.includes("BUSINESS"),
        "Al aprobar se asigna el rol BUSINESS"
    );

    const rejectBusiness = await api(
        `/api/businesses/${businessId}/reject`,
        {
            method: "PATCH",
            token: adminToken,
            body: { reason: "Documentación incompleta para la prueba" }
        }
    );
    assert(
        rejectBusiness.status === 200 &&
            rejectBusiness.data.business.status === "REJECTED",
        "El administrador rechaza la empresa"
    );

    const businessMeRejected = await api("/api/auth/me", {
        token: businessToken
    });
    assert(
        !businessMeRejected.data.user.roles.includes("BUSINESS"),
        "Al rechazar una empresa aprobada se revoca el rol BUSINESS"
    );

    const businessResubmit = await api("/api/businesses/me", {
        method: "PUT",
        token: businessToken,
        body: {
            ...businessPayload,
            description: "Documentación corregida"
        }
    });
    assert(
        businessResubmit.status === 200 &&
            businessResubmit.data.business.status === "PENDING" &&
            businessResubmit.data.business.rejectionReason === null,
        "Al editar una solicitud rechazada vuelve a PENDING"
    );

    const approveBusinessAgain = await api(
        `/api/businesses/${businessId}/approve`,
        { method: "PATCH", token: adminToken }
    );
    assert(
        approveBusinessAgain.status === 200,
        "La empresa puede aprobarse nuevamente"
    );

    // ---------- DOMICILIARIOS ----------
    const deliveryPayload = {
        documentType: "CC",
        documentNumber: `CC-${stamp}`,
        birthDate: "1995-05-20",
        address: "Carrera 10 #20-30",
        city: "Medellín",
        vehicleType: "MOTORCYCLE",
        vehiclePlate: "ABC12D",
        licenseNumber: `LIC-${stamp}`,
        documentUrl: "https://example.com/cedula.pdf",
        licenseUrl: "https://example.com/licencia.pdf",
        emergencyContactName: "Contacto E2E",
        emergencyContactPhone: "3009876543"
    };

    const deliveryRegister = await api("/api/deliveries/register", {
        method: "POST",
        token: deliveryToken,
        body: deliveryPayload
    });
    assert(
        deliveryRegister.status === 201 &&
            deliveryRegister.data.delivery.status === "PENDING",
        "Domiciliario queda en estado PENDING"
    );
    const deliveryId = deliveryRegister.data.delivery.id;

    const rejectDelivery = await api(
        `/api/deliveries/${deliveryId}/reject`,
        {
            method: "PATCH",
            token: adminToken,
            body: { reason: "Licencia de conducción vencida" }
        }
    );
    assert(
        rejectDelivery.status === 200 &&
            rejectDelivery.data.delivery.status === "REJECTED",
        "El administrador rechaza el domiciliario"
    );

    const deliveryMe = await api("/api/deliveries/me", {
        token: deliveryToken
    });
    assert(
        deliveryMe.data.delivery.rejectionReason ===
            "Licencia de conducción vencida",
        "El domiciliario ve el motivo de rechazo"
    );

    const deliveryResubmit = await api("/api/deliveries/me", {
        method: "PUT",
        token: deliveryToken,
        body: {
            ...deliveryPayload,
            licenseUrl: "https://example.com/licencia-nueva.pdf"
        }
    });
    assert(
        deliveryResubmit.status === 200 &&
            deliveryResubmit.data.delivery.status === "PENDING",
        "El domiciliario corrige y reenvía su solicitud"
    );

    const approveDelivery = await api(
        `/api/deliveries/${deliveryId}/approve`,
        { method: "PATCH", token: adminToken }
    );
    assert(
        approveDelivery.status === 200 &&
            approveDelivery.data.delivery.status === "APPROVED",
        "El administrador aprueba el domiciliario"
    );

    const deliveryMeApproved = await api("/api/auth/me", {
        token: deliveryToken
    });
    assert(
        deliveryMeApproved.data.user.roles.includes("DELIVERY"),
        "Al aprobar se asigna el rol DELIVERY"
    );

    // ---------- PANEL / PERMISOS ----------
    const dashboard = await api("/api/admin/dashboard", {
        token: adminToken
    });
    assert(
        dashboard.status === 200 &&
            dashboard.data.stats.businesses.APPROVED >= 1 &&
            dashboard.data.stats.deliveries.APPROVED >= 1,
        "El dashboard muestra las estadísticas de aprobación"
    );

    const requests = await api(
        "/api/admin/requests?type=all&status=APPROVED&limit=50",
        { token: adminToken }
    );
    assert(
        requests.status === 200 &&
            requests.data.businesses.some(item => item.id === businessId) &&
            requests.data.deliveries.some(item => item.id === deliveryId),
        "El panel lista solicitudes aprobadas de ambos tipos"
    );

    const dashboardWithoutToken = await api("/api/admin/dashboard");
    assert(
        dashboardWithoutToken.status === 401,
        "El panel exige autenticación"
    );

    const dashboardAsClient = await api("/api/admin/dashboard", {
        token: deliveryToken
    });
    assert(
        dashboardAsClient.status === 403,
        "Un usuario no administrador no puede acceder al panel"
    );

    const invalidStatus = await api("/api/businesses?status=INVALID", {
        token: adminToken
    });
    assert(
        invalidStatus.status === 400,
        "Se rechazan filtros de estado inválidos"
    );

    console.log("\nTodas las pruebas del Módulo 2 pasaron correctamente.");
}

main()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        // Limpieza: elimina los usuarios creados por la prueba.
        await prisma.user.deleteMany({
            where: { email: { in: [businessEmail, deliveryEmail] } }
        });
        await prisma.$disconnect();
    });
