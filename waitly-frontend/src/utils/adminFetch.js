import API_BASE from "../config/api";

export const adminFetch = (url, options = {}) => {
  const token = localStorage.getItem('waitly_token');
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${url}`, {
    credentials: "include",
    headers,
    ...options
  });
};
