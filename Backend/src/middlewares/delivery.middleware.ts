import { NextFunction, Request, Response } from "express";
import { ApprovalStatus } from "@prisma/client";
import { prisma } from "../config/database";

/**
 * Verifica que el usuario autenticado tenga un perfil de domiciliario aprobado
 * y lo deja disponible en res.locals.delivery.
 *
 * Debe usarse después de authenticateToken y authorizeRoles(DELIVERY).
 */
export async function requireApprovedDelivery(
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

        const delivery = await prisma.deliveryProfile.findUnique({
            where: { userId }
        });

        if (!delivery) {
            return res.status(403).json({
                success: false,
                message: "No tienes un perfil de domiciliario registrado"
            });
        }

        if (delivery.status !== ApprovalStatus.APPROVED) {
            return res.status(403).json({
                success: false,
                message:
                    "Tu perfil de domiciliario debe estar aprobado para gestionar pedidos"
            });
        }

        res.locals.delivery = delivery;

        next();
    } catch (error) {
        console.error("Error validando el domiciliario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al validar el domiciliario"
        });
    }
}
