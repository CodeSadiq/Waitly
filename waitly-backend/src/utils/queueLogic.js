import Token from "../models/Token.js";

/**
 * Get the next best ticket to serve based on priority rules.
 * Rules:
 * 1. Scheduled tickets that are "due" (startTime <= now) take priority?
 *    Actually, usually scheduled tickets are interleaved.
 *    Let's stick to a merged priority:
 *    - Filter for status "Waiting".
 *    - If scheduledTime is set, use it as effective sorting time.
 *    - If scheduledTime is null (walk-in), use createdAt.
 *    - Sort by effective time ASC.
 *    
 *    BUT, strict appointment system (booking in slots) usually means:
 *    - Slot 10:00 - 10:15 has priority during that window.
 *    
 *    Strategy:
 *    1. Find all waiting tickets for this place & counter.
 *    2. Separate into "Scheduled" and "Walk-in".
 *    3. If there are Scheduled tickets with (scheduledTime <= now + gracePeriod), pick the earliest one.
 *    4. If no "due" scheduled tickets, pick the oldest Walk-in ticket.
 */
export const getNextTicket = async (placeId, counterName) => {
    const now = new Date();

    // 1. Find potential candidates
    const candidates = await Token.find({
        place: placeId,
        counterName: counterName,
        status: "Waiting"
    }).sort({ createdAt: 1 }); // Initial rough sort

    if (candidates.length === 0) return null;

    // 2. Separate candidates
    const dueScheduled = [];
    const walkIns = [];
    const futureScheduled = [];

    const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes grace period

    candidates.forEach(t => {
        if (t.scheduledTime) {
            // Priority given if current time is within 5 mins of scheduled time OR past it
            if (t.scheduledTime <= new Date(now.getTime() + GRACE_PERIOD_MS)) {
                dueScheduled.push(t);
            } else {
                futureScheduled.push(t);
            }
        } else {
            walkIns.push(t);
        }
    });

    // 3. Priority Selection

    // Rule A: If there's a scheduled ticket that is DUE (or within grace period), serve it first.
    if (dueScheduled.length > 0) {
        dueScheduled.sort((a, b) => a.scheduledTime - b.scheduledTime);
        return dueScheduled[0];
    }

    // Rule B: If no due scheduled tickets, serve walk-ins (FIFO)
    if (walkIns.length > 0) {
        return walkIns[0];
    }

    // Rule C: If only future scheduled tickets exist, wait? Or serve if strict?
    // Usually, we don't call a 10:30 ticket at 10:15 if there's no one else.
    // But if the staff is idle, maybe they can early-serve?
    // For now, allow early serving if strictly no one else is waiting.
    if (futureScheduled.length > 0) {
        futureScheduled.sort((a, b) => a.scheduledTime - b.scheduledTime);
        return futureScheduled[0];
    }

    return null;
};
