const FEEDBACK_KEY = "waitly_feedback";
const DISMISS_KEY = "waitly_dismissed";

export function saveWaitFeedback(data) {
  const existing =
    JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];

  existing.push({
    ...data,
    createdAt: Date.now(), // Store as timestamp for easier math
  });

  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing));
}

export function hasGivenFeedback(placeId) {
  const feedback =
    JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];

  return feedback.some((f) => f.placeId === placeId);
}

/**
 * Checks if a specific counter at a place has been updated recently.
 * @param {string} placeId 
 * @param {string} counter 
 * @param {number} intervalMs Default 1 hour (3600000ms)
 */
export function isCounterThrottled(placeId, counter, intervalMs = 3600 * 1000) {
  const feedback =
    JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];

  // 🛡️ Filter and ensure we use a numeric timestamp for sorting/math
  const entries = feedback
    .filter((f) => f.placeId === placeId && f.counter === counter)
    .map(f => ({ ...f, ts: new Date(f.createdAt).getTime() }))
    .sort((a, b) => b.ts - a.ts);

  const lastEntry = entries[0];

  if (!lastEntry) return { throttled: false };

  const timePassed = Date.now() - lastEntry.ts;
  const timeLeft = intervalMs - timePassed;


  return {
    throttled: timePassed < intervalMs,
    timeLeftMs: Math.max(0, timeLeft)
  };
}

export function dismissPopup(placeId) {
  const dismissed =
    JSON.parse(localStorage.getItem(DISMISS_KEY)) || {};

  dismissed[placeId] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
}

// 🕒 PROJECT SUBMISSION NOTE: Change 3600 * 1000 (1 hour) to 20 * 1000 (20s) to test repeatedly
export function canShowPopup(placeId, intervalMs = 3600 * 1000) {
  const dismissed =
    JSON.parse(localStorage.getItem(DISMISS_KEY)) || {};

  if (!dismissed[placeId]) return true;

  return Date.now() - dismissed[placeId] > intervalMs;
}

