import { Request, Response } from "express";
import { ApprovalStatus, OrderStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { getPagination, parseEnumValue } from "../utils/profile";

const APPROVAL_STATUSES: readonly ApprovalStatus[] = [
    ApprovalStatus.PENDING,
    ApprovalStatus.APPROVED,
    ApprovalStatus.REJECTED
];

const REQUEST_TYPES = ["all", "business", "delivery"] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

const adminProfileInclude = {
    user: {
        select: {
            id: true,
            name: true,
            email: true,
            phone: true
        }
    },
    reviewedBy: {
        select: {
            id: true,
            name: true,
            email: true
        }
    }
} as const;

function emptyCounts() {
    return {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        total: 0
    };
}

function formatCounts(
    rows: Array<{ status: ApprovalStatus; _count: { _all: number } }>
) {
    const counts = emptyCounts();

    for (const row of rows) {
        counts[row.status] = row._count._all;
        counts.total += row._count._all;
    }

    return counts;
}

function formatOrderCounts(
    rows: Array<{ status: OrderStatus; _count: { _all: number } }>
) {
    const counts: Record<string, number> = {
        total: 0
    };

    for (const status of Object.values(OrderStatus)) {
        counts[status] = 0;
    }

    for (const row of rows) {
        counts[row.status] = row._count._all;
        counts.total += row._count._all;
    }

    return counts;
}

// RESUMEN DEL PANEL DE ADMINISTRACIÓN
export async function getDashboard(_req: Request, res: Response) {
    try {
        const [
            businessCounts,
            deliveryCounts,
            orderCounts,
            profileChangeCounts,
            pendingBusinesses,
            pendingDeliveries,
            pendingProfileChanges,
            totalUsers
        ] = await Promise.all([
            prisma.businessProfile.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            prisma.deliveryProfile.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            prisma.order.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            prisma.profileChangeRequest.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            prisma.businessProfile.findMany({
                where: { status: ApprovalStatus.PENDING },
                include: adminProfileInclude,
                orderBy: { createdAt: "asc" },
                take: 10
            }),
            prisma.deliveryProfile.findMany({
                where: { status: ApprovalStatus.PENDING },
                include: adminProfileInclude,
                orderBy: { createdAt: "asc" },
                take: 10
            }),
            prisma.profileChangeRequest.findMany({
                where: { status: ApprovalStatus.PENDING },
                include: adminProfileInclude,
                orderBy: { createdAt: "asc" },
                take: 10
            }),
            prisma.user.count()
        ]);

        return res.json({
            success: true,
            stats: {
                users: totalUsers,
                businesses: formatCounts(businessCounts),
                deliveries: formatCounts(deliveryCounts),
                orders: formatOrderCounts(orderCounts),
                profileChanges: formatCounts(profileChangeCounts)
            },
            pending: {
                businesses: pendingBusinesses,
                deliveries: pendingDeliveries,
                profileChanges: pendingProfileChanges
            }
        });
    } catch (error) {
        console.error("Error consultando dashboard:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el panel"
        });
    }
}

// SOLICITUDES DE EMPRESAS Y DOMICILIARIOS PARA EL PANEL
export async function getRequests(req: Request, res: Response) {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const rawType = req.query.type;
        const type = rawType
            ? parseEnumValue(rawType, REQUEST_TYPES)
            : "all";

        if (!type) {
            return res.status(400).json({
                success: false,
                message: "Tipo inválido. Usa all, business o delivery"
            });
        }

        const rawStatus = req.query.status;
        const status = rawStatus
            ? parseEnumValue(rawStatus, APPROVAL_STATUSES)
            : null;

        if (rawStatus && !status) {
            return res.status(400).json({
                success: false,
                message: "Estado inválido. Usa PENDING, APPROVED o REJECTED"
            });
        }

        const where = status ? { status } : {};
        const includeBusiness = type === "all" || type === "business";
        const includeDelivery = type === "all" || type === "delivery";

        const [
            businessTotal,
            deliveryTotal,
            businesses,
            deliveries
        ] = await Promise.all([
            includeBusiness
                ? prisma.businessProfile.count({ where })
                : Promise.resolve(0),
            includeDelivery
                ? prisma.deliveryProfile.count({ where })
                : Promise.resolve(0),
            includeBusiness
                ? prisma.businessProfile.findMany({
                      where,
                      include: adminProfileInclude,
                      orderBy: { createdAt: "asc" },
                      skip,
                      take: limit
                  })
                : Promise.resolve([]),
            includeDelivery
                ? prisma.deliveryProfile.findMany({
                      where,
                      include: adminProfileInclude,
                      orderBy: { createdAt: "asc" },
                      skip,
                      take: limit
                  })
                : Promise.resolve([])
        ]);

        return res.json({
            success: true,
            filters: {
                type: type as RequestType,
                status: status ?? "ALL"
            },
            pagination: {
                page,
                limit,
                businesses: {
                    total: businessTotal,
                    totalPages: Math.ceil(businessTotal / limit)
                },
                deliveries: {
                    total: deliveryTotal,
                    totalPages: Math.ceil(deliveryTotal / limit)
                }
            },
            businesses,
            deliveries
        });
    } catch (error) {
        console.error("Error listando solicitudes:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar solicitudes"
        });
    }
}
