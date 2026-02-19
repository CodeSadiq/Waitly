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

        // Find service category or default to first/default
        let service = counter.services?.find(s => s.categoryId === categoryId);

        const staffAvg = service?.staffAvgTime || 5;

        // 🎯 FALLBACK: If counter is CLOSED, use Staff Input only
        if (counter.isClosed) {
            return Math.max(Math.round(staffAvg), 2);
        }

        // Get recent system data (Rolling avg of last 10 completed txns for responsiveness)
        // 🎯 SHARP RULE: Only count "Completed" tickets. "Skipped" or "Cancelled" are ignored.
        const lastTokens = await Token.find({
            place: placeId,
            counterName: counterName,
            status: "Completed",
            serviceDuration: { $exists: true, $gt: 0 }
        }).sort({ completedAt: -1 }).limit(10);

        let systemAvg = staffAvg;
        if (lastTokens.length >= 3) {
            // 🎯 Outlier Protection: Ignore logic errors (e.g. sessions left open for days)
            // Rule: Only count durations between 0.2 mins and 3x staff avg (max 120 mins)
            const upperLimit = Math.max(120, staffAvg * 4);
            const validDurations = lastTokens
                .map(t => t.serviceDuration)
                .filter(d => d > 0.2 && d < upperLimit);

            if (validDurations.length > 0) {
                const sum = validDurations.reduce((acc, d) => acc + d, 0);
                systemAvg = sum / validDurations.length;
            }
        }

        // Apply Hybrid Weighting
        // 30% Staff Input (Stability) + 70% Real Data (Accuracy)
        const finalAvg = (staffAvg * 0.3) + (systemAvg * 0.7);

        return Math.max(Math.round(finalAvg), 2); // Min 2 mins
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
        const staffAvg = service?.staffAvgTime || 5;

        if (counter.isClosed) {
            return { staff: staffAvg, system: staffAvg, final: staffAvg };
        }

        // Only consider "Completed" tickets for accurate calculation (ignores Skipped/Expired)
        const lastTokens = await Token.find({
            place: placeId,
            counterName: counterName,
            status: "Completed",
            serviceDuration: { $exists: true, $gt: 0 }
        }).sort({ completedAt: -1 }).limit(10);

        let systemAvg = staffAvg;
        if (lastTokens.length >= 3) {
            const upperLimit = Math.max(120, staffAvg * 4);
            const validDurations = lastTokens
                .map(t => t.serviceDuration)
                .filter(d => d > 0.2 && d < upperLimit);

            if (validDurations.length > 0) {
                const sum = validDurations.reduce((acc, d) => acc + d, 0);
                systemAvg = sum / validDurations.length;
            }
        }

        const finalAvg = (staffAvg * 0.3) + (systemAvg * 0.7);

        return {
            staff: staffAvg,
            system: Math.round(systemAvg * 10) / 10,
            final: Math.max(Math.round(finalAvg), 2)
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
    try {
        const place = await Place.findById(placeId);
        if (!place) return { level: "Unknown", capacity: 0 };

        const counter = place.counters.find(c => c.name === counterName);
        if (!counter) return { level: "Unknown", capacity: 0 };

        // 1. Calculate Active Load
        const activeCount = await Token.countDocuments({
            place: placeId,
            counterName: counterName,
            status: { $in: ["Waiting", "Serving"] }
        });

        // 2. Estimate Capacity
        // Use the same Hybrid Avg Time for consistency
        const pace = await getRealAverageTime(placeId, counterName, categoryId);

        const open = parseInt(counter.openingTime.split(":")[0]) * 60 + parseInt(counter.openingTime.split(":")[1]);
        const close = parseInt(counter.closingTime.split(":")[0]) * 60 + parseInt(counter.closingTime.split(":")[1]);
        const operatingMins = Math.max(0, close - open);

        const dailyCapacity = Math.floor(operatingMins / pace) || 50;

        // 3. Determine Level
        // Low: < 20% | Mod: < 50% | High: < 85% | Crit: > 85%
        const loadFactor = activeCount / dailyCapacity;

        let level = "Low";
        if (loadFactor > 0.85) level = "Critical"; // Red
        else if (loadFactor > 0.50) level = "High"; // Orange
        else if (loadFactor > 0.20) level = "Moderate"; // Yellow
        // else Low (Green)

        return { level, activeCount, dailyCapacity, pace };
    } catch (e) {
        console.error("CROWD CALC ERROR:", e);
        return { level: "Unknown", capacity: 0, pace: 10 };
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

    // Rule 2: If no urgent slot, take Walk-in
    if (walkin.length > 0) {
        return walkin[0];
    }

    // Rule 3: If only future slots exist, are they too far?
    // If we are here, walkin is empty.
    // Return next slot even if early, or wait?
    // Let's return the next slot to avoid idle staff.
    if (slotted.length > 0) {
        return slotted[0];
    }

    return null;
};
