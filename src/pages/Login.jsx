import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = () => {
    // later → API + MongoDB
    console.log({ role, email, password });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* HEADER */}
        <div className="auth-header">
          <h2>Login to WAITLY</h2>
          <p>Choose your role to continue</p>
        </div>

        {/* ROLE SELECT */}
        <div className="role-select">
          <button
            className={`role-btn ${role === "user" ? "active" : ""}`}
            onClick={() => setRole("user")}
          >
            User
          </button>
          <button
            className={`role-btn ${role === "staff" ? "active" : ""}`}
            onClick={() => setRole("staff")}
          >
            Place Staff
          </button>
          <button
            className={`role-btn ${role === "admin" ? "active" : ""}`}
            onClick={() => setRole("admin")}
          >
            Admin
          </button>
        </div>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* ACTION BUTTONS */}
        <button className="auth-btn" onClick={handleLogin}>
          Login as {role.charAt(0).toUpperCase() + role.slice(1)}
        </button>

        <button
          className="auth-btn outline"
          onClick={() => navigate("/register")}
        >
          Create new account
        </button>

        {/* FOOTER */}
        <div className="auth-footer">
          <span>Forgot password?</span>
        </div>
      </div>
    </div>
  );
}
