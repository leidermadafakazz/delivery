import { Router } from "express";
import { getDashboard, getRequests } from "../controllers/admin.controller";
import {
    listAllProducts,
    deactivateProduct,
    activateProduct
} from "../controllers/admin-product.controller";
import {
    listAllOrders,
    getOrderById,
    assignOrderDelivery,
    cancelOrder
} from "../controllers/admin-order.controller";
import {
    approveProfileChange,
    listProfileChanges,
    rejectProfileChange
} from "../controllers/profile-change.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/roles.middleware";
import { RoleName } from "@prisma/client";

const router = Router();

router.use(authenticateToken, authorizeRoles(RoleName.ADMIN));

router.get("/dashboard", getDashboard);
router.get("/requests", getRequests);

// Cambios de datos de cuenta
router.get("/profile-changes", listProfileChanges);
router.patch("/profile-changes/:id/approve", approveProfileChange);
router.patch("/profile-changes/:id/reject", rejectProfileChange);

// Moderación del catálogo
router.get("/products", listAllProducts);
router.patch("/products/:id/deactivate", deactivateProduct);
router.patch("/products/:id/activate", activateProduct);

// Gestión de pedidos
router.get("/orders", listAllOrders);
router.get("/orders/:id", getOrderById);
router.patch("/orders/:id/assign", assignOrderDelivery);
router.patch("/orders/:id/cancel", cancelOrder);

export default router;
