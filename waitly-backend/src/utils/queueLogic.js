import Token from "../models/Token.js";
import Place from "../models/Place.js";

/* =====================================================
   HYBRID AVERAGE TIME FORMULA
   final = (StaffAvg * 0.3) + (SystemAvg * 0.7)
   ===================================================== */
export async function getRealAverageTime(placeId, counterName, categoryId = "general") {
    try {
        const place = await Place.findById(placeId);
        if (!place) return 5;

        const counter = place.counters.find(c => c.name === counterName);
        if (!counter) return 5;

        // Find service category
        let service = counter.services?.find(s => s.categoryId === categoryId);

        // 🎯 ONE SOURCE OF TRUTH: Use the pre-calculated finalAvgTime stored in the DB
        // If it hasn't been learned yet, fall back to staffAvgTime
        const effectiveAvg = service?.finalAvgTime || service?.staffAvgTime || 5;

        return Math.min(Math.max(Math.round(effectiveAvg), 2), 120); // Min 2 mins, Max 120 mins
    } catch (e) {
        console.error("AVG CALC ERROR:", e);
        return 5;
    }
}

/**
 * Returns breakdown of how avg time was calculated
 */
export async function getDetailedAverageTime(placeId, counterName, categoryId = "general") {
    try {
        const place = await Place.findById(placeId);
        if (!place) return { staff: 5, system: 5, final: 5 };

        const counter = place.counters.find(c => c.name === counterName);
        if (!counter) return { staff: 5, system: 5, final: 5 };

        let service = counter.services?.find(s => s.categoryId === categoryId);

        const staff = service?.staffAvgTime || 5;
        const system = service?.systemAvgTime || staff;
        const final = service?.finalAvgTime || staff;

        return {
            staff,
            system: Math.round(system * 10) / 10,
            final: Math.max(Math.round(final), 2)
        };
    } catch (e) {
        console.error("DETAILED AVG ERROR:", e);
        return { staff: 5, system: 5, final: 5 };
    }
}

/* =====================================================
   CROWD DENSITY CALCULATOR
   Low / Moderate / High / Critical
   ===================================================== */
