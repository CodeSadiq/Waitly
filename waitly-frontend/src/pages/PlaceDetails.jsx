import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
// import AutoWaitPopup (Removed)
// import wait storage utils (Removed)
import { formatWaitTime } from "../utils/timeFormat";
import { io } from "socket.io-client";
import "./PlaceDetails.css";

/* 📏 HELPER: Haversine Distance (km) */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* 🔥 SOCKET (SINGLE INSTANCE) */
const socket = io(import.meta.env.VITE_API_BASE || "http://localhost:5000", {
  transports: ["websocket"]
});

export default function PlaceDetails({ place, onWaitUpdated, userLocation }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  // removed auto popup state
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [crowdData, setCrowdData] = useState({}); // Mapping of counter -> crowdLevel

  const counters = Array.isArray(place?.counters)
    ? place.counters
    : [];

  /* =========================
     🔥 REAL-TIME WAIT UPDATE
     ========================= */
  useEffect(() => {
    if (!place?._id) return;

    const handler = (data) => {
      if (data.placeId !== place._id) return;

      if (typeof onWaitUpdated === "function") {
        onWaitUpdated(data);
      }
    };

    socket.on("wait-updated", handler);

    return () => {
      socket.off("wait-updated", handler);
    };
  }, [place?._id, onWaitUpdated]);

  /* =========================
     FETCH CROWD DENSITY (Initial Load)
     ========================= */
  useEffect(() => {
    if (!place || !place._id) return;

    // Fetch crowd metrics for each counter
    // (Optimization: Backend could send this in 'place' object directly later)
    counters.forEach(counter => {
      fetch(`${import.meta.env.VITE_API_BASE}/api/queue/stats?placeId=${place._id}&counterIndex=${counters.indexOf(counter)}`)
        .then(res => res.json())
        .then(data => {
          setCrowdData(prev => ({ ...prev, [counter.name]: data }));
        })
        .catch(err => console.error("Crowd fetch error", err));
    });
  }, [place]);


  if (!place) {
    return (
      <div className="place-details-empty">
        <p>Select a place to view details</p>
      </div>
    );
  }

  if (place.isUserLocation || place._id === "my-location") {
    return (
      <div className="place-details-my-location">
        <div className="my-location-title" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#ec4899">
            <path d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
          You are here
        </div>
        <div className="my-location-subtitle">
          Select a place from the list or map to see details
        </div>
      </div>
    );
  }

  return (
    <div className="place-details">
      <div className="place-details-header">
        <div className="header-info">
          <h2>{place.name}</h2>
          <span className="rating">⭐ {place.rating || "4.8 (120)"}</span>
        </div>
        <button
          className="close-details-btn"
          onClick={() =>
            window.dispatchEvent(new Event("close-place-details"))
          }
          aria-label="Close details"
        >
          ✕
        </button>
      </div>

      <p className="place-address">
        {place.address || "Address not available"}
      </p>

      {/* CHANGED SECTION TITLE */}
      <h4 className="section-heading">Crowd & Wait Times</h4>

      <div className="wait-times">
        {counters.length > 0 ? (
          counters.map((counter, index) => {
            // Using logic-based averages now, not user reported
            const stats = crowdData[counter.name];
            const density = stats?.crowdLevel || "Unknown";

            let densityIcon = (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
            );
            let densityColor = "gray";

            if (density === "Low") { densityColor = "low"; }
            if (density === "Moderate") { densityColor = "medium"; }
            if (density === "High") { densityColor = "high"; }
            if (density === "Critical") {
              densityColor = "critical";
              densityIcon = (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z" />
                </svg>
              );
            }

            return (
              <div key={index} className="wait-row">
                <span className="wait-label top-aligned">
                  <span className="counter-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </span>
                  {counter.name}
                </span>

                <div className="crowd-info">
                  <div className={`crowd-badge ${densityColor}`}>
                    <span>{density} Crowd</span>
                  </div>
                  <span className="avg-service">
                    avg speed {crowdData[counter.name]?.currentPace || 10}min/service
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p>No counters available</p>
        )}
      </div>

      {user && (user.role === 'staff' || user.role === 'admin') ? (
        <button
          className="join-queue-btn"
          style={{ opacity: 0.6, cursor: 'not-allowed', background: '#94a3b8' }}
          disabled
        >
          View Only Mode ({user.role})
        </button>
      ) : (
        <>
          {counters.some((c) => c.queueWait?.enabled) ? (
            <button
              className="join-queue-btn"
              onClick={() => {
                if (!user) {
                  setShowLoginPrompt(true);
                  return;
                }
                navigate(`/join-queue/${place._id}`);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Join Virtual Queue
            </button>
          ) : (
            <button
              className="join-queue-btn"
              style={{ opacity: 0.6, cursor: "not-allowed", background: "#6b7280" }}
              disabled
            >
              Queue Not Active
            </button>
          )}

          {/* REMOVED UPDATE WAIT TIME BUTTON */}
        </>
      )}

      {/* REMOVED AutoWaitPopup COMPONENT */}

      {/* LOGIN PROMPT MODAL */}
      {showLoginPrompt && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Login Required</h3>
            <p>You need to be logged in as a user to access this feature.</p>
            <div className="actions">
              <button
                onClick={() => navigate("/login")}
                className="submit-btn"
              >
                Login Now
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
