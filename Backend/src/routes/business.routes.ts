import { Router } from "express";
import {
    registerBusiness,
    getMyBusiness,
    updateMyBusiness,
    listBusinesses,
    getBusinessById,
    approveBusiness,
    rejectBusiness
} from "../controllers/business.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/roles.middleware";
import { RoleName } from "@prisma/client";

const router = Router();

// Solicitudes del usuario autenticado
router.post("/register", authenticateToken, registerBusiness);
router.get("/me", authenticateToken, getMyBusiness);
router.put("/me", authenticateToken, updateMyBusiness);

// Panel de administración
router.get(
    "/",
    authenticateToken,
    authorizeRoles(RoleName.ADMIN),
    listBusinesses
);

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles(RoleName.ADMIN),
    getBusinessById
);

router.patch(
    "/:id/approve",
    authenticateToken,
    authorizeRoles(RoleName.ADMIN),
    approveBusiness
);

router.patch(
    "/:id/reject",
    authenticateToken,
    authorizeRoles(RoleName.ADMIN),
    rejectBusiness
);

export default router;
