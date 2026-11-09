import { Router } from "express";
import {
    listPublicBusinesses,
    getPublicBusinessCatalog,
    searchPublicProducts,
    getPublicProduct
} from "../controllers/catalog.controller";

const router = Router();

router.get("/businesses", listPublicBusinesses);
router.get("/businesses/:id", getPublicBusinessCatalog);
router.get("/products", searchPublicProducts);
router.get("/products/:id", getPublicProduct);

export default router;
