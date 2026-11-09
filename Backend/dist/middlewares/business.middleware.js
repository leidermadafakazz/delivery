"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApprovedBusiness = requireApprovedBusiness;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
/**
 * Verifica que el usuario autenticado tenga una empresa aprobada y la deja
 * disponible en res.locals.business para los controladores del catálogo.
 *
 * Debe usarse después de authenticateToken y authorizeRoles(BUSINESS).
 */
async function requireApprovedBusiness(_req, res, next) {
    try {
        const userId = res.locals.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "No estás autenticado"
            });
        }
        const business = await database_1.prisma.businessProfile.findUnique({
            where: { userId }
        });
        if (!business) {
            return res.status(403).json({
                success: false,
                message: "No tienes un perfil de empresa registrado"
            });
        }
        if (business.status !== client_1.ApprovalStatus.APPROVED) {
            return res.status(403).json({
                success: false,
                message: "Tu empresa debe estar aprobada para gestionar el catálogo"
            });
        }
        res.locals.business = business;
        next();
    }
    catch (error) {
        console.error("Error validando la empresa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al validar la empresa"
        });
    }
}