export async function getCrowdMetrics(placeId, counterName, categoryId = "general") {
    const fallback = {
        level: "Unknown",
        activeCount: 0,
        dailyCapacity: 0,
        pace: 10,
        totalSlottedCapacity: 0,
        totalTatkalCapacity: 0,
        usedSlotted: 0,
        usedTatkal: 0,
        remainingSlotted: 0,
        remainingTatkal: 0
    };

    try {
        const place = await Place.findById(placeId);
        if (!place) return fallback;

        const counter = place.counters.find(c => c.name === counterName);
        if (!counter) return fallback;

        // 1. Calculate Active Load
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

        // All tokens applicable for today
        const todaysTokens = await Token.find({
            place: placeId,
            counterName: counterName,
            status: { $nin: ["Cancelled", "Skipped", "Expired"] },
            $or: [
                { scheduledTime: { $type: "date", $gte: startOfDay, $lte: endOfDay } },
                { scheduledTime: null, createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
        }).select("scheduledTime status");

        const activeCount = todaysTokens.filter(t => t.status === "Waiting" || t.status === "Serving").length;

        // 2. Estimate Capacity
        // 'pace' is the learned categorical average (or general fallback)
        const pace = await getRealAverageTime(placeId, counterName, categoryId);
        const slotDuration = counter.slotDuration || 15;
        const wp = counter.walkinPercent ?? 60;

        const parseTime = (t) => {
            if (!t || typeof t !== 'string' || !t.includes(':')) return null;
            const parts = t.split(':');
            const h = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            if (isNaN(h) || isNaN(m)) return null;
            return h * 60 + m;
        };

        const openMins = parseTime(counter.openingTime) ?? 540; // 09:00 default
        const closeMins = parseTime(counter.closingTime) ?? 1020; // 17:00 default

        let lunchMins = 0;
        if (counter.lunchStart && counter.lunchEnd) {
            const lStart = parseTime(counter.lunchStart);
            const lEnd = parseTime(counter.lunchEnd);
            if (lStart !== null && lEnd !== null) {
                lunchMins = Math.max(0, lEnd - lStart);
            }
        }

        const operatingMins = Math.max(0, (closeMins - openMins) - lunchMins);
        const totalPhysicalSlots = Math.floor(operatingMins / slotDuration) || 28;

        // Mathematical distribution of TIME
        let totalSlottedCapacity = 0;
        let reservedTatkalMins = 0;

        for (let i = 1; i <= totalPhysicalSlots; i++) {
            const isTatkalSlot = Math.floor((i * wp) / 100) > Math.floor(((i - 1) * wp) / 100);
            if (isTatkalSlot) {
                reservedTatkalMins += slotDuration;
            } else {
                totalSlottedCapacity++;
            }
        }

        // 🎯 REAL CAPACITY CALCULATION:
        // Slotted capacity is strict (one booking per slot duration)
        // Tatkal capacity is dynamically calculated based on the average time of all categories
        let avgCategoryTime = pace; // fallback
        if (counter.services && counter.services.length > 0) {
            const sumTime = counter.services.reduce((acc, s) => {
                const time = s.finalAvgTime || s.staffAvgTime || pace || 5;
                return acc + time;
            }, 0);
            avgCategoryTime = sumTime / counter.services.length;
        } else {
            avgCategoryTime = pace || 15;
        }

        const totalTatkalCapacity = Math.round(reservedTatkalMins / avgCategoryTime);

        // 3. Current Usage
        const usedSlotted = todaysTokens.filter(t => t.scheduledTime).length;
        const usedTatkal = todaysTokens.filter(t => !t.status.includes("Cancelled") && !t.scheduledTime).length;

        const remainingSlotted = Math.max(0, totalSlottedCapacity - usedSlotted);
        const remainingTatkal = Math.max(0, totalTatkalCapacity - usedTatkal);

        const loadFactor = activeCount / (totalPhysicalSlots || 1);
        let level = "Low";
        if (loadFactor > 0.85) level = "Critical";
        else if (loadFactor > 0.50) level = "High";
        else if (loadFactor > 0.20) level = "Moderate";

        return {
            level,
            activeCount,
            dailyCapacity: totalPhysicalSlots,
            pace,
            totalSlottedCapacity,
            totalTatkalCapacity,
            usedSlotted,
            usedTatkal,
            remainingSlotted,
            remainingTatkal
        };
    } catch (e) {
        console.error("CROWD CALC ERROR:", e);
        return fallback;
    }
}

/**
 * Common Auto-Expiration Logic is good to keep
 */
async function autoExpireTickets(placeId, counterName, io = null) {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
    const expiryResult = await Token.updateMany({
        place: placeId,
        counterName: counterName,
        status: "Waiting",
        scheduledTime: { $lt: thirtyMinsAgo }
    }, {
        $set: { status: "Expired", completedAt: new Date() }
    });

    if (expiryResult.modifiedCount > 0 && io) {
        io.emit("token-updated");
    }
}

/**
 * TIME-BASED WAIT PREDICTION
 * Sum of AvgTime for all people ahead
 */
export async function getQueueMetrics(placeId, counterName, targetTokenId = null, io = null) {
    await autoExpireTickets(placeId, counterName, io);

    // Get Ticket List
    const allCandidates = await Token.find({
        place: placeId,
        counterName: counterName,
        status: "Waiting"
    });

    // Get Serving Token
    const servingToken = await Token.findOne({
        place: placeId,
        counterName: counterName,
        status: "Serving"
    });

    const servingCount = servingToken ? 1 : 0;

    let virtualClock = Date.now();

    // 🎯 FIX: Account for the person currently being served
    if (servingToken) {
        const pace = await getRealAverageTime(placeId, counterName, servingToken.category);
        const startTime = servingToken.servingStartedAt || servingToken.createdAt;
        const elapsed = (Date.now() - new Date(startTime)) / 60000;
        const remaining = Math.max(1, pace - elapsed);
        virtualClock += (remaining * 60000);
    }

    if (allCandidates.length === 0) {
        const crowd = await getCrowdMetrics(placeId, counterName);
        return {
            peopleAhead: servingCount,
            estimatedWait: servingCount > 0 ? Math.round((virtualClock - Date.now()) / 60000) : 0,
            crowdLevel: crowd.level,
            currentPace: crowd.pace,
            nowServing: servingToken?.tokenCode || "None"
        };
    }

    // Split Queues
    const walkIns = allCandidates
        .filter(t => !t.scheduledTime)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a._id.toString().localeCompare(b._id.toString()));

    const slotted = allCandidates
        .filter(t => t.scheduledTime)
        .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime) || a._id.toString().localeCompare(b._id.toString()));

    // Get Map of Category -> WaitTime
    const categoryCache = {};
    const getCachedTime = async (cid) => {
        if (categoryCache[cid]) return categoryCache[cid];
        const time = await getRealAverageTime(placeId, counterName, cid);
        categoryCache[cid] = time;
        return time;
    };

    let peopleAhead = servingCount;

    // Simulation Loop
    let queue = [...walkIns];
    let slotIndex = 0;

    // We need a dummy target if none provided
    if (!targetTokenId) {
        const dummyId = "NEW_WALKIN_TARGET";
        walkIns.push({ _id: dummyId, createdAt: new Date(), category: "general" });
        targetTokenId = dummyId;
        queue = [...walkIns];
    }

    while (true) {
        if (queue.length === 0 && slotIndex >= slotted.length) break;

        const nextSlot = slotted[slotIndex];
        let candidate = null;
        let takenFromSlot = false;

        if (nextSlot && new Date(nextSlot.scheduledTime).getTime() <= virtualClock) {
            candidate = nextSlot;
            takenFromSlot = true;
        }
        else if (queue.length > 0) {
            candidate = queue.shift();
        }
        else if (nextSlot) {
            virtualClock = new Date(nextSlot.scheduledTime).getTime();
            candidate = nextSlot;
            takenFromSlot = true;
        } else {
            break;
        }

        if (takenFromSlot) slotIndex++;

        // Found target?
        if (candidate._id.toString() === targetTokenId.toString()) {
            break;
        }

        peopleAhead++;
        const taskTime = await getCachedTime(candidate.category || "general");
        virtualClock += (taskTime * 60000);
    }
    const estimatedWait = Math.max(0, Math.round((virtualClock - Date.now()) / 60000));

    // Get Crowd Level
    const crowd = await getCrowdMetrics(placeId, counterName);

    return {
        peopleAhead,
        estimatedWait,
        crowdLevel: crowd.level,
        currentPace: crowd.pace,
        nowServing: servingToken?.tokenCode || "None"
    };
}

