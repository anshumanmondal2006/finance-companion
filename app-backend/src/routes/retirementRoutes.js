import express from 'express';
import { getRetirementPlan, generateRetirementPlan } from '../controllers/retirementController.js';
import { protect } from '../middleware/authMiddleware.js'; // Adjust the path to wherever your auth file is

const router = express.Router();

// Protect the route using YOUR auth middleware
router.get('/', protect, getRetirementPlan);

// Generate new plan (The route we just created)
router.post('/generate', protect, generateRetirementPlan);

export default router;