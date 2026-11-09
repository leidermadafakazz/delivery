import { Request, Response } from "express";
import { ApprovalStatus, RoleName, VehicleType } from "@prisma/client";
import { prisma } from "../config/database";
import {
    cleanString,
    getPagination,
    parseEnumValue,
    parseId,
    parseOptionalDate
} from "../utils/profile";
import { deliveryRatingStats } from "../utils/ratings";

const VEHICLE_TYPES: readonly VehicleType[] = [
    VehicleType.MOTORCYCLE,
    VehicleType.BICYCLE,
    VehicleType.CAR,
    VehicleType.OTHER
];

const APPROVAL_STATUSES: readonly ApprovalStatus[] = [
    ApprovalStatus.PENDING,
    ApprovalStatus.APPROVED,
    ApprovalStatus.REJECTED
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
} as const;

interface DeliveryData {
    documentType: string;
    documentNumber: string;
    birthDate: Date | null;
    address: string;
    city: string;
    vehicleType: VehicleType;
    vehiclePlate: string | null;
    licenseNumber: string | null;
    documentUrl: string | null;
    licenseUrl: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
}

function buildDeliveryData(body: Record<string, unknown>): {
    errors: string[];
    data: DeliveryData | null;
} {
    const errors: string[] = [];

    const documentType = cleanString(body.documentType);
    const documentNumber = cleanString(body.documentNumber);
    const address = cleanString(body.address);
    const city = cleanString(body.city);
    const vehicleType = parseEnumValue(body.vehicleType, VEHICLE_TYPES);
    const vehiclePlate = cleanString(body.vehiclePlate);
    const licenseNumber = cleanString(body.licenseNumber);
    const documentUrl = cleanString(body.documentUrl);
    const licenseUrl = cleanString(body.licenseUrl);
    const emergencyContactName = cleanString(body.emergencyContactName);
    const emergencyContactPhone = cleanString(body.emergencyContactPhone);

    const birthDate = parseOptionalDate(body.birthDate);

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
        errors.push(
            "El tipo de vehículo debe ser MOTORCYCLE, BICYCLE, CAR u OTHER"
        );
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
            documentType: documentType as string,
            documentNumber: documentNumber as string,
            birthDate: birthDate ?? null,
            address: address as string,
            city: city as string,
            vehicleType: vehicleType as VehicleType,
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
export async function registerDelivery(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const existingProfile = await prisma.deliveryProfile.findUnique({
            where: { userId }
        });

        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Ya tienes una solicitud de domiciliario registrada. Consulta tu perfil o actualízalo."
            });
        }

        const businessProfile = await prisma.businessProfile.findUnique({
            where: { userId }
        });

        if (businessProfile) {
            return res.status(409).json({
                success: false,
                message:
                    "Tu cuenta ya está registrada como empresa. Para registrarte como domiciliario necesitas otra cuenta."
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

        const duplicateDocument = await prisma.deliveryProfile.findUnique({
            where: { documentNumber: data.documentNumber }
        });

        if (duplicateDocument) {
            return res.status(409).json({
                success: false,
                message: "Ya existe un domiciliario registrado con ese número de documento"
            });
        }

        const profile = await prisma.deliveryProfile.create({
            data: {
                userId,
                ...data,
                status: ApprovalStatus.PENDING
            },
            include: deliveryInclude
        });

        return res.status(201).json({
            success: true,
            message:
                "Solicitud de domiciliario registrada. Queda pendiente de aprobación.",
            delivery: profile
        });
    } catch (error) {
        console.error("Error registrando domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al registrar el domiciliario"
        });
    }
}

// CONSULTAR MI PERFIL DE DOMICILIARIO
export async function getMyDelivery(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const profile = await prisma.deliveryProfile.findUnique({
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
                rating: await deliveryRatingStats(profile.id)
            }
        });
    } catch (error) {
        console.error("Error consultando domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el domiciliario"
        });
    }
}

