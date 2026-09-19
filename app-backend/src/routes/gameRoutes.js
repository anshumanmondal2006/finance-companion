import { Router } from "express";
import {
  getGamesByAgeGroup,
  getGameById,
  submitGameAnswers,
  createGame,
} from "../controllers/gameController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Get games for a specific age group (protected to filter mastered games)
router.get("/age-group/:ageGroup", protect, getGamesByAgeGroup);

// Get specific game details (protected)
router.get("/:gameId", protect, getGameById);

// Submit game answers (protected)
router.post("/:gameId/submit", protect, submitGameAnswers);

// Create game (admin only - for development/seeding)
router.post("/create", protect, createGame);

export default router;
