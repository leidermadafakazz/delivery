import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

let io: Server | null = null;

/**
 * Inicializa Socket.IO sobre el servidor HTTP y autentica cada conexión con
 * el mismo JWT que usa la API. Cada usuario entra a la sala `user:<id>`.
 */
export function initSocket(httpServer: HttpServer, clientUrl: string) {
    io = new Server(httpServer, {
        cors: {
            origin: clientUrl,
            credentials: true
        }
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            const secret = process.env.JWT_SECRET;

            if (typeof token !== "string" || !token || !secret) {
                return next(new Error("No autorizado"));
            }

            const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

            if (typeof decoded.userId !== "number") {
                return next(new Error("Token inválido"));
            }

            socket.data.userId = decoded.userId;
            next();
        } catch {
            next(new Error("Token inválido o expirado"));
        }
    });

    io.on("connection", socket => {
        const userId = socket.data.userId as number;

        socket.join(`user:${userId}`);
    });

    return io;
}

export function emitToUser(
    userId: number,
    event: string,
    payload: unknown
) {
    io?.to(`user:${userId}`).emit(event, payload);
}
