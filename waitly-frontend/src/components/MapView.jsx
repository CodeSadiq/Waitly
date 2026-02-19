import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents
} from "react-leaflet";
import { useEffect } from "react";
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
   🔴 Place icon
   ========================= */
const placeIcon = new L.DivIcon({
  className: "place-marker",
  html: `<div class="place-dot"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const disabledPlaceIcon = new L.DivIcon({
  className: "place-marker disabled",
  html: `<div class="place-dot gray"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});



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
    const isUserLoc = place.isUserLocation;
    const targetZoom = 17;

    if (isMobile && isUserLoc) {
      // 📱 MOBILE + USER LOCATION: Offset center to account for bottom sheet
      // Sheet is ~40% height. Visible map is top 60%. Visual center is at 30%.
      // Map center is at 50%. So we need to shift center DOWN by 20% of height.
      const latlng = [place.location.lat, place.location.lng];
      const point = map.project(latlng, targetZoom);
      const offsetY = window.innerHeight * 0.20;
      const targetPoint = point.add([0, offsetY]); // Shift center down so point appears up
      const targetLatLng = map.unproject(targetPoint, targetZoom);

      map.flyTo(targetLatLng, targetZoom, { duration: 1.2 });
    } else {
      // 💻 DESKTOP or DETAILS OPEN: Standard center
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

/* =========================
   🖱️ MAP EVENTS
   ========================= */
function MapEvents({ addMode, onMapSelect }) {
  useMapEvents({
    click(e) {
      if (addMode && onMapSelect) {
        onMapSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function MapView({
  userLocation,
  places,
  selectedPlace,
  onSelectPlace,
  addMode = false,
  onMapSelect
}) {
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

      <ResizeHandler selectedPlace={selectedPlace} />
      <MapEvents addMode={addMode} onMapSelect={onMapSelect} />

      {/* 🔥 AUTO FLY */}
      <FlyToPlace place={selectedPlace} />

      {/* 💧 USER LOCATION */}
      <Marker
        position={[userLocation.lat, userLocation.lng]}
        icon={userIcon}
      >
        <Popup>You are here</Popup>
      </Marker>

      {/* 📍 PLACES */}
      {places.map((place) => (
        <Marker
          key={place._id}
          position={[
            place.location.lat,
            place.location.lng
          ]}
          icon={place.hasActiveStaff ? disabledPlaceIcon : placeIcon}
          eventHandlers={{
            click: (e) => {
              if (place.hasActiveStaff) return;
              // Stop propagation to prevent map click event from firing
              L.DomEvent.stopPropagation(e);
              onSelectPlace(place);
            }
          }}
          opacity={place.hasActiveStaff ? 0.4 : 1}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -10]}
            className="map-place-tooltip"
          >
            {place.name}
          </Tooltip>
          <Popup>
            <strong>{place.name}</strong>
            {place.hasActiveStaff && <div style={{ color: '#ef4444', fontWeight: '800', fontSize: '0.7rem', marginTop: '4px' }}>ALREADY MANAGED</div>}
            <br />
            {place.category}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
