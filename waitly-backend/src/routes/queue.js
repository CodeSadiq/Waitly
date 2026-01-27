import express from "express";
import Token from "../models/Token.js";
import Place from "../models/Place.js";
import { generateTokenCode } from "../utils/generateToken.js";
import { verifyUser } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();

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

    // Calculate Avg Time (Simulated or Real)
    const completed = await Token.aggregate([
      {
        $match: {
          place: place._id,
          counterName: counter.name,
          status: "Completed",
          serviceDuration: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$serviceDuration" }
        }
      }
    ]);

    const avgTime = completed[0]?.avgTime || 5;
    const estimatedWait = Math.round(peopleAhead * avgTime);

    res.json({
      peopleAhead,
      estimatedWait
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

    const peopleAhead = await Token.countDocuments({
      place: token.place._id,
      counterName: token.counterName,
      _id: { $ne: token._id },
      $or: [
        { status: "Waiting", createdAt: { $lt: token.createdAt } },
        { status: "Serving" }
      ]
    });

    const completed = await Token.aggregate([
      {
        $match: {
          place: token.place._id,
          counterName: token.counterName,
          status: "Completed",
          serviceDuration: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$serviceDuration" }
        }
      }
    ]);

    const avgTime = completed[0]?.avgTime || 5;

    res.json({
      _id: token._id,
      tokenCode: token.tokenCode,
      userName: token.userName,
      counterName: token.counterName,
      status: token.status,
      createdAt: token.createdAt,
      place: token.place,
      peopleAhead,
      estimatedWait: Math.round(peopleAhead * avgTime),
      timeSlotLabel: token.timeSlotLabel // ✨ Added this field
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
        { status: { $in: ["Completed", "Cancelled", "Skipped"] }, createdAt: { $gte: today } }
      ]
    })
      .populate("place", "name address")
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      tokens.map(async (token) => {
        let peopleAhead = 0;
        let estimatedWait = 0;

        if (token.status === "Waiting") {
          peopleAhead = await Token.countDocuments({
            place: token.place._id,
            counterName: token.counterName,
            _id: { $ne: token._id },
            $or: [
              { status: "Waiting", createdAt: { $lt: token.createdAt } },
              { status: "Serving" }
            ]
          });
          estimatedWait = peopleAhead * 5;
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
          timeSlotLabel: token.timeSlotLabel // ✨ Added this field
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
    status: { $in: ["Completed", "Skipped"] }
  })
    .populate("place", "name address")
    .sort({ completedAt: -1 });

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
