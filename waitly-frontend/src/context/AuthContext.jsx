import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 reusable loader (called on app load + after login)
  const loadUser = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include"
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setUser(data);
    } catch {
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

