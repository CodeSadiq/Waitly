import express from "express";
import {
  syncPlaces,
  getNearbyPlaces,
  searchPlaces
} from "../controllers/locationController.js";

import Place from "../models/Place.js";
import { submitPlaceByUser } from "../controllers/locationController.js";
import { updateWaitTime } from "../controllers/waitController.js";



const router = express.Router();


router.post("/update-wait", updateWaitTime);

router.post("/submit-place", submitPlaceByUser);


/* =========================
   SYNC (ADMIN / SYSTEM)
   ========================= */
router.post("/sync-places", syncPlaces);

/* =========================
   GET NEARBY PLACES (HOME)
   ========================= */
router.get("/nearby-places", getNearbyPlaces);

/* =========================
   GLOBAL SEARCH
   ========================= */
router.get("/search", searchPlaces);

/* =========================
   GET SINGLE PLACE BY ID
   🔥 REQUIRED for Join Queue
   ========================= */
router.get("/place/:id", async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);

    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.json(place);
  } catch (err) {
    console.error("Fetch place error:", err);
    res.status(500).json({ message: "Invalid place ID" });
  }
});

export default router;
