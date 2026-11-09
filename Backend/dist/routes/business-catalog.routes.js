"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const business_middleware_1 = require("../middlewares/business.middleware");
const category_controller_1 = require("../controllers/category.controller");
const product_controller_1 = require("../controllers/product.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken, (0, roles_middleware_1.authorizeRoles)(client_1.RoleName.BUSINESS), business_middleware_1.requireApprovedBusiness);
// Categorías
router.get("/categories", category_controller_1.listCategories);
router.post("/categories", category_controller_1.createCategory);
router.put("/categories/:id", category_controller_1.updateCategory);
router.delete("/categories/:id", category_controller_1.deleteCategory);
// Productos
router.get("/products", product_controller_1.listMyProducts);
router.post("/products", product_controller_1.createProduct);
router.get("/products/:id", product_controller_1.getMyProduct);
router.put("/products/:id", product_controller_1.updateProduct);
router.delete("/products/:id", product_controller_1.deleteProduct);
router.patch("/products/:id/restore", product_controller_1.restoreProduct);
router.patch("/products/:id/availability", product_controller_1.updateProductAvailability);
exports.default = router;
