import { Router } from "express";
import {
	getSavedInvestmentPlan,
	recommendInvestmentPlan,
} from "../controllers/investmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/recommend", protect, recommendInvestmentPlan);
router.get("/recommendation", protect, getSavedInvestmentPlan);

export default router;
