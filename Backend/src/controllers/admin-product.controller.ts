import { Request, Response } from "express";
import { prisma } from "../config/database";
import { cleanString, getPagination, parseId } from "../utils/profile";
import {
    parseBoolean,
    parseCategoryId,
    serializeProduct,
    serializeProducts
} from "../utils/catalog";

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
} as const;

// LISTAR TODOS LOS PRODUCTOS (ADMIN)
export async function listAllProducts(req: Request, res: Response) {
    try {
        const { page, limit, skip } = getPagination(req.query);

        let businessId: number | undefined;

        if (req.query.businessId !== undefined) {
            const parsed = parseId(req.query.businessId);

            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro businessId no es válido"
                });
            }

            businessId = parsed;
        }

        let categoryId: number | null | undefined;

        if (req.query.categoryId !== undefined) {
            categoryId = parseCategoryId(req.query.categoryId);

            if (!categoryId) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro categoryId no es válido"
                });
            }
        }

        let isActive: boolean | undefined;

        if (req.query.isActive !== undefined) {
            isActive = parseBoolean(req.query.isActive);

            if (isActive === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro isActive debe ser true o false"
                });
            }
        }

        let isAvailable: boolean | undefined;

        if (req.query.isAvailable !== undefined) {
            isAvailable = parseBoolean(req.query.isAvailable);

            if (isAvailable === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro isAvailable debe ser true o false"
                });
            }
        }

        const includeDeleted =
            parseBoolean(req.query.includeDeleted) === true;
        const search = cleanString(req.query.search);

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
            prisma.product.count({ where }),
            prisma.product.findMany({
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
            products: serializeProducts(products)
        });
    } catch (error) {
        console.error("Error listando productos (admin):", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar productos"
        });
    }
}

// DESACTIVAR PRODUCTO (ADMIN)
export async function deactivateProduct(req: Request, res: Response) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }

        const product = await prisma.product.findUnique({
            where: { id }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        const updated = await prisma.product.update({
            where: { id },
            data: {
                isActive: false,
                isAvailable: false
            },
            include: adminProductInclude
        });

        return res.json({
            success: true,
            message:
                "Producto desactivado. Ya no se muestra en el catálogo público.",
            product: serializeProduct(updated)
        });
    } catch (error) {
        console.error("Error desactivando producto:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al desactivar el producto"
        });
    }
}

// REACTIVAR PRODUCTO (ADMIN)
export async function activateProduct(req: Request, res: Response) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }

        const product = await prisma.product.findUnique({
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
                message:
                    "El producto fue eliminado por la empresa y no puede reactivarse desde administración"
            });
        }

        const updated = await prisma.product.update({
            where: { id },
            data: { isActive: true },
            include: adminProductInclude
        });

        return res.json({
            success: true,
            message:
                "Producto reactivado. La empresa debe marcarlo como disponible para que vuelva a mostrarse.",
            product: serializeProduct(updated)
        });
    } catch (error) {
        console.error("Error reactivando producto:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al reactivar el producto"
        });
    }
}
