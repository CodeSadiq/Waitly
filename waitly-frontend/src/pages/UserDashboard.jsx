import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
import QRCode from "react-qr-code";
import html2pdf from "html2pdf.js";
import { formatWaitTime } from "../utils/timeFormat";
import "./UserDashboard.css";

// Single socket instance
const socket = io(API_BASE, {
    withCredentials: true
});


// Custom Confirmation Modal Component
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type = "primary" }) {
    if (!isOpen) return null;
    return (
        <div className="confirm-modal-overlay">
            <div className={`confirm-modal-card ${type}`}>
                <div className="confirm-modal-icon">
                    {type === "danger" ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    )}
                </div>
                <h3>{title}</h3>
                <p>{message}</p>
                <div className="confirm-modal-actions">
                    <button className="confirm-btn-cancel" onClick={onCancel}>Cancel</button>
                    <button className={`confirm-btn-action ${type}`} onClick={onConfirm}>
                        {type === "danger" ? "Yes, Delete" : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
}


// Helper Component for a single ticket card
function TicketCard({ ticket, onPrint, onCancel, onDelete, isHistory }) {
    const isWaiting = ticket.status === "Waiting";
    const isServing = ticket.status === "Serving";
    const isInactive = ["Completed", "Cancelled", "Skipped", "Expired"].includes(ticket.status);

    // Cancellation Rule: 
    // Walk-in: Can cancel if wait > 30 mins
    // Slotted: Disabled when slotted time is under next 30 min
    const isSlotted = !!ticket.timeSlotLabel;
    const canCancel = isWaiting; // Simplified: users should generally be able to cancel if waiting.


    // Display status label
    const displayStatus = ticket.status;

    return (
        <div id={`ticket-${ticket._id}`} className={`dash-ticket-card printable-ticket ${isHistory ? 'is-history' : ''}`}>
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
                        <div style={{ textAlign: 'right' }}>
                            <span className="meta-value">{ticket.userName}</span>
                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>
                                {ticket.category || "General Service"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN TOKEN DISPLAY */}
                <div className="token-display-modern">
                    <span className="token-label-xs">YOUR TOKEN</span>
                    <span className="token-code-xl" style={{ color: ticket.timeSlotLabel ? '#16a34a' : '#1e293b' }}>{ticket.tokenCode}</span>
                </div>

                {/* STATS GRID - 3 COLUMNS ALWAYS */}
                <div className="stats-grid-modern">
                    {ticket.timeSlotLabel ? (
                        <>
                            <div className="stat-brick">
                                <span className="brick-val" style={{ fontSize: '13px', lineHeight: '1.2', fontWeight: '800' }}>
                                    <span style={{ display: 'block' }}>{ticket.timeSlotLabel?.split(', ')[0]}</span>
                                    <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, marginTop: '2px', fontWeight: '600' }}>{ticket.timeSlotLabel?.split(', ')[1]}</span>
                                </span>
                                <span className="brick-lbl">Slot</span>
                            </div>
                            <div className="brick-divider"></div>
                            <div className="stat-brick">
                                <span className="brick-val" style={{ fontSize: '15px', fontWeight: '800', color: '#16a34a' }}>Slotted</span>
                                <span className="brick-lbl">Type</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="stat-brick">
                                <span className="brick-val" style={{ fontSize: '15px', fontWeight: '800' }}>{ticket.peopleAhead}</span>
                                <span className="brick-lbl">Ahead</span>
                            </div>
                            <div className="brick-divider"></div>
                            <div className="stat-brick">
                                <span className="brick-val" style={{ fontSize: '15px', fontWeight: '800' }}>{formatWaitTime(ticket.estimatedWait)}</span>
                                <span className="brick-lbl">Wait</span>
                            </div>
                        </>
                    )}
                    <div className="brick-divider"></div>
                    <div className="stat-brick">
                        <span className="brick-val" style={{ fontSize: '13px', fontWeight: '800' }}>{ticket.counterName}</span>
                        <span className="brick-lbl">Counter</span>
                    </div>
                </div>

                {/* INFO / ALERT SECTION - FIXED HEIGHT ZONE */}
                <div className="ticket-info-zone">
                    {isWaiting ? (
                        ticket.timeSlotLabel ? (
                            <div className="info-msg walkin-msg">
                                <strong>Note:</strong> Please reach the counter on time. You may experience a slight delay due to the ticket currently being served ahead of you.
                            </div>
                        ) : (
                            <div className="info-msg walkin-msg">
                                <strong>Note:</strong> Wait: {formatWaitTime(ticket.estimatedWait)} from counter opening time.
                            </div>
                        )
                    ) : isServing ? (
                        <div className="info-msg serving-msg">
                            <div className="pulse-dot"></div>
                            It's your turn! Proceed to {ticket.counterName}
                        </div>
                    ) : (
                        <div className="info-msg placeholder-msg">
                            Ticket status: {ticket.status}
                        </div>
                    )}
                </div>

                {/* QR SECTION */}
                <div className="qr-section-modern">
                    <QRCode value={ticket.tokenCode} size={80} />
                </div>

                {/* ACTIONS */}
                <div className="actions-footer-modern">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPrint(ticket._id);
                        }}
                        className="action-icon-btn"
                        title="Print Ticket"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>

                    {isWaiting && (
                        canCancel ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Cancel Clicked for:", ticket._id);
                                    onCancel(ticket._id);
                                }}
                                className="action-text-btn danger"
                            >
                                Cancel Ticket
                            </button>
                        ) : (
                            <span className="wait-msg-xs">
                                {isSlotted
                                    ? "Not cancellable in last 30m"
                                    : "Cancellation: Wait > 30m"
                                }
                            </span>
                        )
                    )}

                    {isInactive && onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log("Delete Clicked for:", ticket._id);
                                onDelete(ticket._id);
                            }}
                            className="action-text-btn danger"
                        >
                            Delete
                        </button>
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
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: null,
        type: "primary"
    });

    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

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

    // Print / PDF Logic
    const handlePrint = (ticketId) => {
        const ticketElement = document.getElementById(`ticket-${ticketId}`);
        if (!ticketElement) return;

        // Configuration for html2pdf
        const opt = {
            margin: 10,
            filename: `Waitly_Ticket_${ticketId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Custom styling for PDF generation - we need to make sure the target looks good
        // We temporarily add a class that html2pdf can use to apply specific styles
        ticketElement.classList.add('pdf-generation');

        // Generate PDF
        html2pdf().set(opt).from(ticketElement).save().then(() => {
            ticketElement.classList.remove('pdf-generation');
        }).catch(err => {
            console.error("PDF Generation Error:", err);
            ticketElement.classList.remove('pdf-generation');
            // Fallback to browser print if PDF fails
            window.print();
        });
    };

    // Cancel Ticket
    const handleCancel = (id) => {
        setConfirmModal({
            isOpen: true,
            title: "Cancel Ticket?",
            message: "Are you sure you want to cancel this ticket? You will lose your position in the queue.",
            type: "danger",
            onConfirm: async () => {
                closeConfirm();
                try {
                    const token = localStorage.getItem('waitly_token');
                    const res = await fetch(`${API_BASE}/api/queue/cancel/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        credentials: "include"
                    });
                    if (res.ok) fetchTickets();
                } catch (err) {
                    console.error("Cancel Error:", err);
                }
            }
        });
    };

    // Delete Ticket
    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: "Remove Ticket?",
            message: "This will permanently remove the ticket from your history. This action cannot be undone.",
            type: "danger",
            onConfirm: async () => {
                closeConfirm();
                try {
                    const token = localStorage.getItem('waitly_token');
                    const res = await fetch(`${API_BASE}/api/queue/delete/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        credentials: "include"
                    });
                    if (res.ok) fetchTickets();
                } catch (err) {
                    console.error("Delete Error:", err);
                }
            }
        });
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
                        <div className="empty-state">
                            <div className="pulse-dot" style={{ margin: '0 auto 16px' }}></div>
                            <h3>Loading your tickets...</h3>
                            <p>We're fetching your latest queue status.</p>
                        </div>
                    ) : (
                        <>
                            {/* ACTIVE TICKETS (WAITING & SERVING) */}
                            {tickets.filter(t => ["Waiting", "Serving"].includes(t.status)).length > 0 && (
                                <>
                                    <h2>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                        Active Tickets
                                    </h2>
                                    <div className="dashboard-ticket-grid">
                                        {tickets
                                            .filter(t => ["Waiting", "Serving"].includes(t.status))
                                            .sort((a, b) => {
                                                // Priority 1: Serving status
                                                if (a.status === "Serving" && b.status !== "Serving") return -1;
                                                if (b.status === "Serving" && a.status !== "Serving") return 1;
                                                // Priority 2: Creation date (oldest first for active queue)
                                                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                                            })
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
                            {tickets.filter(t => ["Completed", "Cancelled", "Skipped", "Expired"].includes(t.status)).length > 0 && (
                                <>
                                    <h2>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        Recent History
                                    </h2>
                                    <div className="dashboard-ticket-grid">
                                        {tickets
                                            .filter(t => ["Completed", "Cancelled", "Skipped", "Expired"].includes(t.status))
                                            .sort((a, b) => {
                                                const timeA = new Date(a.completedAt || a.createdAt).getTime();
                                                const timeB = new Date(b.completedAt || b.createdAt).getTime();
                                                return timeB - timeA;
                                            })
                                            .map((ticket) => (
                                                <TicketCard
                                                    key={ticket._id}
                                                    ticket={ticket}
                                                    onPrint={handlePrint}
                                                    onCancel={handleCancel}
                                                    onDelete={handleDelete}
                                                    isHistory={true}
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
            {/* CONFIRMATION MODAL */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirm}
            />
        </div>
    );
}
