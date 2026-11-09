import { Request, Response } from "express";
import { ApprovalStatus, BusinessType, RoleName } from "@prisma/client";
import { prisma } from "../config/database";
import {
    cleanString,
    getPagination,
    isValidEmail,
    parseEnumValue,
    parseId
} from "../utils/profile";
import { parseMoney } from "../utils/orders";
import { businessRatingStats } from "../utils/ratings";

const BUSINESS_TYPES: readonly BusinessType[] = [
    BusinessType.RESTAURANT,
    BusinessType.STORE
];

const APPROVAL_STATUSES: readonly ApprovalStatus[] = [
    ApprovalStatus.PENDING,
    ApprovalStatus.APPROVED,
    ApprovalStatus.REJECTED
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
} as const;

interface BusinessData {
    businessName: string;
    legalName: string | null;
    taxId: string | null;
    businessType: BusinessType;
    description: string | null;
    address: string;
    city: string;
    department: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    logoUrl: string | null;
    documentUrl: string | null;
    deliveryFee: number | null;
}

function buildBusinessData(body: Record<string, unknown>): {
    errors: string[];
    data: BusinessData | null;
} {
    const errors: string[] = [];

    const businessName = cleanString(body.businessName);
    const legalName = cleanString(body.legalName);
    const taxId = cleanString(body.taxId);
    const businessType = parseEnumValue(body.businessType, BUSINESS_TYPES);
    const description = cleanString(body.description);
    const address = cleanString(body.address);
    const city = cleanString(body.city);
    const department = cleanString(body.department);
    const contactPhone = cleanString(body.contactPhone);
    const contactEmail = cleanString(body.contactEmail);
    const logoUrl = cleanString(body.logoUrl);
    const documentUrl = cleanString(body.documentUrl);
    const deliveryFee = parseMoney(body.deliveryFee);

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

    if (contactEmail && !isValidEmail(contactEmail)) {
        errors.push("El correo de contacto no es válido");
    }

    if (deliveryFee === undefined) {
        errors.push(
            "La tarifa de domicilio debe ser un número mayor o igual a 0"
        );
    }

    if (errors.length > 0) {
        return { errors, data: null };
    }

    return {
        errors: [],
        data: {
            businessName: businessName as string,
            legalName,
            taxId,
            businessType: businessType as BusinessType,
            description,
            address: address as string,
            city: city as string,
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
export async function registerBusiness(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const existingProfile = await prisma.businessProfile.findUnique({
            where: { userId }
        });

        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Ya tienes una solicitud de empresa registrada. Consulta tu perfil o actualízalo."
            });
        }

        const deliveryProfile = await prisma.deliveryProfile.findUnique({
            where: { userId }
        });

        if (deliveryProfile) {
            return res.status(409).json({
                success: false,
                message:
                    "Tu cuenta ya está registrada como domiciliario. Para registrar una empresa necesitas otra cuenta."
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
            const duplicateTaxId = await prisma.businessProfile.findUnique({
                where: { taxId: data.taxId }
            });

            if (duplicateTaxId) {
                return res.status(409).json({
                    success: false,
                    message: "Ya existe una empresa registrada con ese NIT/documento"
                });
            }
        }

        const profile = await prisma.businessProfile.create({
            data: {
                userId,
                ...data,
                deliveryFee: data.deliveryFee ?? 0,
                status: ApprovalStatus.PENDING
            },
            include: businessInclude
        });

        return res.status(201).json({
            success: true,
            message: "Solicitud de empresa registrada. Queda pendiente de aprobación.",
            business: profile
        });
    } catch (error) {
        console.error("Error registrando empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al registrar la empresa"
        });
    }
}

// CONSULTAR MI EMPRESA
export async function getMyBusiness(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const profile = await prisma.businessProfile.findUnique({
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
                rating: await businessRatingStats(profile.id)
            }
        });
    } catch (error) {
        console.error("Error consultando empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar la empresa"
        });
    }
}

// ACTUALIZAR MI EMPRESA (solo si está pendiente o rechazada)
export async function updateMyBusiness(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const profile = await prisma.businessProfile.findUnique({
            where: { userId }
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Todavía no tienes una solicitud de empresa registrada"
            });
        }

        if (profile.status === ApprovalStatus.APPROVED) {
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
            const duplicateTaxId = await prisma.businessProfile.findFirst({
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
        const updated = await prisma.businessProfile.update({
            where: { userId },
            data: {
                ...data,
                deliveryFee: data.deliveryFee ?? Number(profile.deliveryFee),
                status: ApprovalStatus.PENDING,
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
    } catch (error) {
        console.error("Error actualizando empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al actualizar la empresa"
        });
    }
}

// LISTAR EMPRESAS (solo administrador)
export async function listBusinesses(req: Request, res: Response) {
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
            prisma.businessProfile.count({ where }),
            prisma.businessProfile.findMany({
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
    } catch (error) {
        console.error("Error listando empresas:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar empresas"
        });
    }
}

// DETALLE DE UNA EMPRESA (solo administrador)
export async function getBusinessById(req: Request, res: Response) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de empresa inválido"
            });
        }

        const business = await prisma.businessProfile.findUnique({
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
    } catch (error) {
        console.error("Error consultando empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar la empresa"
        });
    }
}

// APROBAR EMPRESA (solo administrador)
export async function approveBusiness(req: Request, res: Response) {
    try {
        const adminId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de empresa inválido"
            });
        }

        const profile = await prisma.businessProfile.findUnique({
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

        if (profile.status === ApprovalStatus.APPROVED) {
            return res.status(409).json({
                success: false,
                message: "Esta empresa ya está aprobada"
            });
        }

        const updated = await prisma.$transaction(async tx => {
            const business = await tx.businessProfile.update({
                where: { id },
                data: {
                    status: ApprovalStatus.APPROVED,
                    rejectionReason: null,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: businessInclude
            });

            const role = await tx.role.upsert({
                where: { name: RoleName.BUSINESS },
                update: {},
                create: { name: RoleName.BUSINESS }
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
    } catch (error) {
        console.error("Error aprobando empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al aprobar la empresa"
        });
    }
}

// RECHAZAR EMPRESA (solo administrador)
export async function rejectBusiness(req: Request, res: Response) {
    try {
        const adminId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de empresa inválido"
            });
        }

        const reason = cleanString(req.body.reason);

        if (!reason || reason.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Debes indicar un motivo de rechazo de al menos 5 caracteres"
            });
        }

        const profile = await prisma.businessProfile.findUnique({
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

        if (profile.status === ApprovalStatus.REJECTED) {
            return res.status(409).json({
                success: false,
                message: "Esta empresa ya está rechazada"
            });
        }

        const updated = await prisma.$transaction(async tx => {
            const business = await tx.businessProfile.update({
                where: { id },
                data: {
                    status: ApprovalStatus.REJECTED,
                    rejectionReason: reason,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: businessInclude
            });

            // Si la empresa estaba aprobada, se revoca el permiso BUSINESS.
            if (profile.status === ApprovalStatus.APPROVED) {
                const role = await tx.role.findUnique({
                    where: { name: RoleName.BUSINESS }
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
            message:
                profile.status === ApprovalStatus.APPROVED
                    ? "Empresa rechazada. Se revocó el rol BUSINESS del usuario."
                    : "Empresa rechazada.",
            business: updated
        });
    } catch (error) {
        console.error("Error rechazando empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al rechazar la empresa"
        });
    }
}
