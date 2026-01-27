import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PlaceList from "../components/PlaceList";
import MapView from "../components/MapView";
import PlaceDetails from "./PlaceDetails";
import AddPlaceModal from "../components/AddPlaceModal";
import "./Home.css";
import API_BASE from "../config/api";
import { io } from "socket.io-client";

/* =========================
   🔌 SOCKET (SINGLE INSTANCE)
   ========================= */
const socket = io(API_BASE, {
  withCredentials: true
});


export default function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [places, setPlaces] = useState([]);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const [addMode, setAddMode] = useState(false);
  const [newPlaceCoords, setNewPlaceCoords] = useState(null);

  /* =========================
     ⚡ LIVE WAIT UPDATE (SOCKET)
     ========================= */
  useEffect(() => {
    socket.on("wait-updated", ({ placeId, counters }) => {
      if (!Array.isArray(counters)) return; // 🛡️ safety guard

      setSelectedPlace((prev) =>
        prev && prev._id === placeId
          ? { ...prev, counters }
          : prev
      );

      setPlaces((prev) =>
        prev.map((p) =>
          p._id === placeId ? { ...p, counters } : p
        )
      );
    });


    return () => {
      socket.off("wait-updated");
    };
  }, []);

  /* =========================
     📍 INITIAL LOCATION
     ========================= */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      setUserLocation(coords);

      const myLocationPlace = {
        _id: "my-location",
        name: "My Location",
        location: coords,
        isUserLocation: true
      };

      const res = await fetch(
        `${API_BASE}/api/location/nearby-places?lat=${coords.lat}&lng=${coords.lng}`
      );
      const data = await res.json();
      const nearbyPlaces = Array.isArray(data) ? data : [];

      setPlaces([myLocationPlace, ...nearbyPlaces]);
      setSelectedPlace(myLocationPlace);
    });
  }, []);

  /* =========================
     🔍 SEARCH FILTER
     ========================= */
  useEffect(() => {
    if (!search.trim()) {
      setFilteredPlaces(places);
    } else {
      const lower = search.toLowerCase();
      setFilteredPlaces(
        places.filter((p) => p.name?.toLowerCase().includes(lower))
      );
    }
  }, [search, places]);

  /* =========================
     🔙 CLOSE DETAILS
     ========================= */
  useEffect(() => {
    const handler = () => setSelectedPlace(null);
    window.addEventListener("close-place-details", handler);
    return () =>
      window.removeEventListener("close-place-details", handler);
  }, []);

  /* =========================
     🧠 BODY STATES
     ========================= */
  useEffect(() => {
    if (selectedPlace && !selectedPlace.isUserLocation) {
      document.body.classList.add("details-open");
    } else {
      document.body.classList.remove("details-open");
    }
  }, [selectedPlace]);

  useEffect(() => {
    if (newPlaceCoords) {
      document.body.classList.add("add-place-open");
    } else {
      document.body.classList.remove("add-place-open");
    }
  }, [newPlaceCoords]);

  useEffect(() => {
    if (addMode) {
      document.body.classList.add("add-mode");
    } else {
      document.body.classList.remove("add-mode");
    }
  }, [addMode]);

  /* =========================
     📱 SWIPE HANDLER
     ========================= */
  /* =========================
     📱 SWIPE HANDLER (SMOOTH DRAG)
     ========================= */


  /* =========================
     📱 SWIPE LOGIC v2 (HEADER ONLY)
     ========================= */
  /* =========================
     📱 SWIPE LOGIC v3 (HOLD TO DRAG)
     ========================= */
  useEffect(() => {
    const listEl = document.querySelector(".home-left"); // Target the container, not just list content
    if (!listEl) return;

    let startY = 0;
    let currentY = 0;
    let isHolding = false;
    let holdTimer = null;
    let initialTransform = 0; // To track where we started

    const onTouchStart = (e) => {
      // 1. Start timer on touch
      startY = e.touches[0].clientY;

      holdTimer = setTimeout(() => {
        isHolding = true;
        // Optionally add a visual cue class here
        document.body.classList.add("dragging-active");
        if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
      }, 250); // 250ms hold required
    };

    const onTouchMove = (e) => {
      // If user moves BEFORE timer fires, cancel hold (it's a scroll)
      if (!isHolding) {
        if (holdTimer) clearTimeout(holdTimer);
        return;
      }

      // If holding, prevent scrolling so we can track "drag"
      e.preventDefault();

      // FOLLOW FINGER LOGIC
      currentY = e.touches[0].clientY;
      const delta = currentY - startY;

      // We apply smooth inline transform
      // Note: We need to respect current state (expanded/collapsed) offset if we want perfection,
      // but for now, we just visually move it relative to start.
      // A simple approach is just translating Y.
      listEl.style.transform = `translateY(${delta}px)`;

      // 🔄 SYNC ADD BUTTON
      const btnEl = document.querySelector(".add-place-btn");
      if (btnEl) btnEl.style.transform = `translateY(${delta}px)`;
    };


    const onTouchEnd = (e) => {
      // Cleanup timer
      if (holdTimer) clearTimeout(holdTimer);

      if (!isHolding) return; // Regular scroll/tap

      // If we *were* holding, calculate drag
      isHolding = false;
      document.body.classList.remove("dragging-active");

      // Clear inline style so CSS class takes over
      listEl.style.transform = "";
      const btnEl = document.querySelector(".add-place-btn");
      if (btnEl) btnEl.style.transform = "";

      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;

      if (diff > 50) {
        // Drag UP -> EXPAND
        document.body.classList.add("list-expanded");
        document.body.classList.remove("list-collapsed");
      } else if (diff < -50) {
        // Drag DOWN -> COLLAPSE
        document.body.classList.remove("list-expanded");
        document.body.classList.add("list-collapsed");
      }
    };

    // Attach to listEl (home-left)
    listEl.addEventListener("touchstart", onTouchStart, { passive: false });
    listEl.addEventListener("touchmove", onTouchMove, { passive: false });
    listEl.addEventListener("touchend", onTouchEnd);

    return () => {
      listEl.removeEventListener("touchstart", onTouchStart);
      listEl.removeEventListener("touchmove", onTouchMove);
      listEl.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  /* =========================
     📱 DETAILS SWIPE LOGIC
     ========================= */
  useEffect(() => {
    // Reset state on open
    document.body.classList.remove("details-expanded", "details-reduced");

    const detailsEl = document.querySelector(".home-right");
    if (!detailsEl) return;

    let startY = 0;
    let isHolding = false;
    let holdTimer = null;

    const onDetailsTouchStart = (e) => {
      // RESET visual state when starting valid new drag? No, keep it. 
      // But we should reset when opening a new place.
      startY = e.touches[0].clientY;
      holdTimer = setTimeout(() => {
        isHolding = true;
        document.body.classList.add("dragging-details");
        if (navigator.vibrate) navigator.vibrate(50);
      }, 250); // 0.25s hold time
    };

    const onDetailsTouchMove = (e) => {
      if (!isHolding) {
        if (holdTimer) clearTimeout(holdTimer);
        return;
      }
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY;
      detailsEl.style.transform = `translateY(${delta}px)`;
    };

    const onDetailsTouchEnd = (e) => {
      if (holdTimer) clearTimeout(holdTimer);
      if (!isHolding) return;

      isHolding = false;
      document.body.classList.remove("dragging-details");
      detailsEl.style.transform = "";

      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;

      if (diff > 50) {
        // Drag UP
        if (document.body.classList.contains("details-reduced")) {
          // Reduced -> Default
          document.body.classList.remove("details-reduced");
        } else {
          // Default -> Expanded
          document.body.classList.add("details-expanded");
        }
      } else if (diff < -50) {
        // Drag DOWN
        if (document.body.classList.contains("details-expanded")) {
          // Expanded -> Default
          document.body.classList.remove("details-expanded");
        } else {
          // Default -> Reduced
          document.body.classList.add("details-reduced");
        }
      }
    };

    detailsEl.addEventListener("touchstart", onDetailsTouchStart, { passive: false });
    detailsEl.addEventListener("touchmove", onDetailsTouchMove, { passive: false });
    detailsEl.addEventListener("touchend", onDetailsTouchEnd);

    return () => {
      detailsEl.removeEventListener("touchstart", onDetailsTouchStart);
      detailsEl.removeEventListener("touchmove", onDetailsTouchMove);
      detailsEl.removeEventListener("touchend", onDetailsTouchEnd);
    };
  }, [selectedPlace]);

  /* =========================
     🧱 UI
     ========================= */
  return (
    <div className="home-layout">
      <aside className="home-left">
        {/* DESKTOP SEARCH (Inside List Panel) */}
        <div className="search-container desktop-only">
          <input
            className="place-search"
            type="text"
            placeholder="Search places..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <PlaceList
          places={filteredPlaces}
          selectedPlace={selectedPlace}
          onSelect={setSelectedPlace}
        />
      </aside>

      <main className="home-center" style={{ position: "relative" }}>
        {/* MOBILE SEARCH (Floating on Map) */}
        <input
          className="place-search mobile-only"
          type="text"
          placeholder="Search places..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`add-place-btn ${addMode ? "active" : ""}`}
          onClick={() => {
            setAddMode(!addMode);
            setSelectedPlace(null);
          }}
        >
          {addMode ? "✖" : "+"}
        </button>

        {addMode && (
          <div className="add-place-hint">
            📍 Tap on map to add a new place
          </div>
        )}

        {!userLocation && (
          <div className="map-loading">
            <div className="spinner"></div>
            <p>Map is loading…</p>
            <p>Please turn on your location.</p>
          </div>
        )}

        {userLocation && (
          <MapView
            userLocation={userLocation}
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            addMode={addMode}
            onMapSelect={(coords) => {
              setNewPlaceCoords(coords);
              setAddMode(false);
            }}
          />
        )}

      </main>

      <aside className="home-right">
        <PlaceDetails place={selectedPlace} />
      </aside>

      {newPlaceCoords && (
        <AddPlaceModal
          coords={newPlaceCoords}
          onClose={() => setNewPlaceCoords(null)}
        />
      )}
    </div>
  );
}
