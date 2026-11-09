import { Router } from "express";
import { RoleName } from "@prisma/client";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/roles.middleware";
import {
    createOrder,
    listMyOrders,
    getMyOrder,
    cancelMyOrder
} from "../controllers/order.controller";

const router = Router();

router.use(authenticateToken, authorizeRoles(RoleName.CLIENT));

router.post("/", createOrder);
router.get("/", listMyOrders);
router.get("/:id", getMyOrder);
router.patch("/:id/cancel", cancelMyOrder);

export default router;
