import express from "express";
import Place from "../models/Place.js";
import Staff from "../models/Staff.js";
import Token from "../models/Token.js";
import { verifyStaff } from "../middleware/authMiddleware.js";
import { getNextTicket } from "../utils/queueLogic.js";
import { io } from "../server.js";

const router = express.Router();


/* =====================================================
   SEARCH PLACES (FOR APPLICATION)
   ===================================================== */
router.get("/places/search", verifyStaff, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const places = await Place.find({
            name: { $regex: q, $options: "i" }
        }).select("name address category location counters");

        res.json(places);
    } catch (err) {
        console.error("SEARCH ERROR:", err);
        res.status(500).json({ message: "Search failed" });
    }
});

/* =====================================================
   APPLY FOR PLACE
   ===================================================== */
router.post("/places/apply", verifyStaff, async (req, res) => {
    try {
        const { placeId } = req.body;
        if (!placeId) return res.status(400).json({ message: "Place ID required" });

        const staff = await Staff.findById(req.user._id);
        if (!staff) return res.status(404).json({ message: "Staff not found" });

        staff.application = {
            placeId,
            appliedAt: new Date()
        };
        staff.status = "applied";

        // Clear old request details if any
        staff.requestDetails = undefined;

        await staff.save();

        res.json({ success: true, message: "Application submitted" });
    } catch (err) {
        console.error("APPLY ERROR:", err);
        res.status(500).json({ message: "Application failed" });
    }
});

/* =====================================================
   GET COUNTERS (FOR SELECTION)
   ===================================================== */
router.get("/counters", verifyStaff, async (req, res) => {
    try {
        // If staff is not active, block access
        // Wait, verifyStaff allows any staff.
        // We should check status here? Or assume frontend handles it?
        // Let's safe guard.
        if (!req.user?._id) return res.status(401).json({ message: "No user ID" });
        const staff = await Staff.findById(req.user._id);
        if (!staff) {
            return res.status(404).json({ message: "Staff account not found. Please relogin." });
        }

        if (staff.status !== 'active') {
            return res.status(403).json({ message: "Account not active" });
        }

        const place = await Place.findOne({ _id: staff.placeId }); // Use DB source of truth
        if (!place) return res.status(404).json({ message: "Place not found" });

        res.json({
            counters: place.counters,
            placeName: place.name
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch counters" });
    }
});

/* =====================================================
   QUEUE DASHBOARD STATUS
   ===================================================== */
router.get("/status", verifyStaff, async (req, res) => {
    try {
        const { counterName } = req.query;
        if (!counterName) return res.status(400).json({ message: "Counter name required" });

        // 1. Current Ticket (Being served by THIS staff or ANY staff on this counter?)
        // Typically, a counter has one staff. Or multiple?
        // Let's assume counterName defines the queue line.
        // Ensure we fetch a ticket that is "Serving" on this counter.

        // Find active ticket for this counter (served by ANYONE or unassigned? usually served by one person)
        // We will look for tickets in "Serving" state for this counter.
        const currentTicket = await Token.findOne({
            place: req.user.placeId,
            counterName: counterName,
            status: "Serving"
        });

        // 2. Queue Metrics
        const waitingCount = await Token.countDocuments({
            place: req.user.placeId,
            counterName: counterName,
            status: "Waiting"
        });

        const completedCount = await Token.countDocuments({
            place: req.user.placeId,
            counterName: counterName,
            status: "Completed",
            updatedAt: { $gte: new Date().setHours(0, 0, 0, 0) } // Today
        });

        // 3. Upcoming List (Next 3)
        // Use simple find for display, logic uses intelligent sort
        const nextTickets = await Token.find({
            place: req.user.placeId,
            counterName: counterName,
            status: "Waiting"
        })
            .sort({ createdAt: 1 }) // Simple sort for visualization, real priority is more complex
            .limit(3);


        res.json({
            currentTicket,
            waiting: waitingCount,
            completed: completedCount,
            nextTickets
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch status" });
    }
});

/* =====================================================
   GET ALL TOKENS (LIST VIEW)
   ===================================================== */
router.get("/all-tokens", verifyStaff, async (req, res) => {
    try {
        const { counterName } = req.query;
        if (!counterName) return res.status(400).json({ message: "Counter name required" });

        const tokens = await Token.find({
            place: req.user.placeId,
            counterName: counterName,
            status: { $in: ["Waiting", "Serving", "Completed"] },
            createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } // Filter for today
        }).sort({ createdAt: 1 });

        res.json({ tokens });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch all tokens" });
    }
});

/* =====================================================
   CALL NEXT TICKET
   ===================================================== */
router.post("/next", verifyStaff, async (req, res) => {
    try {
        const { counterName } = req.body;

        // 1. Get Priority Ticket
        const nextTicket = await getNextTicket(req.user.placeId, counterName);

        if (!nextTicket) {
            return res.status(404).json({ message: "No tickets in queue" });
        }

        // 2. Assign to Staff & Update Status
        nextTicket.status = "Serving";
        nextTicket.servedBy = req.user._id;
        nextTicket.servingStartedAt = new Date();
        await nextTicket.save();

        // 3. Emit Update
        io.emit("token-updated"); // Simple global emit, can be optimized

        res.json({ ticket: nextTicket });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to call next ticket" });
    }
});

/* =====================================================
   UPDATE TICKET STATUS (COMPLETE / SKIP / NO-SHOW)
   ===================================================== */
router.post("/action", verifyStaff, async (req, res) => {
    try {
        const { tokenId, action } = req.body; // action: "Completed" | "Skipped"

        if (!["Completed", "Skipped"].includes(action)) {
            return res.status(400).json({ message: "Invalid action" });
        }

        const ticket = await Token.findById(tokenId);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        // Validate ownership? (Maybe optional if team manages queue)

        ticket.status = action;
        if (action === "Completed") {
            ticket.completedAt = new Date();
            // Calc duration
            if (ticket.servingStartedAt) {
                ticket.serviceDuration = (ticket.completedAt - ticket.servingStartedAt) / 60000; // minutes
            }
        }

        await ticket.save();

        io.emit("token-updated");

        res.json({ success: true, ticket });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update ticket" });
    }
});

export default router;
