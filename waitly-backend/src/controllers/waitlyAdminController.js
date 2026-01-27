import Place from "../models/Place.js";
import PendingPlace from "../models/PendingPlace.js";
import Staff from "../models/Staff.js";

/* =====================================================
   HELPER: BUILD COUNTERS (DB-SAFE FORMAT)
   ===================================================== */
const buildCounters = (counterNames = []) => {
  if (!Array.isArray(counterNames) || counterNames.length === 0) {
    counterNames = ["General"];
  }

  return counterNames.map((name) => ({
    name,
    normalWait: {
      avgTime: 0,
      lastUpdated: null,
      reportsCount: 0
    },
    queueWait: {
      enabled: false,
      avgTime: 0,
      peopleAhead: 0,
      activeTokens: 0
    }
  }));
};

/* =====================================================
   FETCH FROM OSM
   ===================================================== */
/* =====================================================
   FETCH FROM OSM (SAFE + CATEGORY-AWARE)
   ===================================================== */

const OSM_CATEGORY_MAP = {
  // ✅ Amenity based
  bank: { key: "amenity", value: "bank" },
  hospital: { key: "amenity", value: "hospital" },
  police: { key: "amenity", value: "police" },
  post_office: { key: "amenity", value: "post_office" },
  college: { key: "amenity", value: "college" },
  school: { key: "amenity", value: "school" },
  restaurant: { key: "amenity", value: "restaurant" },
  cafe: { key: "amenity", value: "cafe" },
  bus_station: { key: "amenity", value: "bus_station" },

  // 🔥 FIXED ONES
  courthouse: { key: "amenity", value: "courthouse" },
  gas_agency: { key: "amenity", value: "fuel" },
  government: { key: "office", value: "government" },


  // 🏛 Government / office
  passport_office: { key: "government", value: "passport" },
  electricity_office: { key: "office", value: "utility" },
  water_office: { key: "office", value: "water_utility" },
  telecom_office: { key: "office", value: "telecommunication" },

  // 🚆 Transport
  railway_station: { key: "railway", value: "station" },
  airport: { key: "aeroway", value: "aerodrome" },

  // 🛍 Commercial
  mall: { key: "shop", value: "mall" }
};

