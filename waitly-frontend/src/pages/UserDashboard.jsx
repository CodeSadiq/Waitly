import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
import QRCode from "react-qr-code";
import "./UserDashboard.css";

// Single socket instance
const socket = io(API_BASE, {
    withCredentials: true
});

export default function UserDashboard() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(true);

    // Redirect if not user
    useEffect(() => {
        if (user && user.role !== "user") {
            navigate("/");
        }
    }, [user, navigate]);

    // Fetch tickets
    const fetchTickets = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/queue/my-tickets`, {
                credentials: "include"
            });

            if (!res.ok) throw new Error();

            const data = await res.json();
            setTickets(data || []);
        } catch {
            setTickets([]);
        } finally {
            setLoadingTickets(false);
        }
    };

    useEffect(() => {
        fetchTickets();

        // Listen for updates
        socket.off("token-updated");
        socket.on("token-updated", fetchTickets);

        return () => socket.off("token-updated");
    }, []); // eslint-disable-line

    if (!user) return <div className="dashboard-loading">Loading...</div>;

    return (
        <div className="user-dashboard-layout">
            {/* SIDEBAR / PROFILE SECTION */}
            <aside className="dashboard-sidebar">
                <div className="profile-card">
                    <div className="avatar">
                        {user.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <h3>{user.username}</h3>
                    <p className="email">{user.email}</p>
                    <div className="role-batch">{user.role}</div>

                    <div className="profile-stats">
                        <div className="stat">
                            <span className="value">{tickets.length}</span>
                            <span className="label">Active Tickets</span>
                        </div>
                    </div>

                    <button onClick={() => logout().then(() => navigate("/login"))} className="logout-btn-dash">
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="dashboard-content">
                <header className="content-header">
                    <h1>My Dashboard</h1>
                    <p>Welcome back, manage your queues and tickets here.</p>
                </header>

                <section className="tickets-section">
                    <h2>🎟 Active Tickets</h2>

                    {loadingTickets ? (
                        <div className="loading-state">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🎫</div>
                            <h3>No tickets at the moment</h3>
                            <p>Join a queue to see your ticket here.</p>
                            <button onClick={() => navigate("/")} className="primary-btn">
                                Browse Places
                            </button>
                        </div>
                    ) : (
                        <div className="dashboard-ticket-grid">
                            {tickets.map((ticket) => {
                                const isActive = ticket.status === "Waiting";
                                const displayStatus = ticket.status === "Skipped" ? "Expired" : ticket.status;

                                return (
                                    <div key={ticket._id} className="dash-ticket-card">
                                        <div className="card-header">
                                            <span className={`status-badge ${ticket.status.toLowerCase()}`}>
                                                {displayStatus}
                                            </span>
                                            <span className="ticket-date">
                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="card-body">
                                            <div className="place-info">
                                                <h4>{ticket.place?.name}</h4>
                                                <p>{ticket.place?.address}</p>
                                            </div>

                                            {/* Booking Name */}
                                            <div className="booking-info" style={{ marginBottom: '15px' }}>
                                                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Booking For</span>
                                                <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>
                                                    {ticket.userName}
                                                </span>
                                            </div>

                                            <div className="token-display">
                                                <span className="token-label">Token ID</span>
                                                <span className="token-value">{ticket.tokenCode}</span>
                                            </div>

                                            <div className="qr-wrapper">
                                                <QRCode value={ticket.tokenCode} size={80} />
                                            </div>

                                            {isActive && (
                                                <div className="queue-stats">
                                                    <div className="q-stat">
                                                        <span className="val">{ticket.peopleAhead}</span>
                                                        <span className="lbl">People Ahead</span>
                                                    </div>
                                                    <div className="q-stat">
                                                        <span className="val">{ticket.estimatedWait}m</span>
                                                        <span className="lbl">Est. Wait</span>
                                                    </div>
                                                    <div className="q-stat">
                                                        <span className="val">{ticket.counterName}</span>
                                                        <span className="lbl">Counter</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
