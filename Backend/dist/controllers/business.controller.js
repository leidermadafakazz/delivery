"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBusiness = registerBusiness;
exports.getMyBusiness = getMyBusiness;
exports.updateMyBusiness = updateMyBusiness;
exports.listBusinesses = listBusinesses;
exports.getBusinessById = getBusinessById;
exports.approveBusiness = approveBusiness;
exports.rejectBusiness = rejectBusiness;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const orders_1 = require("../utils/orders");
const ratings_1 = require("../utils/ratings");
const BUSINESS_TYPES = [
    client_1.BusinessType.RESTAURANT,
    client_1.BusinessType.STORE
];
const APPROVAL_STATUSES = [
    client_1.ApprovalStatus.PENDING,
    client_1.ApprovalStatus.APPROVED,
    client_1.ApprovalStatus.REJECTED
];
const businessInclude = {
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
function buildBusinessData(body) {
    const errors = [];
    const businessName = (0, profile_1.cleanString)(body.businessName);
    const legalName = (0, profile_1.cleanString)(body.legalName);
    const taxId = (0, profile_1.cleanString)(body.taxId);
    const businessType = (0, profile_1.parseEnumValue)(body.businessType, BUSINESS_TYPES);
    const description = (0, profile_1.cleanString)(body.description);
    const address = (0, profile_1.cleanString)(body.address);
    const city = (0, profile_1.cleanString)(body.city);
    const department = (0, profile_1.cleanString)(body.department);
    const contactPhone = (0, profile_1.cleanString)(body.contactPhone);
    const contactEmail = (0, profile_1.cleanString)(body.contactEmail);
    const logoUrl = (0, profile_1.cleanString)(body.logoUrl);
    const documentUrl = (0, profile_1.cleanString)(body.documentUrl);
    const deliveryFee = (0, orders_1.parseMoney)(body.deliveryFee);
    if (!businessName) {
        errors.push("El nombre del negocio es obligatorio");
    }
    if (!businessType) {
        errors.push("El tipo de negocio debe ser RESTAURANT o STORE");
    }
    if (!address) {
        errors.push("La dirección es obligatoria");
    }
    if (!city) {
        errors.push("La ciudad es obligatoria");
    }
    if (contactEmail && !(0, profile_1.isValidEmail)(contactEmail)) {
        errors.push("El correo de contacto no es válido");
    }
    if (deliveryFee === undefined) {
        errors.push("La tarifa de domicilio debe ser un número mayor o igual a 0");
    }
    if (errors.length > 0) {
        return { errors, data: null };
    }
    return {
        errors: [],
        data: {
            businessName: businessName,
            legalName,
            taxId,
            businessType: businessType,
            description,
            address: address,
            city: city,
            department,
            contactPhone,
            contactEmail,
            logoUrl,
            documentUrl,
            deliveryFee: deliveryFee ?? null
        }
    };
}
// REGISTRAR EMPRESA / TIENDA (queda pendiente de aprobación)
async function registerBusiness(req, res) {
    try {
        const userId = res.locals.userId;
        const existingProfile = await database_1.prisma.businessProfile.findUnique({
            where: { userId }
        });
        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Ya tienes una solicitud de empresa registrada. Consulta tu perfil o actualízalo."
            });
        }
        const deliveryProfile = await database_1.prisma.deliveryProfile.findUnique({
            where: { userId }
        });
        if (deliveryProfile) {
            return res.status(409).json({
                success: false,
                message: "Tu cuenta ya está registrada como domiciliario. Para registrar una empresa necesitas otra cuenta."
            });
        }
        const { errors, data } = buildBusinessData(req.body);
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Datos de la empresa inválidos",
                errors
            });
        }
        if (data.taxId) {
            const duplicateTaxId = await database_1.prisma.businessProfile.findUnique({
                where: { taxId: data.taxId }
            });
            if (duplicateTaxId) {
                return res.status(409).json({
                    success: false,
                    message: "Ya existe una empresa registrada con ese NIT/documento"
                });
            }
        }
        const profile = await database_1.prisma.businessProfile.create({
            data: {
                userId,
                ...data,
                deliveryFee: data.deliveryFee ?? 0,
                status: client_1.ApprovalStatus.PENDING
            },
            include: businessInclude
        });
        return res.status(201).json({
            success: true,
            message: "Solicitud de empresa registrada. Queda pendiente de aprobación.",
            business: profile
        });
    }
    catch (error) {
        console.error("Error registrando empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al registrar la empresa"
        });
    }
}
// CONSULTAR MI EMPRESA
async function getMyBusiness(req, res) {
    try {
        const userId = res.locals.userId;
        const profile = await database_1.prisma.businessProfile.findUnique({
            where: { userId },
            include: businessInclude
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Todavía no tienes una solicitud de empresa registrada"
            });
        }
        return res.json({
            success: true,
            business: {
                ...profile,
                rating: await (0, ratings_1.businessRatingStats)(profile.id)
            }
        });
    }
    catch (error) {
        console.error("Error consultando empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar la empresa"
        });
    }
}
// ACTUALIZAR MI EMPRESA (solo si está pendiente o rechazada)
async function updateMyBusiness(req, res) {
    try {
        const userId = res.locals.userId;
        const profile = await database_1.prisma.businessProfile.findUnique({
            where: { userId }
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Todavía no tienes una solicitud de empresa registrada"
            });
        }
        if (profile.status === client_1.ApprovalStatus.APPROVED) {
            return res.status(409).json({
                success: false,
                message: "Tu empresa ya fue aprobada y no puede editarse desde este endpoint"
            });
        }
        const { errors, data } = buildBusinessData(req.body);
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Datos de la empresa inválidos",
                errors
            });
        }
        if (data.taxId) {
            const duplicateTaxId = await database_1.prisma.businessProfile.findFirst({
                where: {
                    taxId: data.taxId,
                    userId: { not: userId }
                }
            });
            if (duplicateTaxId) {
                return res.status(409).json({
                    success: false,
                    message: "Ya existe una empresa registrada con ese NIT/documento"
                });
            }
        }
        // Al editar una solicitud rechazada, vuelve a quedar pendiente.
        const updated = await database_1.prisma.businessProfile.update({
            where: { userId },
            data: {
                ...data,
                deliveryFee: data.deliveryFee ?? Number(profile.deliveryFee),
                status: client_1.ApprovalStatus.PENDING,
                rejectionReason: null,
                reviewedById: null,
                reviewedAt: null
            },
            include: businessInclude
        });
        return res.json({
            success: true,
            message: "Solicitud actualizada. Queda nuevamente pendiente de aprobación.",
            business: updated
        });
    }
    catch (error) {
        console.error("Error actualizando empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar la empresa"
        });
    }
}
// LISTAR EMPRESAS (solo administrador)
async function listBusinesses(req, res) {
    try {
        const { page, limit, skip } = (0, profile_1.getPagination)(req.query);
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
        const where = {
            ...(status ? { status } : {}),
            ...(businessType ? { businessType } : {}),
            ...(search
                ? {
                    OR: [
                        { businessName: { contains: search } },
                        { legalName: { contains: search } },
                        { taxId: { contains: search } }
                    ]
                }
                : {})
        };
        const [total, businesses] = await Promise.all([
            database_1.prisma.businessProfile.count({ where }),
            database_1.prisma.businessProfile.findMany({
                where,
                include: businessInclude,
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
            businesses
        });
    }
    catch (error) {
        console.error("Error listando empresas:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar empresas"
        });
    }
}
// DETALLE DE UNA EMPRESA (solo administrador)
async function getBusinessById(req, res) {
    try {
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de empresa inválido"
            });
        }
        const business = await database_1.prisma.businessProfile.findUnique({
            where: { id },
            include: businessInclude
        });
        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Empresa no encontrada"
            });
        }
        return res.json({
            success: true,
            business
        });
    }
    catch (error) {
        console.error("Error consultando empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar la empresa"
        });
    }
}
// APROBAR EMPRESA (solo administrador)
async function approveBusiness(req, res) {
    try {
        const adminId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de empresa inválido"
            });
        }
        const profile = await database_1.prisma.businessProfile.findUnique({
            where: { id }
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Empresa no encontrada"
            });
        }
        if (profile.userId === adminId) {
            return res.status(403).json({
                success: false,
                message: "No puedes revisar tu propia solicitud"
            });
        }
        if (profile.status === client_1.ApprovalStatus.APPROVED) {
            return res.status(409).json({
                success: false,
                message: "Esta empresa ya está aprobada"
            });
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const business = await tx.businessProfile.update({
                where: { id },
                data: {
                    status: client_1.ApprovalStatus.APPROVED,
                    rejectionReason: null,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: businessInclude
            });
            const role = await tx.role.upsert({
                where: { name: client_1.RoleName.BUSINESS },
                update: {},
                create: { name: client_1.RoleName.BUSINESS }
            });
            await tx.userRole.upsert({
                where: {
                    userId_roleId: {
                        userId: profile.userId,
                        roleId: role.id
                    }
                },
                update: {},
                create: {
                    userId: profile.userId,
                    roleId: role.id
                }
            });
            return business;
        });
        return res.json({
            success: true,
            message: "Empresa aprobada. Se asignó el rol BUSINESS al usuario.",
            business: updated
        });
    }
    catch (error) {
        console.error("Error aprobando empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al aprobar la empresa"
        });
    }
}
// RECHAZAR EMPRESA (solo administrador)
async function rejectBusiness(req, res) {
    try {
        const adminId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de empresa inválido"
            });
        }
        const reason = (0, profile_1.cleanString)(req.body.reason);
        if (!reason || reason.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Debes indicar un motivo de rechazo de al menos 5 caracteres"
            });
        }
        const profile = await database_1.prisma.businessProfile.findUnique({
            where: { id }
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Empresa no encontrada"
            });
        }
        if (profile.userId === adminId) {
            return res.status(403).json({
                success: false,
                message: "No puedes revisar tu propia solicitud"
            });
        }
        if (profile.status === client_1.ApprovalStatus.REJECTED) {
            return res.status(409).json({
                success: false,
                message: "Esta empresa ya está rechazada"
            });
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const business = await tx.businessProfile.update({
                where: { id },
                data: {
                    status: client_1.ApprovalStatus.REJECTED,
                    rejectionReason: reason,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: businessInclude
            });
            // Si la empresa estaba aprobada, se revoca el permiso BUSINESS.
            if (profile.status === client_1.ApprovalStatus.APPROVED) {
                const role = await tx.role.findUnique({
                    where: { name: client_1.RoleName.BUSINESS }
                });
                if (role) {
                    await tx.userRole.deleteMany({
                        where: {
                            userId: profile.userId,
                            roleId: role.id
                        }
                    });
                }
            }
            return business;
        });
        return res.json({
            success: true,
            message: profile.status === client_1.ApprovalStatus.APPROVED
                ? "Empresa rechazada. Se revocó el rol BUSINESS del usuario."
                : "Empresa rechazada.",
            business: updated
        });
    }
    catch (error) {
        console.error("Error rechazando empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al rechazar la empresa"
        });
    }
}
