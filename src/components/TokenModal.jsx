export default function TokenModal({ token, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{token.place}</h2>

        <img
          src="/qr-placeholder.png"
          alt="Token QR"
          style={{ width: 180 }}
        />

        <p><strong>Token #</strong>{token.id}</p>
        <p><strong>Counter:</strong> {token.counter}</p>
        <p><strong>People Ahead:</strong> {token.peopleAhead}</p>
        <p><strong>Estimated Wait:</strong> {token.estimatedWait} min</p>
        <p><strong>Issued At:</strong> {token.time}</p>

        <button className="primary-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
