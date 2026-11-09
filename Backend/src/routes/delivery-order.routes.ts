import { Router } from "express";
import { RoleName } from "@prisma/client";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/roles.middleware";
import { requireApprovedDelivery } from "../middlewares/delivery.middleware";
import {
    listAvailableOrders,
    listMyDeliveryOrders,
    getMyDeliveryOrder,
    acceptAvailableOrder,
    pickupOrder,
    deliverOrder
} from "../controllers/delivery-order.controller";

const router = Router();

router.use(
    authenticateToken,
    authorizeRoles(RoleName.DELIVERY),
    requireApprovedDelivery
);

router.get("/available-orders", listAvailableOrders);
router.get("/orders", listMyDeliveryOrders);
router.get("/orders/:id", getMyDeliveryOrder);
router.patch("/orders/:id/accept", acceptAvailableOrder);
router.patch("/orders/:id/pickup", pickupOrder);
router.patch("/orders/:id/deliver", deliverOrder);

export default router;
