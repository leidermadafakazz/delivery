import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import {
    getMyRatingSummary,
    getPublicRatingSummary,
    listOrderRatings,
    rateOrder
} from "../controllers/rating.controller";

const router = Router();

router.use(authenticateToken);

router.get("/summary", getPublicRatingSummary);
router.get("/me", getMyRatingSummary);
router.get("/orders/:orderId", listOrderRatings);
router.post("/orders/:orderId", rateOrder);

export default router;
