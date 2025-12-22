import { useState } from "react";

export default function PlaceList({ places, selectedPlace, onSelect }) {
  const [search, setSearch] = useState("");

  const filtered = places.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <input
        className="search"
        placeholder="Search places"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.map(place => (
        <div
          key={place.id}
          className={`place-card ${
            selectedPlace?.id === place.id ? "active" : ""
          }`}
          onClick={() => onSelect(place)}
        >
          <strong>{place.name}</strong>
          <p>{place.category} • {place.distance}</p>
        </div>
      ))}
    </>
  );
}
