"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApprovedDelivery = requireApprovedDelivery;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
/**
 * Verifica que el usuario autenticado tenga un perfil de domiciliario aprobado
 * y lo deja disponible en res.locals.delivery.
 *
 * Debe usarse después de authenticateToken y authorizeRoles(DELIVERY).
 */
async function requireApprovedDelivery(_req, res, next) {
    try {
        const userId = res.locals.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "No estás autenticado"
            });
        }
        const delivery = await database_1.prisma.deliveryProfile.findUnique({
            where: { userId }
        });
        if (!delivery) {
            return res.status(403).json({
                success: false,
                message: "No tienes un perfil de domiciliario registrado"
            });
        }
        if (delivery.status !== client_1.ApprovalStatus.APPROVED) {
            return res.status(403).json({
                success: false,
                message: "Tu perfil de domiciliario debe estar aprobado para gestionar pedidos"
            });
        }
        res.locals.delivery = delivery;
        next();
    }
    catch (error) {
        console.error("Error validando el domiciliario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al validar el domiciliario"
        });
    }
}
