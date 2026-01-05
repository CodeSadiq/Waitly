import { useState } from "react";

export default function PlaceList({ places, selectedPlace, onSelect }) {
  const [search, setSearch] = useState("");

  // 🛡️ HARD GUARD: never allow crash
  const safePlaces = Array.isArray(places) ? places : [];

  const filteredPlaces = safePlaces.filter((place) =>
    place.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="place-list">
      {/* ===============================
          DRAG HANDLE (ONLY THIS MOVES SHEET)
      =============================== */}
      <div className="sheet-handle" style={{color:"red"}} />

      {/* ===============================
          SEARCH
      =============================== */}
      <input
        className="place-search"
        type="text"
        placeholder="Search places"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h3 className="place-list-title" style={{ margin: "20px 0px" }}>
        Nearby Locations
      </h3>

      {/* ===============================
          PLACE ITEMS
      =============================== */}
      {filteredPlaces.map((place) => {
        const isActive = selectedPlace?._id === place._id;
        const category = place.category?.toLowerCase();
        const waitTime =
          place.counters?.[0]?.normalWait?.avgTime;

        return (
          <div
            key={place._id}
            className={`place-item ${isActive ? "active" : ""}`}
            onClick={() => onSelect(place)}
          >
            {/* ICON */}
            <div className="place-icon">
              {category === "bank" && "🏦"}
              {category === "hospital" && "➕"}
              {category === "government" && "🏛️"}
              {category === "courthouse" && "🏛️"}
            </div>

            {/* INFO */}
            <div className="place-info">
              <div className="place-name">{place.name}</div>
              <div className="place-meta">
                {place.category}
              </div>
            </div>

            {/* WAIT TIME */}
            <div className="place-wait">
              {typeof waitTime === "number" && (
                <strong>{waitTime}m</strong>
              )}
            </div>
          </div>
        );
      })}

      {/* ===============================
          EMPTY STATE
      =============================== */}
      {filteredPlaces.length === 0 && (
        <div className="no-results">No places found</div>
      )}
    </div>
  );
}
