import Place from "../models/Place.js";
import PendingPlace from "../models/PendingPlace.js";

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
export const fetchFromOSM = async (req, res) => {
  try {
    const { category, lat, lng } = req.body;

    const overpassQuery = `
      [out:json];
      node
        ["amenity"="${category}"]
        (around:20000,${lat},${lng});
      out body 15;
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

    if (overpassText.startsWith("<")) {
      console.error("Overpass returned non-JSON:", overpassText.slice(0, 200));
      return res.status(502).json({ error: "OSM Overpass error" });
    }

    const overpassData = JSON.parse(overpassText);

    const normalized = [];

    for (const p of overpassData.elements) {
      let address = "";

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
        name: p.tags?.name || category,
        lat: p.lat,
        lng: p.lon,
        address,
        source: "osm"
      });

      // 🔥 polite delay to avoid rate limit
      await new Promise((r) => setTimeout(r, 350));
    }

    res.json(normalized);
  } catch (err) {
    console.error("OSM ERROR:", err);
    res.status(500).json({ error: "Failed to fetch from OSM" });
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
