function Modal({ title, children, onClose }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>{title}</h3>
          <button onClick={onClose} style={styles.close}>✕</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  modal: {
    background: "#fff",
    borderRadius: "12px",
    width: "420px",
    padding: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  close: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer"
  }
};

export default Modal;
