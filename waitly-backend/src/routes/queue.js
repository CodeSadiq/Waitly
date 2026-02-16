import express from "express";
import Token from "../models/Token.js";
import Place from "../models/Place.js";
import { generateTokenCode } from "../utils/generateToken.js";
import { verifyUser } from "../middleware/authMiddleware.js";
import { io } from "../server.js";
import { getRealAverageTime, getQueueMetrics, getCrowdMetrics } from "../utils/queueLogic.js";

const router = express.Router();


/* =====================================================
   AVAILABLE SLOTS (HYBRID 70/30 SPLIT)
   ===================================================== */
router.get("/available-slots", async (req, res) => {
  try {
    const { placeId, counterIndex, date, categoryId = "general" } = req.query; // date in YYYY-MM-DD

    if (!placeId || counterIndex === undefined || !date) {
      return res.status(400).json({ message: "placeId, counterIndex, and date required" });
    }

    const place = await Place.findById(placeId);
    if (!place) return res.status(404).json({ message: "Place not found" });

    const counter = place.counters[counterIndex];
    if (!counter) return res.status(404).json({ message: "Invalid counter" });

    // 1. Get Operating Hours
    const openingTime = counter.openingTime || "09:00";
    const closingTime = counter.closingTime || "17:00";
    const lunchStart = counter.lunchStart || "13:00";
    const lunchEnd = counter.lunchEnd || "14:00";

    // 2. Calculate Avg Time (Hybrid)
    const avgTime = await getRealAverageTime(placeId, counter.name, categoryId);

    // 3. Define Timings
    const startOfDay = new Date(date);
    const [openH, openM] = openingTime.split(":").map(Number);
    startOfDay.setHours(openH, openM, 0, 0);

    const endOfDay = new Date(date);
    const [closeH, closeM] = closingTime.split(":").map(Number);
    endOfDay.setHours(closeH, closeM, 0, 0);

    // Lunch Window
    const lunchS = new Date(date);
    const [lsH, lsM] = lunchStart.split(":").map(Number);
    lunchS.setHours(lsH, lsM, 0, 0);

    const lunchE = new Date(date);
    const [leH, leM] = lunchEnd.split(":").map(Number);
    lunchE.setHours(leH, leM, 0, 0);

    // 4. Fetch Existing Slots
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const bookedTokens = await Token.find({
      place: placeId,
      counterName: counter.name,
      scheduledTime: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ["Cancelled", "Skipped"] }
    }).select("scheduledTime");

    const bookedTimes = bookedTokens.map(t => new Date(t.scheduledTime).getTime());

    // 5. Generate Slots (70% Expose Logic)
    // We strictly generate time blocks based on avgTime.
    // E.g. 9:00, 9:10, 9:20...
    // But we only expose 70% of capacity? 
    // Implementation: In this strict slot system, we can just expose ALL calculated slots,
    // but reserving timestamps for walk-ins happens implicitly by the "Hybrid Serving Rule" 
    // OR we explicitly skip some slots here.
    //
    // Let's go with EXPLICIT SKIPPING for true Hybrid feel.
    // Every 3rd slot is hidden (reserved for walk-in catchup)?

    const slots = [];
    let currentTime = new Date(startOfDay);
    let slotCount = 0;

    while (currentTime < endOfDay) {
      // Skip Lunch
      if (currentTime >= lunchS && currentTime < lunchE) {
        currentTime.setMinutes(currentTime.getMinutes() + avgTime);
        continue;
      }

      // Past check
      if (currentTime.getTime() <= Date.now()) {
        currentTime.setMinutes(currentTime.getMinutes() + avgTime);
        continue;
      }

      slotCount++;

      // 🎯 70/30 Logic: Skip every 3rd slot to leave buffer?
      // 1 (Show), 2 (Show), 3 (Hide/Walk-in), 4 (Show)...
      const isWalkInBuffer = (slotCount % 3 === 0);

      if (!isWalkInBuffer) {
        const timeMs = currentTime.getTime();

        // Check Booked
        // Since we use strict blocks, exact match is enough?
        // Or safer window check.
        const isBooked = bookedTimes.some(bt => Math.abs(bt - timeMs) < (avgTime * 60000 / 2));

        if (!isBooked) {
          slots.push(currentTime.toISOString());
        }
      }

      currentTime.setMinutes(currentTime.getMinutes() + avgTime);
    }

    res.json({ slots, openingTime, closingTime, avgTime });

  } catch (err) {
    console.error("SLOTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch slots" });
  }
});

/* =====================================================
   JOIN QUEUE (Walk-in or Slot)
   ===================================================== */
