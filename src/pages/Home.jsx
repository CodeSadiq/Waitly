import { usePlace } from "../context/PlaceContext";
import { mockPlaces } from "../utils/mockData";

function Home() {
  const { setSelectedPlace } = usePlace();

  return (
    <>
      <h3 style={{ marginBottom: "16px", color: "var(--text-main)" }}>
        Locations
      </h3>

      {mockPlaces.map((place) => (
        <div
          key={place.id}
          onClick={() => {
            setSelectedPlace(place);
          }}
          style={styles.card}
        >
          <h4 style={{ margin: 0 }}>{place.name}</h4>
          <p style={styles.muted}>{place.type}</p>
          <span style={styles.muted}>{place.distance} km away</span>
        </div>
      ))}
    </>
  );
}

const styles = {
  card: {
    background: "var(--bg-card)",
    padding: "14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
    marginBottom: "12px",
    cursor: "pointer"
  },
  muted: {
    color: "var(--text-muted)",
    fontSize: "14px"
  }
};

export default Home;
