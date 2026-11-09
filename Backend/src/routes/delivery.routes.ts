import { Router } from "express";
import {
    registerDelivery,
    getMyDelivery,
    updateMyDelivery,
    listDeliveries,
    getDeliveryById,
    approveDelivery,
    rejectDelivery
} from "../controllers/delivery.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/roles.middleware";
import { RoleName } from "@prisma/client";

const router = Router();

// Solicitudes del usuario autenticado
router.post("/register", authenticateToken, registerDelivery);
router.get("/me", authenticateToken, getMyDelivery);
router.put("/me", authenticateToken, updateMyDelivery);

// Panel de administración
router.get(
    "/",
    authenticateToken,
    authorizeRoles(RoleName.ADMIN),
    listDeliveries
);

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles(RoleName.ADMIN),
    getDeliveryById
);

router.patch(
    "/:id/approve",
    authenticateToken,
    authorizeRoles(RoleName.ADMIN),
    approveDelivery
);

router.patch(
    "/:id/reject",
    authenticateToken,
    authorizeRoles(RoleName.ADMIN),
    rejectDelivery
);

export default router;
