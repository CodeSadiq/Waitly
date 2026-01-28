import express from "express";
import {
  fetchFromOSM,
  fetchFromGoogle,
  addPlaceFromAPI,
  addPlaceManually,
  getPendingPlaces,
  approvePlace,
  rejectPlace,
  addPendingPlace,
  updatePendingPlace,
  getAllPlaces,              // ✅ existing
  updatePlaceByAdmin,        // ✅ existing
  approveEditedPendingPlace,  // ✅ ADD THIS
  deletePlaceByAdmin,
  getPendingStaffRequests,
  approveStaffRequest,
  rejectStaffRequest
} from "../controllers/waitlyAdminController.js";

import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= USER SUBMISSIONS ================= */
// Allow any authenticated user to add a pending place
router.post("/pending/add", protect(), addPendingPlace);

// Apply protection to all admin routes
router.use(protect(), requireRole("admin"));

/* ================= ADMIN FETCH ================= */
router.post("/fetch/osm", fetchFromOSM);
router.post("/fetch/google", fetchFromGoogle);

/* ================= ADD PLACES ================= */
router.post("/place/api", addPlaceFromAPI);
router.post("/place/manual", addPlaceManually);


/* ================= PENDING (ADMIN) ================= */
router.get("/pending", getPendingPlaces);
router.post("/pending/approve/:id", approvePlace);
router.post("/pending/reject/:id", rejectPlace);
// router.post("/pending/add", addPendingPlace); // MOVED UP
router.put("/pending/:id", updatePendingPlace);

/* 🔥 REQUIRED: APPROVE EDITED JSON */
router.post(
  "/pending/approve-edited/:id",
  approveEditedPendingPlace
);

/* ================= DATABASE PLACES ================= */
router.get("/places", getAllPlaces);
router.post("/place/update/:id", updatePlaceByAdmin);
router.delete("/place/:id", deletePlaceByAdmin);

/* ================= STAFF REQUESTS ================= */
router.get("/staff-requests", getPendingStaffRequests);
router.post("/staff-requests/approve/:id", approveStaffRequest);
router.post("/staff-requests/reject/:id", rejectStaffRequest);

export default router;
