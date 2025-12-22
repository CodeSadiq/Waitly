
import { useState } from "react";

export default function PlaceList({ places, selectedPlace, onSelect }) {
  const [search, setSearch] = useState("");

  const filteredPlaces = places.filter((place) =>
    place.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="place-list">
      {/* Search */}
      <input
        className="place-search"
        type="text"
        placeholder="Search places"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h3 className="place-list-title" style={{margin:"20px 0px"}}>Nearby Locations</h3>

      {/* Places */}
      {filteredPlaces.map((place) => {
        const isActive = selectedPlace?.id === place.id;

        return (
          <div
            key={place.id}
            className={`place-item ${isActive ? "active" : ""}`}
            onClick={() => onSelect(place)}
          >
            <div className="place-icon">
              {place.category === "Bank" && "🏦"}
              {place.category === "Hospital" && "➕"}
              {place.category === "Government Office" && "🏛️"}
            </div>

            <div className="place-info">
              <div className="place-name">{place.name}</div>
              <div className="place-meta">
                {place.category} • {place.distance}
              </div>
            </div>

            <div className="place-wait">
              {Object.values(place.waits)[0]}m
            </div>
          </div>
        );
      })}

      {filteredPlaces.length === 0 && (
        <div className="no-results">No places found</div>
      )}
    </div>
  );
}
