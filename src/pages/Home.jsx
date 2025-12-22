import { useState } from "react";
import PlaceList from "../components/PlaceList";
import PlaceDetails from "./PlaceDetails";
import MapView from "../components/MapView";
import PLACES from "../utils/PlacesData";

export default function Home() {
  const [selectedPlace, setSelectedPlace] = useState(null);

  return (
    <div className="home-layout">
      {/* LEFT */}
      <aside className="home-left">
        <PlaceList
          places={PLACES}
          selectedPlace={selectedPlace}
          onSelect={setSelectedPlace}
        />
      </aside>

      {/* CENTER */}
      <main className="home-center">
        <MapView />
      </main>

      {/* RIGHT */}
      <aside className="home-right">
        <PlaceDetails place={selectedPlace} />
      </aside>
    </div>
  );
}
