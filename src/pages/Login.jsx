import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import API_BASE from "../config/api";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const { loadUser } = useContext(AuthContext);

  const [mode, setMode] = useState("login"); // login | register
  const [role, setRole] = useState("user"); // ONLY for register

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    setError("");

    if (!identifier || !password) {
      setError("Username / Email and password required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/user/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      // Load user into context
      await loadUser();

      // Redirect based on role from backend
      if (data.role === "admin") navigate("/admin/dashboard");
      else if (data.role === "staff") navigate("/staff/dashboard");
      else navigate("/");

    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  /* ================= REGISTER ================= */
  const handleRegister = async () => {
    setError("");

    if (!identifier || !email || !password) {
      setError("All fields required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier,
          email,
          password,
          role
        })
      });

      if (!res.ok) throw new Error();

      setMode("login");
      setPassword("");
      setError("Account created. Please login.");

    } catch {
      setError("User already exists");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h2>{mode === "login" ? "Login to WAITLY" : "Create Account"}</h2>

        {/* ROLE SELECT ONLY FOR REGISTER */}
        {mode === "register" && (
          <div className="role-select">
            {["user", "staff", "admin"].map(r => (
              <button
                key={r}
                className={`role-btn ${role === r ? "active" : ""}`}
                onClick={() => setRole(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <input
          placeholder="Username or Email"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
        />

        {mode === "register" && (
          <input
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        )}

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer"
            }}
          >
            👁
          </span>
        </div>

        {/* FORGOT PASSWORD */}
        {mode === "login" && (
          <p
            style={{ fontSize: 13, cursor: "pointer", color: "#6366f1" }}
            onClick={() => navigate("/forgot-password")}
          >
            Forgot password?
          </p>
        )}

        {error && <p className="error-text">{error}</p>}

        <button
          className="auth-btn"
          disabled={loading}
          onClick={mode === "login" ? handleLogin : handleRegister}
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>

        <button
          className="auth-btn outline"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Create Account" : "Back to Login"}
        </button>

      </div>
    </div>
  );
}
