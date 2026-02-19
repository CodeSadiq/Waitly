import express from "express";
import Place from "../models/Place.js";
import Staff from "../models/Staff.js";
import Token from "../models/Token.js";
import { verifyStaff } from "../middleware/authMiddleware.js";
import { getNextTicket, getRealAverageTime, getCrowdMetrics, getDetailedAverageTime } from "../utils/queueLogic.js";
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

        // Check if any place already has an active staff
        const placesWithStatus = await Promise.all(places.map(async (p) => {
            const activeStaff = await Staff.findOne({ placeId: p._id, status: 'active' });
            return {
                ...p.toObject(),
                hasActiveStaff: !!activeStaff
            };
        }));

        console.log(`✅ [SEARCH] Found ${places.length} places for "${q}":`, places.map(p => p.name));

        res.json(placesWithStatus);
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
        const { placeId, fullName, staffId, designation, counterName, newPlaceData } = req.body;
        let finalPlaceId = placeId;

        // If a new place is being created by the staff
        if (!placeId && newPlaceData) {
            const newPlace = new Place({
                ...newPlaceData,
                status: 'pending', // Staff-created places need admin approval 
                createdBy: req.user._id,
                isStaffProposed: true
            });
            await newPlace.save();
            finalPlaceId = newPlace._id;
        }

        if (!finalPlaceId) return res.status(400).json({ message: "Place or New Place Data required" });

        const staff = await Staff.findById(req.user._id);
        if (!staff) return res.status(404).json({ message: "Staff not found" });

        // Check if already approved or has pending application
        if (staff.status === "active" && staff.placeId) {
            return res.status(400).json({ message: "You are already approved and assigned to a workplace." });
        }
        if (staff.status === "applied" || staff.status === "pending") {
            return res.status(400).json({ message: "You already have a pending application. Please cancel it before applying again." });
        }

        staff.application = {
            placeId: finalPlaceId,
            appliedAt: new Date(),
            fullName,
            staffId,
            designation,
            counterName
        };
        staff.status = "applied";

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

        // 0. Auto-Expire Stale Tickets (> 30 mins late)
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
        await Token.updateMany({
            place: req.user.placeId,
            counterName: counterName,
            status: "Waiting",
            scheduledTime: { $lt: thirtyMinsAgo }
        }, {
            $set: { status: "Expired", completedAt: new Date() }
        });

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

        // 2. Queue Metrics (TODAY ONLY)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const waitingCount = await Token.countDocuments({
            place: req.user.placeId,
            counterName: counterName,
            status: "Waiting"
        });

        const completedCount = await Token.countDocuments({
            place: req.user.placeId,
            counterName: counterName,
            status: "Completed",
            $or: [
                { completedAt: { $gte: today, $lt: tomorrow } },
                { completedAt: { $exists: false }, createdAt: { $gte: today, $lt: tomorrow } }
            ]
        });

        const skippedCount = await Token.countDocuments({
            place: req.user.placeId,
            counterName: counterName,
            status: "Skipped",
            $or: [
                { completedAt: { $gte: today, $lt: tomorrow } },
                { completedAt: { $exists: false }, createdAt: { $gte: today, $lt: tomorrow } }
            ]
        });

        const activeSlottedCount = await Token.countDocuments({
            place: req.user.placeId,
            counterName: counterName,
            status: "Waiting",
            scheduledTime: { $exists: true }
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


        // 4. Intelligence Metrics
        const crowd = await getCrowdMetrics(req.user.placeId, counterName);
        const avgTimes = await getDetailedAverageTime(req.user.placeId, counterName);

        // 5. Get Counter Details (Schedule + Categories)
        const place = await Place.findById(req.user.placeId);
        const counter = place?.counters.find(c => c.name === counterName);

        res.json({
            currentTicket,
            waiting: waitingCount,
            completed: completedCount,
            skipped: skippedCount,
            slotted: activeSlottedCount,
            nextTickets,
            crowd,
            avgTimes,
            counterConfig: counter // 🔥 Added
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

        // 1. Get all relevant tokens (removed date filter for all-time visibility)
        const items = await Token.find({
            place: req.user.placeId,
            counterName: counterName
        }).sort({ createdAt: 1, _id: 1 });

        // 2. Separate by categories
        const serving = items.filter(t => t.status === "Serving");
        const waitingRaw = items.filter(t => t.status === "Waiting");
        const history = items
            .filter(t => ["Completed", "Skipped", "Expired", "Cancelled"].includes(t.status))
            .sort((a, b) => {
                const priority = { "Completed": 1, "Cancelled": 2, "Expired": 3, "Skipped": 4 };
                const pa = priority[a.status] || 99;
                const pb = priority[b.status] || 99;

                if (pa !== pb) return pa - pb;
                // If same priority, latest first
                return new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt);
            });

        // 3. Simulate Actual Queue Order for "Waiting"
        const walkIns = waitingRaw.filter(t => !t.scheduledTime);
        const slotted = waitingRaw.filter(t => t.scheduledTime).sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

        let queue = [...walkIns];
        let slotIndex = 0;
        let virtualClock = Date.now();
        const orderedWaiting = [];
        const avgTime = await getRealAverageTime(req.user.placeId, counterName, 5);

        while (queue.length > 0 || slotIndex < slotted.length) {
            const nextSlot = slotted[slotIndex];
            let candidate = null;

            if (nextSlot && new Date(nextSlot.scheduledTime).getTime() <= virtualClock) {
                candidate = nextSlot;
                slotIndex++;
            } else if (queue.length > 0) {
                candidate = queue.shift();
            } else if (nextSlot) {
                virtualClock = new Date(nextSlot.scheduledTime).getTime();
                continue;
            } else {
                break;
            }

            orderedWaiting.push({
                ...candidate.toObject(),
                positionOnList: orderedWaiting.length + 1,
                estimatedWait: Math.max(0, Math.round((virtualClock - Date.now()) / 60000))
            });

            virtualClock += (avgTime * 60000);
        }

        res.json({
            serving: serving.map(t => t.toObject()),
            waiting: orderedWaiting,
            history: history.map(t => t.toObject())
        });

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

        // 0. Auto-Skip any existing "Serving" tickets for this counter
        // This prevents the "multiple It's your turn" bug
        await Token.updateMany(
            { place: req.user.placeId, counterName, status: "Serving" },
            { $set: { status: "Skipped", completedAt: new Date() } }
        );

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


/* =====================================================
   UPDATE COUNTER SCHEDULE
   ===================================================== */
router.post("/counters/update-schedule", verifyStaff, async (req, res) => {
    try {
        const { counterName, openingTime, closingTime, isClosed } = req.body;

        if (!counterName) {
            return res.status(400).json({ message: "Counter name required" });
        }

        const place = await Place.findById(req.user.placeId);
        if (!place) return res.status(404).json({ message: "Place not found" });

        const counter = place.counters.find(c => c.name === counterName);
        if (!counter) return res.status(404).json({ message: "Counter not found" });

        // Update fields
        if (openingTime !== undefined) counter.openingTime = openingTime;
        if (closingTime !== undefined) counter.closingTime = closingTime;
        if (isClosed !== undefined) counter.isClosed = isClosed;

        // 🔥 FIX: Ensure queue is ENABLED when staff configures it
        // This fixes the issue where "Join Queue" button is hidden for legacy places
        if (counter.queueWait) {
            counter.queueWait.enabled = true;
        }

        await place.save();

        res.json({ success: true, message: "Schedule updated", counter });
    } catch (err) {
        console.error("UPDATE SCHEDULE ERROR:", err);
        res.status(500).json({ message: "Failed to update schedule" });
    }
});

/* =====================================================
   UPDATE COUNTER METRICS (STAFF TARGET)
   ===================================================== */
router.post("/counters/update-metrics", verifyStaff, async (req, res) => {
    try {
        const { counterName, staffAvgTime, categoryId = "general" } = req.body;

        if (!counterName) {
            return res.status(400).json({ message: "counterName is required" });
        }

        const place = await Place.findById(req.user.placeId);
        if (!place) return res.status(404).json({ message: "Place not found" });

        const counter = place.counters.find(c => c.name === counterName);
        if (!counter) return res.status(404).json({ message: "Counter not found" });

        // Ensure services array exists
        if (!counter.services) counter.services = [];

        // Support for schedule updates in same call
        if (req.body.openingTime !== undefined) counter.openingTime = req.body.openingTime;
        if (req.body.closingTime !== undefined) counter.closingTime = req.body.closingTime;
        if (req.body.isClosed !== undefined) counter.isClosed = req.body.isClosed;

        // Ensure queue is enabled for the counter
        if (counter.queueWait) {
            counter.queueWait.enabled = true;
        }

        if (staffAvgTime !== undefined) {
            // Find or create service category
            let service = counter.services.find(s => s.categoryId === categoryId);
            if (!service) {
                service = {
                    categoryId,
                    name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
                    staffAvgTime: Number(staffAvgTime)
                };
                counter.services.push(service);
            } else {
                service.staffAvgTime = Number(staffAvgTime);
            }
        }

        // Add support for "categories" array to bulk update
        if (req.body.categories && Array.isArray(req.body.categories)) {
            counter.services = req.body.categories.map(c => ({
                categoryId: c.categoryId || c.name.toLowerCase().replace(/\s+/g, "_"),
                name: c.name,
                staffAvgTime: Number(c.staffAvgTime || 5)
            }));
        }

        await place.save();
        io.emit("token-updated");

        res.json({ success: true, message: "Settings updated", counter });
    } catch (err) {
        console.error("UPDATE METRICS ERROR:", err);
        res.status(500).json({ message: "Failed to update metrics" });
    }
});

export default router;