/**
 * NEXT TICKET PICKER (HYBRID RULE)
 * 1. Slot Due (within window) -> Priority
 * 2. Walk-in -> Secondary
 */
export const getNextTicket = async (placeId, counterName, io = null) => {
    await autoExpireTickets(placeId, counterName, io);

    const candidates = await Token.find({
        place: placeId,
        counterName: counterName,
        status: "Waiting"
    });

    if (candidates.length === 0) return null;

    const now = new Date();
    const avgTime = await getRealAverageTime(placeId, counterName);
    const windowMs = avgTime * 60000; // e.g. 5 mins

    // Sort Lists
    const slotted = candidates.filter(t => t.scheduledTime).sort((a, b) => a.scheduledTime - b.scheduledTime);
    const walkin = candidates.filter(t => !t.scheduledTime).sort((a, b) => a.createdAt - b.createdAt);

    // Rule 1: Is there a slot effectively "Now" or "Past Due"?
    // "Now" = ScheduledTime <= (Now + Small Buffer)
    if (slotted.length > 0) {
        const nextSlot = slotted[0];
        // If slot is ready (time passed or within next 2 mins)
        if (new Date(nextSlot.scheduledTime) <= new Date(now.getTime() + 120000)) {
            return nextSlot;
        }
    }

    // Rule 2: If no urgent slot, check if Walk-in fits before next slot
    if (walkin.length > 0) {
        const nextSlot = slotted[0];

        if (nextSlot) {
            const nextSlotTime = new Date(nextSlot.scheduledTime);
            // remainingTime in minutes
            const remainingTime = (nextSlotTime.getTime() - now.getTime()) / 60000;
            const safetyBuffer = 0.5; // 30 seconds safety

            // Find all walk-ins that FIT inside the remaining time
            // We need to fetch their specific category average times
            const walkinsWithTime = await Promise.all(walkin.map(async (w) => {
                const time = await getRealAverageTime(placeId, counterName, w.category);
                return { token: w, time };
            }));

            const fittingWalkins = walkinsWithTime.filter(w => w.time <= (remainingTime - safetyBuffer));

            if (fittingWalkins.length > 0) {
                // FIRST FIT: Pick the earliest walk-in in the queue that fits the gap to maintain fairness
                return fittingWalkins[0].token;
            } else {
                // STARVATION PROTECTION
                // If the first walkin has been waiting for more than 40 minutes (starving), 
                // we force-serve them even if it eats into the slot time to prevent infinite wait loops.
                const firstWalkin = walkin[0];
                const waitTime = (now.getTime() - new Date(firstWalkin.createdAt).getTime()) / 60000;

                if (waitTime >= 40) {
                    return firstWalkin;
                }
                // No walk-in fits safely, so we check if the slot is "close enough" 
                // to just start it now (within 5 mins of schedule)
                if (remainingTime <= 5) {
                    return nextSlot;
                }
                // Otherwise, staff might have a small forced idle or we wait for a very short task
                return null;
            }
        }

        // No slots at all? Just serve the next walk-in by creation time
        return walkin[0];
    }

    // Rule 3: If only future slots exist
    if (slotted.length > 0) {
        return slotted[0];
    }

    return null;
};
