import Place from "../models/Place.js";
import { io } from "../server.js"; // 🔹 socket instance

export const updateWaitTime = async (req, res) => {
  try {
    const { placeId, counter, waitTime } = req.body;

    if (!placeId || !counter || !waitTime) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const place = await Place.findById(placeId);
    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    /* ===============================
       🔹 NORMALIZE COUNTER NAMES
       =============================== */
    const normalize = (str) =>
      String(str).toLowerCase().replace(/\s+/g, "").trim();

    const targetCounter = place.counters.find(
      (c) => normalize(c.name) === normalize(counter)
    );

    if (!targetCounter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    /* ===============================
       🔢 CALCULATE NEW AVERAGE
       =============================== */
    const oldAvg = targetCounter.normalWait.avgTime || 0;
    const oldCount = targetCounter.normalWait.reportsCount || 0;

    const newCount = oldCount + 1;
    const newAvg =
      (oldAvg * oldCount + Number(waitTime)) / newCount;

    targetCounter.normalWait.avgTime = Math.round(newAvg);
    targetCounter.normalWait.reportsCount = newCount;
    targetCounter.normalWait.lastUpdated = new Date();

    /* ===============================
       💾 SAVE
       =============================== */
    await place.save();

    /* ===============================
       🔥 REAL-TIME SOCKET EMIT (FIXED)
       =============================== */
    io.emit("wait-updated", {
      placeId: place._id.toString(),
      counters: place.counters   // ✅ FULL ARRAY (CRITICAL FIX)
    });

    /* ===============================
       ✅ API RESPONSE
       =============================== */
    res.json({ 
      success: true,
      placeId: place._id.toString(),
      counters: place.counters
    });

  } catch (err) {
    console.error("WAIT UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update wait time" });
  }
};
