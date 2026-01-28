import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AutoWaitPopup from "../components/AutoWaitPopup";
import { canShowPopup, hasGivenFeedback } from "../utils/waitStorage";
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
  const [showWaitPopup, setShowWaitPopup] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const autoTimerRef = useRef(null);

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
     ⏳ AUTO POPUP (LONG STAY)
     ========================= */
  /* =========================
     ⏳ SMART AUTO POPUP
     ========================= */
  useEffect(() => {
    // Cleanup previous timer
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    // 1. Basic Checks
    if (!place || !place.location || !userLocation) return;
    if (place.isUserLocation || place._id === "my-location") return;
    if (user && (user.role === 'staff' || user.role === 'admin')) return;

    // 2. Check Local Storage (Cooldown & Already Submitted)
    if (!canShowPopup(place._id)) return;
    if (hasGivenFeedback(place._id)) return;

    // 3. 🌍 Geo-Fence Check (Haversine)
    const dist = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      place.location.lat,
      place.location.lng
    );

    // 🌍 PROJECT SUBMISSION NOTE: 0.5 km (500m) is standard.
    // Change `0.5` to `50.0` to test from far away.
    if (dist > 0.5) {
      console.log(`📍 User too far (${dist.toFixed(2)}km). Popup suppressed.`);
      return;
    }

    // 4. Start Timer if all checks pass
    // 🕒 PROJECT SUBMISSION NOTE: 20000ms (20s) is standard.
    // Change to 5000 (5s) for quicker testing.
    autoTimerRef.current = setTimeout(() => {
      // 🛡️ Double check: User might have manually submitted while timer was running
      if (hasGivenFeedback(place._id)) return;
      setShowWaitPopup(true);
    }, 20000);

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [place, userLocation, user]);

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

      <h4 className="section-heading">Live Wait Times</h4>

      <div className="wait-times">
        {counters.length > 0 ? (
          counters.map((counter, index) => {
            const avg = counter.normalWait?.avgTime || 0;

            const waitClass =
              avg <= 10
                ? "wait-low"
                : avg <= 30
                  ? "wait-medium"
                  : "wait-high";

            return (
              <div key={index} className="wait-row">
                <span className="wait-label">
                  <span className="counter-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="10" width="18" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="6" y="5" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="8" r="1.2" fill="currentColor" />
                    </svg>
                  </span>
                  {counter.name}
                </span>

                <strong className={`wait-value ${waitClass}`}>
                  {avg > 0 ? formatWaitTime(avg) : "No data"}
                </strong>
              </div>
            );
          })
        ) : (
          <p>No counters available</p>
        )}
      </div>

      <div className="best-time">
        <h4 className="section-heading">Best Time to Visit</h4>
        <p className="muted">🚧 Future Enhancement</p>
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

          <button
            className="join-queue-btn secondary"
            onClick={() => setShowWaitPopup(true)}
          >
            Update Wait Time
          </button>
        </>
      )}

      {showWaitPopup && (
        <AutoWaitPopup
          place={place}
          onClose={() => setShowWaitPopup(false)}
          onWaitUpdated={onWaitUpdated}
        />
      )}

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