export const fetchFromOSM = async (req, res) => {
  try {
    const { category, lat, lng } = req.body;

    if (!category || !lat || !lng) {
      return res.status(400).json({ message: "Category & location required" });
    }

    const tag = OSM_CATEGORY_MAP[category];

    // 🔒 Prevent Overpass crash for unsupported categories
    if (!tag) {
      console.warn("Unsupported OSM category:", category);
      return res.json([]);
    }

    const overpassQuery = `
[out:json][timeout:25];
node
  ["${tag.key}"="${tag.value}"]
  (around:40000,${lat},${lng});
out body 10;
`;

    const overpassRes = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "WAITLY/1.0 (admin@waitly.app)"
        },
        body: overpassQuery
      }
    );

    const overpassText = await overpassRes.text();

    // ❌ Overpass sometimes returns HTML (rate limit / error page)
    if (!overpassRes.ok || overpassText.startsWith("<")) {
      console.error(
        "Overpass error:",
        overpassText.slice(0, 200)
      );
      return res.status(502).json({
        message: "OSM service temporarily unavailable"
      });
    }

    const overpassData = JSON.parse(overpassText);

    if (!Array.isArray(overpassData.elements)) {
      return res.json([]);
    }

    const normalized = [];

    for (const p of overpassData.elements) {
      let address = "";

      // 🔄 Reverse geocode (best-effort, never crash)
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${p.lat}&lon=${p.lon}&format=json`,
          {
            headers: {
              "User-Agent": "WAITLY/1.0 (admin@waitly.app)",
              "Accept": "application/json"
            }
          }
        );

        const geoText = await geoRes.text();
        if (!geoText.startsWith("<")) {
          const geoData = JSON.parse(geoText);
          address = geoData.display_name || "";
        }
      } catch {
        address = "";
      }

      normalized.push({
        name: p.tags?.name || category.replace(/_/g, " "),
        lat: p.lat,
        lng: p.lon,
        address,
        source: "osm"
      });

      // ⏱ Polite delay (prevents 429 bans)
      await new Promise((r) => setTimeout(r, 300));
    }

    res.json(normalized);
  } catch (err) {
    console.error("OSM FETCH FAILED:", err);
    res.status(500).json({
      message: "Failed to fetch from OSM"
    });
  }
};




/* =====================================================
   FETCH FROM GOOGLE
   ===================================================== */
export const fetchFromGoogle = async (req, res) => {
  const { category, lat, lng } = req.body;

  if (!category || !lat || !lng) {
    return res.status(400).json({ message: "Category & location required" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const radius = 20000;

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${category}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(400).json({ error: data.status });
    }

    const results = data.results.map((p) => ({
      name: p.name,
      category,
      address: p.vicinity || "",
      location: {
        lat: p.geometry.location.lat,
        lng: p.geometry.location.lng
      },
      source: "google"
    }));

    res.json(results);
  } catch (err) {
    console.error("GOOGLE FETCH ERROR:", err);
    res.status(500).json({ error: "Google fetch failed" });
  }
};

/* =====================================================
   ADMIN: ADD PLACE DIRECTLY
   ===================================================== */
export const addPlaceFromAPI = async (req, res) => {
  try {
    const { name, category, address, location, counters } = req.body;

    if (!name || !location?.lat || !location?.lng) {
      return res.status(400).json({ message: "Invalid data" });
    }

    await Place.create({
      externalPlaceId: `admin-api-${Date.now()}`,
      name,
      category,
      address,
      location,
      counters,
      metadata: { source: "admin-api" }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("ADD API PLACE ERROR:", err);
    res.status(500).json({ error: "Failed to add place" });
  }
};

/* =====================================================
   ADMIN: MANUAL ADD
   ===================================================== */
export const addPlaceManually = async (req, res) => {
  try {
    const { name, category, address, lat, lng, counters } = req.body;

    if (!name || !lat || !lng) {
      return res.status(400).json({ message: "Invalid data" });
    }

    await Place.create({
      externalPlaceId: `manual-${Date.now()}`,
      name,
      category,
      address,
      location: { lat, lng },
      counters: buildCounters(counters),
      metadata: { source: "admin-manual" }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("MANUAL ADD ERROR:", err);
    res.status(500).json({ error: "Failed to add place" });
  }
};

/* =====================================================
   USER → ADD PENDING
   ===================================================== */
export const addPendingPlace = async (req, res) => {
  try {
    const { name, category, address, location, counters, source } = req.body;

    if (!name || !location?.lat || !location?.lng) {
      return res.status(400).json({ message: "Invalid data" });
    }

    await PendingPlace.create({
      name,
      category,
      address,
      location,
      counters: buildCounters(counters),
      source: source || "user-map",
      createdAt: new Date()
    });

    res.json({ success: true });
  } catch (err) {
    console.error("ADD PENDING ERROR:", err);
    res.status(500).json({ error: "Failed to add pending place" });
  }
};

/* =====================================================
   ADMIN: VIEW PENDING
   ===================================================== */
export const getPendingPlaces = async (req, res) => {
  const data = await PendingPlace.find().sort({ createdAt: -1 });
  res.json(data);
};

/* =====================================================
   UPDATE PENDING (ADMIN EDIT)
   ===================================================== */
export const updatePendingPlace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, address, location, counters } = req.body;

    const pending = await PendingPlace.findById(id);
    if (!pending) {
      return res.status(404).json({ message: "Pending place not found" });
    }

    pending.name = name ?? pending.name;
    pending.category = category ?? pending.category;
    pending.address = address ?? pending.address;
    pending.location = location ?? pending.location;

    if (Array.isArray(counters) && counters.length > 0) {
      pending.counters = counters;
    }

    await pending.save();
    res.json({ success: true, pending });
  } catch (err) {
    console.error("UPDATE PENDING ERROR:", err);
    res.status(500).json({ error: "Failed to update pending place" });
  }
};

/* =====================================================
   ADMIN: APPROVE (NORMAL)
   ===================================================== */
export const approvePlace = async (req, res) => {
  const pending = await PendingPlace.findById(req.params.id);
  if (!pending) return res.status(404).json({ message: "Not found" });

  await Place.create({
    externalPlaceId: `pending-${pending._id}`,
    name: pending.name,
    category: pending.category,
    address: pending.address,
    location: pending.location,
    counters: pending.counters,
    metadata: { source: pending.source, approvedAt: new Date() }
  });

  await PendingPlace.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

/* =====================================================
   ADMIN: REJECT
   ===================================================== */
export const rejectPlace = async (req, res) => {
  await PendingPlace.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

/* =====================================================
   DB PLACES
   ===================================================== */
export const getAllPlaces = async (req, res) => {
  try {
    const places = await Place.find().sort({ createdAt: -1 });
    res.json(places);
  } catch {
    res.status(500).json({ message: "Failed to fetch places" });
  }
};

export const updatePlaceByAdmin = async (req, res) => {
  try {
    const updated = await Place.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch {
    res.status(500).json({ message: "Failed to update place" });
  }
};

/* =====================================================
   🔥 FIXED: APPROVE EDITED PENDING
   ===================================================== */
export const approveEditedPendingPlace = async (req, res) => {
  try {
    const { id } = req.params;
    const editedData = { ...req.body };

    const pending = await PendingPlace.findById(id);
    if (!pending) {
      return res.status(404).json({ message: "Pending place not found" });
    }

    /* 🔥 REQUIRED FIELD */
    editedData.externalPlaceId =
      editedData.externalPlaceId ||
      `pending-edited-${pending._id}`;

    /* CLEAN Mongo fields */
    delete editedData._id;
    delete editedData.__v;

    await Place.create({
      ...editedData,
      metadata: {
        source: "pending-edited",
        approvedAt: new Date()
      }
    });

    await PendingPlace.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error("Approve edited failed:", err);
    res.status(500).json({ error: err.message });
  }
};


/* ================= DELETE DB PLACE (ADMIN) ================= */
export const deletePlaceByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Place.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE PLACE ERROR:", err);
    res.status(500).json({ message: "Failed to delete place" });
  }
};

/* =====================================================
   STAFF REQUEST MANAGEMENT
   ===================================================== */

// 1. Get Pending Requests (Support both legacy Pending and new Applied)
export const getPendingStaffRequests = async (req, res) => {
  try {
    console.log("🔍 [ADMIN] Fetching pending staff requests...");
    const requests = await Staff.find({ status: { $in: ["pending", "applied"] } })
      .select("-password")
      .populate("application.placeId", "name address") // Fill place details if applied
      .sort({ createdAt: -1 });

    console.log(`✅ [ADMIN] Found ${requests.length} staff requests`);
    res.json(requests);
  } catch (err) {
    console.error("FETCH STAFF REQUESTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// 2. Approve Request
export const approveStaffRequest = async (req, res) => {
  try {
    const { id } = req.params; // Staff ID

    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: "Request not found" });

    if (staff.status === "active") {
      return res.status(400).json({ message: "Staff already active" });
    }

    // CASE A: NEW APPLICATION FLOW (Link to existing place)
    if (staff.status === "applied" && staff.application?.placeId) {
      console.log(`✅ [APPROVE STAFF] Processing APPLIED staff: ${staff.username}`);
      staff.status = "active";
      staff.placeId = staff.application.placeId;
      staff.application = undefined; // Clear application
      await staff.save();
      return res.json({ success: true, staff });
    }

    console.log(`✅ [APPROVE STAFF] Processing LEGACY staff: ${staff.username}`);
    // Only if requestDetails exists
    const { placeName, address, counters } = staff.requestDetails || {};

    if (!placeName && !staff.application?.placeId) {
      return res.status(400).json({ message: "No place application found" });
    }

    // Create the Place (Legacy)
    const newPlace = await Place.create({
      externalPlaceId: `staff-request-${staff._id}`,
      name: placeName,
      address: address,
      category: "General",
      location: { lat: 0, lng: 0 },
      counters: buildCounters(counters),
      metadata: { source: "staff-request", approvedAt: new Date(), createdByStaff: staff._id }
    });

    // Update Staff
    staff.status = "active";
    staff.placeId = newPlace._id;
    staff.requestDetails = undefined;
    await staff.save();

    res.json({ success: true, place: newPlace, staff });

  } catch (err) {
    console.error("APPROVE STAFF ERROR:", err);
    res.status(500).json({ message: "Failed to approve request" });
  }
};

// 3. Reject Request (Reset to unassigned)
export const rejectStaffRequest = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🚫 [REJECT STAFF] Rejecting request for ID: ${id}`);
    const staff = await Staff.findById(id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    staff.status = "unassigned";
    staff.application = undefined;
    staff.requestDetails = undefined;
    await staff.save();

    console.log(`✅ [REJECT STAFF] Staff ${staff.username} reset to unassigned`);
    res.json({ success: true, message: "Request rejected and staff reset to unassigned" });
  } catch (err) {
    console.error("REJECT STAFF ERROR:", err);
    res.status(500).json({ message: "Failed to reject request" });
  }
};
