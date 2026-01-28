/**
 * Formats minutes into a human-readable string.
 * Examples:
 * 45 -> "45 min"
 * 60 -> "1 hr"
 * 90 -> "1 hr 30 min"
 * 
 * @param {number} minutes 
 * @returns {string}
 */
export function formatWaitTime(minutes) {
    if (!minutes || isNaN(minutes)) return "0 min";

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
        return `${hrs} hr`;
    }

    return `${hrs} hr ${mins} min`;
}
