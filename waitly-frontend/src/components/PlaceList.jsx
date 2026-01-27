import { useState } from "react";
import "./PlaceList.css";
/* ================= ICONS ================= */

const BankIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <path
      d="M3 10h18M5 10v7M9 10v7M15 10v7M19 10v7M3 17h18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M2 10L12 4l10 6"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const HospitalIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <rect
      x="4"
      y="3"
      width="16"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12 7v8M8 11h8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const GovernmentIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <path
      d="M3 10h18M6 10v8M10 10v8M14 10v8M18 10v8M3 18h18"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M2 10L12 4l10 6"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const PoliceIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <path
      d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const EducationIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <path
      d="M2 8l10-4 10 4-10 4-10-4z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M6 10v5c0 2 12 2 12 0v-5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const StoreIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <path
      d="M3 9l2-5h14l2 5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M4 9v10h16V9"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M9 19v-6h6v6"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

/* ================= CATEGORY ICON SELECTOR ================= */

const CategoryIcon = ({ category }) => {
  switch (category) {
    case "bank":
      return <BankIcon />;
    case "hospital":
      return <HospitalIcon />;
    case "government":
    case "courthouse":
      return <GovernmentIcon />;
    case "police":
      return <PoliceIcon />;
    case "college":
    case "school":
    case "university":
      return <EducationIcon />;
    case "mall":
    case "store":
    case "shop":
      return <StoreIcon />;
    default:
      return <StoreIcon />;
  }
};

/* ================= COMPONENT ================= */

export default function PlaceList({ places, selectedPlace, onSelect }) {
  // 🛡️ HARD GUARD
  const safePlaces = Array.isArray(places) ? places : [];

  return (
    <div className="place-list">
      <h3 className="place-list-title" style={{ margin: "10px 0px 20px" }}>
        Nearby Locations
      </h3>

      {/* PLACE ITEMS */}
      {safePlaces.map((place) => {
        const isActive = selectedPlace?._id === place._id;
        const category = place.category?.toLowerCase();
        const waitTime = place.counters?.[0]?.normalWait?.avgTime;

        return (
          <div
            key={place._id}
            className={`place-item ${isActive ? "active" : ""}`}
            onClick={() => onSelect(place)}
          >
            {/* ICON */}
            <div className="place-icon">
              <CategoryIcon category={category} />
            </div>

            {/* INFO */}
            <div className="place-info">
              <div className="place-name">{place.name}</div>
              <div className="place-meta">{place.category}</div>
            </div>


          </div>
        );
      })}

      {/* EMPTY STATE */}
      {safePlaces.length === 0 && (
        <div className="no-results">No places found</div>
      )}
    </div>
  );
}
