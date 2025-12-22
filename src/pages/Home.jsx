import { useState } from "react";
import PlaceList from "../components/PlaceList";
import MapView from "../components/MapView";
import PlaceDetails from "./PlaceDetails";
import "./Home.css";

const PLACES = [
  {
    id: 1,
    name: "SBI Bank",
    category: "Bank",
    distance: "0.5 km",
    address: "Connaught Place, Delhi",
    rating: 4.2,
    waits: {
      cash: 40,
      loan: 25,
      document: 10,
      account: 15,
    },
    bestTime: "After 3:30 PM",
  },
  {
    id: 2,
    name: "City Hospital OPD",
    category: "Hospital",
    distance: "1.2 km",
    address: "Karol Bagh, Delhi",
    rating: 4.0,
    waits: {
      registration: 20,
      doctor: 35,
    },
    bestTime: "After 4:00 PM",
  },
  {
    id: 3,
    name: "RTO Office",
    category: "Government Office",
    distance: "2.1 km",
    address: "Dwarka, Delhi",
    rating: 3.8,
    waits: {
      license: 45,
      documents: 30,
    },
    bestTime: "After 2:00 PM",
  },
];

export default function Home() {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showQueueModal, setShowQueueModal] = useState(false);

  return (
    <div className="home-layout">
      {/* LEFT PANEL */}
      <aside className="home-left">
        <PlaceList
          places={PLACES}
          selectedPlace={selectedPlace}
          onSelect={setSelectedPlace}
        />
      </aside>

      {/* CENTER PANEL */}
      <main className="home-center">
        <MapView />
      </main>

      {/* RIGHT PANEL */}
      <aside className="home-right">
        <PlaceDetails
          place={selectedPlace}
          onJoinQueue={() => setShowQueueModal(true)}
        />
      </aside>

      {/* JOIN QUEUE MODAL */}
      {showQueueModal && selectedPlace && (
        <JoinQueueModal
          place={selectedPlace}
          onClose={() => setShowQueueModal(false)}
        />
      )}
    </div>
  );
}
