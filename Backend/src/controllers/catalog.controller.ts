import { Request, Response } from "express";
import { ApprovalStatus, BusinessType, RatingTarget } from "@prisma/client";
import { prisma } from "../config/database";
import { cleanString, getPagination, parseId, parseEnumValue } from "../utils/profile";
import {
    parseCategoryId,
    parsePriceFilter,
    serializeProduct,
    serializeProducts
} from "../utils/catalog";
import { businessRatingStats } from "../utils/ratings";

const BUSINESS_TYPES: readonly BusinessType[] = [
    BusinessType.RESTAURANT,
    BusinessType.STORE
];

const publicProductWhere = {
    isActive: true,
    isAvailable: true,
    deletedAt: null
} as const;

const publicProductSelect = {
    id: true,
    categoryId: true,
    name: true,
    description: true,
    price: true,
    imageUrl: true,
    sku: true,
    stock: true,
    isAvailable: true,
    createdAt: true,
    updatedAt: true
} as const;

const publicBusinessSelect = {
    id: true,
    businessName: true,
    description: true,
    businessType: true,
    address: true,
    city: true,
    department: true,
    contactPhone: true,
    logoUrl: true,
    deliveryFee: true,
    createdAt: true
} as const;

// LISTAR EMPRESAS APROBADAS
export async function listPublicBusinesses(req: Request, res: Response) {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const rawType = req.query.businessType;
        const businessType = rawType
            ? parseEnumValue(rawType, BUSINESS_TYPES)
            : null;

        if (rawType && !businessType) {
            return res.status(400).json({
                success: false,
                message: "Tipo de negocio inválido. Usa RESTAURANT o STORE"
            });
        }

        const search = cleanString(req.query.search);
        const city = cleanString(req.query.city);

        const where = {
            status: ApprovalStatus.APPROVED,
            user: { isActive: true },
            ...(businessType ? { businessType } : {}),
            ...(city ? { city: { contains: city } } : {}),
            ...(search
                ? {
                      OR: [
                          { businessName: { contains: search } },
                          { description: { contains: search } }
                      ]
                  }
                : {})
        };

        const [total, businesses] = await Promise.all([
            prisma.businessProfile.count({ where }),
            prisma.businessProfile.findMany({
                where,
                select: {
                    ...publicBusinessSelect,
                    _count: {
                        select: {
                            products: {
                                where: publicProductWhere
                            }
                        }
                    }
                },
                orderBy: { businessName: "asc" },
                skip,
                take: limit
            })
        ]);

        const ratingRows = businesses.length
            ? await prisma.rating.groupBy({
                  by: ["businessId"],
                  where: {
                      targetType: RatingTarget.BUSINESS,
                      businessId: {
                          in: businesses.map(business => business.id)
                      }
                  },
                  _avg: { score: true },
                  _count: { _all: true }
              })
            : [];

        const ratingMap = new Map(
            ratingRows.map(row => [
                row.businessId,
                {
                    average: row._avg.score
                        ? Math.round(row._avg.score * 100) / 100
                        : 0,
                    count: row._count._all
                }
            ])
        );

        return res.json({
            success: true,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            businesses: businesses.map(({ _count, ...business }) => ({
                ...business,
                productCount: _count.products,
                rating: ratingMap.get(business.id) ?? {
                    average: 0,
                    count: 0
                }
            }))
        });
    } catch (error) {
        console.error("Error listando empresas públicas:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar empresas"
        });
    }
}

// CATÁLOGO PÚBLICO DE UNA EMPRESA
export async function getPublicBusinessCatalog(
    req: Request,
    res: Response
) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de empresa inválido"
            });
        }

        const business = await prisma.businessProfile.findFirst({
            where: {
                id,
                status: ApprovalStatus.APPROVED,
                user: { isActive: true }
            },
            select: publicBusinessSelect
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Empresa no encontrada o no está aprobada"
            });
        }

        const [categories, uncategorized] = await Promise.all([
            prisma.category.findMany({
                where: { businessId: id },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    sortOrder: true,
                    products: {
                        where: publicProductWhere,
                        orderBy: { name: "asc" },
                        select: publicProductSelect
                    }
                },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
            }),
            prisma.product.findMany({
                where: {
                    businessId: id,
                    categoryId: null,
                    ...publicProductWhere
                },
                orderBy: { name: "asc" },
                select: publicProductSelect
            })
        ]);

        return res.json({
            success: true,
            business: {
                ...business,
                rating: await businessRatingStats(id)
            },
            categories: categories.map(category => ({
                ...category,
                products: serializeProducts(category.products)
            })),
            uncategorized: serializeProducts(uncategorized)
        });
    } catch (error) {
        console.error("Error consultando catálogo público:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el catálogo"
        });
    }
}

// BUSCAR PRODUCTOS DISPONIBLES
export async function searchPublicProducts(req: Request, res: Response) {
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

            if (categoryId === undefined || categoryId === null) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro categoryId no es válido"
                });
            }
        }

        const minPrice = parsePriceFilter(req.query.minPrice);

        if (minPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "El precio mínimo no es válido"
            });
        }

        const maxPrice = parsePriceFilter(req.query.maxPrice);

        if (maxPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "El precio máximo no es válido"
            });
        }

        if (
            minPrice !== null &&
            maxPrice !== null &&
            minPrice > maxPrice
        ) {
            return res.status(400).json({
                success: false,
                message: "El precio mínimo no puede ser mayor que el máximo"
            });
        }

        const search = cleanString(req.query.search);

        const rawSort = cleanString(req.query.sort) || "name";

        const sortOptions: Record<string, object> = {
            name: { name: "asc" },
            price_asc: { price: "asc" },
            price_desc: { price: "desc" },
            newest: { createdAt: "desc" }
        };

        const orderBy = sortOptions[rawSort];

        if (!orderBy) {
            return res.status(400).json({
                success: false,
                message:
                    "Orden inválido. Usa name, price_asc, price_desc o newest"
            });
        }

        const where = {
            ...publicProductWhere,
            ...(businessId ? { businessId } : {}),
            ...(categoryId ? { categoryId } : {}),
            ...(search
                ? {
                      OR: [
                          { name: { contains: search } },
                          { description: { contains: search } },
                          { sku: { contains: search } }
                      ]
                  }
                : {}),
            ...(minPrice !== null || maxPrice !== null
                ? {
                      price: {
                          ...(minPrice !== null
                              ? { gte: minPrice.toFixed(2) }
                              : {}),
                          ...(maxPrice !== null
                              ? { lte: maxPrice.toFixed(2) }
                              : {})
                      }
                  }
                : {}),
            business: {
                status: ApprovalStatus.APPROVED,
                user: { isActive: true }
            }
        };

        const [total, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                include: {
                    business: {
                        select: {
                            id: true,
                            businessName: true,
                            logoUrl: true,
                            city: true
                        }
                    },
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy,
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
        console.error("Error buscando productos:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al buscar productos"
        });
    }
}

// DETALLE PÚBLICO DE UN PRODUCTO
export async function getPublicProduct(req: Request, res: Response) {
    try {
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
                ...publicProductWhere,
                business: {
                    status: ApprovalStatus.APPROVED,
                    user: { isActive: true }
                }
            },
            include: {
                business: {
                    select: {
                        id: true,
                        businessName: true,
                        logoUrl: true,
                        city: true
                    }
                },
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado o no disponible"
            });
        }

        return res.json({
            success: true,
            product: serializeProduct(product)
        });
    } catch (error) {
        console.error("Error consultando producto público:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el producto"
        });
    }
}
