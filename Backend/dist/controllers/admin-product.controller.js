"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllProducts = listAllProducts;
exports.deactivateProduct = deactivateProduct;
exports.activateProduct = activateProduct;
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const catalog_1 = require("../utils/catalog");
const adminProductInclude = {
    business: {
        select: {
            id: true,
            businessName: true,
            status: true
        }
    },
    category: {
        select: {
            id: true,
            name: true
        }
    }
};
// LISTAR TODOS LOS PRODUCTOS (ADMIN)
async function listAllProducts(req, res) {
    try {
        const { page, limit, skip } = (0, profile_1.getPagination)(req.query);
        let businessId;
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
        let categoryId;
        if (req.query.categoryId !== undefined) {
            categoryId = (0, catalog_1.parseCategoryId)(req.query.categoryId);
            if (!categoryId) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro categoryId no es válido"
                });
            }
        }
        let isActive;
        if (req.query.isActive !== undefined) {
            isActive = (0, catalog_1.parseBoolean)(req.query.isActive);
            if (isActive === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro isActive debe ser true o false"
                });
            }
        }
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
        const includeDeleted = (0, catalog_1.parseBoolean)(req.query.includeDeleted) === true;
        const search = (0, profile_1.cleanString)(req.query.search);
        const where = {
            ...(businessId ? { businessId } : {}),
            ...(categoryId ? { categoryId } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
            ...(isAvailable !== undefined ? { isAvailable } : {}),
            ...(includeDeleted ? {} : { deletedAt: null }),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search } },
                        { sku: { contains: search } },
                        { business: { businessName: { contains: search } } }
                    ]
                }
                : {})
        };
        const [total, products] = await Promise.all([
            database_1.prisma.product.count({ where }),
            database_1.prisma.product.findMany({
                where,
                include: adminProductInclude,
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
        console.error("Error listando productos (admin):", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar productos"
        });
    }
}
// DESACTIVAR PRODUCTO (ADMIN)
async function deactivateProduct(req, res) {
    try {
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }
        const product = await database_1.prisma.product.findUnique({
            where: { id }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }
        const updated = await database_1.prisma.product.update({
            where: { id },
            data: {
                isActive: false,
                isAvailable: false
            },
            include: adminProductInclude
        });
        return res.json({
            success: true,
            message: "Producto desactivado. Ya no se muestra en el catálogo público.",
            product: (0, catalog_1.serializeProduct)(updated)
        });
    }
    catch (error) {
        console.error("Error desactivando producto:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al desactivar el producto"
        });
    }
}
// REACTIVAR PRODUCTO (ADMIN)
async function activateProduct(req, res) {
    try {
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }
        const product = await database_1.prisma.product.findUnique({
            where: { id }
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
                message: "El producto fue eliminado por la empresa y no puede reactivarse desde administración"
            });
        }
        const updated = await database_1.prisma.product.update({
            where: { id },
            data: { isActive: true },
            include: adminProductInclude
        });
        return res.json({
            success: true,
            message: "Producto reactivado. La empresa debe marcarlo como disponible para que vuelva a mostrarse.",
            product: (0, catalog_1.serializeProduct)(updated)
        });
    }
    catch (error) {
        console.error("Error reactivando producto:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al reactivar el producto"
        });
    }
}
