import { useNavigate } from "react-router-dom";

export default function PlaceDetails({ place, onJoinQueue }) {
  if (!place) {
    return (
      <div className="place-details-empty">
        <p>Select a place to view details</p>
      </div>
    );
  }

  return (
    <div className="place-details">
      {/* Header */}
      <div className="place-details-header">
        <h2>{place.name}</h2>
        <span className="rating">⭐ {place.rating}</span>
      </div>

      {/* Address */}
      <p className="place-address">{place.address}</p>

      {/* Live Wait Times */}
      <h4 className="section-heading">Live Wait Times</h4>

      <div className="wait-times">
        {Object.entries(place.waits).map(([key, value]) => (
          <div key={key} className="wait-row">
            <span className="wait-label">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
            <strong className="wait-value">{value} min</strong>
          </div>
        ))}
      </div>

      {/* Best Time */}
      <div className="best-time">
        Best time to visit
        <br />
        <strong>{place.bestTime}</strong>
      </div>

      

      <button
        className="join-queue-btn"
        onClick={() => navigate(`/join-queue/${place.id}`)}
      >
        Join Virtual Queue
      </button>

    </div>
  );
}
