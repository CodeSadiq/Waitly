import express from "express";
import Token from "../models/Token.js";
import Place from "../models/Place.js";
import { generateTokenCode } from "../utils/generateToken.js";
import { verifyUser } from "../middleware/authMiddleware.js";
import { io } from "../server.js";
import { getRealAverageTime, getQueueMetrics } from "../utils/queueLogic.js";

const router = express.Router();


/* =====================================================
   AVAILABLE SLOTS
   ===================================================== */
router.get("/available-slots", async (req, res) => {
  try {
    const { placeId, counterIndex, date } = req.query; // date in YYYY-MM-DD

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

    // 2. Calculate Dynamic Average Service Time (Real-time data)
    const realAvgTime = await getRealAverageTime(placeId, counter.name, counter.queueWait.avgTime || 5);

    // 3. Calculate Walk-in Backlog
    const walkInCount = await Token.countDocuments({
      place: placeId,
      counterName: counter.name,
      status: "Waiting",
      scheduledTime: null
    });

    const backlogMinutes = walkInCount * realAvgTime;

    // 4. Determine Start Time (Earliest possible slot)
    const [openHour, openMin] = openingTime.split(":").map(Number);

    let baseStart = new Date(date);
    baseStart.setHours(openHour, openMin + backlogMinutes, 0, 0);

    const now = new Date();
    if (new Date(date).toDateString() === now.toDateString()) {
      baseStart = baseStart > now ? baseStart : now;
    }

    // Round up to next 5 minutes
    const remainder = 5 - (baseStart.getMinutes() % 5);
    baseStart.setMinutes(baseStart.getMinutes() + remainder);

    // 5. Fetch Existing Booked Slots for this Date
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const bookedTokens = await Token.find({
      place: placeId,
      counterName: counter.name,
      scheduledTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["Cancelled", "Skipped"] }
    }).select("scheduledTime");

    const bookedTimes = bookedTokens.map(t => new Date(t.scheduledTime).getTime());

    // 6. Generate Valid Slots
    const [closeHour, closeMin] = closingTime.split(":").map(Number);
    const closeDate = new Date(date);
    closeDate.setHours(closeHour, closeMin, 0, 0);

    const slots = [];
    // Candidate step is 5 mins (granular choice for users)
    // But buffer protection is `realAvgTime`
    let currentTime = new Date(baseStart);

    while (currentTime < closeDate) {
      const candidateTime = currentTime.getTime();

      // Prevent booking in the past
      if (candidateTime <= Date.now()) {
        currentTime.setMinutes(currentTime.getMinutes() + 5);
        continue;
      }

      let isBlocked = false;

      // Collision Check: blocked if within +/- AvgTime of ANY booked slot
      // Formula: |Candidate - Booked| < AvgTime
      // Example: Booked 9:00, Avg 10. 
      // 8:55 (Diff 5) -> Blocked. 9:05 (Diff 5) -> Blocked. 9:10 (Diff 10) -> OK.

      for (let booked of bookedTimes) {
        const diffMins = Math.abs(candidateTime - booked) / 60000;
        // Strict collision: we cannot overlap with the service window
        if (diffMins < realAvgTime) {
          isBlocked = true;
          break;
        }
      }

      if (!isBlocked) {
        slots.push(currentTime.toISOString());
      }

      // Next candidate in 5 mins
      currentTime.setMinutes(currentTime.getMinutes() + 5);
    }

    res.json({ slots, openingTime, closingTime, backlogMinutes, avgTime: realAvgTime });

  } catch (err) {
    console.error("SLOTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch slots" });
  }
});

/* =====================================================
   JOIN QUEUE (LOGIN REQUIRED)
   ===================================================== */
router.post("/join", verifyUser, async (req, res) => {
  try {
    const { placeId, counterIndex, userName, scheduledTime, timeSlotLabel } = req.body;

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

    const tokenData = {
      place: place._id,
      counterName: counter.name,
      userName: userName,
      user: req.user._id,
      tokenCode: generateTokenCode(),
      status: "Waiting"
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

// Local helpers moved to ../utils/queueLogic.js for shared use.

/* =====================================================
   PRE-JOIN STATS (No Token Needed)
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

    // Count people ahead (Waiting + Serving)
    const peopleAhead = await Token.countDocuments({
      place: place._id,
      counterName: counter.name,
      $or: [
        { status: "Waiting" },
        { status: "Serving" }
      ]
    });

    // Use SIMULATION for accurate stats
    // For Stats (New Walk-in), we want to know how many people are ahead of the END of the line.
    // So we assume the target is "The Last Walk-in".
    const metrics = await getQueueMetrics(placeId, counter.name, null);

    res.json({
      peopleAhead: metrics.peopleAhead,
      estimatedWait: metrics.estimatedWait
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

    if (token.status === "Waiting") {
      const metrics = await getQueueMetrics(token.place._id, token.counterName, token._id);
      peopleAhead = metrics.peopleAhead;
      estimatedWait = metrics.estimatedWait;
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
        // Auto-Check Expiration for Response (so user sees it immediately)
        if (token.status === "Waiting" && token.scheduledTime) {
          const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
          if (new Date(token.scheduledTime) < thirtyMinsAgo) {
            token.status = "Expired";
            // DB will be updated by getQueueMetrics or next check, 
            // but we assume it's effectively expired now.
          }
        }

        let peopleAhead = 0;
        let estimatedWait = 0;

        if (token.status === "Waiting") {
          const metrics = await getQueueMetrics(token.place._id, token.counterName, token._id);
          peopleAhead = metrics.peopleAhead;
          estimatedWait = metrics.estimatedWait;
        } else if (token.status === "Serving") {
          peopleAhead = 0;
          estimatedWait = 0;
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
   ❌ CANCEL TICKET (User cancels their own ticket)
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

    io.emit("token-updated"); // Notify staff/others

    res.json({ success: true, message: "Ticket cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel ticket" });
  }
});

/* =====================================================
   🗑 DELETE TICKET (Remove from dashboard/history)
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
