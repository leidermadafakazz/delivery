import { Router } from "express";
import { RoleName } from "@prisma/client";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/roles.middleware";
import { requireApprovedBusiness } from "../middlewares/business.middleware";
import {
    listBusinessOrders,
    getBusinessOrder,
    acceptBusinessOrder,
    rejectBusinessOrder,
    updateBusinessOrderStatus
} from "../controllers/business-order.controller";

const router = Router();

router.use(
    authenticateToken,
    authorizeRoles(RoleName.BUSINESS),
    requireApprovedBusiness
);

router.get("/", listBusinessOrders);
router.get("/:id", getBusinessOrder);
router.patch("/:id/accept", acceptBusinessOrder);
router.patch("/:id/reject", rejectBusinessOrder);
router.patch("/:id/status", updateBusinessOrderStatus);

export default router;
