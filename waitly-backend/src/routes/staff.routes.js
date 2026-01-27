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
        console.log("🔍 [SEARCH] Query received:", q, "from user:", req.user?.username);

        if (!q) {
            console.log("⚠️ [SEARCH] No query provided");
            return res.json([]);
        }

        const places = await Place.find({
            name: { $regex: q, $options: "i" }
        }).select("name address category location counters");

        console.log(`✅ [SEARCH] Found ${places.length} places for "${q}":`, places.map(p => p.name));

        res.json(places);
    } catch (err) {
        console.error("❌ [SEARCH] ERROR:", err);
        res.status(500).json({ message: "Search failed" });
    }
});

/* =====================================================
   GET PLACE BY ID (FOR VIEWING APPLIED PLACE)
   ===================================================== */
router.get("/places/:id", verifyStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const place = await Place.findById(id).select("name address category location");

        if (!place) {
            return res.status(404).json({ message: "Place not found" });
        }

        res.json(place);
    } catch (err) {
        console.error("❌ [GET PLACE] ERROR:", err);
        res.status(500).json({ message: "Failed to fetch place" });
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
   CANCEL APPLICATION
   ===================================================== */
router.post("/places/cancel", verifyStaff, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user._id);
        if (!staff) return res.status(404).json({ message: "Staff not found" });

        if (staff.status !== "applied" && staff.status !== "pending") {
            return res.status(400).json({ message: "No pending application to cancel" });
        }

        staff.application = undefined;
        staff.status = "unassigned";

        await staff.save();

        res.json({ success: true, message: "Application cancelled" });
    } catch (err) {
        console.error("CANCEL ERROR:", err);
        res.status(500).json({ message: "Failed to cancel application" });
    }
});

/* =====================================================
   GET COUNTERS (FOR SELECTION)
   ===================================================== */
router.get("/counters", verifyStaff, async (req, res) => {
    try {
        if (!req.user?._id) return res.status(401).json({ message: "No user ID" });

        const staff = await Staff.findById(req.user._id);
        if (!staff) {
            console.log("❌ [COUNTERS] Staff not found in DB:", req.user._id);
            return res.status(404).json({ message: "Staff account not found. Please relogin." });
        }

        console.log(`🔍 [COUNTERS] Staff: ${staff.username}, Status: ${staff.status}, PlaceId: ${staff.placeId}`);

        if (staff.status !== 'active' || !staff.placeId) {
            console.log("⚠️ [COUNTERS] Staff not active or no placeId assigned");
            return res.status(403).json({ message: "Account not active or no workplace assigned" });
        }

        const place = await Place.findById(staff.placeId);
        if (!place) {
            console.log("❌ [COUNTERS] Place not found for ID:", staff.placeId);
            return res.status(404).json({ message: "Workplace not found" });
        }

        // Ensure we always have at least one counter to show
        const counters = place.counters && place.counters.length > 0
            ? place.counters
            : [{ name: "General" }];

        console.log(`✅ [COUNTERS] Found ${counters.length} counters for ${place.name}`);

        res.json({
            counters,
            placeName: place.name,
            placeAddress: place.address
        });
    } catch (err) {
        console.error("❌ [COUNTERS] ERROR:", err);
        res.status(500).json({ message: "Internal server error loading counters" });
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
            status: "Waiting",
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        const completedCount = await Token.countDocuments({
            place: req.user.placeId,
            counterName: counterName,
            status: "Completed",
            completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        const skippedCount = await Token.countDocuments({
            place: req.user.placeId,
            counterName: counterName,
            status: "Skipped",
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
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
            skipped: skippedCount,
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
            status: { $in: ["Waiting", "Serving", "Completed", "Skipped"] },
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } // Filter for today
        }).sort({ createdAt: 1 });

        // Enrich with Position in Queue
        const enrichedTokens = await Promise.all(tokens.map(async (t) => {
            let position = null;
            if (t.status === "Waiting") {
                // Same "peopleAhead" logic as queue.js
                const peopleAhead = await Token.countDocuments({
                    place: req.user.placeId,
                    counterName: counterName,
                    _id: { $ne: t._id },
                    $or: [
                        { status: "Waiting", createdAt: { $lt: t.createdAt } },
                        { status: "Serving" }
                    ]
                });
                // Position # is basically peopleAhead + 1
                // E.g. 0 people ahead means I am #1
                position = peopleAhead + 1;
            }
            return {
                ...t.toObject(),
                position
            };
        }));

        res.json({ tokens: enrichedTokens });
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
