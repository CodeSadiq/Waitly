import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import Logo from "../assets/icons/logo.png";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);          // profile dropdown
  const [menuOpen, setMenuOpen] = useState(false); // mobile hamburger

  const auth = JSON.parse(localStorage.getItem("auth"));

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/login");
  };

  return (
    <header className="navbar-wrapper">
      <div className="navbar">
        {/* LEFT */}
        <div className="nav-left" onClick={() => navigate("/")}>
          <img src={Logo} alt="logo" style={{ height: "28px" }} />
          <span>WAITLY</span>
        </div>

        {/* HAMBURGER (MOBILE ONLY) */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        {/* CENTER NAV */}
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
        </nav>

        {/* RIGHT */}
        <div className="nav-right">
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
            <div className="profile">
              <span onClick={() => setOpen(!open)}>👤</span>

              {open && (
                <div className="dropdown">
                  <p className="name">{auth.name}</p>
                  <p className="role">{auth.role.toUpperCase()}</p>

                  {auth.role === "admin" && (
                    <button onClick={() => navigate("/admin")}>
                      Admin Dashboard
                    </button>
                  )}

                  {auth.role === "staff" && (
                    <button onClick={() => navigate("/staff")}>
                      Staff Dashboard
                    </button>
                  )}

                  <button className="logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
