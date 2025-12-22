import { useNavigate } from "react-router-dom";

export default function PlaceDetails({ place }) {
  const navigate = useNavigate();

  if (!place) {
    return <p>Select a place to view details</p>;
  }

  return (
    <div>
      <h2>{place.name}</h2>
      <p>{place.address}</p>

      <h4>Live Wait Times</h4>
      {Object.entries(place.waits).map(([k, v]) => (
        <div key={k}>
          {k}: {v} min
        </div>
      ))}

      <p><strong>Best Time:</strong> {place.bestTime}</p>

      {/* 🚨 ONLY ROUTE CHANGE */}
      <button
        className="join-btn"
        onClick={() => navigate(`/join-queue/${place.id}`)}
      >
        Join Virtual Queue
      </button>
    </div>
  );
}
