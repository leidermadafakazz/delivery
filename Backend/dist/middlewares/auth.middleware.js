"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authenticateToken(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (typeof decoded.userId !== "number") {
            return res.status(401).json({
                success: false,
                message: "Token inválido"
            });
        }
        res.locals.userId = decoded.userId;
        next();
    }
    catch {
        return res.status(401).json({
            success: false,
            message: "Token inválido o expirado"
        });
    }
}
