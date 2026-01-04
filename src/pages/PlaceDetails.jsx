import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import AutoWaitPopup from "../components/AutoWaitPopup";
import "./PlaceDetails.css"
export default function PlaceDetails({ place }) {
  const navigate = useNavigate();
  const [showWaitPopup, setShowWaitPopup] = useState(false);
  const autoTimerRef = useRef(null);

  const counters = Array.isArray(place?.counters)
    ? place.counters
    : [];

  /* =========================
     ⏳ AUTO POPUP (LONG STAY)
     ========================= */
  useEffect(() => {
    // Always clear old timer
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    if (!place) return;

    // 🔥 DO NOT trigger auto popup for My Location
    if (place.isUserLocation || place._id === "my-location") return;

    autoTimerRef.current = setTimeout(() => {
      setShowWaitPopup(true);
    }, 20000);

    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [place?._id]);

  /* =========================
     🧱 UI
     ========================= */

  // No selection
  if (!place) {
    return (
      <div className="place-details-empty">
        <p>Select a place to view details</p>
      </div>
    );
  }

  // 🔥 MY LOCATION (SPECIAL CASE)
  if (place.isUserLocation || place._id === "my-location") {
    return (
      <div className="place-details-my-location">
        <div className="my-location-title">📍 You are here</div>
        <div className="my-location-subtitle">
          Select a place from the list or map to see details
        </div>
      </div>
    );
  }

  // ✅ NORMAL PLACE DETAILS
  return (
    <div className="place-details">
      {/* Header */}
      <div className="place-details-header">
        <h2>{place.name}</h2>
        <span className="rating">⭐ N/A</span>
      </div>

      {/* Address */}
      <p className="place-address">
        {place.address || "Address not available"}
      </p>

      {/* Live Wait Times */}
      <h4 className="section-heading">Live Wait Times</h4>

      <div className="wait-times">
        {counters.length > 0 ? (
          counters.map((counter, index) => (
            <div key={index} className="wait-row">
              <span className="wait-label">⭕ {counter.name}</span>
              <strong className="wait-value">
                {counter.normalWait?.avgTime > 0
                  ? `${counter.normalWait.avgTime} min`
                  : "No data"}
              </strong>
            </div>
          ))
        ) : (
          <p>No counters available</p>
        )}
      </div>

      {/* Best Time */}
      <div className="best-time">
        <h4 className="section-heading">Best Time to Visit</h4>
        <p className="muted">🚧 Future Enhancement</p>
      </div>

      {/* Actions */}
      <button
        className="join-queue-btn"
        onClick={() => navigate(`/join-queue/${place._id}`)}
      >
        Join Virtual Queue
      </button>

      <button
        className="join-queue-btn secondary"
        onClick={() => setShowWaitPopup(true)}
      >
        Update Wait Time
      </button>

      {/* Popup */}
      {showWaitPopup && (
        <AutoWaitPopup
          place={place}
          onClose={() => setShowWaitPopup(false)}
        />
      )}
    </div>
  );
}