router.post("/join", verifyUser, async (req, res) => {
  try {
    const { placeId, counterIndex, userName, scheduledTime, timeSlotLabel, categoryId = "general" } = req.body;

    if (!placeId || counterIndex === undefined || !userName) {
      return res.status(400).json({
        message: "placeId, counterIndex and userName are required"
      });
    }

    const place = await Place.findById(placeId);
    if (!place) return res.status(404).json({ message: "Place not found" });

    const counter = place.counters[counterIndex];
    if (!counter) return res.status(400).json({ message: "Invalid counter" });

    if (counter.isClosed) {
      return res.status(400).json({ message: "Counter is currently closed for new tokens." });
    }

    // Constraint removed: Users can now book multiple tickets for the same counter

    const tokenData = {
      place: place._id,
      counterName: counter.name,
      userName: userName,
      user: req.user._id,
      tokenCode: generateTokenCode(),
      status: "Waiting",
      category: categoryId,
      verifiedAt: new Date(), // Auto-verify on join for now
      type: scheduledTime ? "Slot" : "Walk-in"
    };

    // Add optional scheduling details
    if (scheduledTime) tokenData.scheduledTime = new Date(scheduledTime);
    if (timeSlotLabel) tokenData.timeSlotLabel = timeSlotLabel;

    const token = await Token.create(tokenData);

    io.emit("token-updated");

    res.json({
      tokenId: token._id,
      tokenCode: token.tokenCode
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to join queue" });
  }
});

/* =====================================================
   STATS (PRE-JOIN) + CROWD DENSITY
   ===================================================== */
router.get("/stats", async (req, res) => {
  try {
    const { placeId, counterIndex } = req.query;

    if (!placeId || counterIndex === undefined) {
      return res.status(400).json({ message: "placeId and counterIndex required" });
    }

    const place = await Place.findById(placeId);
    if (!place) return res.status(404).json({ message: "Place not found" });

    const counter = place.counters[counterIndex];
    if (!counter) return res.status(400).json({ message: "Invalid counter" });

    // Use SIMULATION for accurate stats
    const metrics = await getQueueMetrics(placeId, counter.name, null);

    res.json({
      peopleAhead: metrics.peopleAhead,
      estimatedWait: metrics.estimatedWait,
      crowdLevel: metrics.crowdLevel // 🔥 SENT TO FRONTEND
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

/* =====================================================
   SINGLE TICKET DETAILS
   ===================================================== */
router.get("/ticket/:tokenId", async (req, res) => {
  try {
    const token = await Token.findById(req.params.tokenId)
      .populate("place", "name address");

    if (!token) return res.status(404).json({ message: "Ticket not found" });

    // Auto-Check Expiration for Response
    if (token.status === "Waiting" && token.scheduledTime) {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
      if (new Date(token.scheduledTime) < thirtyMinsAgo) {
        token.status = "Expired";
      }
    }

    let peopleAhead = 0;
    let estimatedWait = 0;
    let crowdLevel = "Unknown";

    if (token.status === "Waiting") {
      const metrics = await getQueueMetrics(token.place._id, token.counterName, token._id);
      peopleAhead = metrics.peopleAhead;
      estimatedWait = metrics.estimatedWait;
      crowdLevel = metrics.crowdLevel;
    }

    res.json({
      _id: token._id,
      tokenCode: token.tokenCode,
      userName: token.userName,
      counterName: token.counterName,
      status: token.status,
      createdAt: token.createdAt,
      place: token.place,
      peopleAhead,
      estimatedWait,
      crowdLevel,
      timeSlotLabel: token.timeSlotLabel
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
});

/* =====================================================
   🔥 MY ACTIVE TICKETS (WAITING ONLY)
   ===================================================== */
router.get("/my-tickets", verifyUser, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tokens = await Token.find({
      user: req.user._id,
      $or: [
        { status: { $in: ["Waiting", "Serving"] } },
        { status: { $in: ["Completed", "Cancelled", "Skipped", "Expired"] }, $or: [{ createdAt: { $gte: today } }, { completedAt: { $gte: today } }] }
      ]
    })
      .populate("place", "name address")
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      tokens.map(async (token) => {
        // Auto-Check Expiration
        if (token.status === "Waiting" && token.scheduledTime) {
          const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
          if (new Date(token.scheduledTime) < thirtyMinsAgo) {
            token.status = "Expired";
          }
        }

        let peopleAhead = 0;
        let estimatedWait = 0;

        if (token.status === "Waiting") {
          const metrics = await getQueueMetrics(token.place._id, token.counterName, token._id);
          peopleAhead = metrics.peopleAhead;
          estimatedWait = metrics.estimatedWait;
        }

        return {
          _id: token._id,
          tokenCode: token.tokenCode,
          userName: token.userName,
          counterName: token.counterName,
          status: token.status,
          createdAt: token.createdAt,
          place: token.place,
          peopleAhead,
          estimatedWait,
          timeSlotLabel: token.timeSlotLabel,
          scheduledTime: token.scheduledTime,
          completedAt: token.completedAt
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
});

/* =====================================================
   🎯 MY TICKET HISTORY
   ===================================================== */
router.get("/ticket-history", verifyUser, async (req, res) => {
  const tickets = await Token.find({
    user: req.user._id,
    status: { $in: ["Completed", "Skipped", "Expired", "Cancelled"] }
  })
    .populate("place", "name address")
    .sort({ completedAt: -1, createdAt: -1 });

  res.json(tickets);
});

/* =====================================================
   ❌ CANCEL TICKET
   ===================================================== */
router.put("/cancel/:id", verifyUser, async (req, res) => {
  try {
    const token = await Token.findOne({ _id: req.params.id, user: req.user._id });
    if (!token) return res.status(404).json({ message: "Ticket not found" });

    if (token.status !== "Waiting") {
      return res.status(400).json({ message: "Cannot cancel a ticket that is not waiting" });
    }

    token.status = "Cancelled";
    token.completedAt = new Date();
    await token.save();

    io.emit("token-updated");

    res.json({ success: true, message: "Ticket cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel ticket" });
  }
});

/* =====================================================
   🗑 DELETE TICKET
   ===================================================== */
router.delete("/delete/:id", verifyUser, async (req, res) => {
  try {
    const token = await Token.findOne({ _id: req.params.id, user: req.user._id });
    if (!token) return res.status(404).json({ message: "Ticket not found" });

    // Allow deleting if it's Completed, Cancelled, or Skipped
    if (["Waiting", "Serving"].includes(token.status)) {
      return res.status(400).json({ message: "Cannot delete an active ticket. Cancel it first." });
    }

    await Token.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: "Ticket deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete ticket" });
  }
});

export default router;
