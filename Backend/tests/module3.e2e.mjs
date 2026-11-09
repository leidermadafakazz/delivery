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
            contactEmail: `contacto.${slug}@test.com`
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

function flattenCatalog(catalog) {
    return [
        ...catalog.categories.flatMap(category => category.products),
        ...catalog.uncategorized
    ];
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

    const businessA = await createApprovedBusiness(adminToken, "empresaA");
    const businessB = await createApprovedBusiness(adminToken, "empresaB");
    const client = await registerUser("cliente");

    // ---------- CATEGORÍAS ----------
    const categoryOne = await api("/api/businesses/me/categories", {
        method: "POST",
        token: businessA.token,
        body: {
            name: "Platos fuertes",
            description: "Comidas principales",
            sortOrder: 1
        }
    });

    assert(
        categoryOne.status === 201,
        "La empresa crea una categoría"
    );
    const categoryOneId = categoryOne.data.category.id;

    const duplicateCategory = await api("/api/businesses/me/categories", {
        method: "POST",
        token: businessA.token,
        body: {
            name: "Platos fuertes"
        }
    });

    assert(
        duplicateCategory.status === 409,
        "No se permiten categorías duplicadas en la misma empresa"
    );

    const categoryTwo = await api("/api/businesses/me/categories", {
        method: "POST",
        token: businessA.token,
        body: {
            name: "Bebidas",
            sortOrder: 2
        }
    });

    assert(categoryTwo.status === 201, "La empresa crea una segunda categoría");
    const categoryTwoId = categoryTwo.data.category.id;

    const updateCategory = await api(
        `/api/businesses/me/categories/${categoryTwoId}`,
        {
            method: "PUT",
            token: businessA.token,
            body: {
                name: "Bebidas frías",
                description: "Jugos y gaseosas",
                sortOrder: 3
            }
        }
    );

    assert(
        updateCategory.status === 200 &&
            updateCategory.data.category.name === "Bebidas frías",
        "La empresa actualiza una categoría"
    );

    const listCategories = await api("/api/businesses/me/categories", {
        token: businessA.token
    });

    assert(
        listCategories.status === 200 &&
            listCategories.data.categories.length === 2,
        "La empresa lista sus dos categorías"
    );

    // ---------- PRODUCTOS ----------
    const productOne = await api("/api/businesses/me/products", {
        method: "POST",
        token: businessA.token,
        body: {
            name: "Bandeja paisa",
            description: "Plato típico",
            price: 28000.5,
            categoryId: categoryOneId,
            sku: `BANDEJA-${stamp}`,
            stock: 10,
            isAvailable: true,
            imageUrl: "https://example.com/bandeja.jpg"
        }
    });

    assert(
        productOne.status === 201 &&
            productOne.data.product.price === 28000.5 &&
            productOne.data.product.isAvailable === true,
        "La empresa crea un producto con precio numérico"
    );
    const productOneId = productOne.data.product.id;

    const duplicateSku = await api("/api/businesses/me/products", {
        method: "POST",
        token: businessA.token,
        body: {
            name: "Otro producto",
            price: 10000,
            sku: `BANDEJA-${stamp}`
        }
    });

    assert(
        duplicateSku.status === 409,
        "No se permite repetir el SKU dentro de la empresa"
    );

    const invalidPrice = await api("/api/businesses/me/products", {
        method: "POST",
        token: businessA.token,
        body: {
            name: "Producto inválido",
            price: -5
        }
    });

    assert(
        invalidPrice.status === 400,
        "Se rechaza un precio inválido"
    );

    const productTwo = await api("/api/businesses/me/products", {
        method: "POST",
        token: businessA.token,
        body: {
            name: "Limonada",
            price: "7000",
            categoryId: null,
            stock: 0,
            isAvailable: true
        }
    });

    assert(
        productTwo.status === 201 &&
            productTwo.data.product.categoryId === null &&
            productTwo.data.product.price === 7000,
        "La empresa crea un producto sin categoría"
    );
    const productTwoId = productTwo.data.product.id;

    const listMyProducts = await api("/api/businesses/me/products", {
        token: businessA.token
    });

    assert(
        listMyProducts.status === 200 &&
            listMyProducts.data.pagination.total === 2,
        "La empresa lista sus productos"
    );

    // ---------- AISLAMIENTO ENTRE EMPRESAS ----------
    const crossProductUpdate = await api(
        `/api/businesses/me/products/${productOneId}`,
        {
            method: "PUT",
            token: businessB.token,
            body: {
                name: "Intento de edición",
                price: 1
            }
        }
    );

    assert(
        crossProductUpdate.status === 404,
        "Otra empresa no puede editar un producto ajeno"
    );

    const crossCategoryDelete = await api(
        `/api/businesses/me/categories/${categoryOneId}`,
        {
            method: "DELETE",
            token: businessB.token
        }
    );

    assert(
        crossCategoryDelete.status === 404,
        "Otra empresa no puede eliminar una categoría ajena"
    );

    const crossCategoryUse = await api("/api/businesses/me/products", {
        method: "POST",
        token: businessB.token,
        body: {
            name: "Producto cruzado",
            price: 5000,
            categoryId: categoryOneId
        }
    });

    assert(
        crossCategoryUse.status === 400,
        "Otra empresa no puede usar una categoría ajena"
    );

    // ---------- CATÁLOGO PÚBLICO ----------
    const publicBusinesses = await api(
        "/api/catalog/businesses?limit=100"
    );

    const publicA = publicBusinesses.data.businesses.find(
        item => item.id === businessA.businessId
    );

    assert(
        publicBusinesses.status === 200 &&
            publicA &&
            publicA.productCount === 2,
        "El catálogo público lista la empresa aprobada con 2 productos"
    );

    const publicCatalog = await api(
        `/api/catalog/businesses/${businessA.businessId}`
    );

    assert(
        publicCatalog.status === 200 &&
            publicCatalog.data.categories.some(
                category => category.id === categoryOneId
            ) &&
            flattenCatalog(publicCatalog.data).length === 2,
        "El detalle público muestra categorías y productos"
    );

    assert(
        typeof flattenCatalog(publicCatalog.data)[0].price === "number",
        "El precio se devuelve como número"
    );

    const publicSearch = await api(
        `/api/catalog/products?search=Bandeja&businessId=${businessA.businessId}`
    );

    assert(
        publicSearch.status === 200 &&
            publicSearch.data.products.some(
                product => product.id === productOneId
            ),
        "La búsqueda pública encuentra el producto"
    );

    const priceFilter = await api(
        `/api/catalog/products?businessId=${businessA.businessId}&minPrice=10000&maxPrice=30000`
    );

    assert(
        priceFilter.status === 200 &&
            priceFilter.data.products.length === 1 &&
            priceFilter.data.products[0].id === productOneId,
        "El filtro por rango de precio funciona"
    );

    const publicProductDetail = await api(
        `/api/catalog/products/${productOneId}`
    );

    assert(
        publicProductDetail.status === 200 &&
            publicProductDetail.data.product.business.id ===
                businessA.businessId,
        "El detalle público del producto incluye su empresa"
    );

    const invalidSort = await api("/api/catalog/products?sort=invalid");
    assert(
        invalidSort.status === 400,
        "Se rechaza un orden inválido en el catálogo"
    );

    // ---------- DISPONIBILIDAD ----------
    const markUnavailable = await api(
        `/api/businesses/me/products/${productOneId}/availability`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { isAvailable: false }
        }
    );

    assert(
        markUnavailable.status === 200 &&
            markUnavailable.data.product.isAvailable === false,
        "La empresa marca un producto como no disponible"
    );

    const hiddenCatalog = await api(
        `/api/catalog/businesses/${businessA.businessId}`
    );

    assert(
        !flattenCatalog(hiddenCatalog.data).some(
            product => product.id === productOneId
        ),
        "Un producto no disponible se oculta al público"
    );

    const hiddenSearch = await api(
        `/api/catalog/products?businessId=${businessA.businessId}`
    );

    assert(
        !hiddenSearch.data.products.some(
            product => product.id === productOneId
        ),
        "Un producto no disponible no aparece en la búsqueda"
    );

    await api(
        `/api/businesses/me/products/${productOneId}/availability`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { isAvailable: true }
        }
    );

    // ---------- PERMISOS ----------
    const clientCreateCategory = await api(
        "/api/businesses/me/categories",
        {
            method: "POST",
            token: client.token,
            body: { name: "Categoría de cliente" }
        }
    );

    assert(
        clientCreateCategory.status === 403,
        "Un cliente no puede crear categorías"
    );

    const anonymousCreate = await api("/api/businesses/me/categories", {
        method: "POST",
        body: { name: "Categoría anónima" }
    });

    assert(
        anonymousCreate.status === 401,
        "Sin token no se puede gestionar el catálogo"
    );

    // ---------- MODERACIÓN DEL ADMIN ----------
    const adminProducts = await api(
        `/api/admin/products?businessId=${businessA.businessId}&limit=100`,
        { token: adminToken }
    );

    assert(
        adminProducts.status === 200 &&
            adminProducts.data.products.some(
                product => product.id === productOneId
            ),
        "El administrador lista los productos de la empresa"
    );

    const adminDeactivate = await api(
        `/api/admin/products/${productOneId}/deactivate`,
        {
            method: "PATCH",
            token: adminToken
        }
    );

    assert(
        adminDeactivate.status === 200 &&
            adminDeactivate.data.product.isActive === false &&
            adminDeactivate.data.product.isAvailable === false,
        "El administrador desactiva un producto"
    );

    const publicAfterAdminBlock = await api(
        `/api/catalog/products/${productOneId}`
    );

    assert(
        publicAfterAdminBlock.status === 404,
        "Un producto desactivado por el administrador no es público"
    );

    const ownAfterBlock = await api(
        `/api/businesses/me/products/${productOneId}`,
        { token: businessA.token }
    );

    assert(
        ownAfterBlock.status === 200 &&
            ownAfterBlock.data.product.isActive === false,
        "La empresa ve que el administrador desactivó su producto"
    );

    const adminReactivate = await api(
        `/api/admin/products/${productOneId}/activate`,
        {
            method: "PATCH",
            token: adminToken
        }
    );

    assert(
        adminReactivate.status === 200 &&
            adminReactivate.data.product.isActive === true &&
            adminReactivate.data.product.isAvailable === false,
        "El administrador reactiva el producto sin marcarlo disponible"
    );

    const stillHidden = await api(
        `/api/catalog/products/${productOneId}`
    );

    assert(
        stillHidden.status === 404,
        "Tras reactivarlo sigue oculto hasta que la empresa lo disponga"
    );

    await api(
        `/api/businesses/me/products/${productOneId}/availability`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { isAvailable: true }
        }
    );

    const visibleAgain = await api(
        `/api/catalog/products/${productOneId}`
    );

    assert(
        visibleAgain.status === 200,
        "El producto vuelve al catálogo público"
    );

    // ---------- ELIMINACIÓN LÓGICA ----------
    const deleteProduct = await api(
        `/api/businesses/me/products/${productTwoId}`,
        {
            method: "DELETE",
            token: businessA.token
        }
    );

    assert(
        deleteProduct.status === 200 &&
            deleteProduct.data.product.deletedAt !== null,
        "La empresa elimina lógicamente un producto"
    );

    const listWithoutDeleted = await api(
        "/api/businesses/me/products",
        { token: businessA.token }
    );

    assert(
        !listWithoutDeleted.data.products.some(
            product => product.id === productTwoId
        ),
        "El producto eliminado no aparece en el listado normal"
    );

    const listWithDeleted = await api(
        "/api/businesses/me/products?includeDeleted=true",
        { token: businessA.token }
    );

    assert(
        listWithDeleted.data.products.some(
            product => product.id === productTwoId
        ),
        "El producto eliminado aparece con includeDeleted=true"
    );

    const publicAfterDelete = await api(
        `/api/catalog/products/${productTwoId}`
    );

    assert(
        publicAfterDelete.status === 404,
        "El producto eliminado no es público"
    );

    const adminActivateDeleted = await api(
        `/api/admin/products/${productTwoId}/activate`,
        {
            method: "PATCH",
            token: adminToken
        }
    );

    assert(
        adminActivateDeleted.status === 409,
        "El administrador no reactiva un producto eliminado por la empresa"
    );

    const restoreProduct = await api(
        `/api/businesses/me/products/${productTwoId}/restore`,
        {
            method: "PATCH",
            token: businessA.token
        }
    );

    assert(
        restoreProduct.status === 200 &&
            restoreProduct.data.product.deletedAt === null &&
            restoreProduct.data.product.isAvailable === false,
        "La empresa restaura el producto como no disponible"
    );

    await api(
        `/api/businesses/me/products/${productTwoId}/availability`,
        {
            method: "PATCH",
            token: businessA.token,
            body: { isAvailable: true }
        }
    );

    const restoredPublic = await api(
        `/api/catalog/products/${productTwoId}`
    );

    assert(
        restoredPublic.status === 200,
        "El producto restaurado vuelve al catálogo"
    );

    // ---------- ELIMINACIÓN DE CATEGORÍA ----------
    const deleteCategory = await api(
        `/api/businesses/me/categories/${categoryOneId}`,
        {
            method: "DELETE",
            token: businessA.token
        }
    );

    assert(
        deleteCategory.status === 200 &&
            deleteCategory.data.affectedProducts === 1,
        "Al eliminar la categoría se informan los productos afectados"
    );

    const uncategorizedProduct = await api(
        `/api/businesses/me/products/${productOneId}`,
        { token: businessA.token }
    );

    assert(
        uncategorizedProduct.data.product.categoryId === null,
        "Los productos de la categoría eliminada quedan sin categoría"
    );

    console.log(
        "\nTodas las pruebas del Módulo 3 pasaron correctamente."
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
