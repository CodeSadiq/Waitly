import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "../assets/icons/logo.png";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = localStorage.getItem("waitly_role");

  const handleLogout = () => {
    localStorage.removeItem("waitly_role");
    setMenuOpen(false);
    setProfileOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    return () => {
      setMenuOpen(false);
      setProfileOpen(false);
    };
  }, []);

  useEffect(() => {
    if (menuOpen) document.body.classList.add("menu-open");
    else document.body.classList.remove("menu-open");

    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  return (
    <header className="navbar-wrapper">
      <div className="navbar">
        {/* LEFT */}
        <div className="nav-left" onClick={() => navigate("/")}>
          <img src={Logo} alt="logo" style={{ height: "28px" }} />
          <span>WAITLY</span>
        </div>

        {/* HAMBURGER */}
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>

        {/* CENTER */}
        <nav className={`nav-center ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>

          <NavLink to="/about" onClick={() => setMenuOpen(false)}>
            About
          </NavLink>

          <NavLink to="/contact" onClick={() => setMenuOpen(false)}>
            Contact
          </NavLink>

          {/* ✅ MY TICKET (USER ONLY) */}
          {role === "USER" && (
            <NavLink to="/my-ticket" onClick={() => setMenuOpen(false)}>
              My Ticket
            </NavLink>
          )}

          {/* MOBILE AUTH */}
          <div className="mobile-auth">
            {!role ? (
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
                {role === "ADMIN" && (
                  <button
                    className="admin-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/admin/dashboard");
                    }}
                  >
                    Admin Dashboard
                  </button>
                )}

                {role === "STAFF" && (
                  <button
                    className="admin-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/staff/dashboard");
                    }}
                  >
                    Staff Dashboard
                  </button>
                )}

                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>

        {/* RIGHT DESKTOP */}
        <div className="nav-right">
          {!role ? (
            <button className="login-btn" onClick={() => navigate("/login")}>
              Login
            </button>
          ) : (
            <>
              {/* ✅ MY TICKET DESKTOP */}
              {role === "USER" && (
                <button
                  className="ticket-btn"
                  onClick={() => navigate("/my-ticket")}
                >
                  My Ticket
                </button>
              )}

              {role === "ADMIN" && (
                <button
                  className="admin-btn"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  Admin
                </button>
              )}

              {role === "STAFF" && (
                <button
                  className="admin-btn"
                  onClick={() => navigate("/staff/dashboard")}
                >
                  Staff
                </button>
              )}

              <div className="profile">
                <span onClick={() => setProfileOpen(!profileOpen)}>👤</span>

                {profileOpen && (
                  <div className="dropdown">
                    <p className="role">{role}</p>
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
