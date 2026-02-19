import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PlaceList from "../components/PlaceList";
import MapView from "../components/MapView";
import PlaceDetails from "./PlaceDetails";
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
     🔍 SEARCH FILTER (GLOBAL DEBOUNCED)
     ========================= */
  useEffect(() => {
    if (!search.trim()) {
      setFilteredPlaces(places);
      return;
    }

    // Debounce timer
    const delayDebounceFn = setTimeout(async () => {
      const lower = search.toLowerCase();

      // 1. First filter local nearby places
      const localMatches = places.filter((p) =>
        p.name?.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower)
      );

      // 2. If no local matches found, or we want to augment with global search
      // (Fetching global anyway ensures we see places outside range)
      try {
        const res = await fetch(`${API_BASE}/api/location/search?q=${encodeURIComponent(search)}`);
        const globalResults = await res.json();

        // Merge & De-duplicate
        const combined = [...localMatches];
        globalResults.forEach(gp => {
          if (!combined.some(p => p._id === gp._id)) {
            combined.push(gp);
          }
        });

        setFilteredPlaces(combined);
      } catch (err) {
        console.error("Global search failed", err);
        setFilteredPlaces(localMatches);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
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
    let baseTransform = 0;

    const onTouchStart = (e) => {
      // 1. Start timer on touch
      startY = e.touches[0].clientY;

      holdTimer = setTimeout(() => {
        isHolding = true;
        document.body.classList.add("dragging-active");

        // Calculate baseline for 3-step cycle (35% -> 60% -> 92%)
        const docH = window.innerHeight;
        let visibleH = 35; // Default Minimum
        if (document.body.classList.contains("list-expanded")) visibleH = 92;
        else if (document.body.classList.contains("list-default")) visibleH = 60;
        baseTransform = docH * (1 - visibleH / 100);
      }, 50); // 50ms hold required to start dragging
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

      // Apply smooth drag with base baseline
      listEl.style.transform = `translateY(${baseTransform + delta}px)`;
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

      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;

      if (diff > 50) {
        // Drag UP -> Move to next state
        if (document.body.classList.contains("list-expanded")) {
          // Already Max
        } else if (document.body.classList.contains("list-default")) {
          document.body.classList.remove("list-default");
          document.body.classList.add("list-expanded");
        } else {
          // From 35% -> 60%
          document.body.classList.add("list-default");
        }
      } else if (diff < -50) {
        // Drag DOWN -> Move to previous state
        if (document.body.classList.contains("list-expanded")) {
          document.body.classList.remove("list-expanded");
          document.body.classList.add("list-default");
        } else if (document.body.classList.contains("list-default")) {
          document.body.classList.remove("list-default");
        } else {
          // Already Min (no class)
        }
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
    document.body.classList.remove("details-expanded", "details-reduced", "details-peek");

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
      }, 50); // 50ms hold time
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
        // Drag UP -> Move to next larger state
        if (document.body.classList.contains("details-peek")) {
          document.body.classList.remove("details-peek");
          document.body.classList.add("details-reduced");
        } else if (document.body.classList.contains("details-reduced")) {
          document.body.classList.remove("details-reduced");
        } else {
          document.body.classList.add("details-expanded");
        }
      } else if (diff < -50) {
        // Drag DOWN -> Move to next smaller state
        if (document.body.classList.contains("details-expanded")) {
          document.body.classList.remove("details-expanded");
        } else if (!document.body.classList.contains("details-reduced") && !document.body.classList.contains("details-peek")) {
          document.body.classList.add("details-reduced");
        } else if (document.body.classList.contains("details-reduced")) {
          document.body.classList.remove("details-reduced");
          document.body.classList.add("details-peek");
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
          <div className="search-input-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              className="place-search"
              type="text"
              placeholder="Search places..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <PlaceList
          places={filteredPlaces}
          selectedPlace={selectedPlace}
          onSelect={setSelectedPlace}
        />
      </aside>

      <main className="home-center">
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
            places={filteredPlaces}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
          />
        )}
      </main>

      {/* MOBILE SEARCH (Floating outside center to stay on top layer) */}
      <div className="search-input-wrapper mobile-only">
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          className="place-search"
          type="text"
          placeholder="Search places..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <aside className="home-right">
        <PlaceDetails place={selectedPlace} userLocation={userLocation} />
      </aside>
    </div>
  );
}
