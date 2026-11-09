"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const catalog_1 = require("../utils/catalog");
function currentBusiness(res) {
    return res.locals.business;
}
// LISTAR CATEGORÍAS DE MI EMPRESA
async function listCategories(_req, res) {
    try {
        const business = currentBusiness(res);
        const categories = await database_1.prisma.category.findMany({
            where: { businessId: business.id },
            include: {
                _count: {
                    select: {
                        products: {
                            where: { deletedAt: null }
                        }
                    }
                }
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
        });
        return res.json({
            success: true,
            categories
        });
    }
    catch (error) {
        console.error("Error listando categorías:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar categorías"
        });
    }
}
// CREAR CATEGORÍA
async function createCategory(req, res) {
    try {
        const business = currentBusiness(res);
        const name = (0, profile_1.cleanString)(req.body.name);
        const description = (0, profile_1.cleanString)(req.body.description);
        const sortOrder = (0, catalog_1.parseSortOrder)(req.body.sortOrder);
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "El nombre de la categoría es obligatorio"
            });
        }
        if (sortOrder === undefined) {
            return res.status(400).json({
                success: false,
                message: "El orden debe ser un número entero mayor o igual a 0"
            });
        }
        const existing = await database_1.prisma.category.findUnique({
            where: {
                businessId_name: {
                    businessId: business.id,
                    name
                }
            }
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Ya tienes una categoría con ese nombre"
            });
        }
        const category = await database_1.prisma.category.create({
            data: {
                businessId: business.id,
                name,
                description,
                sortOrder
            }
        });
        return res.status(201).json({
            success: true,
            message: "Categoría creada correctamente",
            category
        });
    }
    catch (error) {
        console.error("Error creando categoría:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al crear la categoría"
        });
    }
}
// ACTUALIZAR CATEGORÍA
async function updateCategory(req, res) {
    try {
        const business = currentBusiness(res);
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de categoría inválido"
            });
        }
        const category = await database_1.prisma.category.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Categoría no encontrada"
            });
        }
        const name = (0, profile_1.cleanString)(req.body.name);
        const description = (0, profile_1.cleanString)(req.body.description);
        const sortOrder = (0, catalog_1.parseSortOrder)(req.body.sortOrder);
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "El nombre de la categoría es obligatorio"
            });
        }
        if (sortOrder === undefined) {
            return res.status(400).json({
                success: false,
                message: "El orden debe ser un número entero mayor o igual a 0"
            });
        }
        const duplicate = await database_1.prisma.category.findFirst({
            where: {
                businessId: business.id,
                name,
                id: { not: id }
            }
        });
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "Ya tienes una categoría con ese nombre"
            });
        }
        const updated = await database_1.prisma.category.update({
            where: { id },
            data: {
                name,
                description,
                sortOrder
            }
        });
        return res.json({
            success: true,
            message: "Categoría actualizada correctamente",
            category: updated
        });
    }
    catch (error) {
        console.error("Error actualizando categoría:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar la categoría"
        });
    }
}
// ELIMINAR CATEGORÍA
async function deleteCategory(req, res) {
    try {
        const business = currentBusiness(res);
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de categoría inválido"
            });
        }
        const category = await database_1.prisma.category.findFirst({
            where: {
                id,
                businessId: business.id
            }
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Categoría no encontrada"
            });
        }
        const affectedProducts = await database_1.prisma.product.count({
            where: { categoryId: id }
        });
        await database_1.prisma.category.delete({
            where: { id }
        });
        return res.json({
            success: true,
            message: affectedProducts > 0
                ? `Categoría eliminada. ${affectedProducts} producto(s) quedaron sin categoría.`
                : "Categoría eliminada correctamente",
            affectedProducts
        });
    }
    catch (error) {
        console.error("Error eliminando categoría:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al eliminar la categoría"
        });
    }
}
