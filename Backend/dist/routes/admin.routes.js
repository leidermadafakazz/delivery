"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const admin_product_controller_1 = require("../controllers/admin-product.controller");
const admin_order_controller_1 = require("../controllers/admin-order.controller");
const profile_change_controller_1 = require("../controllers/profile-change.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN));
router.get("/dashboard", admin_controller_1.getDashboard);
router.get("/requests", admin_controller_1.getRequests);
// Cambios de datos de cuenta
router.get("/profile-changes", profile_change_controller_1.listProfileChanges);
router.patch("/profile-changes/:id/approve", profile_change_controller_1.approveProfileChange);
router.patch("/profile-changes/:id/reject", profile_change_controller_1.rejectProfileChange);
// Moderación del catálogo
router.get("/products", admin_product_controller_1.listAllProducts);
router.patch("/products/:id/deactivate", admin_product_controller_1.deactivateProduct);
router.patch("/products/:id/activate", admin_product_controller_1.activateProduct);
// Gestión de pedidos
router.get("/orders", admin_order_controller_1.listAllOrders);
router.get("/orders/:id", admin_order_controller_1.getOrderById);
router.patch("/orders/:id/assign", admin_order_controller_1.assignOrderDelivery);
router.patch("/orders/:id/cancel", admin_order_controller_1.cancelOrder);
exports.default = router;
