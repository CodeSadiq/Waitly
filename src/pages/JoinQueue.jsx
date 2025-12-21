import Modal from "../components/Modal";

function JoinQueue({ onClose }) {
  return (
    <Modal title="Join Virtual Queue" onClose={onClose}>
      <p>Have you completed your work here today?</p>

      <div style={styles.actions}>
        <button onClick={onClose}>No</button>
        <button style={styles.primary}>Yes</button>
      </div>
    </Modal>
  );
}

const styles = {
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

export default JoinQueue;
