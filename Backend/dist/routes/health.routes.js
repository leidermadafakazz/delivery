"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        res.json({
            success: true,
            message: "FastDelivery API funcionando",
            database: "MySQL conectado",
        });
    }
    catch (error) {
        console.error("Error de conexión:", error);
        res.status(500).json({
            success: false,
            message: "No se pudo conectar con MySQL",
        });
    }
});
exports.default = router;
