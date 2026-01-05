import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "../assets/icons/logo.png";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);   // hamburger menu
  const [profileOpen, setProfileOpen] = useState(false); // profile dropdown

  const auth = JSON.parse(localStorage.getItem("auth"));

  const handleLogout = () => {
    localStorage.removeItem("auth");
    setMenuOpen(false);
    setProfileOpen(false);
    navigate("/login");
  };


  /* =====================================================
   🚨 DEV ONLY: TEMP ADMIN AUTO LOGIN (REMOVE LATER)
   ===================================================== */
useEffect(() => {
  // ⚠️ REMOVE THIS BLOCK WHEN AUTH IS READY
  const DEV_AUTO_ADMIN = true; // ← set false or delete block later

  if (DEV_AUTO_ADMIN) {
    const existingAuth = JSON.parse(localStorage.getItem("auth"));

    if (!existingAuth) {
      const adminAuth = {
        name: "Dev Admin",
        role: "admin",
        token: "dev-token-no-auth"
      };

      localStorage.setItem("auth", JSON.stringify(adminAuth));
      navigate("/admin"); // routes to AdminDashboard.jsx
    }
  }
}, [navigate]);





  // Close hamburger on route change
  useEffect(() => {
    return () => {
      setMenuOpen(false);
      setProfileOpen(false);
    };
  }, []);


  useEffect(() => {
  if (menuOpen) {
    document.body.classList.add("menu-open");
  } else {
    document.body.classList.remove("menu-open");
  }

  return () => {
    document.body.classList.remove("menu-open");
  };
}, [menuOpen]);


  return (
    <header className="navbar-wrapper">
      <div className="navbar">
        {/* ================= LEFT (LOGO) ================= */}
        <div className="nav-left" onClick={() => navigate("/")}>
          <img src={Logo} alt="logo" style={{ height: "28px" }} />
          <span>WAITLY</span>
        </div>

        {/* ================= HAMBURGER ================= */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>

        {/* ================= NAV MENU (DESKTOP + MOBILE) ================= */}
        <nav className={`nav-center ${menuOpen ? "open" : ""}`}>
          {/* PRIMARY LINKS */}
          <NavLink to="/" onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>

          <NavLink to="/about" onClick={() => setMenuOpen(false)}>
            About
          </NavLink>

          <NavLink to="/contact" onClick={() => setMenuOpen(false)}>
            Contact
          </NavLink>

          {/* ================= AUTH / ADMIN (MOBILE VIEW) ================= */}
          <div className="mobile-auth">
            {!auth ? (
              <button
                className="login-btn"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/login");
                }}
              >
                Login
              </button>
            ) : (
              <>
                {/* ADMIN BUTTON (EXPLICIT) */}
                {auth.role === "admin" && (
                  <button
                    className="admin-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/admin");
                    }}
                  >
                    Admin Dashboard
                  </button>
                )}

                {/* STAFF BUTTON */}
                {auth.role === "staff" && (
                  <button
                    className="admin-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/staff");
                    }}
                  >
                    Staff Dashboard
                  </button>
                )}

                {/* LOGOUT */}
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>

        {/* ================= RIGHT (DESKTOP ONLY) ================= */}
        <div className="nav-right">
          {!auth ? (
            <button
              className="login-btn"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          ) : (
            <>
              {/* ADMIN BUTTON (DESKTOP) */}
              {auth.role === "admin" && (
                <button
                  className="admin-btn"
                  onClick={() => navigate("/admin")}
                >
                  Admin
                </button>
              )}

              {auth.role === "staff" && (
                <button
                  className="admin-btn"
                  onClick={() => navigate("/staff")}
                >
                  Staff
                </button>
              )}

              {/* PROFILE DROPDOWN */}
              <div className="profile">
                <span onClick={() => setProfileOpen(!profileOpen)}>👤</span>

                {profileOpen && (
                  <div className="dropdown">
                    <p className="name">{auth.name}</p>
                    <p className="role">{auth.role.toUpperCase()}</p>

                    <button onClick={handleLogout} className="logout">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
