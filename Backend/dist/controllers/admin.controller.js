"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = getDashboard;
exports.getRequests = getRequests;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const APPROVAL_STATUSES = [
    client_1.ApprovalStatus.PENDING,
    client_1.ApprovalStatus.APPROVED,
    client_1.ApprovalStatus.REJECTED
];
const REQUEST_TYPES = ["all", "business", "delivery"];
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
};
function emptyCounts() {
    return {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        total: 0
    };
}
function formatCounts(rows) {
    const counts = emptyCounts();
    for (const row of rows) {
        counts[row.status] = row._count._all;
        counts.total += row._count._all;
    }
    return counts;
}
function formatOrderCounts(rows) {
    const counts = {
        total: 0
    };
    for (const status of Object.values(client_1.OrderStatus)) {
        counts[status] = 0;
    }
    for (const row of rows) {
        counts[row.status] = row._count._all;
        counts.total += row._count._all;
    }
    return counts;
}
// RESUMEN DEL PANEL DE ADMINISTRACIÓN
async function getDashboard(_req, res) {
    try {
        const [businessCounts, deliveryCounts, orderCounts, profileChangeCounts, pendingBusinesses, pendingDeliveries, pendingProfileChanges, totalUsers] = await Promise.all([
            database_1.prisma.businessProfile.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            database_1.prisma.deliveryProfile.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            database_1.prisma.order.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            database_1.prisma.profileChangeRequest.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            database_1.prisma.businessProfile.findMany({
                where: { status: client_1.ApprovalStatus.PENDING },
                include: adminProfileInclude,
                orderBy: { createdAt: "asc" },
                take: 10
            }),
            database_1.prisma.deliveryProfile.findMany({
                where: { status: client_1.ApprovalStatus.PENDING },
                include: adminProfileInclude,
                orderBy: { createdAt: "asc" },
                take: 10
            }),
            database_1.prisma.profileChangeRequest.findMany({
                where: { status: client_1.ApprovalStatus.PENDING },
                include: adminProfileInclude,
                orderBy: { createdAt: "asc" },
                take: 10
            }),
            database_1.prisma.user.count()
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
    }
    catch (error) {
        console.error("Error consultando dashboard:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el panel"
        });
    }
}
// SOLICITUDES DE EMPRESAS Y DOMICILIARIOS PARA EL PANEL
async function getRequests(req, res) {
    try {
        const { page, limit, skip } = (0, profile_1.getPagination)(req.query);
        const rawType = req.query.type;
        const type = rawType
            ? (0, profile_1.parseEnumValue)(rawType, REQUEST_TYPES)
            : "all";
        if (!type) {
            return res.status(400).json({
                success: false,
                message: "Tipo inválido. Usa all, business o delivery"
            });
        }
        const rawStatus = req.query.status;
        const status = rawStatus
            ? (0, profile_1.parseEnumValue)(rawStatus, APPROVAL_STATUSES)
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
        const [businessTotal, deliveryTotal, businesses, deliveries] = await Promise.all([
            includeBusiness
                ? database_1.prisma.businessProfile.count({ where })
                : Promise.resolve(0),
            includeDelivery
                ? database_1.prisma.deliveryProfile.count({ where })
                : Promise.resolve(0),
            includeBusiness
                ? database_1.prisma.businessProfile.findMany({
                    where,
                    include: adminProfileInclude,
                    orderBy: { createdAt: "asc" },
                    skip,
                    take: limit
                })
                : Promise.resolve([]),
            includeDelivery
                ? database_1.prisma.deliveryProfile.findMany({
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
                type: type,
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
    }
    catch (error) {
        console.error("Error listando solicitudes:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar solicitudes"
        });
    }
}
