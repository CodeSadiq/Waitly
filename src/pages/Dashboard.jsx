import Home from "./Home";
import PlaceDetails from "./PlaceDetails";
import MapView from "../components/MapView";

function Dashboard() {
  return (
    <div style={styles.container}>
      <aside style={styles.left}><Home /></aside>
      <main style={styles.center}><MapView /></main>
      <aside style={styles.right}><PlaceDetails /></aside>
    </div>
  );
}

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "300px 1fr 360px",
    height: "calc(100vh - 64px)",
    background: "var(--bg-app)"
  },
  left: {
    background: "var(--bg-panel)",
    borderRight: "1px solid var(--border)",
    padding: "16px",
    overflowY: "auto"
  },
  center: {
    background: "#eef2f7"
  },
  right: {
    background: "var(--bg-panel)",
    borderLeft: "1px solid var(--border)",
    padding: "16px",
    overflowY: "auto"
  }
};

export default Dashboard;
