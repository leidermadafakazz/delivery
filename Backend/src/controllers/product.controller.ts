import { Request, Response } from "express";
import { prisma } from "../config/database";
import { cleanString, getPagination, parseId } from "../utils/profile";
import {
    parseBoolean,
    parseCategoryId,
    parsePrice,
    parseStock,
    priceToDatabase,
    serializeProduct,
    serializeProducts
} from "../utils/catalog";

const productInclude = {
    category: {
        select: {
            id: true,
            name: true
        }
    }
} as const;

interface ProductData {
    name: string;
    description: string | null;
    categoryId: number | null;
    price: string;
    imageUrl: string | null;
    sku: string | null;
    stock: number | null;
    isAvailable: boolean;
}

function currentBusiness(res: Response): { id: number } {
    return res.locals.business as { id: number };
}

function buildProductData(
    body: Record<string, unknown>,
    availabilityFallback: boolean
): { errors: string[]; data: ProductData | null } {
    const errors: string[] = [];

    const name = cleanString(body.name);
    const description = cleanString(body.description);
    const imageUrl = cleanString(body.imageUrl);
    const sku = cleanString(body.sku);
    const priceValue = parsePrice(body.price);
    const categoryId = parseCategoryId(body.categoryId);
    const stock = parseStock(body.stock);
    const isAvailable =
        body.isAvailable === undefined
            ? availabilityFallback
            : parseBoolean(body.isAvailable);

    if (!name) {
        errors.push("El nombre del producto es obligatorio");
    }

    if (priceValue === null) {
        errors.push(
            "El precio debe ser un número mayor que 0 y menor o igual a 99.999.999,99"
        );
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
            name: name as string,
            description,
            categoryId: categoryId as number | null,
            price: priceToDatabase(priceValue as number),
            imageUrl,
            sku,
            stock: stock as number | null,
            isAvailable: isAvailable as boolean
        }
    };
}

async function categoryBelongsToBusiness(
    categoryId: number,
    businessId: number
): Promise<boolean> {
    const category = await prisma.category.findFirst({
        where: {
            id: categoryId,
            businessId
        }
    });

    return Boolean(category);
}

async function findSkuConflict(
    businessId: number,
    sku: string | null,
    excludeProductId?: number
) {
    if (!sku) {
        return null;
    }

    return prisma.product.findFirst({
        where: {
            businessId,
            sku,
            ...(excludeProductId ? { id: { not: excludeProductId } } : {})
        }
    });
}

// LISTAR MIS PRODUCTOS
export async function listMyProducts(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const { page, limit, skip } = getPagination(req.query);

        const includeDeleted =
            parseBoolean(req.query.includeDeleted) === true;

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

        let categoryId: number | null | undefined;

        if (req.query.categoryId !== undefined) {
            categoryId = parseCategoryId(req.query.categoryId);

            if (categoryId === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro categoryId no es válido"
                });
            }
        }

        const search = cleanString(req.query.search);

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
            prisma.product.count({ where }),
            prisma.product.findMany({
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
            products: serializeProducts(products)
        });
    } catch (error) {
        console.error("Error listando productos:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar productos"
        });
    }
}

// DETALLE DE UN PRODUCTO PROPIO
export async function getMyProduct(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }

        const product = await prisma.product.findFirst({
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
            product: serializeProduct(product)
        });
    } catch (error) {
        console.error("Error consultando producto:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el producto"
        });
    }
}

// CREAR PRODUCTO
export async function createProduct(req: Request, res: Response) {
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

        if (
            data.categoryId &&
            !(await categoryBelongsToBusiness(data.categoryId, business.id))
        ) {
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

        const product = await prisma.product.create({
            data: {
                businessId: business.id,
                ...data
            },
            include: productInclude
        });

        return res.status(201).json({
            success: true,
            message: "Producto creado correctamente",
            product: serializeProduct(product)
        });
    } catch (error) {
        console.error("Error creando producto:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al crear el producto"
        });
    }
}

// ACTUALIZAR PRODUCTO
export async function updateProduct(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }

        const product = await prisma.product.findFirst({
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
                message:
                    "Este producto está eliminado. Restáuralo antes de editarlo."
            });
        }

        const { errors, data } = buildProductData(
            req.body,
            product.isAvailable
        );

        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Datos del producto inválidos",
                errors
            });
        }

        if (
            data.categoryId &&
            !(await categoryBelongsToBusiness(data.categoryId, business.id))
        ) {
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

        const updated = await prisma.product.update({
            where: { id },
            data,
            include: productInclude
        });

        return res.json({
            success: true,
            message: "Producto actualizado correctamente",
            product: serializeProduct(updated)
        });
    } catch (error) {
        console.error("Error actualizando producto:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar el producto"
        });
    }
}

// ELIMINAR PRODUCTO (eliminación lógica)
export async function deleteProduct(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }

        const product = await prisma.product.findFirst({
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

        const deleted = await prisma.product.update({
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
            product: serializeProduct(deleted)
        });
    } catch (error) {
        console.error("Error eliminando producto:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al eliminar el producto"
        });
    }
}

// RESTAURAR PRODUCTO ELIMINADO
export async function restoreProduct(req: Request, res: Response) {
    try {
        const business = currentBusiness(res);
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }

        const product = await prisma.product.findFirst({
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

        const restored = await prisma.product.update({
            where: { id },
            data: {
                deletedAt: null,
                isAvailable: false
            },
            include: productInclude
        });

        return res.json({
            success: true,
            message:
                "Producto restaurado. Queda no disponible hasta que lo actives.",
            product: serializeProduct(restored)
        });
    } catch (error) {
        console.error("Error restaurando producto:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al restaurar el producto"
        });
    }
}

// CAMBIAR DISPONIBILIDAD
export async function updateProductAvailability(
    req: Request,
    res: Response
) {
    try {
        const business = currentBusiness(res);
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de producto inválido"
            });
        }

        const isAvailable = parseBoolean(req.body.isAvailable);

        if (isAvailable === undefined) {
            return res.status(400).json({
                success: false,
                message: "Debes enviar isAvailable como true o false"
            });
        }

        const product = await prisma.product.findFirst({
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

        const updated = await prisma.product.update({
            where: { id },
            data: { isAvailable },
            include: productInclude
        });

        return res.json({
            success: true,
            message: isAvailable
                ? "Producto marcado como disponible"
                : "Producto marcado como no disponible",
            product: serializeProduct(updated)
        });
    } catch (error) {
        console.error("Error cambiando disponibilidad:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al cambiar la disponibilidad"
        });
    }
}
