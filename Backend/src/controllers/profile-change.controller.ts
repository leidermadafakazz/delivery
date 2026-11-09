import { Request, Response } from "express";
import { ApprovalStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import {
    cleanString,
    getPagination,
    isValidEmail,
    parseEnumValue,
    parseId
} from "../utils/profile";

/**
 * Cambios de los datos de la cuenta (nombre, correo y teléfono).
 * Quedan pendientes hasta que el administrador los aprueba.
 */

const APPROVAL_STATUSES: readonly ApprovalStatus[] = [
    ApprovalStatus.PENDING,
    ApprovalStatus.APPROVED,
    ApprovalStatus.REJECTED
];

const changeInclude = {
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

// CONSULTAR MI SOLICITUD DE CAMBIO
export async function getMyProfileChange(_req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const request = await prisma.profileChangeRequest.findUnique({
            where: { userId },
            include: changeInclude
        });

        return res.json({
            success: true,
            request
        });
    } catch (error) {
        console.error("Error consultando cambio de perfil:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el cambio de perfil"
        });
    }
}

// CREAR O ACTUALIZAR MI SOLICITUD DE CAMBIO
export async function upsertMyProfileChange(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                email: true,
                phone: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }

        const rawName = req.body.name;
        const rawEmail = req.body.email;
        const rawPhone = req.body.phone;

        if (
            rawName === undefined &&
            rawEmail === undefined &&
            rawPhone === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "No enviaste ningún dato para actualizar"
            });
        }

        let name: string | null = null;
        let email: string | null = null;
        let phone: string | null = null;

        if (rawName !== undefined) {
            const parsed = cleanString(rawName);

            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El nombre no puede estar vacío"
                });
            }

            name = parsed;
        }

        if (rawEmail !== undefined) {
            const parsed = cleanString(rawEmail);

            if (!parsed || !isValidEmail(parsed)) {
                return res.status(400).json({
                    success: false,
                    message: "El correo electrónico no es válido"
                });
            }

            email = parsed.toLowerCase();

            const duplicate = await prisma.user.findFirst({
                where: {
                    email,
                    id: { not: userId }
                },
                select: { id: true }
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "Ese correo ya está registrado por otra cuenta"
                });
            }
        }

        if (rawPhone !== undefined) {
            // Cadena vacía = quitar el teléfono; texto = nuevo teléfono.
            phone = cleanString(rawPhone) ?? "";
        }

        const phoneChanged =
            rawPhone !== undefined &&
            (phone === "" ? user.phone !== null : phone !== user.phone);

        const changed =
            (name !== null && name !== user.name) ||
            (email !== null && email !== user.email) ||
            phoneChanged;

        if (!changed) {
            return res.status(400).json({
                success: false,
                message: "Los datos enviados son iguales a los actuales"
            });
        }

        const request = await prisma.profileChangeRequest.upsert({
            where: { userId },
            create: {
                userId,
                name,
                email,
                phone,
                status: ApprovalStatus.PENDING
            },
            update: {
                name,
                email,
                phone,
                status: ApprovalStatus.PENDING,
                rejectionReason: null,
                reviewedById: null,
                reviewedAt: null
            },
            include: changeInclude
        });

        return res.json({
            success: true,
            message:
                "Solicitud de cambio enviada. El administrador debe aprobarla para que se aplique.",
            request
        });
    } catch (error) {
        console.error("Error guardando cambio de perfil:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al guardar el cambio de perfil"
        });
    }
}

// LISTAR SOLICITUDES DE CAMBIO (administrador)
export async function listProfileChanges(req: Request, res: Response) {
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

        const where = status ? { status } : {};

        const [total, requests] = await Promise.all([
            prisma.profileChangeRequest.count({ where }),
            prisma.profileChangeRequest.findMany({
                where,
                include: changeInclude,
                orderBy: { createdAt: "asc" },
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
            requests
        });
    } catch (error) {
        console.error("Error listando cambios de perfil:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al listar los cambios de perfil"
        });
    }
}

// APROBAR CAMBIO DE PERFIL (administrador)
export async function approveProfileChange(req: Request, res: Response) {
    try {
        const adminId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de solicitud inválido"
            });
        }

        const request = await prisma.profileChangeRequest.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Solicitud no encontrada"
            });
        }

        if (request.userId === adminId) {
            return res.status(403).json({
                success: false,
                message: "No puedes revisar tu propia solicitud"
            });
        }

        if (request.status === ApprovalStatus.APPROVED) {
            return res.status(409).json({
                success: false,
                message: "Este cambio ya está aprobado"
            });
        }

        if (request.email) {
            const duplicate = await prisma.user.findFirst({
                where: {
                    email: request.email,
                    id: { not: request.userId }
                },
                select: { id: true }
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message:
                        "El correo solicitado ya fue registrado por otra cuenta. Rechaza el cambio."
                });
            }
        }

        const data: Prisma.UserUpdateInput = {};

        if (request.name !== null) {
            data.name = request.name;
        }

        if (request.email !== null) {
            data.email = request.email;
        }

        if (request.phone !== null) {
            data.phone = request.phone === "" ? null : request.phone;
        }

        const updated = await prisma.$transaction(async tx => {
            await tx.user.update({
                where: { id: request.userId },
                data
            });

            return tx.profileChangeRequest.update({
                where: { id },
                data: {
                    status: ApprovalStatus.APPROVED,
                    rejectionReason: null,
                    reviewedById: adminId,
                    reviewedAt: new Date()
                },
                include: changeInclude
            });
        });

        return res.json({
            success: true,
            message: "Cambio de perfil aprobado y aplicado a la cuenta",
            request: updated
        });
    } catch (error) {
        console.error("Error aprobando cambio de perfil:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al aprobar el cambio de perfil"
        });
    }
}

// RECHAZAR CAMBIO DE PERFIL (administrador)
export async function rejectProfileChange(req: Request, res: Response) {
    try {
        const adminId = res.locals.userId as number;
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de solicitud inválido"
            });
        }

        const reason = cleanString(req.body.reason);

        if (!reason || reason.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Debes indicar un motivo de rechazo de al menos 5 caracteres"
            });
        }

        const request = await prisma.profileChangeRequest.findUnique({
            where: { id }
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Solicitud no encontrada"
            });
        }

        if (request.userId === adminId) {
            return res.status(403).json({
                success: false,
                message: "No puedes revisar tu propia solicitud"
            });
        }

        if (request.status === ApprovalStatus.REJECTED) {
            return res.status(409).json({
                success: false,
                message: "Este cambio ya está rechazado"
            });
        }

        const updated = await prisma.profileChangeRequest.update({
            where: { id },
            data: {
                status: ApprovalStatus.REJECTED,
                rejectionReason: reason,
                reviewedById: adminId,
                reviewedAt: new Date()
            },
            include: changeInclude
        });

        return res.json({
            success: true,
            message: "Cambio de perfil rechazado",
            request: updated
        });
    } catch (error) {
        console.error("Error rechazando cambio de perfil:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al rechazar el cambio de perfil"
        });
    }
}
