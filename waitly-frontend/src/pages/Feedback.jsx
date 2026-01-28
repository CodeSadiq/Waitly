import { useState } from "react";
import Modal from "../components/Modal";
import { usePlace } from "../context/PlaceContext";
import { formatWaitTime } from "../utils/timeFormat";

function Feedback({ onClose }) {
  const { selectedPlace, waitEntries, setWaitEntries } = usePlace();
  const [section, setSection] = useState("Cash Counter");
  const [wait, setWait] = useState(20);
  const [comment, setComment] = useState("");

  const submit = () => {
    setWaitEntries([
      ...waitEntries,
      {
        section,
        wait,
        comment,
        createdAt: new Date().toISOString()
      }
    ]);
    onClose();
  };

  return (
    <Modal title={selectedPlace.name} onClose={onClose}>
      <p style={{ marginBottom: "12px" }}>Which counter did you use?</p>

      <select value={section} onChange={e => setSection(e.target.value)} style={styles.input}>
        <option>Cash Counter</option>
        <option>Loan Desk</option>
        <option>Document Desk</option>
        <option>Account Opening</option>
        <option>Other</option>
      </select>

      <p style={{ marginTop: "16px" }}>How long did you wait?</p>
      <input
        type="range"
        min="5"
        max="300"
        step="5"
        value={wait}
        onChange={e => setWait(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <strong>{formatWaitTime(wait)}</strong>

      <textarea
        placeholder="Comment (optional)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        style={styles.textarea}
      />

      <div style={styles.actions}>
        <button onClick={onClose}>Back</button>
        <button style={styles.primary} onClick={submit}>Submit</button>
      </div>
    </Modal>
  );
}

const styles = {
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb"
  },
  textarea: {
    width: "100%",
    marginTop: "12px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb"
  },
  actions: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "space-between"
  },
  primary: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer"
  }
};

export default Feedback;
