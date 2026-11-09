"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyProducts = listMyProducts;
exports.getMyProduct = getMyProduct;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.restoreProduct = restoreProduct;
exports.updateProductAvailability = updateProductAvailability;
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const catalog_1 = require("../utils/catalog");
const productInclude = {
    category: {
        select: {
            id: true,
            name: true
        }
    }
};
function currentBusiness(res) {
    return res.locals.business;
}
function buildProductData(body, availabilityFallback) {
    const errors = [];
    const name = (0, profile_1.cleanString)(body.name);
    const description = (0, profile_1.cleanString)(body.description);
    const imageUrl = (0, profile_1.cleanString)(body.imageUrl);
    const sku = (0, profile_1.cleanString)(body.sku);
    const priceValue = (0, catalog_1.parsePrice)(body.price);
    const categoryId = (0, catalog_1.parseCategoryId)(body.categoryId);
    const stock = (0, catalog_1.parseStock)(body.stock);
    const isAvailable = body.isAvailable === undefined
        ? availabilityFallback
        : (0, catalog_1.parseBoolean)(body.isAvailable);
    if (!name) {
        errors.push("El nombre del producto es obligatorio");
    }
    if (priceValue === null) {
        errors.push("El precio debe ser un número mayor que 0 y menor o igual a 99.999.999,99");
    }
    if (categoryId === undefined) {
        errors.push("La categoría indicada no es válida");
    }
    if (stock === undefined) {
        errors.push("El stock debe ser un número entero mayor o igual a 0");
    }
    if (isAvailable === undefined) {
        errors.push("La disponibilidad debe ser true o false");
    }
    if (errors.length > 0) {
        return { errors, data: null };
    }
    return {
        errors: [],
        data: {
            name: name,
            description,
            categoryId: categoryId,
            price: (0, catalog_1.priceToDatabase)(priceValue),
            imageUrl,
            sku,
            stock: stock,
            isAvailable: isAvailable
        }
    };
}
async function categoryBelongsToBusiness(categoryId, businessId) {
    const category = await database_1.prisma.category.findFirst({
        where: {
            id: categoryId,
            businessId
        }
    });
    return Boolean(category);
}
async function findSkuConflict(businessId, sku, excludeProductId) {
    if (!sku) {
        return null;
    }
    return database_1.prisma.product.findFirst({
        where: {
            businessId,
            sku,
            ...(excludeProductId ? { id: { not: excludeProductId } } : {})
        }
    });
}
// LISTAR MIS PRODUCTOS
async function listMyProducts(req, res) {
    try {
        const business = currentBusiness(res);
        const { page, limit, skip } = (0, profile_1.getPagination)(req.query);
        const includeDeleted = (0, catalog_1.parseBoolean)(req.query.includeDeleted) === true;
        let isAvailable;
        if (req.query.isAvailable !== undefined) {
            isAvailable = (0, catalog_1.parseBoolean)(req.query.isAvailable);
            if (isAvailable === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro isAvailable debe ser true o false"
                });
            }
        }
        let categoryId;
        if (req.query.categoryId !== undefined) {
            categoryId = (0, catalog_1.parseCategoryId)(req.query.categoryId);
            if (categoryId === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro categoryId no es válido"
                });
            }
        }
        const search = (0, profile_1.cleanString)(req.query.search);
        const where = {
            businessId: business.id,
            ...(includeDeleted ? {} : { deletedAt: null }),
            ...(categoryId ? { categoryId } : {}),
            ...(isAvailable !== undefined ? { isAvailable } : {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search } },
                        { sku: { contains: search } }
                    ]
                }
                : {})
        };
        const [total, products] = await Promise.all([
            database_1.prisma.product.count({ where }),
            database_1.prisma.product.findMany({
                where,
                include: productInclude,
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
            products: (0, catalog_1.serializeProducts)(products)
        });
    }
    catch (error) {
        console.error("Error listando productos:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar productos"
        });
    }
}
// DETALLE DE UN PRODUCTO PROPIO
async function getMyProduct(req, res) {
    try {
        const business = currentBusiness(res);
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }
        const product = await database_1.prisma.product.findFirst({
            where: {
                id,
                businessId: business.id
            },
            include: productInclude
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }
        return res.json({
            success: true,
            product: (0, catalog_1.serializeProduct)(product)
        });
    }
    catch (error) {
        console.error("Error consultando producto:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el producto"
        });
    }
}
// CREAR PRODUCTO
async function createProduct(req, res) {
    try {
        const business = currentBusiness(res);
        const { errors, data } = buildProductData(req.body, true);
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Datos del producto inválidos",
                errors
            });
        }
        if (data.categoryId &&
            !(await categoryBelongsToBusiness(data.categoryId, business.id))) {
            return res.status(400).json({
                success: false,
                message: "La categoría no pertenece a tu empresa"
            });
        }
        if (await findSkuConflict(business.id, data.sku)) {
            return res.status(409).json({
                success: false,
                message: "Ya tienes un producto con ese SKU"
            });
        }
        const product = await database_1.prisma.product.create({
            data: {
                businessId: business.id,
                ...data
            },
            include: productInclude
        });
        return res.status(201).json({
            success: true,
            message: "Producto creado correctamente",
            product: (0, catalog_1.serializeProduct)(product)
        });
    }
    catch (error) {
        console.error("Error creando producto:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al crear el producto"
        });
    }
}
// ACTUALIZAR PRODUCTO
async function updateProduct(req, res) {
    try {
        const business = currentBusiness(res);
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }
        const product = await database_1.prisma.product.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }
        if (product.deletedAt) {
            return res.status(409).json({
                success: false,
                message: "Este producto está eliminado. Restáuralo antes de editarlo."
            });
        }
        const { errors, data } = buildProductData(req.body, product.isAvailable);
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Datos del producto inválidos",
                errors
            });
        }
        if (data.categoryId &&
            !(await categoryBelongsToBusiness(data.categoryId, business.id))) {
            return res.status(400).json({
                success: false,
                message: "La categoría no pertenece a tu empresa"
            });
        }
        if (await findSkuConflict(business.id, data.sku, id)) {
            return res.status(409).json({
                success: false,
                message: "Ya tienes un producto con ese SKU"
            });
        }
        const updated = await database_1.prisma.product.update({
            where: { id },
            data,
            include: productInclude
        });
        return res.json({
            success: true,
            message: "Producto actualizado correctamente",
            product: (0, catalog_1.serializeProduct)(updated)
        });
    }
    catch (error) {
        console.error("Error actualizando producto:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar el producto"
        });
    }
}
// ELIMINAR PRODUCTO (eliminación lógica)
async function deleteProduct(req, res) {
    try {
        const business = currentBusiness(res);
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }
        const product = await database_1.prisma.product.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }
        if (product.deletedAt) {
            return res.status(409).json({
                success: false,
                message: "Este producto ya está eliminado"
            });
        }
        const deleted = await database_1.prisma.product.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isAvailable: false
            },
            include: productInclude
        });
        return res.json({
            success: true,
            message: "Producto eliminado correctamente",
            product: (0, catalog_1.serializeProduct)(deleted)
        });
    }
    catch (error) {
        console.error("Error eliminando producto:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al eliminar el producto"
        });
    }
}
// RESTAURAR PRODUCTO ELIMINADO
async function restoreProduct(req, res) {
    try {
        const business = currentBusiness(res);
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }
        const product = await database_1.prisma.product.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }
        if (!product.deletedAt) {
            return res.status(409).json({
                success: false,
                message: "Este producto no está eliminado"
            });
        }
        const restored = await database_1.prisma.product.update({
            where: { id },
            data: {
                deletedAt: null,
                isAvailable: false
            },
            include: productInclude
        });
        return res.json({
            success: true,
            message: "Producto restaurado. Queda no disponible hasta que lo actives.",
            product: (0, catalog_1.serializeProduct)(restored)
        });
    }
    catch (error) {
        console.error("Error restaurando producto:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al restaurar el producto"
        });
    }
}
// CAMBIAR DISPONIBILIDAD
async function updateProductAvailability(req, res) {
    try {
        const business = currentBusiness(res);
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }
        const isAvailable = (0, catalog_1.parseBoolean)(req.body.isAvailable);
        if (isAvailable === undefined) {
            return res.status(400).json({
                success: false,
                message: "Debes enviar isAvailable como true o false"
            });
        }
        const product = await database_1.prisma.product.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }
        if (product.deletedAt) {
            return res.status(409).json({
                success: false,
                message: "No puedes cambiar la disponibilidad de un producto eliminado"
            });
        }
        const updated = await database_1.prisma.product.update({
            where: { id },
            data: { isAvailable },
            include: productInclude
        });
        return res.json({
            success: true,
            message: isAvailable
                ? "Producto marcado como disponible"
                : "Producto marcado como no disponible",
            product: (0, catalog_1.serializeProduct)(updated)
        });
    }
    catch (error) {
        console.error("Error cambiando disponibilidad:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al cambiar la disponibilidad"
        });
    }
}
