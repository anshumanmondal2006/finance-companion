import { Router } from "express";
import { getProfile, updateProfile, updateLastLogin } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { saveOnboarding } from "../controllers/userController.js";
const router = Router();

// Middleware to update last login on all protected routes
router.use(protect, updateLastLogin);

router.get("/me", protect, getProfile);
router.patch("/me", protect, updateProfile);
router.post("/onboarding", protect, saveOnboarding);
export default router;
