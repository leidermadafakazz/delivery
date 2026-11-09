import { NextFunction, Request, Response } from "express";
import { RoleName } from "@prisma/client";
import { prisma } from "../config/database";

/**
 * Carga los roles del usuario autenticado y, si se indican roles permitidos,
 * valida que tenga al menos uno de ellos.
 *
 * Debe usarse siempre después de authenticateToken.
 */
export function authorizeRoles(...allowedRoles: RoleName[]) {
    return async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = res.locals.userId as number | undefined;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "No estás autenticado"
                });
            }

            const user = await prisma.user.findUnique({
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

            if (
                allowedRoles.length > 0 &&
                !allowedRoles.some(role => roles.includes(role))
            ) {
                return res.status(403).json({
                    success: false,
                    message: "No tienes permisos para realizar esta acción"
                });
            }

            next();
        } catch (error) {
            console.error("Error validando permisos:", error);

            return res.status(500).json({
                success: false,
                message: "Error interno al validar permisos"
            });
        }
    };
}
