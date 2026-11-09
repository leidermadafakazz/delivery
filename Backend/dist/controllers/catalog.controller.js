"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicBusinesses = listPublicBusinesses;
exports.getPublicBusinessCatalog = getPublicBusinessCatalog;
exports.searchPublicProducts = searchPublicProducts;
exports.getPublicProduct = getPublicProduct;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const catalog_1 = require("../utils/catalog");
const ratings_1 = require("../utils/ratings");
const BUSINESS_TYPES = [
    client_1.BusinessType.RESTAURANT,
    client_1.BusinessType.STORE
];
const publicProductWhere = {
    isActive: true,
    isAvailable: true,
    deletedAt: null
};
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
};
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
};
// LISTAR EMPRESAS APROBADAS
async function listPublicBusinesses(req, res) {
    try {
        const { page, limit, skip } = (0, profile_1.getPagination)(req.query);
        const rawType = req.query.businessType;
        const businessType = rawType
            ? (0, profile_1.parseEnumValue)(rawType, BUSINESS_TYPES)
            : null;
        if (rawType && !businessType) {
            return res.status(400).json({
                success: false,
                message: "Tipo de negocio inválido. Usa RESTAURANT o STORE"
            });
        }
        const search = (0, profile_1.cleanString)(req.query.search);
        const city = (0, profile_1.cleanString)(req.query.city);
        const where = {
            status: client_1.ApprovalStatus.APPROVED,
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
            database_1.prisma.businessProfile.count({ where }),
            database_1.prisma.businessProfile.findMany({
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
            ? await database_1.prisma.rating.groupBy({
                by: ["businessId"],
                where: {
                    targetType: client_1.RatingTarget.BUSINESS,
                    businessId: {
                        in: businesses.map(business => business.id)
                    }
                },
                _avg: { score: true },
                _count: { _all: true }
            })
            : [];
        const ratingMap = new Map(ratingRows.map(row => [
            row.businessId,
            {
                average: row._avg.score
                    ? Math.round(row._avg.score * 100) / 100
                    : 0,
                count: row._count._all
            }
        ]));
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
    }
    catch (error) {
        console.error("Error listando empresas públicas:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar empresas"
        });
    }
}
// CATÁLOGO PÚBLICO DE UNA EMPRESA
async function getPublicBusinessCatalog(req, res) {
    try {
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de empresa inválido"
            });
        }
        const business = await database_1.prisma.businessProfile.findFirst({
            where: {
                id,
                status: client_1.ApprovalStatus.APPROVED,
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
            database_1.prisma.category.findMany({
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
            database_1.prisma.product.findMany({
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
                rating: await (0, ratings_1.businessRatingStats)(id)
            },
            categories: categories.map(category => ({
                ...category,
                products: (0, catalog_1.serializeProducts)(category.products)
            })),
            uncategorized: (0, catalog_1.serializeProducts)(uncategorized)
        });
    }
    catch (error) {
        console.error("Error consultando catálogo público:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el catálogo"
        });
    }
}
// BUSCAR PRODUCTOS DISPONIBLES
async function searchPublicProducts(req, res) {
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
            if (categoryId === undefined || categoryId === null) {
                return res.status(400).json({
                    success: false,
                    message: "El filtro categoryId no es válido"
                });
            }
        }
        const minPrice = (0, catalog_1.parsePriceFilter)(req.query.minPrice);
        if (minPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "El precio mínimo no es válido"
            });
        }
        const maxPrice = (0, catalog_1.parsePriceFilter)(req.query.maxPrice);
        if (maxPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "El precio máximo no es válido"
            });
        }
        if (minPrice !== null &&
            maxPrice !== null &&
            minPrice > maxPrice) {
            return res.status(400).json({
                success: false,
                message: "El precio mínimo no puede ser mayor que el máximo"
            });
        }
        const search = (0, profile_1.cleanString)(req.query.search);
        const rawSort = (0, profile_1.cleanString)(req.query.sort) || "name";
        const sortOptions = {
            name: { name: "asc" },
            price_asc: { price: "asc" },
            price_desc: { price: "desc" },
            newest: { createdAt: "desc" }
        };
        const orderBy = sortOptions[rawSort];
        if (!orderBy) {
            return res.status(400).json({
                success: false,
                message: "Orden inválido. Usa name, price_asc, price_desc o newest"
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
                status: client_1.ApprovalStatus.APPROVED,
                user: { isActive: true }
            }
        };
        const [total, products] = await Promise.all([
            database_1.prisma.product.count({ where }),
            database_1.prisma.product.findMany({
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
            products: (0, catalog_1.serializeProducts)(products)
        });
    }
    catch (error) {
        console.error("Error buscando productos:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al buscar productos"
        });
    }
}
// DETALLE PÚBLICO DE UN PRODUCTO
async function getPublicProduct(req, res) {
    try {
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
                ...publicProductWhere,
                business: {
                    status: client_1.ApprovalStatus.APPROVED,
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
            product: (0, catalog_1.serializeProduct)(product)
        });
    }
    catch (error) {
        console.error("Error consultando producto público:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el producto"
        });
    }
}
