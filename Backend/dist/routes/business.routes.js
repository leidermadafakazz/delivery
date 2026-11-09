"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const business_controller_1 = require("../controllers/business.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Solicitudes del usuario autenticado
router.post("/register", auth_middleware_1.authenticateToken, business_controller_1.registerBusiness);
router.get("/me", auth_middleware_1.authenticateToken, business_controller_1.getMyBusiness);
router.put("/me", auth_middleware_1.authenticateToken, business_controller_1.updateMyBusiness);
// Panel de administración
router.get("/", auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN), business_controller_1.listBusinesses);
router.get("/:id", auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN), business_controller_1.getBusinessById);
router.patch("/:id/approve", auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN), business_controller_1.approveBusiness);
router.patch("/:id/reject", auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.ADMIN), business_controller_1.rejectBusiness);
exports.default = router;
