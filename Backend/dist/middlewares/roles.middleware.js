"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = authorizeRoles;
const database_1 = require("../config/database");
/**
 * Carga los roles del usuario autenticado y, si se indican roles permitidos,
 * valida que tenga al menos uno de ellos.
 *
 * Debe usarse siempre después de authenticateToken.
 */
function authorizeRoles(...allowedRoles) {
    return async (_req, res, next) => {
        try {
            const userId = res.locals.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "No estás autenticado"
                });
            }
            const user = await database_1.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    roles: {
                        include: { role: true }
                    }
                }
            });
            if (!user || !user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: "Tu cuenta no está disponible"
                });
            }
            const roles = user.roles.map(item => item.role.name);
            res.locals.roles = roles;
            if (allowedRoles.length > 0 &&
                !allowedRoles.some(role => roles.includes(role))) {
                return res.status(403).json({
                    success: false,
                    message: "No tienes permisos para realizar esta acción"
                });
            }
            next();
        }
        catch (error) {
            console.error("Error validando permisos:", error);
            return res.status(500).json({
                success: false,
                message: "Error interno al validar permisos"
            });
        }
    };
}
