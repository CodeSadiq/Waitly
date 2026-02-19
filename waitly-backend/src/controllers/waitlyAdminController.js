import Place from "../models/Place.js";
import PendingPlace from "../models/PendingPlace.js";
import Staff from "../models/Staff.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import { io } from "../server.js";

/* =====================================================
   ADMIN: GET OVERVIEW STATS
   ===================================================== */
export const getAdminStats = async (req, res) => {
  try {
    const [userCount, staffCount, placeCount, pendingCount, staffRequestCount] = await Promise.all([
      User.countDocuments(),
      Staff.countDocuments({ status: 'active' }),
      Place.countDocuments(),
      PendingPlace.countDocuments(),
      Staff.countDocuments({ status: { $in: ["pending", "applied"] } })
    ]);

    res.json({
      users: userCount,
      activeStaff: staffCount,
      places: placeCount,
      pendingPlaces: pendingCount,
      staffRequests: staffRequestCount
    });
  } catch (err) {
    console.error("STATS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

/* =====================================================
   HELPER: BUILD COUNTERS (DB-SAFE FORMAT)
   ===================================================== */
const buildCounters = (counterNames = [], enabled = false) => {
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
      enabled: enabled,
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
  try {
    // 1. Fetch user-submitted pending places (Legacy PendingPlace model)
    const legacyPending = await PendingPlace.find().lean();

    // 2. Fetch staff-proposed pending places (Place model with status='pending')
    const staffPending = await Place.find({ status: 'pending' })
      .populate('createdBy', 'username email') // Get staff details
      .lean();

    // 3. Normalize structure for frontend
    const merged = [
      ...legacyPending.map(p => ({ ...p, type: 'user_submission' })),
      ...staffPending.map(p => ({
        ...p,
        _id: p._id, // Keep original ID
        source: p.metadata?.source || 'staff_proposed',
        submittedBy: p.createdBy, // Attach staff info
        type: 'staff_proposal'
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(merged);
  } catch (err) {
    console.error("GET PENDING ERROR:", err);
    res.status(500).json({ message: "Failed to fetch pending places" });
  }
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
  const { id } = req.params;

  // 1. Try finding in legacy PendingPlace
  const legacyPending = await PendingPlace.findById(id);
  if (legacyPending) {
    await Place.create({
      externalPlaceId: `pending-${legacyPending._id}`,
      name: legacyPending.name,
      category: legacyPending.category,
      address: legacyPending.address,
      location: legacyPending.location,
      counters: legacyPending.counters,
      metadata: { source: legacyPending.source, approvedAt: new Date() }
    });
    await PendingPlace.findByIdAndDelete(id);
    return res.json({ success: true, type: 'legacy' });
  }

  // 2. Try finding in Place (Staff Proposed)
  const staffPending = await Place.findOne({ _id: id, status: 'pending' });
  if (staffPending) {
    staffPending.status = 'active';
    if (staffPending.metadata) staffPending.metadata.approvedAt = new Date();
    await staffPending.save();
    return res.json({ success: true, type: 'staff_proposed' });
  }

  return res.status(404).json({ message: "Pending place not found" });
};

/* =====================================================
   ADMIN: REJECT
   ===================================================== */
export const rejectPlace = async (req, res) => {
  const { id } = req.params;

  const legacyPending = await PendingPlace.findByIdAndDelete(id);
  if (legacyPending) return res.json({ success: true });

  const staffPending = await Place.findOneAndDelete({ _id: id, status: 'pending' });
  if (staffPending) return res.json({ success: true });

  return res.status(404).json({ message: "Pending place not found" });
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

/* =====================================================
   DB USERS
   ===================================================== */
/* =====================================================
   DB USERS (Unified View)
   ===================================================== */
export const getAllUsers = async (req, res) => {
  try {
    const [users, staff, admins] = await Promise.all([
      User.find().select("-password -__v").lean(),
      Staff.find().select("-password -__v").lean(),
      Admin.find().select("-password -__v").lean()
    ]);

    const usersMap = new Map();

    // 1. Add all Users (Master)
    users.forEach(u => usersMap.set(u.email, { ...u, _source: 'User' }));

    // 2. Merge Staff (if not present or if standalone)
    staff.forEach(s => {
      if (!usersMap.has(s.email)) {
        usersMap.set(s.email, { ...s, role: 'staff', _source: 'Staff' });
      } else {
        // Enforce role consistency if User exists
        usersMap.get(s.email).role = 'staff';
      }
    });

    // 3. Merge Admins
    admins.forEach(a => {
      if (!usersMap.has(a.email)) {
        usersMap.set(a.email, { ...a, role: 'admin', _source: 'Admin' });
      } else {
        usersMap.get(a.email).role = 'admin';
      }
    });

    res.json(Array.from(usersMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, username, email } = req.body;

    // Try finding in all collections
    let user = await User.findById(id);
    let collection = 'User';

    if (!user) {
      user = await Staff.findById(id);
      collection = 'Staff';
    }
    if (!user) {
      user = await Admin.findById(id);
      collection = 'Admin';
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    // Handle Role Change (Migration)
    // If collection matches target role, just update.
    // If not, we might need to migrate (complex). 
    // For now, simpler logic: Update fields if collection matches role logic.
    // Or if role changed, simply update the 'User' record if it exists, or convert?

    // Simplest approach for "working" state:
    // If updating a 'Staff' source to 'User' role, we should create a User record.

    if (collection === 'Staff' && role === 'user') {
      // Migrate Staff -> User
      await User.create({ username: username || user.username, email: email || user.email, password: user.password, role: 'user' });
      await Staff.findByIdAndDelete(id);
      return res.json({ success: true, message: "Migrated Staff to User" });
    }

    // Default: update fields in current collection
    if (collection === 'User') {
      await User.findByIdAndUpdate(id, { role, username, email });
    } else if (collection === 'Staff') {
      await Staff.findByIdAndUpdate(id, { username, email });
    } else if (collection === 'Admin') {
      await Admin.findByIdAndUpdate(id, { username, email });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};

export const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    // Attempt delete on all
    await Promise.all([
      User.findByIdAndDelete(id),
      Staff.findByIdAndDelete(id),
      Admin.findByIdAndDelete(id)
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
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
/* ================= DELETE DB PLACE (ADMIN) ================= */
export const deletePlaceByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑 [ADMIN] Deleting place with ID: ${id}`);

    const deleted = await Place.findByIdAndDelete(id);

    if (!deleted) {
      console.warn(`⚠️ [ADMIN] Place not found for deletion: ${id}`);
      return res.status(404).json({ message: "Place not found" });
    }

    console.log(`✅ [ADMIN] Place deleted successfully: ${id}`);
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

      const targetPlaceId = staff.application.placeId._id || staff.application.placeId;

      /* ===================================================
         🔥 FIX: AUTO-ENABLE QUEUES FOR THIS PLACE
         So users can see "Join Queue" immediately
         =================================================== */
      try {
        const placeDoc = await Place.findById(targetPlaceId);
        if (placeDoc) {
          // Get counters from application
          const requestCounters = staff.application.counterName
            ? staff.application.counterName.split(',').map(c => c.trim()).filter(c => c)
            : ["General"];

          if (!placeDoc.counters || placeDoc.counters.length === 0) {
            // Use helper to create default from request
            placeDoc.counters = buildCounters(requestCounters, true);
          } else {
            // 1. Remove default 'General' if we are adding specific counters
            if (requestCounters.length > 0 && placeDoc.counters.length === 1 && placeDoc.counters[0].name === "General") {
              placeDoc.counters = [];
            }

            // 2. Add requested counters if they don't exist
            requestCounters.forEach(rc => {
              const exists = placeDoc.counters.some(c => c.name.toLowerCase() === rc.toLowerCase());
              if (!exists) {
                placeDoc.counters.push({
                  name: rc,
                  queueWait: { enabled: true, estimatedWait: 10, manualOverride: false },
                  currentCrowdLevel: "Low",
                  status: "open",
                  servedCount: 0
                });
              }
            });

            // 2. Enable all existing counters
            placeDoc.counters.forEach((c) => {
              if (c.queueWait) c.queueWait.enabled = true;
            });
          }
          await placeDoc.save();
          console.log(`✅ [APPROVE STAFF] Queues auto-enabled for place: ${targetPlaceId}`);

          // 🔥 Notify Frontend
          if (io) {
            io.emit("wait-updated", {
              placeId: placeDoc._id,
              counters: placeDoc.counters
            });
          }
        }
      } catch (err) {
        console.error("⚠️ Failed to auto-enable queues:", err);
      }

      staff.status = "active";
      staff.placeId = targetPlaceId;
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
      counters: buildCounters(counters, true), // 🔥 Auto-enable queues for staff requests
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
