import { Router } from "express";
import {
  addOrUpdateNomination,
  getNomination,
  deleteNomination,
  checkAndNotifyInactive,
  acknowledgeNomination,
} from "../controllers/nominationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Protected routes - requires authentication
router.post("/add", protect, addOrUpdateNomination);
router.get("/", protect, getNomination);
router.delete("/", protect, deleteNomination);

// Admin route - check inactivity and send notifications
router.post("/check-inactivity", checkAndNotifyInactive);

// Public route - acknowledge nomination
router.post("/acknowledge", acknowledgeNomination);

export default router;
