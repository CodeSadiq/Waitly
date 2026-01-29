/**
 * Formats minutes into a human-readable string.
 * Examples:
 * 45 -> "45 min"
 * 60 -> "1 hr"
 * 90 -> "1 hr 30 min"
 * 1440 -> "1 day"
 * 1500 -> "1 day 1 hr"
 * 
 * @param {number} minutes 
 * @returns {string}
 */
export function formatWaitTime(minutes) {
    if (!minutes || isNaN(minutes) || minutes <= 0) return "0 min";

    const days = Math.floor(minutes / 1440);
    const hrs = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    let parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    if (hrs > 0) parts.push(`${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} min`);

    return parts.join(" ");
}

/**
 * Formats a date string into a relative format (Today, Yesterday, or Date).
 * @param {string|Date} dateParam 
 * @returns {string}
 */
export function formatRelativeDate(dateParam) {
    if (!dateParam) return "";
    const date = new Date(dateParam);
    const now = new Date();

    // Reset hours to compare dates only
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (targetDate.getTime() === today.getTime()) {
        return `Today, ${timeStr}`;
    } else if (targetDate.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeStr}`;
    } else {
        return `${date.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${timeStr}`;
    }
}
