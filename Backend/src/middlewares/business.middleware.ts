import { NextFunction, Request, Response } from "express";
import { ApprovalStatus } from "@prisma/client";
import { prisma } from "../config/database";

/**
 * Verifica que el usuario autenticado tenga una empresa aprobada y la deja
 * disponible en res.locals.business para los controladores del catálogo.
 *
 * Debe usarse después de authenticateToken y authorizeRoles(BUSINESS).
 */
export async function requireApprovedBusiness(
    _req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = res.locals.userId as number | undefined;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "No estás autenticado"
            });
        }

        const business = await prisma.businessProfile.findUnique({
            where: { userId }
        });

        if (!business) {
            return res.status(403).json({
                success: false,
                message: "No tienes un perfil de empresa registrado"
            });
        }

        if (business.status !== ApprovalStatus.APPROVED) {
            return res.status(403).json({
                success: false,
                message:
                    "Tu empresa debe estar aprobada para gestionar el catálogo"
            });
        }

        res.locals.business = business;

        next();
    } catch (error) {
        console.error("Error validando la empresa:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al validar la empresa"
        });
    }
}
