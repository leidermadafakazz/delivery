import { Router } from "express";
import { RoleName } from "@prisma/client";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/roles.middleware";
import { requireApprovedBusiness } from "../middlewares/business.middleware";
import {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from "../controllers/category.controller";
import {
    listMyProducts,
    getMyProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    updateProductAvailability
} from "../controllers/product.controller";

const router = Router();

router.use(
    authenticateToken,
    authorizeRoles(RoleName.BUSINESS),
    requireApprovedBusiness
);

// Categorías
router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// Productos
router.get("/products", listMyProducts);
router.post("/products", createProduct);
router.get("/products/:id", getMyProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.patch("/products/:id/restore", restoreProduct);
router.patch("/products/:id/availability", updateProductAvailability);

export default router;
