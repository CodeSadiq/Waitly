import { useEffect, useState } from "react";
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
const socket = io("http://localhost:5000", {
  withCredentials: true
});


export default function Home() {
  const [places, setPlaces] = useState([]);
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
  useEffect(() => {
    let startY = 0;
    const handle = document.querySelector(".sheet-handle");
    if (!handle) return;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;

      if (diff > 50) {
        document.body.classList.add("list-expanded");
        document.body.classList.remove("list-collapsed");
      }

      if (diff < -50) {
        document.body.classList.remove("list-expanded");
        document.body.classList.add("list-collapsed");
      }
    };

    handle.addEventListener("touchstart", onTouchStart);
    handle.addEventListener("touchend", onTouchEnd);

    return () => {
      handle.removeEventListener("touchstart", onTouchStart);
      handle.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  /* =========================
     🧱 UI
     ========================= */
  return (
    <div className="home-layout">
      <aside className="home-left">
        <PlaceList
          places={places}
          selectedPlace={selectedPlace}
          onSelect={setSelectedPlace}
        />
      </aside>

      <main className="home-center" style={{ position: "relative" }}>
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
