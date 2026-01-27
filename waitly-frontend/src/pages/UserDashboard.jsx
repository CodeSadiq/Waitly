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
function TicketCard({ ticket, onPrint, onCancel, onDelete }) {
    const isWaiting = ticket.status === "Waiting";
    const isServing = ticket.status === "Serving";
    const isInactive = ["Completed", "Cancelled", "Skipped"].includes(ticket.status);

    // Cancellation Rule: Can only cancel if wait time > 30 mins
    const canCancel = isWaiting && ticket.estimatedWait > 30;

    // Display status label
    const displayStatus = ticket.status === "Skipped" ? "Expired" : ticket.status;

    return (
        <div id={`ticket-${ticket._id}`} className="dash-ticket-card printable-ticket">
            {/* TICKET HEADER - Place & Status */}
            <div className="ticket-header-modern">
                <div className="place-info-modern">
                    <h4>{ticket.place?.name}</h4>
                    <span className="place-addr">{ticket.place?.address || "Location unavailable"}</span>
                </div>
                <div className={`status-pill-modern ${ticket.status.toLowerCase()}`}>
                    {displayStatus}
                </div>
            </div>

            <div className="ticket-body-modern">
                {/* DATE & USER ROW */}
                <div className="ticket-meta-row">
                    <div className="meta-item">
                        <span className="meta-label">Date</span>
                        <span className="meta-value">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="meta-item right">
                        <span className="meta-label">Booking For</span>
                        <span className="meta-value">{ticket.userName}</span>
                    </div>
                </div>

                {/* MAIN TOKEN DISPLAY */}
                <div className="token-display-modern">
                    <span className="token-label-xs">YOUR TOKEN</span>
                    <span className="token-code-xl">{ticket.tokenCode}</span>
                    {ticket.timeSlotLabel && (
                        <div className="slot-badge-modern">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            {ticket.timeSlotLabel}
                        </div>
                    )}
                </div>

                {/* STATS GRID */}
                <div className="stats-grid-modern">
                    <div className="stat-brick">
                        <span className="brick-val">{ticket.peopleAhead}</span>
                        <span className="brick-lbl">Ahead</span>
                    </div>
                    <div className="brick-divider"></div>
                    <div className="stat-brick">
                        <span className="brick-val">{ticket.estimatedWait}<small>m</small></span>
                        <span className="brick-lbl">Wait</span>
                    </div>
                    <div className="brick-divider"></div>
                    <div className="stat-brick">
                        <span className="brick-val" style={{ fontSize: '14px' }}>{ticket.counterName}</span>
                        <span className="brick-lbl">Counter</span>
                    </div>
                </div>

                {/* QR SECTION */}
                <div className="qr-section-modern">
                    <QRCode value={ticket.tokenCode} size={100} />
                </div>

                {/* SERVING ALERT */}
                {isServing && (
                    <div className="serving-alert-modern">
                        <div className="pulse-dot"></div>
                        It's your turn! Please proceed to {ticket.counterName}
                    </div>
                )}

                {/* ACTIONS */}
                <div className="actions-footer-modern">
                    <button onClick={() => onPrint(ticket._id)} className="action-icon-btn" title="Print Ticket">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>

                    {isWaiting && (
                        canCancel ? (
                            <button onClick={() => onCancel(ticket._id)} className="action-text-btn danger">Cancel</button>
                        ) : (
                            <span className="wait-msg-xs">You can only cancel if wait is over 30 mins</span>
                        )
                    )}

                    {isInactive && onDelete && (
                        <button onClick={() => onDelete(ticket._id)} className="action-text-btn danger">Delete</button>
                    )}
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

    // Cancel Ticket
    const handleCancel = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this ticket?")) return;
        try {
            const token = localStorage.getItem('waitly_token');
            const res = await fetch(`${API_BASE}/api/queue/cancel/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchTickets();
        } catch (err) {
            console.error(err);
        }
    };

    // Delete Ticket
    const handleDelete = async (id) => {
        if (!window.confirm("Remove this ticket from your history?")) return;
        try {
            const token = localStorage.getItem('waitly_token');
            const res = await fetch(`${API_BASE}/api/queue/delete/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchTickets();
        } catch (err) {
            console.error(err);
        }
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

                    <div className="profile-stats" style={{ justifyContent: 'space-evenly', alignItems: 'center' }}>
                        <div className="stat" style={{ alignItems: 'center' }}>
                            <span className="value" style={{ color: '#2563eb' }}>{tickets.filter(t => ["Waiting", "Serving"].includes(t.status)).length}</span>
                            <span className="label">Active Tickets</span>
                        </div>
                        <div style={{ width: '1px', background: '#e2e8f0', height: '40px' }}></div>
                        <div className="stat" style={{ alignItems: 'center' }}>
                            <span className="value" style={{ color: '#16a34a' }}>{tickets.filter(t => t.status === "Completed").length}</span>
                            <span className="label">Completed Tickets</span>
                        </div>
                    </div>
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
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                        Active Tickets
                                    </h2>
                                    <div className="dashboard-ticket-grid">
                                        {tickets
                                            .filter(t => ["Waiting", "Serving"].includes(t.status))
                                            .map((ticket) => (
                                                <TicketCard
                                                    key={ticket._id}
                                                    ticket={ticket}
                                                    onPrint={handlePrint}
                                                    onCancel={handleCancel}
                                                    onDelete={handleDelete} // Pass this too just in case
                                                />
                                            ))}
                                    </div>
                                    <div style={{ margin: '40px 0' }}></div>
                                </>
                            )}

                            {/* HISTORY / INACTIVE TICKETS */}
                            {tickets.filter(t => ["Completed", "Cancelled", "Skipped"].includes(t.status)).length > 0 && (
                                <>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        Recent History
                                    </h2>
                                    <div className="dashboard-ticket-grid">
                                        {tickets
                                            .filter(t => ["Completed", "Cancelled", "Skipped"].includes(t.status))
                                            .map((ticket) => (
                                                <TicketCard
                                                    key={ticket._id}
                                                    ticket={ticket}
                                                    onPrint={handlePrint}
                                                    onCancel={handleCancel} // Pass this too
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                    </div>
                                </>
                            )}

                            {tickets.length === 0 && (
                                <div className="empty-state">
                                    <div className="empty-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                    </div>
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
