import { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";
import { AuthContext } from "../context/AuthContext";
import { validateLoginForm, validateRegisterForm, getPasswordStrength } from "../utils/validators";
import API_BASE from "../config/api";

export default function Login() {
  const { user, loading: authLoading, login, register, loadUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect mode and role from query params
  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get("role") || "user";
  const initialMode = location.pathname.includes("register") || queryParams.get("mode") === "register" ? "register" : "login";

  const [mode, setMode] = useState(initialMode);

  // Form fields
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(initialRole);
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  /* 🔥 Load user on mount */
  useEffect(() => {
    loadUser();

    // Handle Google Auth redirects
    const status = queryParams.get("status");
    if (status === "success") {
      const isNew = queryParams.get("isNew") === "true";
      const userRole = queryParams.get("role");
      const isVerified = queryParams.get("verified") === "true";

      if (isNew) {
        setSuccess(`Welcome! You've successfully signed up as ${userRole.toUpperCase()}. ${isVerified ? "Your email has been verified via Google." : ""}`);
      } else {
        setSuccess(`Login successful! ${isVerified ? "Email verified via Google." : ""}`);
      }

      // Re-load user to get the profile view
      loadUser();
      // Remove query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === "error") {
      setError(queryParams.get("message") || "Authentication failed");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // If query params change, update states
    if (queryParams.get("role")) setRole(queryParams.get("role"));
    if (location.pathname.includes("register")) setMode("register");
    else if (location.pathname.includes("login")) setMode("login");
  }, [location]);

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
        <div className="auth-card profile-card modern">
          <div className="profile-header">
            {success && <div className="success-banner animate-slide-down">{success}</div>}

            <div className="avatar-wrapper">
              <div className="profile-avatar-modern">
                {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </div>
              {(user.isVerified || user.role === "staff") && (
                <div className="verified-check" title="Verified Account">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>

            <div className="profile-titles">
              <span className={`role-tag ${user.role}`}>{user.role}</span>
              <h2>{user.username || "Anonymous User"}</h2>
              <p className="handle">@{user.username || user.email.split('@')[0]}</p>
            </div>
          </div>

          <div className="profile-info-grid">
            <div className="info-cell">
              <label>Primary Email</label>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button
              className="btn-dashboard"
              onClick={() => {
                if (user.role === "admin") navigate("/admin/dashboard");
                else if (user.role === "staff") navigate("/staff/dashboard");
                else navigate("/user/dashboard");
              }}
            >
              Open Dashboard
            </button>

            <div className="btn-group-secondary">
              <button className="btn-ghost" onClick={() => navigate("/")}>
                Return Home
              </button>
              <button className="btn-ghost danger" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>
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

        <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
          {/* ROLE SELECTOR (only for register) */}
          {mode === "register" && (
            <div className="role-select">
              {["user", "staff"].map(r => (
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

        <div className="divider">
          <span>OR CONTINUE WITH</span>
        </div>

        {/* GOOGLE OAUTH BUTTON (At the bottom) */}
        {mode === "register" && (
          <p className="google-signup-hint">
            You are signing up as a <strong>{role.toUpperCase()}</strong>
          </p>
        )}
        <button
          type="button"
          className="google-auth-btn-v2"
          onClick={() => {
            window.location.href = `${API_BASE}/api/auth/google?role=${role}`;
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

      </div>
    </div>
  );
}
