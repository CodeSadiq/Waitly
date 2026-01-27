import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import { AuthContext } from "../context/AuthContext";
import { validateLoginForm, validateRegisterForm, getPasswordStrength } from "../utils/validators";
import API_BASE from "../config/api";

export default function Login() {
  const { user, loading: authLoading, login, register, loadUser } = useContext(AuthContext);

  const [mode, setMode] = useState("login");
  const [loginType, setLoginType] = useState("user"); // user, staff, admin

  // Form fields
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Staff Registration Extra State
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [counters, setCounters] = useState("");

  const navigate = useNavigate();

  // No fetch needed for places anymore since we request new ones

  /* 🔥 Load user on mount */
  useEffect(() => {
    loadUser();
  }, []);

  /* ================= LOGIN ================= */
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});
    setError("");

    // Validation
    const validation = validateLoginForm(identifier, password);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      const credentials = loginType === "admin"
        ? { email: identifier, password }
        : { identifier, password };

      const result = await login(credentials, loginType);

      if (result.success) {
        // Redirect based on role
        const userRole = result.user.role;
        if (userRole === "admin") {
          navigate("/admin/dashboard");
        } else if (userRole === "staff") {
          navigate("/staff/dashboard");
        } else {
          navigate("/");
        }
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= REGISTER ================= */
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrors({});
    setError("");
    setSuccess("");

    // Validation
    const validation = validateRegisterForm(username, email, password, confirmPassword);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Simplified Validation for Staff
    // if (role === 'staff') ... no extra validation needed now

    setLoading(true);

    try {
      const result = await register({
        username,
        email,
        password,
        role
        // Place details removed - Apply after login
      });

      if (result.success) {
        setSuccess("Account created successfully! Please login.");
        setMode("login");
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:5000'}/api/auth/logout`, {
      method: "POST",
      credentials: "include"
    });

    window.location.reload();
  };

  /* =====================================================
     ✅ IF USER EXISTS — SHOW PROFILE CARD
  ===================================================== */

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <h2>Welcome {user.username || user.email}</h2>

          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>

          <button
            className="auth-btn"
            onClick={() => {
              if (user.role === "admin") navigate("/admin/dashboard");
              else if (user.role === "staff") navigate("/staff/dashboard");
              else navigate("/");
            }}
          >
            {user.role === "staff" ? "Go to Staff Dashboard" : (user.role === "admin" ? "Go to Admin Dashboard" : "Go to Dashboard")}
          </button>

          <button
            className="auth-btn outline"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>
      </div>
    );
  }

  /* =====================================================
     LOGIN / REGISTER FORM
  ===================================================== */

  const passwordStrength = mode === "register" ? getPasswordStrength(password) : null;

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h2>{mode === "login" ? "Login to WAITLY" : "Create Account"}</h2>

        {/* LOGIN TYPE SELECTOR (only for login) */}
        {mode === "login" && (
          <div className="role-select" style={{ marginBottom: 20 }}>
            {["user", "staff", "admin"].map(type => (
              <button
                key={type}
                className={`role-btn ${loginType === type ? "active" : ""}`}
                onClick={() => setLoginType(type)}
                type="button"
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* ROLE SELECTOR (only for register) */}
        {mode === "register" && (
          <div className="role-select">
            {["user", "staff", "admin"].map(r => (
              <button
                key={r}
                className={`role-btn ${role === r ? "active" : ""}`}
                onClick={() => setRole(r)}
                type="button"
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* STAFF REQUEST FORM REMOVED - NOW SIMPLE REGISTRATION */}
        {mode === "register" && role === "staff" && (
          <div style={{ marginBottom: 15, padding: "10px", background: "#f0f9ff", borderRadius: "8px", fontSize: "0.9em", color: "#0369a1" }}>
            ℹ️ You can search and apply for your workplace after creating your account.
          </div>
        )}

        <form onSubmit={mode === "login" ? handleLogin : handleRegister}>

          {/* USERNAME (register only) */}
          {mode === "register" && (
            <div>
              <input
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              {errors.username && <p className="error-text">{errors.username}</p>}
            </div>
          )}

          {/* EMAIL (register only) OR IDENTIFIER (login) */}
          {mode === "register" ? (
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>
          ) : (
            <div>
              <input
                placeholder={loginType === "admin" ? "Email" : "Username or Email"}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
              {errors.identifier && <p className="error-text">{errors.identifier}</p>}
            </div>
          )}

          {/* PASSWORD */}
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
          {errors.password && <p className="error-text">{errors.password}</p>}

          {/* PASSWORD STRENGTH (register only) */}
          {mode === "register" && password && passwordStrength && (
            <div style={{ marginTop: 5, marginBottom: 10 }}>
              <div style={{
                height: 4,
                backgroundColor: "#e5e7eb",
                borderRadius: 2,
                overflow: "hidden"
              }}>
                <div style={{
                  height: "100%",
                  width: `${(passwordStrength.score / 6) * 100}%`,
                  backgroundColor: passwordStrength.color,
                  transition: "all 0.3s"
                }} />
              </div>
              <p style={{ fontSize: 12, color: passwordStrength.color, marginTop: 5 }}>
                Password strength: {passwordStrength.text}
              </p>
            </div>
          )}

          {/* CONFIRM PASSWORD (register only) */}
          {mode === "register" && (
            <div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
            </div>
          )}

          {/* FORGOT PASSWORD (login only) */}
          {mode === "login" && (
            <p
              style={{ fontSize: 13, cursor: "pointer", color: "#6366f1" }}
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </p>
          )}

          {/* ERROR/SUCCESS MESSAGES */}
          {error && <p className="error-text">{error}</p>}
          {success && <p style={{ color: "#10b981", fontSize: 14 }}>{success}</p>}

          {/* SUBMIT BUTTON */}
          <button
            className="auth-btn"
            disabled={loading}
            type="submit"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>

          {/* TOGGLE MODE */}
          <button
            className="auth-btn outline"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErrors({});
              setError("");
              setSuccess("");
            }}
            type="button"
          >
            {mode === "login" ? "Create Account" : "Back to Login"}
          </button>

        </form>

      </div>
    </div>
  );
}
