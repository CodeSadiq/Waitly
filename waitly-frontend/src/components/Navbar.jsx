import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import Logo from "../assets/icons/logo.png";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const dropdownRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = user?.role;

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    setProfileOpen(false);
    navigate("/login");
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) document.body.classList.add("menu-open");
    else document.body.classList.remove("menu-open");
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  // Close menus on navigation
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  return (
    <header className="navbar-wrapper">
      <div className="navbar">
        {/* LEFT: Logo */}
        <div className="nav-left" onClick={() => navigate("/")}>
          <img src={Logo} alt="Waitly" />
          <span>WAITLY</span>
        </div>

        {/* CENTER (MOBILE DRAWER): Navigation & Mobile-Profile */}
        <nav className={`nav-center ${menuOpen ? "open" : ""}`}>
          {/* MOBILE ONLY: PROFILE HEADER */}


          {/* SHARED LINKS */}
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>

          {/* MOBILE ONLY: LOGGED IN OPTIONS */}
          {user && (
            <div className="mobile-only-links">
              <div className="mobile-divider"></div>
              <div className="mobile-user-info">
                <span className="mobile-welcome">Hi, {user.username}</span>
              </div>

              {role === "user" && (
                <NavLink to="/user/dashboard">User Dashboard</NavLink>
              )}
              {role === "staff" && (
                <NavLink to="/staff/dashboard">Staff Dashboard</NavLink>
              )}
              {role === "admin" && (
                <NavLink to="/admin/dashboard">Admin Dashboard</NavLink>
              )}

              <button className="mobile-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}

          {/* MOBILE ONLY: LOGIN BUTTON (if guest) */}
          {!user && (
            <div className="mobile-guest-footer">
              <div className="mobile-divider"></div>
              <button className="mobile-login-full" onClick={() => navigate("/login")}>
                Login / Join Waitly
              </button>
            </div>
          )}
        </nav>

        {/* RIGHT: Desktop Auth Actions */}
        <div className="nav-right">
          {!user ? (
            <button className="login-btn" onClick={() => navigate("/login")}>
              Login
            </button>
          ) : (
            <div className="profile" ref={dropdownRef}>
              <div
                className="profile-trigger"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                {user.username?.charAt(0).toUpperCase() || "👤"}
              </div>

              {profileOpen && (
                <div className="dropdown">
                  <div className="dropdown-header">
                    <span className="role">{role}</span>
                    <span className="name">{user.username}</span>
                  </div>

                  {role === "user" && (
                    <button className="dropdown-item" onClick={() => navigate("/user/dashboard")}>
                      <span>🏠</span> User Dashboard
                    </button>
                  )}

                  {role === "admin" && (
                    <button className="dropdown-item" onClick={() => navigate("/admin/dashboard")}>
                      <span>🛡️</span> Admin Dashboard
                    </button>
                  )}

                  {role === "staff" && (
                    <button className="dropdown-item" onClick={() => navigate("/staff/dashboard")}>
                      <span>📋</span> Staff Dashboard
                    </button>
                  )}

                  <button onClick={handleLogout} className="dropdown-item logout">
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HAMBURGER: Menu toggle */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <div className={`burger-icon ${menuOpen ? "active" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </header>
  );
}
