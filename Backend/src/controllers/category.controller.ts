import { Request, Response } from "express";
import { prisma } from "../config/database";
import { cleanString, parseId } from "../utils/profile";
import { parseSortOrder } from "../utils/catalog";

function currentBusiness(res: Response): { id: number } {
    return res.locals.business as { id: number };
}

// LISTAR CATEGORÍAS DE MI EMPRESA
export async function listCategories(_req: Request, res: Response) {
    try {
        const business = currentBusiness(res);

        const categories = await prisma.category.findMany({
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
    } catch (error) {
        console.error("Error listando categorías:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar categorías"
        });
    }
}

// CREAR CATEGORÍA
export async function createCategory(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);

        const name = cleanString(req.body.name);
        const description = cleanString(req.body.description);
        const sortOrder = parseSortOrder(req.body.sortOrder);

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

        const existing = await prisma.category.findUnique({
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

        const category = await prisma.category.create({
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
    } catch (error) {
        console.error("Error creando categoría:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al crear la categoría"
        });
    }
}

// ACTUALIZAR CATEGORÍA
export async function updateCategory(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de categoría inválido"
            });
        }

        const category = await prisma.category.findFirst({
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

        const name = cleanString(req.body.name);
        const description = cleanString(req.body.description);
        const sortOrder = parseSortOrder(req.body.sortOrder);

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

        const duplicate = await prisma.category.findFirst({
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

        const updated = await prisma.category.update({
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
    } catch (error) {
        console.error("Error actualizando categoría:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar la categoría"
        });
    }
}

// ELIMINAR CATEGORÍA
export async function deleteCategory(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de categoría inválido"
            });
        }

        const category = await prisma.category.findFirst({
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

        const affectedProducts = await prisma.product.count({
            where: { categoryId: id }
        });

        await prisma.category.delete({
            where: { id }
        });

        return res.json({
            success: true,
            message:
                affectedProducts > 0
                    ? `Categoría eliminada. ${affectedProducts} producto(s) quedaron sin categoría.`
                    : "Categoría eliminada correctamente",
            affectedProducts
        });
    } catch (error) {
        console.error("Error eliminando categoría:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al eliminar la categoría"
        });
    }
}
