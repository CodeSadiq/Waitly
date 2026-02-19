import Place from "../models/Place.js";
import PendingPlace from "../models/PendingPlace.js";
import Staff from "../models/Staff.js";

export const submitPlaceByUser = async (req, res) => {
  try {
    const { name, category, lat, lng } = req.body;

    if (!name || !category || !lat || !lng) {
      return res.status(400).json({ message: "All fields required" });
    }

    await PendingPlace.create({
      name,
      category,
      address: "User submitted",
      location: { lat, lng },
      source: "user"
    });

    res.json({ success: true, message: "Place sent for approval" });
  } catch (err) {
    console.error("USER PLACE ERROR:", err);
    res.status(500).json({ error: "Submission failed" });
  }
};

/* ===========================
   POST /api/location/sync-places
   Purpose: (NO SEED ANYMORE)
   Kept only to avoid frontend / route break
   =========================== */
export const syncPlaces = async (req, res) => {
  try {
    return res.json({
      success: true,
      inserted: 0,
      message: "Seed system removed. Use Admin Panel to add places."
    });
  } catch (err) {
    console.error("SYNC ERROR:", err);
    return res.status(500).json({ error: "Sync failed" });
  }
};

/* ===========================
   GET /api/location/nearby-places
   Purpose: Fetch places ONLY from DB
   =========================== */
export const getNearbyPlaces = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Location required" });
    }

    const userLat = Number(lat);
    const userLng = Number(lng);

    const MAX_DISTANCE_KM = 500; // realistic nearby radius

    const places = await Place.find();

    const nearbyPlaces = places.filter(place => {
      if (!place.location?.lat || !place.location?.lng) return false;

      const dLat = (place.location.lat - userLat) * 111;
      const dLng =
        (place.location.lng - userLng) *
        111 *
        Math.cos((userLat * Math.PI) / 180);

      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      return distance <= MAX_DISTANCE_KM;
    });

    // Check if any place already has an active staff
    const placesWithStatus = await Promise.all(nearbyPlaces.map(async (p) => {
      const activeStaff = await Staff.findOne({ placeId: p._id, status: 'active' });
      return {
        ...p.toObject(),
        hasActiveStaff: !!activeStaff
      };
    }));

    return res.json(placesWithStatus);
  } catch (err) {
    console.error("Nearby fetch error:", err);
    return res.status(500).json({ error: "Fetch failed" });
  }
};

/* ===========================
   GET /api/location/search
   Purpose: Global search for places
   =========================== */
export const searchPlaces = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const places = await Place.find({
      name: { $regex: q, $options: "i" }
    }).limit(20);

    // Also check for active staff for each found place
    const placesWithStatus = await Promise.all(places.map(async (p) => {
      const activeStaff = await Staff.findOne({ placeId: p._id, status: 'active' });
      return {
        ...p.toObject(),
        hasActiveStaff: !!activeStaff
      };
    }));

    res.json(placesWithStatus);
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ error: "Search failed" });
  }
};
