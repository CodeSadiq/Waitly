import { useState } from "react";
import { placesData } from "../utils/PlacesData";

export default function PlaceList({ onSelect }) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);

  const filteredPlaces = placesData.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="place-list">
      <input
        className="search-input"
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h3 className="section-title">Locations</h3>

      {filteredPlaces.map((place) => (
        <div
          key={place.id}
          className={`place-card ${
            activeId === place.id ? "active" : ""
          }`}
          onClick={() => {
            setActiveId(place.id);
            onSelect(place);
          }}
        >
          <div className="place-icon">🏦</div>

          <div className="place-info">
            <div className="place-name">{place.name}</div>
            <div className="place-meta">
              {place.type} • {place.distance}
            </div>
          </div>

          <div className="place-time">
            {place.sections[0]?.time} m
          </div>
        </div>
      ))}
    </div>
  );
}
