"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const delivery_controller_1 = require("../controllers/delivery.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Solicitudes del usuario autenticado
router.post("/register", auth_middleware_1.authenticateToken, delivery_controller_1.registerDelivery);
router.get("/me", auth_middleware_1.authenticateToken, delivery_controller_1.getMyDelivery);
router.put("/me", auth_middleware_1.authenticateToken, delivery_controller_1.updateMyDelivery);
// Panel de administración
router.get("/", auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN), delivery_controller_1.listDeliveries);
router.get("/:id", auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN), delivery_controller_1.getDeliveryById);
router.patch("/:id/approve", auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN), delivery_controller_1.approveDelivery);
router.patch("/:id/reject", auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN), delivery_controller_1.rejectDelivery);
exports.default = router;
