const FEEDBACK_KEY = "waitly_feedback";
const DISMISS_KEY = "waitly_dismissed";

export function saveWaitFeedback(data) {
  const existing =
    JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];

  existing.push({
    ...data,
    createdAt: new Date().toISOString(),
  });

  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing));
}

export function hasGivenFeedback(placeId) {
  const feedback =
    JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];

  return feedback.some((f) => f.placeId === placeId);
}

export function dismissPopup(placeId) {
  const dismissed =
    JSON.parse(localStorage.getItem(DISMISS_KEY)) || {};

  dismissed[placeId] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
}

export function canShowPopup(placeId, intervalMs = 5 * 1000) {
  const dismissed =
    JSON.parse(localStorage.getItem(DISMISS_KEY)) || {};

  if (!dismissed[placeId]) return true;

  return Date.now() - dismissed[placeId] > intervalMs;
}
