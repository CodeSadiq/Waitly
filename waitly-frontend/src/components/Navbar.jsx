import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";
import logoImg from "../assets/icons/logo.png";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const dropdownRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const role = user?.role;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    setProfileOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (menuOpen) document.body.classList.add("menu-open");
    else document.body.classList.remove("menu-open");
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const isLanding = location.pathname === "/";

  return (
    <nav className={`landing-navbar ${scrolled ? "scrolled" : ""} ${!isLanding ? "non-landing" : ""}`}>
      <div className="landing-nav-content">
        {/* LEFT: Logo */}
        <div className="landing-nav-logo" onClick={() => navigate("/")}>
          <img src={logoImg} alt="Waitly Logo" className="logo-img" />
          <span>WAITLY</span>
        </div>

        {/* CENTER: Navigation Links (Desktop) */}
        <div className="landing-nav-links desktop-only">
          <NavLink to="/">Home</NavLink>
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How It Works</a>
          <NavLink to="/map">Explore Map</NavLink>
        </div>

        {/* RIGHT: Auth & Hamburger */}
        <div className="landing-nav-actions">
          {!user ? (
            <button className="landing-nav-btn-primary desktop-only" onClick={() => navigate("/login")}>
              Sign In
            </button>
          ) : (
            <div className="profile desktop-only" ref={dropdownRef}>
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

          {/* HAMBURGER BTN */}
          <button
            className={`hamburger ${menuOpen ? "active" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <div className={`mobile-drawer ${menuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-links">
          <NavLink to="/" onClick={() => setMenuOpen(false)}>Home</NavLink>
          <a href="/#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="/#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
          <NavLink to="/map" onClick={() => setMenuOpen(false)}>Explore Map</NavLink>

          <div className="mobile-divider"></div>

          {user ? (
            <>
              <div className="mobile-user-profile">
                <div className="mobile-avatar">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <div className="mobile-user-details">
                  <span className="mobile-role">{role}</span>
                  <span className="mobile-username">{user.username}</span>
                </div>
              </div>
              {role === "user" && <NavLink to="/user/dashboard">My Dashboard</NavLink>}
              {role === "staff" && <NavLink to="/staff/dashboard">Staff Panel</NavLink>}
              {role === "admin" && <NavLink to="/admin/dashboard">Admin Console</NavLink>}
              <button className="mobile-logout-btn" onClick={handleLogout}>Log Out</button>
            </>
          ) : (
            <button className="mobile-signin-btn" onClick={() => navigate("/login")}>
              Sign In to Waitly
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
