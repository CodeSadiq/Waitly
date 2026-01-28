import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import { AuthContext } from "../context/AuthContext";
import { validateLoginForm, validateRegisterForm, getPasswordStrength } from "../utils/validators";
import API_BASE from "../config/api";

export default function Login() {
  const { user, loading: authLoading, login, register, loadUser } = useContext(AuthContext);

  const [mode, setMode] = useState("login");

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

  const navigate = useNavigate();

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
      // Unified login - backend determines role from account
      const result = await login({ identifier, password });

      if (result.success) {
        // Just show success; the UI will re-render with the "Welcome back" card
        // which contains the manual "Go to Dashboard/Home" button.
        setSuccess("Login successful!");
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

    setLoading(true);

    try {
      const result = await register({
        username,
        email,
        password,
        role
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
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-page">
        <div className="auth-card profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </div>
            <h2>Welcome back!</h2>
            <p className="profile-name">{user.username || user.email}</p>
          </div>

          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role</span>
              <span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span>
            </div>
          </div>

          <button
            className="auth-btn"
            onClick={() => {
              if (user.role === "admin") navigate("/admin/dashboard");
              else if (user.role === "staff") navigate("/staff/dashboard");
              else navigate("/");
            }}
          >
            {user.role === "staff" ? "Go to Staff Dashboard" : (user.role === "admin" ? "Go to Admin Dashboard" : "Go to Home")}
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

        <div className="auth-header">
          <h2>{mode === "login" ? "Welcome to WAITLY" : "Create Your Account"}</h2>
          <p>{mode === "login" ? "Sign in to continue" : "Join us today"}</p>
        </div>

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



        <form onSubmit={mode === "login" ? handleLogin : handleRegister}>

          {/* USERNAME (register only) */}
          {mode === "register" && (
            <div className="input-group">
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
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>
          ) : (
            <div className="input-group">
              <input
                placeholder="Username or Email"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
              {errors.identifier && <p className="error-text">{errors.identifier}</p>}
            </div>
          )}

          {/* PASSWORD */}
          <div className="input-group">
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          {/* PASSWORD STRENGTH (register only) */}
          {mode === "register" && password && passwordStrength && (
            <div className="password-strength">
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${(passwordStrength.score / 6) * 100}%`,
                    backgroundColor: passwordStrength.color
                  }}
                />
              </div>
              <p className="strength-text" style={{ color: passwordStrength.color }}>
                Password strength: {passwordStrength.text}
              </p>
            </div>
          )}

          {/* CONFIRM PASSWORD (register only) */}
          {mode === "register" && (
            <div className="input-group">
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
            <div className="forgot-password">
              <span onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </span>
            </div>
          )}

          {/* ERROR/SUCCESS MESSAGES */}
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}

          {/* SUBMIT BUTTON */}
          <button
            className="auth-btn"
            disabled={loading}
            type="submit"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          {/* TOGGLE MODE */}
          <div className="auth-footer">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span
              className="toggle-link"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setErrors({});
                setError("");
                setSuccess("");
              }}
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </span>
          </div>

        </form>

      </div>
    </div>
  );
}