// ACTUALIZAR MI PERFIL DE DOMICILIARIO (solo si está pendiente o rechazado)
export async function updateMyDelivery(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const profile = await prisma.deliveryProfile.findUnique({
            where: { userId }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Todavía no tienes una solicitud de domiciliario registrada"
            });
        }

        if (profile.status === ApprovalStatus.APPROVED) {
            return res.status(409).json({
                success: false,
                message:
                    "Tu perfil ya fue aprobado y no puede editarse desde este endpoint"
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

        const duplicateDocument = await prisma.deliveryProfile.findFirst({
            where: {
                documentNumber: data.documentNumber,
                userId: { not: userId }
            }
        });

        if (duplicateDocument) {
            return res.status(409).json({
                success: false,
                message:
                    "Ya existe un domiciliario registrado con ese número de documento"
            });
        }

        const updated = await prisma.deliveryProfile.update({
            where: { userId },
            data: {
                ...data,
                status: ApprovalStatus.PENDING,
                rejectionReason: null,
                reviewedById: null,
                reviewedAt: null
            },
            include: deliveryInclude
        });

        return res.json({
            success: true,
            message:
                "Solicitud actualizada. Queda nuevamente pendiente de aprobación.",
            delivery: updated
        });
    } catch (error) {
        console.error("Error actualizando domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar el domiciliario"
        });
    }
}

// LISTAR DOMICILIARIOS (solo administrador)
export async function listDeliveries(req: Request, res: Response) {
    try {
        const { page, limit, skip } = getPagination(req.query);

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

        const rawVehicle = req.query.vehicleType;
        const vehicleType = rawVehicle
            ? parseEnumValue(rawVehicle, VEHICLE_TYPES)
            : null;

        if (rawVehicle && !vehicleType) {
            return res.status(400).json({
                success: false,
                message:
                    "Tipo de vehículo inválido. Usa MOTORCYCLE, BICYCLE, CAR u OTHER"
            });
        }

        const search = cleanString(req.query.search);

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
            prisma.deliveryProfile.count({ where }),
            prisma.deliveryProfile.findMany({
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
    } catch (error) {
        console.error("Error listando domiciliarios:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar domiciliarios"
        });
    }
}

// DETALLE DE UN DOMICILIARIO (solo administrador)
export async function getDeliveryById(req: Request, res: Response) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de domiciliario inválido"
            });
        }

        const delivery = await prisma.deliveryProfile.findUnique({
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
    } catch (error) {
        console.error("Error consultando domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el domiciliario"
        });
    }
}

// APROBAR DOMICILIARIO (solo administrador)
export async function approveDelivery(req: Request, res: Response) {
    try {
        const adminId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de domiciliario inválido"
            });
        }

        const profile = await prisma.deliveryProfile.findUnique({
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

        if (profile.status === ApprovalStatus.APPROVED) {
            return res.status(409).json({
                success: false,
                message: "Este domiciliario ya está aprobado"
            });
        }

        const updated = await prisma.$transaction(async tx => {
            const delivery = await tx.deliveryProfile.update({
                where: { id },
                data: {
                    status: ApprovalStatus.APPROVED,
                    rejectionReason: null,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: deliveryInclude
            });

            const role = await tx.role.upsert({
                where: { name: RoleName.DELIVERY },
                update: {},
                create: { name: RoleName.DELIVERY }
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
            message:
                "Domiciliario aprobado. Se asignó el rol DELIVERY al usuario.",
            delivery: updated
        });
    } catch (error) {
        console.error("Error aprobando domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al aprobar el domiciliario"
        });
    }
}

// RECHAZAR DOMICILIARIO (solo administrador)
export async function rejectDelivery(req: Request, res: Response) {
    try {
        const adminId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de domiciliario inválido"
            });
        }

        const reason = cleanString(req.body.reason);

        if (!reason || reason.length < 5) {
            return res.status(400).json({
                success: false,
                message:
                    "Debes indicar un motivo de rechazo de al menos 5 caracteres"
            });
        }

        const profile = await prisma.deliveryProfile.findUnique({
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

        if (profile.status === ApprovalStatus.REJECTED) {
            return res.status(409).json({
                success: false,
                message: "Este domiciliario ya está rechazado"
            });
        }

        const updated = await prisma.$transaction(async tx => {
            const delivery = await tx.deliveryProfile.update({
                where: { id },
                data: {
                    status: ApprovalStatus.REJECTED,
                    rejectionReason: reason,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: deliveryInclude
            });

            // Si el domiciliario estaba aprobado, se revoca el permiso DELIVERY.
            if (profile.status === ApprovalStatus.APPROVED) {
                const role = await tx.role.findUnique({
                    where: { name: RoleName.DELIVERY }
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
            message:
                profile.status === ApprovalStatus.APPROVED
                    ? "Domiciliario rechazado. Se revocó el rol DELIVERY del usuario."
                    : "Domiciliario rechazado.",
            delivery: updated
        });
    } catch (error) {
        console.error("Error rechazando domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al rechazar el domiciliario"
        });
    }
}
