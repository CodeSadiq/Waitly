
import express from "express";
import { addReview, getReviews } from "../controllers/waitlyReviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= ROUTES ================= */
router.post("/:placeId", protect(), addReview);
router.get("/:placeId", getReviews);

export default router;
