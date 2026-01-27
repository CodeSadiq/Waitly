import { createContext, useEffect, useState } from "react";
import { authAPI } from "../utils/auth";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= LOAD USER ================= */
  const loadUser = async () => {
    try {
      setLoading(true);
      const data = await authAPI.getUser();

      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth load error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* ================= REGISTER ================= */
  const register = async (userData) => {
    try {
      setError(null);
      let data;

      if (userData.role === "staff") {
        data = await authAPI.staffRegister(userData);
      } else {
        data = await authAPI.register(userData);
      }

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  /* ================= LOGIN ================= */
  const login = async (credentials, loginType = "user") => {
    try {
      setError(null);
      let data;

      if (loginType === "admin") {
        data = await authAPI.adminLogin(credentials);
      } else if (loginType === "staff") {
        data = await authAPI.staffLogin(credentials);
      } else {
        data = await authAPI.login(credentials);
      }

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, error: "Login failed" };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  /* ================= LOGOUT ================= */
  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error("Logout error:", err);
      // Clear user anyway
      setUser(null);
      return { success: false, error: err.message };
    }
  };

  /* ================= FORGOT PASSWORD ================= */
  const forgotPassword = async (email) => {
    try {
      setError(null);
      const data = await authAPI.forgotPassword(email);
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  /* ================= RESET PASSWORD ================= */
  const resetPassword = async (token, password, confirmPassword) => {
    try {
      setError(null);
      const data = await authAPI.resetPassword(token, password, confirmPassword);
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  /* ================= CHANGE PASSWORD ================= */
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      setError(null);
      const data = await authAPI.changePassword(currentPassword, newPassword, confirmPassword);
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  /* ================= AUTO-LOAD USER ON MOUNT ================= */
  useEffect(() => {
    loadUser();
  }, []);

  /* ================= AUTO-REFRESH TOKEN ================= */
  useEffect(() => {
    if (!user) return;

    // Refresh token every 6 days (before 7 day expiry)
    const refreshInterval = setInterval(async () => {
      try {
        await authAPI.refreshToken();
        console.log("Token refreshed successfully");
      } catch (err) {
        console.error("Token refresh failed:", err);
        // If refresh fails, logout user
        setUser(null);
      }
    }, 6 * 24 * 60 * 60 * 1000); // 6 days

    return () => clearInterval(refreshInterval);
  }, [user]);

  const value = {
    user,
    loading,
    error,
    loadUser,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
