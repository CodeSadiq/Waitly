import API_BASE from "../config/api";

const getAuthToken = () => localStorage.getItem('waitly_token');

export const adminFetch = async (url, options = {}) => {
  let token = getAuthToken();

  const makeRequest = async (tokenOverride) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const currentToken = tokenOverride || getAuthToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    return fetch(`${API_BASE}${url}`, {
      credentials: "include",
      headers,
      ...options
    });
  };

  let response = await makeRequest(token);

  if (response.status === 401) {
    try {
      console.log("🔄 [AdminFetch] 401 detected. Attempting token refresh...");
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh-token`, {
        method: "POST",
        credentials: "include"
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data.token) {
          localStorage.setItem('waitly_token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('waitly_refresh_token', data.refreshToken);
          }
          console.log("✅ [AdminFetch] Token refreshed. Retrying request...");
          return makeRequest(data.token);
        }
      } else {
        console.warn("⚠️ [AdminFetch] Token refresh failed.");
      }
    } catch (e) {
      console.error("🚨 [AdminFetch] Error during token refresh:", e);
    }
  }

  return response;
};
