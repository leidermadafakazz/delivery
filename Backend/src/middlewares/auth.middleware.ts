
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "No estás autenticado"
        });
    }

    const token = authorization.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(500).json({
            success: false,
            message: "Error de configuración del servidor"
        });
    }

    try {
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

        if (typeof decoded.userId !== "number") {
            return res.status(401).json({
                success: false,
                message: "Token inválido"
            });
        }

        res.locals.userId = decoded.userId;

        next();

    } catch {
        return res.status(401).json({
            success: false,
            message: "Token inválido o expirado"
        });
    }
}
