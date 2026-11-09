"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.emitToUser = emitToUser;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io = null;
/**
 * Inicializa Socket.IO sobre el servidor HTTP y autentica cada conexión con
 * el mismo JWT que usa la API. Cada usuario entra a la sala `user:<id>`.
 */
function initSocket(httpServer, clientUrl) {
    io = new socket_io_1.Server(httpServer, {
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
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            if (typeof decoded.userId !== "number") {
                return next(new Error("Token inválido"));
            }
            socket.data.userId = decoded.userId;
            next();
        }
        catch {
            next(new Error("Token inválido o expirado"));
        }
    });
    io.on("connection", socket => {
        const userId = socket.data.userId;
        socket.join(`user:${userId}`);
    });
    return io;
}
function emitToUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
}
