import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* =========================
   💧 User location icon
   ========================= */
const userIcon = new L.DivIcon({
  className: "user-drop-marker",
  html: `<div class="drop"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

/* =========================
   📍 Dynamic Place icon with Name
   ========================= */
const createPlaceIcon = (name, isActive, showName) => new L.DivIcon({
  className: `place-marker ${isActive ? "active" : ""}`,
  html: `
    <div class="simple-marker">
      <span class="marker-dot"></span>
      ${showName ? `<span class="marker-name">${name}</span>` : ""}
    </div>
  `,
  iconSize: [null, null],
  iconAnchor: [6, 6]
});

/* =========================
   🖱️ HANDLE MAP CLICK (ADD MODE)
   ========================= */
function MapClickHandler({ addMode, onMapSelect }) {
  useMapEvents({
    click(e) {
      if (!addMode) return;

      onMapSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    }
  });

  return null;
}

/* =========================
   🔥 Fly to selected place
   ========================= */
/* =========================
   🔥 Fly to selected place
   ========================= */
function FlyToPlace({ place }) {
  const map = useMap();

  useEffect(() => {
    if (!place?.location) return;

    const isMobile = window.innerWidth <= 1024;
    const isUserLoc = place._id === "my-location" || place.isUserLocation;
    const targetZoom = 17;

    if (isMobile && isUserLoc) {
      // 📱 MOBILE + USER LOCATION: Offset center to account for bottom sheet
      // Typically the sheet takes up the bottom 35-40%. 
      // Shifting center down transforms the visual center higher up.
      const latlng = [place.location.lat, place.location.lng];

      // Use a timeout to ensure container size is stable
      const timer = setTimeout(() => {
        const point = map.project(latlng, targetZoom);
        // We want the pin at ~30% from the top (visual center of map space)
        // Center is at 50%. Diff is 20%.
        const offsetY = window.innerHeight * 0.12;
        const targetPoint = point.add([0, offsetY]);
        const targetLatLng = map.unproject(targetPoint, targetZoom);

        map.flyTo(targetLatLng, targetZoom, { duration: 1.5 });
      }, 100);

      return () => clearTimeout(timer);
    } else {
      // 💻 DESKTOP or PLACES: Standard center
      map.flyTo(
        [place.location.lat, place.location.lng],
        targetZoom,
        { duration: 1.2 }
      );
    }
  }, [place, map]);

  return null;
}

/* =========================
   🔄 RESIZE HANDLER
   ========================= */
function ResizeHandler({ selectedPlace }) {
  const map = useMap();

  useEffect(() => {
    // When selectedPlace changes (or nulls), the container resizes via CSS.
    // We need to tell Leaflet to check its size after the transition (approx 350-400ms).
    const timer = setTimeout(() => {
      map.invalidateSize();

      // Only re-pan if it's NOT the user location (as FlyToPlace handles the offset for UserLoc)
      // And only if we have a valid location.
      if (selectedPlace?.location && !selectedPlace.isUserLocation) {
        map.panTo(
          [selectedPlace.location.lat, selectedPlace.location.lng],
          { animate: true, duration: 0.5 }
        );
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [selectedPlace, map]);

  return null;
}

export default function MapView({
  userLocation,
  places,
  selectedPlace,
  onSelectPlace,
  addMode,
  onMapSelect
}) {
  const [zoom, setZoom] = useState(14); // Track zoom level

  // Simple sub-component to catch zoom events
  function ZoomTracker() {
    const map = useMapEvents({
      zoomend() {
        setZoom(map.getZoom());
      },
    });
    return null;
  }

  if (!userLocation) {
    return (
      <div style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "20px",
        paddingBottom: "40vh", // Push it up visually on mobile
        color: "#6b7280",
        fontFamily: "inherit"
      }}>
        <p style={{ marginBottom: "8px", fontWeight: 500 }}>Map is loading...</p>
        <p style={{ fontSize: "0.9em", opacity: 0.8 }}>Please turn on location access.</p>
      </div>
    );
  }

  const showNames = zoom >= 15; // Threshold for showing names

  return (
    <MapContainer
      center={[userLocation.lat, userLocation.lng]}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap & CARTO"
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <ZoomTracker />
      <ResizeHandler selectedPlace={selectedPlace} />

      {/* 🔥 CLICK HANDLER */}
      <MapClickHandler
        addMode={addMode}
        onMapSelect={onMapSelect}
      />

      {/* 🔥 AUTO FLY */}
      <FlyToPlace place={selectedPlace} />

      {/* 💧 USER LOCATION */}
      <Marker
        position={[userLocation.lat, userLocation.lng]}
        icon={new L.DivIcon({
          className: "user-drop-marker",
          html: `
            <div class="simple-marker">
              <div class="drop"></div>
              ${showNames ? `<span class="marker-name" style="color: #3b82f6; font-weight: 700;">My Location</span>` : ""}
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [9, 9] // Center of the 18px drop
        })}
      >
        <Popup>You are here</Popup>
      </Marker>

      {/* 📍 PLACES */}
      {places.map((place) => {
        if (place.isUserLocation) return null; // Already handled above

        const isActive = selectedPlace?._id === place._id;

        return (
          <Marker
            key={place._id}
            position={[
              place.location.lat,
              place.location.lng
            ]}
            icon={createPlaceIcon(place.name, isActive, showNames)}
            eventHandlers={{
              click: () => onSelectPlace(place)
            }}
          >
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {place.category}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
