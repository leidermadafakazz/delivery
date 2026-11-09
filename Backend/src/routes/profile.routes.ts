import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import {
    getMyProfileChange,
    upsertMyProfileChange
} from "../controllers/profile-change.controller";

const router = Router();

router.use(authenticateToken);

router.get("/change", getMyProfileChange);
router.put("/change", upsertMyProfileChange);

export default router;
