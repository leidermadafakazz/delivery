import { Router } from "express";
import { prisma } from "../config/database";

const router = Router();

router.get("/", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            success: true,
            message: "FastDelivery API funcionando",
            database: "MySQL conectado",
        });
    } catch (error) {
        console.error("Error de conexión:", error);

        res.status(500).json({
            success: false,
            message: "No se pudo conectar con MySQL",
        });
    }
});

export default router;