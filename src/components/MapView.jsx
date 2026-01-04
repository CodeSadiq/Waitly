import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
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
function FlyToPlace({ place }) {
  const map = useMap();

  useEffect(() => {
    if (!place?.location) return;

    map.flyTo(
      [place.location.lat, place.location.lng],
      17,
      { duration: 1.2 }
    );
  }, [place, map]);

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
  if (!userLocation) {
    return <p style={{ padding: 20 }}>Loading map…</p>;
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
          icon={placeIcon}
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
      ))}
    </MapContainer>
  );
}

