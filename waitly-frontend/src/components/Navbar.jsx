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
              <div className="mobile-user-info" data-initial={user.username?.charAt(0).toUpperCase()}>
                <div className="mobile-welcome">
                  <span>Active Profile</span>
                  <span>@{user.username}</span>
                </div>
              </div>

              <div className="mobile-divider"></div>

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
                Log Out
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
                className={`profile-trigger ${profileOpen ? "active" : ""}`}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="avatar-circle">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
              </div>

              {profileOpen && (
                <div className="dropdown animate-pop">
                  <div className="dropdown-header">
                    <span className="role-badge">{role}</span>
                    <p className="name">{user.username}</p>
                    <p className="email">{user.email}</p>
                  </div>

                  <div className="dropdown-links">
                    {role === "user" && (
                      <button className="dropdown-item" onClick={() => navigate("/user/dashboard")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        User Dashboard
                      </button>
                    )}

                    {role === "admin" && (
                      <button className="dropdown-item" onClick={() => navigate("/admin/dashboard")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Admin Dashboard
                      </button>
                    )}

                    {role === "staff" && (
                      <button className="dropdown-item" onClick={() => navigate("/staff/dashboard")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Staff Dashboard
                      </button>
                    )}

                    <button onClick={handleLogout} className="dropdown-item logout">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Sign Out
                    </button>
                  </div>
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
