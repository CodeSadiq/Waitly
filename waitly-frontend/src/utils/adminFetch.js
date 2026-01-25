import API_BASE from "../config/api";

export const adminFetch = (url, options = {}) => {
  return fetch(`${API_BASE}${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
};
