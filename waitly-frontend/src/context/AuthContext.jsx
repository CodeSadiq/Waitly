import { createContext, useEffect, useState } from "react";
import API_BASE from "../config/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include"
      });

      if (!res.ok) {
        // IMPORTANT: don't wipe user on initial 401
        setLoading(false);
        return;
      }

      const data = await res.json();

      // normalize response
      setUser(data.user || data);

    } catch (err) {
      console.error("Auth load error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}
