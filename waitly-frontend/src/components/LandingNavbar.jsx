import { useNavigate } from "react-router-dom";
import "./LandingNavbar.css";

export default function LandingNavbar() {
    const navigate = useNavigate();

    return (
        <nav className="landing-navbar">
            <div className="landing-nav-content">
                {/* Logo */}
                <div className="landing-nav-logo" onClick={() => navigate("/")}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>WAITLY</span>
                </div>

                {/* Navigation Links */}
                <div className="landing-nav-links">
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How It Works</a>
                    <a href="#about">About</a>
                </div>

                {/* CTA Buttons */}
                <div className="landing-nav-actions">
                    <button className="nav-signin" onClick={() => navigate("/login")}>
                        Sign In
                    </button>
                    <button className="nav-getstarted" onClick={() => navigate("/map")}>
                        Get Started
                    </button>
                </div>
            </div>
        </nav>
    );
}
