import { useEffect, useState } from "react";
import PlaceList from "../components/PlaceList";
import MapView from "../components/MapView";
import PlaceDetails from "./PlaceDetails";
import AddPlaceModal from "../components/AddPlaceModal";
import "./Home.css";
import API_BASE from "../config/api";

export default function Home() {
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const [addMode, setAddMode] = useState(false);
  const [newPlaceCoords, setNewPlaceCoords] = useState(null);

  const handleAddPlaceSubmit = async (data) => {
    try {
      await fetch(`${API_BASE}/api/admin/pending/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          source: "user-map"
        })
      });

      alert("Place sent for admin approval ✅");
    } catch (err) {
      alert("Failed to submit place");
    }
  };

  /* 📍 INITIAL LOCATION */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      setUserLocation(coords);

      // 🔥 Virtual "My Location" place
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

      // 🔥 Put My Location at top
      setPlaces([myLocationPlace, ...nearbyPlaces]);

      // 🔥 Select My Location by default
      setSelectedPlace(myLocationPlace);
    });
  }, []);


 

  useEffect(() => {
  const handler = () => setSelectedPlace(null);

  window.addEventListener("close-place-details", handler);
  return () =>
    window.removeEventListener("close-place-details", handler);
}, []);



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

    // Swipe UP → expand
    if (diff > 50) {
      document.body.classList.add("list-expanded");
      document.body.classList.remove("list-collapsed");
    }

    // Swipe DOWN → collapse
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
        {/* ➕ BUTTON */}
        <button
          className={`add-place-btn ${addMode ? "active" : ""}`}
          onClick={() => {
            setAddMode(!addMode);
            setSelectedPlace(null);
          }}
        >
          {addMode ? "✖" : "+"}
        </button>

        {/* 🧠 USER GUIDANCE */}
        {addMode && (
          <div className="add-place-hint">
            📍 Tap on map to add a new place
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

      {/* 🔥 ADD PLACE FORM */}
      {newPlaceCoords && (
        <AddPlaceModal
          coords={newPlaceCoords}
          onClose={() => setNewPlaceCoords(null)}
        />
      )}
    </div>
  );
}
