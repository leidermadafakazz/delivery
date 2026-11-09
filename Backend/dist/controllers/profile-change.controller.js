"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyProfileChange = getMyProfileChange;
exports.upsertMyProfileChange = upsertMyProfileChange;
exports.listProfileChanges = listProfileChanges;
exports.approveProfileChange = approveProfileChange;
exports.rejectProfileChange = rejectProfileChange;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const profile_1 = require("../utils/profile");
/**
 * Cambios de los datos de la cuenta (nombre, correo y teléfono).
 * Quedan pendientes hasta que el administrador los aprueba.
 */
const APPROVAL_STATUSES = [
    client_1.ApprovalStatus.PENDING,
    client_1.ApprovalStatus.APPROVED,
    client_1.ApprovalStatus.REJECTED
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
};
// CONSULTAR MI SOLICITUD DE CAMBIO
async function getMyProfileChange(_req, res) {
    try {
        const userId = res.locals.userId;
        const request = await database_1.prisma.profileChangeRequest.findUnique({
            where: { userId },
            include: changeInclude
        });
        return res.json({
            success: true,
            request
        });
    }
    catch (error) {
        console.error("Error consultando cambio de perfil:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al consultar el cambio de perfil"
        });
    }
}
// CREAR O ACTUALIZAR MI SOLICITUD DE CAMBIO
async function upsertMyProfileChange(req, res) {
    try {
        const userId = res.locals.userId;
        const user = await database_1.prisma.user.findUnique({
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
        if (rawName === undefined &&
            rawEmail === undefined &&
            rawPhone === undefined) {
            return res.status(400).json({
                success: false,
                message: "No enviaste ningún dato para actualizar"
            });
        }
        let name = null;
        let email = null;
        let phone = null;
        if (rawName !== undefined) {
            const parsed = (0, profile_1.cleanString)(rawName);
            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    message: "El nombre no puede estar vacío"
                });
            }
            name = parsed;
        }
        if (rawEmail !== undefined) {
            const parsed = (0, profile_1.cleanString)(rawEmail);
            if (!parsed || !(0, profile_1.isValidEmail)(parsed)) {
                return res.status(400).json({
                    success: false,
                    message: "El correo electrónico no es válido"
                });
            }
            email = parsed.toLowerCase();
            const duplicate = await database_1.prisma.user.findFirst({
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
            phone = (0, profile_1.cleanString)(rawPhone) ?? "";
        }
        const phoneChanged = rawPhone !== undefined &&
            (phone === "" ? user.phone !== null : phone !== user.phone);
        const changed = (name !== null && name !== user.name) ||
            (email !== null && email !== user.email) ||
            phoneChanged;
        if (!changed) {
            return res.status(400).json({
                success: false,
                message: "Los datos enviados son iguales a los actuales"
            });
        }
        const request = await database_1.prisma.profileChangeRequest.upsert({
            where: { userId },
            create: {
                userId,
                name,
                email,
                phone,
                status: client_1.ApprovalStatus.PENDING
            },
            update: {
                name,
                email,
                phone,
                status: client_1.ApprovalStatus.PENDING,
                rejectionReason: null,
                reviewedById: null,
                reviewedAt: null
            },
            include: changeInclude
        });
        return res.json({
            success: true,
            message: "Solicitud de cambio enviada. El administrador debe aprobarla para que se aplique.",
            request
        });
    }
    catch (error) {
        console.error("Error guardando cambio de perfil:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al guardar el cambio de perfil"
        });
    }
}
// LISTAR SOLICITUDES DE CAMBIO (administrador)
async function listProfileChanges(req, res) {
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
        const where = status ? { status } : {};
        const [total, requests] = await Promise.all([
            database_1.prisma.profileChangeRequest.count({ where }),
            database_1.prisma.profileChangeRequest.findMany({
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
    }
    catch (error) {
        console.error("Error listando cambios de perfil:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al listar los cambios de perfil"
        });
    }
}
// APROBAR CAMBIO DE PERFIL (administrador)
async function approveProfileChange(req, res) {
    try {
        const adminId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de solicitud inválido"
            });
        }
        const request = await database_1.prisma.profileChangeRequest.findUnique({
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
        if (request.status === client_1.ApprovalStatus.APPROVED) {
            return res.status(409).json({
                success: false,
                message: "Este cambio ya está aprobado"
            });
        }
        if (request.email) {
            const duplicate = await database_1.prisma.user.findFirst({
                where: {
                    email: request.email,
                    id: { not: request.userId }
                },
                select: { id: true }
            });
            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "El correo solicitado ya fue registrado por otra cuenta. Rechaza el cambio."
                });
            }
        }
        const data = {};
        if (request.name !== null) {
            data.name = request.name;
        }
        if (request.email !== null) {
            data.email = request.email;
        }
        if (request.phone !== null) {
            data.phone = request.phone === "" ? null : request.phone;
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: request.userId },
                data
            });
            return tx.profileChangeRequest.update({
                where: { id },
                data: {
                    status: client_1.ApprovalStatus.APPROVED,
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
    }
    catch (error) {
        console.error("Error aprobando cambio de perfil:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al aprobar el cambio de perfil"
        });
    }
}
// RECHAZAR CAMBIO DE PERFIL (administrador)
async function rejectProfileChange(req, res) {
    try {
        const adminId = res.locals.userId;
        const id = (0, profile_1.parseId)(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Identificador de solicitud inválido"
            });
        }
        const reason = (0, profile_1.cleanString)(req.body.reason);
        if (!reason || reason.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Debes indicar un motivo de rechazo de al menos 5 caracteres"
            });
        }
        const request = await database_1.prisma.profileChangeRequest.findUnique({
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
        if (request.status === client_1.ApprovalStatus.REJECTED) {
            return res.status(409).json({
                success: false,
                message: "Este cambio ya está rechazado"
            });
        }
        const updated = await database_1.prisma.profileChangeRequest.update({
            where: { id },
            data: {
                status: client_1.ApprovalStatus.REJECTED,
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
    }
    catch (error) {
        console.error("Error rechazando cambio de perfil:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al rechazar el cambio de perfil"
        });
    }
}
