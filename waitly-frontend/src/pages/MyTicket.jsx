import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { io } from "socket.io-client";
import "./MyTicket.css";
import API_BASE from "../config/api";

// 🔥 Socket must connect DIRECTLY to backend
const socket = io("http://localhost:5000", {
  withCredentials: true
});

export default function MyTicket() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH USER TICKETS ================= */
  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/queue/my-tickets`, {
        credentials: "include"
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setTickets(data || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SOCKET + LOAD ================= */
  useEffect(() => {
    fetchTickets();

    socket.off("token-updated");
    socket.on("token-updated", fetchTickets);

    return () => socket.off("token-updated");
  }, []);

  if (loading) return <p className="ticket-loading">Loading your tickets…</p>;

  if (tickets.length === 0) {
    return (
      <div className="ticket-empty">
        <h3>No tickets booked yet</h3>
        <button onClick={() => navigate("/")}>Book Now</button>
      </div>
    );
  }

  return (
    <div className="ticket-dashboard">
      <h2>🎟 My Tickets</h2>

      <div className="ticket-grid">
        {tickets.map((ticket) => {
          const isActive = ticket.status === "Waiting";
          const displayStatus =
            ticket.status === "Skipped" ? "Expired" : ticket.status;

          return (
            <div key={ticket._id} className="ticket-card">
              <div className="ticket-header">
                <h4>{ticket.place?.name}</h4>
                <span className={`status ${ticket.status}`}>
                  {displayStatus}
                </span>
              </div>

              <p className="ticket-address">{ticket.place?.address}</p>

              <div className="token-code">{ticket.tokenCode}</div>

              {/* Booking Name */}
              <p>
                <strong>Name:</strong> {ticket.userName}
              </p>

              {isActive && (
                <div className="ticket-meta">
                  <p>
                    <strong>Counter:</strong> {ticket.counterName}
                  </p>
                  <p>
                    <strong>People Ahead:</strong> {ticket.peopleAhead}
                  </p>
                  <p>
                    <strong>Estimated Wait:</strong> {ticket.estimatedWait} min
                  </p>
                </div>
              )}

              <QRCode value={ticket._id} size={110} />

              <p className="ticket-time">
                {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
