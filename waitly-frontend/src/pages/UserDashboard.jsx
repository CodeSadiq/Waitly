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

// Helper Component for a single ticket card
function TicketCard({ ticket, onPrint }) {
    const isActive = ticket.status === "Waiting";
    const displayStatus = ticket.status === "Skipped" ? "Expired" : ticket.status;

    return (
        <div id={`ticket-${ticket._id}`} className="dash-ticket-card printable-ticket">
            <div className="card-header">
                <span className={`status-badge ${ticket.status.toLowerCase()}`}>
                    {displayStatus}
                </span>
                <span className="ticket-date">
                    {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            <div className="card-body">
                <div className="place-info">
                    <h4>{ticket.place?.name}</h4>
                    <p>{ticket.place?.address}</p>
                </div>

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
                    <QRCode value={ticket.tokenCode} size={120} />
                </div>

                <div className="queue-stats printable-stats">
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

                {ticket.status === "Serving" && (
                    <div className="serving-msg" style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        width: '100%'
                    }}>
                        It's your turn! Please go to the counter: {ticket.counterName}
                    </div>
                )}

                <div className="ticket-actions" style={{
                    marginTop: '20px',
                    display: 'flex',
                    gap: '10px',
                    width: '100%',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '15px'
                }}>
                    <button
                        onClick={() => onPrint(ticket._id)}
                        className="action-btn print-btn"
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        Print
                    </button>
                    <button
                        onClick={() => onPrint(ticket._id)}
                        className="action-btn download-btn"
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'white' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download
                    </button>
                </div>
            </div>
        </div>
    );
}

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
            const token = localStorage.getItem('waitly_token');
            const headers = {};

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE}/api/queue/my-tickets`, {
                credentials: "include",
                headers
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

    // Print Logic
    const handlePrint = (ticketId) => {
        const ticketElement = document.getElementById(`ticket-${ticketId}`);
        if (!ticketElement) return;

        // Add a class to hide everything else
        document.body.classList.add('printing-active');
        ticketElement.classList.add('print-target');

        window.print();

        // Cleanup
        document.body.classList.remove('printing-active');
        ticketElement.classList.remove('print-target');
    };

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
                    {loadingTickets ? (
                        <div className="loading-state">Loading tickets...</div>
                    ) : (
                        <>
                            {/* ACTIVE TICKETS (WAITING & SERVING) */}
                            {tickets.filter(t => ["Waiting", "Serving"].includes(t.status)).length > 0 && (
                                <>
                                    <h2>🎟 Active Tickets</h2>
                                    <div className="dashboard-ticket-grid">
                                        {tickets
                                            .filter(t => ["Waiting", "Serving"].includes(t.status))
                                            .map((ticket) => (
                                                <TicketCard
                                                    key={ticket._id}
                                                    ticket={ticket}
                                                    onPrint={handlePrint}
                                                />
                                            ))}
                                    </div>
                                    <div style={{ margin: '40px 0' }}></div>
                                </>
                            )}

                            {/* COMPLETED TICKETS */}
                            {tickets.filter(t => t.status === "Completed").length > 0 && (
                                <>
                                    <h2>✅ Completed Today</h2>
                                    <div className="dashboard-ticket-grid">
                                        {tickets
                                            .filter(t => t.status === "Completed")
                                            .map((ticket) => (
                                                <TicketCard
                                                    key={ticket._id}
                                                    ticket={ticket}
                                                    onPrint={handlePrint}
                                                />
                                            ))}
                                    </div>
                                </>
                            )}

                            {tickets.length === 0 && (
                                <div className="empty-state">
                                    <div className="empty-icon">🎫</div>
                                    <h3>No tickets at the moment</h3>
                                    <p>Join a queue to see your ticket here.</p>
                                    <button onClick={() => navigate("/")} className="primary-btn">
                                        Browse Places
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
