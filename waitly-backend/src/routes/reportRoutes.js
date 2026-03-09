import express from "express";
import {
    getOverviewStats,
    getAnalyticsData,
    generateReport,
    exportReport
} from "../controllers/reportController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply admin protection to all routes
router.use(protect(), requireRole("admin"));

router.get("/overview", getOverviewStats);
router.get("/analytics", getAnalyticsData);
router.post("/generate", generateReport);
router.post("/export", exportReport);

export default router;
