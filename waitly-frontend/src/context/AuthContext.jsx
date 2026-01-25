import { createContext, useEffect, useState } from "react";
import API_BASE from "../config/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 reusable loader (called on app load + after login)
  const loadUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include"
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Auth load error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // run once on app start
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}
