import Token from "../models/Token.js";

/**
 * Calculate Real Average Service Time based on recent completed tickets
 */
export async function getRealAverageTime(placeId, counterName, defaultTime = 5) {
    try {
        const lastTokens = await Token.find({
            place: placeId,
            counterName: counterName,
            status: "Completed",
            servingStartedAt: { $exists: true },
            completedAt: { $exists: true }
        }).sort({ completedAt: -1 }).limit(20);

        if (lastTokens.length < 3) return defaultTime;

        const totalDuration = lastTokens.reduce((sum, t) => {
            const duration = (new Date(t.completedAt) - new Date(t.servingStartedAt)) / 60000;
            return sum + duration;
        }, 0);

        return Math.max(Math.ceil(totalDuration / lastTokens.length), 2);
    } catch (e) {
        return defaultTime;
    }
}

/**
 * Common Auto-Expiration Logic
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
 * Simulation for Accurate "People Ahead" and Estimated Wait
 */
export async function getQueueMetrics(placeId, counterName, targetTokenId = null, io = null) {
    await autoExpireTickets(placeId, counterName, io);

    const allCandidates = await Token.find({
        place: placeId,
        counterName: counterName,
        status: "Waiting"
    });

    const servingCount = await Token.countDocuments({
        place: placeId,
        counterName: counterName,
        status: "Serving"
    });

    if (allCandidates.length === 0) return { peopleAhead: servingCount, estimatedWait: 0 };

    const walkIns = allCandidates
        .filter(t => !t.scheduledTime)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a._id.toString().localeCompare(b._id.toString()));

    const slotted = allCandidates
        .filter(t => t.scheduledTime)
        .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime) || a._id.toString().localeCompare(b._id.toString()));

    const avgTime = await getRealAverageTime(placeId, counterName, 5);
    let virtualClock = Date.now();
    let peopleAhead = servingCount;

    if (!targetTokenId) {
        const dummyId = "NEW_WALKIN_TARGET";
        walkIns.push({ _id: dummyId, createdAt: new Date() });
        targetTokenId = dummyId;
    }

    let queue = [...walkIns];
    let slotIndex = 0;

    while (true) {
        if (queue.length === 0 && slotIndex >= slotted.length) break;

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

        if (candidate._id.toString() === targetTokenId.toString()) {
            return { peopleAhead, estimatedWait: peopleAhead * avgTime };
        }

        peopleAhead++;
        virtualClock += (avgTime * 60000);
    }

    return { peopleAhead, estimatedWait: peopleAhead * avgTime };
}

/**
 * Get the next best ticket to serve based on strict priority rules.
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
    const dueScheduled = [];
    const walkIns = [];

    candidates.forEach(t => {
        if (t.scheduledTime) {
            if (new Date(t.scheduledTime) <= now) {
                dueScheduled.push(t);
            }
        } else {
            walkIns.push(t);
        }
    });

    if (dueScheduled.length > 0) {
        dueScheduled.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime) || a._id.toString().localeCompare(b._id.toString()));
        return dueScheduled[0];
    }

    if (walkIns.length > 0) {
        walkIns.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a._id.toString().localeCompare(b._id.toString()));
        return walkIns[0];
    }

    return null;
};
