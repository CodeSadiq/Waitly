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
    const { placeId, counterIndex, userName } = req.body;

    if (!placeId || counterIndex === undefined || !userName) {
      return res.status(400).json({
        message: "placeId, counterIndex and userName are required"
      });
    }

    const place = await Place.findById(placeId);
    if (!place) return res.status(404).json({ message: "Place not found" });

    const counter = place.counters[counterIndex];
    if (!counter) return res.status(400).json({ message: "Invalid counter" });

    const token = await Token.create({
      place: place._id,
      counterName: counter.name,

      // 🔥 BOOKING NAME (FROM FORM)
      userName: userName,

      user: req.user._id,
      tokenCode: generateTokenCode(),
      status: "Waiting"
    });

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
      status: "Waiting",
      createdAt: { $lt: token.createdAt }
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
      estimatedWait: Math.round(peopleAhead * avgTime)
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
        { status: "Completed", createdAt: { $gte: today } }
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
            status: "Waiting",
            createdAt: { $lt: token.createdAt }
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
          estimatedWait
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

export default router;
