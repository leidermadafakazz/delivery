"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDelivery = registerDelivery;
exports.getMyDelivery = getMyDelivery;
exports.updateMyDelivery = updateMyDelivery;
exports.listDeliveries = listDeliveries;
exports.getDeliveryById = getDeliveryById;
exports.approveDelivery = approveDelivery;
exports.rejectDelivery = rejectDelivery;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
const ratings_1 = require("../utils/ratings");
const VEHICLE_TYPES = [
    client_1.VehicleType.MOTORCYCLE,
    client_1.VehicleType.BICYCLE,
    client_1.VehicleType.CAR,
    client_1.VehicleType.OTHER
];
const APPROVAL_STATUSES = [
    client_1.ApprovalStatus.PENDING,
    client_1.ApprovalStatus.APPROVED,
    client_1.ApprovalStatus.REJECTED
];
const deliveryInclude = {
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
function buildDeliveryData(body) {
    const errors = [];
    const documentType = (0, profile_1.cleanString)(body.documentType);
    const documentNumber = (0, profile_1.cleanString)(body.documentNumber);
    const address = (0, profile_1.cleanString)(body.address);
    const city = (0, profile_1.cleanString)(body.city);
    const vehicleType = (0, profile_1.parseEnumValue)(body.vehicleType, VEHICLE_TYPES);
    const vehiclePlate = (0, profile_1.cleanString)(body.vehiclePlate);
    const licenseNumber = (0, profile_1.cleanString)(body.licenseNumber);
    const documentUrl = (0, profile_1.cleanString)(body.documentUrl);
    const licenseUrl = (0, profile_1.cleanString)(body.licenseUrl);
    const emergencyContactName = (0, profile_1.cleanString)(body.emergencyContactName);
    const emergencyContactPhone = (0, profile_1.cleanString)(body.emergencyContactPhone);
    const birthDate = (0, profile_1.parseOptionalDate)(body.birthDate);
    if (!documentType) {
        errors.push("El tipo de documento es obligatorio");
    }
    if (!documentNumber) {
        errors.push("El número de documento es obligatorio");
    }
    if (!address) {
        errors.push("La dirección es obligatoria");
    }
    if (!city) {
        errors.push("La ciudad es obligatoria");
    }
    if (!vehicleType) {
        errors.push("El tipo de vehículo debe ser MOTORCYCLE, BICYCLE, CAR u OTHER");
    }
    if (birthDate === undefined) {
        errors.push("La fecha de nacimiento no es válida");
    }
    if (errors.length > 0) {
        return { errors, data: null };
    }
    return {
        errors: [],
        data: {
            documentType: documentType,
            documentNumber: documentNumber,
            birthDate: birthDate ?? null,
            address: address,
            city: city,
            vehicleType: vehicleType,
            vehiclePlate,
            licenseNumber,
            documentUrl,
            licenseUrl,
            emergencyContactName,
            emergencyContactPhone
        }
    };
}
// REGISTRAR DOMICILIARIO (queda pendiente de aprobación)
async function registerDelivery(req, res) {
    try {
        const userId = res.locals.userId;
        const existingProfile = await database_1.prisma.deliveryProfile.findUnique({
            where: { userId }
        });
        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Ya tienes una solicitud de domiciliario registrada. Consulta tu perfil o actualízalo."
            });
        }
        const businessProfile = await database_1.prisma.businessProfile.findUnique({
            where: { userId }
        });
        if (businessProfile) {
            return res.status(409).json({
                success: false,
                message: "Tu cuenta ya está registrada como empresa. Para registrarte como domiciliario necesitas otra cuenta."
            });
        }
        const { errors, data } = buildDeliveryData(req.body);
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Datos del domiciliario inválidos",
                errors
            });
        }
        const duplicateDocument = await database_1.prisma.deliveryProfile.findUnique({
            where: { documentNumber: data.documentNumber }
        });
        if (duplicateDocument) {
            return res.status(409).json({
                success: false,
                message: "Ya existe un domiciliario registrado con ese número de documento"
            });
        }
        const profile = await database_1.prisma.deliveryProfile.create({
            data: {
                userId,
                ...data,
                status: client_1.ApprovalStatus.PENDING
            },
            include: deliveryInclude
        });
        return res.status(201).json({
            success: true,
            message: "Solicitud de domiciliario registrada. Queda pendiente de aprobación.",
            delivery: profile
        });
    }
    catch (error) {
        console.error("Error registrando domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al registrar el domiciliario"
        });
    }
}
// CONSULTAR MI PERFIL DE DOMICILIARIO
async function getMyDelivery(req, res) {
    try {
        const userId = res.locals.userId;
        const profile = await database_1.prisma.deliveryProfile.findUnique({
            where: { userId },
            include: deliveryInclude
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Todavía no tienes una solicitud de domiciliario registrada"
            });
        }
        return res.json({
            success: true,
            delivery: {
                ...profile,
                rating: await (0, ratings_1.deliveryRatingStats)(profile.id)
            }
        });
    }
    catch (error) {
        console.error("Error consultando domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el domiciliario"
        });
    }
}
// ACTUALIZAR MI PERFIL DE DOMICILIARIO (solo si está pendiente o rechazado)
async function updateMyDelivery(req, res) {
    try {
        const userId = res.locals.userId;
        const profile = await database_1.prisma.deliveryProfile.findUnique({
            where: { userId }
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Todavía no tienes una solicitud de domiciliario registrada"
            });
        }
        if (profile.status === client_1.ApprovalStatus.APPROVED) {
            return res.status(409).json({
                success: false,
                message: "Tu perfil ya fue aprobado y no puede editarse desde este endpoint"
            });
        }
        const { errors, data } = buildDeliveryData(req.body);
        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Datos del domiciliario inválidos",
                errors
            });
        }
        const duplicateDocument = await database_1.prisma.deliveryProfile.findFirst({
            where: {
                documentNumber: data.documentNumber,
                userId: { not: userId }
            }
        });
        if (duplicateDocument) {
            return res.status(409).json({
                success: false,
                message: "Ya existe un domiciliario registrado con ese número de documento"
            });
        }
        const updated = await database_1.prisma.deliveryProfile.update({
            where: { userId },
            data: {
                ...data,
                status: client_1.ApprovalStatus.PENDING,
                rejectionReason: null,
                reviewedById: null,
                reviewedAt: null
            },
            include: deliveryInclude
        });
        return res.json({
            success: true,
            message: "Solicitud actualizada. Queda nuevamente pendiente de aprobación.",
            delivery: updated
        });
    }
    catch (error) {
        console.error("Error actualizando domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar el domiciliario"
        });
    }
}
// LISTAR DOMICILIARIOS (solo administrador)
async function listDeliveries(req, res) {
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
        const rawVehicle = req.query.vehicleType;
        const vehicleType = rawVehicle
            ? (0, profile_1.parseEnumValue)(rawVehicle, VEHICLE_TYPES)
            : null;
        if (rawVehicle && !vehicleType) {
            return res.status(400).json({
                success: false,
                message: "Tipo de vehículo inválido. Usa MOTORCYCLE, BICYCLE, CAR u OTHER"
            });
        }
        const search = (0, profile_1.cleanString)(req.query.search);
        const where = {
            ...(status ? { status } : {}),
            ...(vehicleType ? { vehicleType } : {}),
            ...(search
                ? {
                    OR: [
                        { documentNumber: { contains: search } },
                        { user: { name: { contains: search } } },
                        { user: { email: { contains: search } } }
                    ]
                }
                : {})
        };
        const [total, deliveries] = await Promise.all([
            database_1.prisma.deliveryProfile.count({ where }),
            database_1.prisma.deliveryProfile.findMany({
                where,
                include: deliveryInclude,
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
            deliveries
        });
    }
    catch (error) {
        console.error("Error listando domiciliarios:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar domiciliarios"
        });
    }
}
// DETALLE DE UN DOMICILIARIO (solo administrador)
async function getDeliveryById(req, res) {
    try {
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de domiciliario inválido"
            });
        }
        const delivery = await database_1.prisma.deliveryProfile.findUnique({
            where: { id },
            include: deliveryInclude
        });
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: "Domiciliario no encontrado"
            });
        }
        return res.json({
            success: true,
            delivery
        });
    }
    catch (error) {
        console.error("Error consultando domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el domiciliario"
        });
    }
}
// APROBAR DOMICILIARIO (solo administrador)
async function approveDelivery(req, res) {
    try {
        const adminId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de domiciliario inválido"
            });
        }
        const profile = await database_1.prisma.deliveryProfile.findUnique({
            where: { id }
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Domiciliario no encontrado"
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
                message: "Este domiciliario ya está aprobado"
            });
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const delivery = await tx.deliveryProfile.update({
                where: { id },
                data: {
                    status: client_1.ApprovalStatus.APPROVED,
                    rejectionReason: null,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: deliveryInclude
            });
            const role = await tx.role.upsert({
                where: { name: client_1.RoleName.DELIVERY },
                update: {},
                create: { name: client_1.RoleName.DELIVERY }
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
            return delivery;
        });
        return res.json({
            success: true,
            message: "Domiciliario aprobado. Se asignó el rol DELIVERY al usuario.",
            delivery: updated
        });
    }
    catch (error) {
        console.error("Error aprobando domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al aprobar el domiciliario"
        });
    }
}
// RECHAZAR DOMICILIARIO (solo administrador)
async function rejectDelivery(req, res) {
    try {
        const adminId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de domiciliario inválido"
            });
        }
        const reason = (0, profile_1.cleanString)(req.body.reason);
        if (!reason || reason.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Debes indicar un motivo de rechazo de al menos 5 caracteres"
            });
        }
        const profile = await database_1.prisma.deliveryProfile.findUnique({
            where: { id }
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Domiciliario no encontrado"
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
                message: "Este domiciliario ya está rechazado"
            });
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const delivery = await tx.deliveryProfile.update({
                where: { id },
                data: {
                    status: client_1.ApprovalStatus.REJECTED,
                    rejectionReason: reason,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: deliveryInclude
            });
            // Si el domiciliario estaba aprobado, se revoca el permiso DELIVERY.
            if (profile.status === client_1.ApprovalStatus.APPROVED) {
                const role = await tx.role.findUnique({
                    where: { name: client_1.RoleName.DELIVERY }
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
            return delivery;
        });
        return res.json({
            success: true,
            message: profile.status === client_1.ApprovalStatus.APPROVED
                ? "Domiciliario rechazado. Se revocó el rol DELIVERY del usuario."
                : "Domiciliario rechazado.",
            delivery: updated
        });
    }
    catch (error) {
        console.error("Error rechazando domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al rechazar el domiciliario"
        });
    }
}
