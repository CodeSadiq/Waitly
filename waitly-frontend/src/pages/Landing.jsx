import { useNavigate } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Smart Queue Management</span>
                    </div>

                    <h1 className="hero-title">
                        <span className="brand-highlight">WAITLY</span>
                        <span className="title-main">Skip the Line,</span>
                        <span className="title-gradient">Save Your Time</span>
                    </h1>

                    <p className="hero-description">
                        Join virtual queues from anywhere, track real-time wait times, and get notified when it's your turn.
                        Say goodbye to physical waiting and hello to <span className="highlight-text">freedom</span>.
                    </p>

                    <div className="cta-buttons">
                        <button className="cta-primary" onClick={() => navigate("/map")}>
                            <span>Book Ticket</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>

                    </div>

                    <div className="hero-stats">
                        <div className="stat-item">
                            <div className="stat-number">10K+</div>
                            <div className="stat-label">Active Users</div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <div className="stat-number">500+</div>
                            <div className="stat-label">Partner Venues</div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <div className="stat-number">50K+</div>
                            <div className="stat-label">Hours Saved</div>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="floating-card card-1">
                        <div className="card-icon green">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        </div>
                        <div className="card-text">
                            <div className="card-title">Low Crowd</div>
                            <div className="card-subtitle">~5 min wait</div>
                        </div>
                    </div>

                    <div className="floating-card card-2">
                        <div className="card-icon purple">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>
                        <div className="card-text">
                            <div className="card-title">Nearby</div>
                            <div className="card-subtitle">12 places found</div>
                        </div>
                    </div>

                    <div className="floating-card card-3">
                        <div className="card-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <div className="card-text">
                            <div className="card-title">Token #42</div>
                            <div className="card-subtitle">Your turn soon!</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" id="features">
                <h2 className="section-title">Why Choose Waitly?</h2>
                <p className="section-subtitle">Everything you need for a seamless waiting experience</p>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon blue-gradient">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <h3 className="feature-title">Real-Time Updates</h3>
                        <p className="feature-description">
                            Join now or book a slot. See live wait times and crowd levels.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon green-gradient">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>
                        <h3 className="feature-title">Join Anywhere</h3>
                        <p className="feature-description">
                            Find nearby places on the map and join the line from your phone.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon orange-gradient">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                        <h3 className="feature-title">Safe & Private</h3>
                        <p className="feature-description">
                            Your data is safe and your visits are always kept private.
                        </p>
                    </div>


                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works-section" id="how-it-works">
                <h2 className="section-title">How It Works</h2>
                <p className="section-subtitle">Get started in three simple steps</p>

                <div className="steps-container">
                    <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h3 className="step-title">Find a Place</h3>
                            <p className="step-description">
                                Browse nearby locations on the map or search for a specific place you want to visit.
                            </p>
                        </div>
                    </div>

                    <div className="step-connector"></div>

                    <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h3 className="step-title">Join the Queue</h3>
                            <p className="step-description">
                                Select your preferred counter, join the virtual queue, and receive your token number.
                            </p>
                        </div>
                    </div>

                    <div className="step-connector"></div>

                    <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h3 className="step-title">Get Notified</h3>
                            <p className="step-description">
                                Relax while you wait. We'll notify you when it's your turn to be served.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Ready to Skip the Wait?</h2>
                    <p className="cta-description">
                        Join thousands of users who are saving time every day with Waitly.
                    </p>
                    <div className="cta-group">
                        <button className="cta-button" onClick={() => navigate("/map")}>
                            Book Ticket
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                        <button className="cta-button cta-button-secondary" onClick={() => navigate("/register?role=staff")}>
                            Register Your Place
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-container">
                    <div className="footer-top">
                        <div className="footer-brand-column">
                            <div className="footer-logo" onClick={() => navigate("/")}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>WAITLY</span>
                            </div>
                            <p className="footer-brand-desc">
                                Revolutionizing how people wait. Smart, real-time queue management for the modern world.
                            </p>
                            <div className="footer-socials">
                                <a href="#" className="social-link">𝕏</a>
                                <a href="#" className="social-link">LinkedIn</a>
                                <a href="#" className="social-link">Instagram</a>
                            </div>
                        </div>

                        <div className="footer-links-grid">
                            <div className="link-group">
                                <h4>Product</h4>
                                <a href="#features">Features</a>
                                <a href="/map">Exploration</a>
                                <a href="#">Business Portal</a>
                            </div>
                            <div className="link-group">
                                <h4>Company</h4>
                                <a href="#">About Us</a>
                                <a href="#">Careers</a>
                                <a href="#">Contact</a>
                            </div>
                            <div className="link-group">
                                <h4>Legal</h4>
                                <a href="#">Privacy</a>
                                <a href="#">Terms</a>
                                <a href="#">Security</a>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <div className="footer-copyright">
                            © {new Date().getFullYear()} WAITLY. Built for efficiency.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
