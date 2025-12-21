import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { usePlace } from "../context/PlaceContext";
import useWaitTimes from "../hooks/useWaitTimes";

function PlaceDetails() {
  const navigate = useNavigate();
  const { selectedPlace, waitEntries, setWaitEntries } = usePlace();
  const sectionWaits = useWaitTimes(waitEntries);

  useEffect(() => {
    if (selectedPlace && waitEntries.length === 0) {
      setWaitEntries([
        { section: "Cash Counter", wait: 40 },
        { section: "Loan Desk", wait: 25 },
        { section: "Document Desk", wait: 10 },
        { section: "Account Opening", wait: 15 }
      ]);
    }
  }, [selectedPlace]);

  if (!selectedPlace) {
    return <p style={{ color: "var(--text-muted)" }}>Select a place</p>;
  }

  return (
    <>
      <h3>{selectedPlace.name}</h3>
      <p style={{ color: "var(--text-muted)" }}>{selectedPlace.type}</p>

      <h4 style={{ marginTop: "24px" }}>Live Wait Times</h4>

      {sectionWaits.map((item) => (
        <div key={item.section} style={styles.waitCard}>
          <span>{item.section}</span>
          <strong>{item.wait} min</strong>
        </div>
      ))}

      <button style={styles.primary} onClick={() => navigate("/join")}>
        Join Virtual Queue
      </button>
    </>
  );
}

const styles = {
  waitCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "12px",
    marginTop: "12px",
    display: "flex",
    justifyContent: "space-between",
    boxShadow: "var(--shadow-sm)"
  },
  primary: {
    marginTop: "24px",
    width: "100%",
    background: "var(--primary)",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: "var(--radius-md)",
    fontWeight: "600",
    cursor: "pointer"
  }
};

export default PlaceDetails;
