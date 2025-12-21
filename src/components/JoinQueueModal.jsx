
import { useState } from "react";

export default function JoinQueueModal({ place, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    dob: "",
    counter: "",
    slot: "",
  });

  const submitPayment = () => {
    const token = {
      id: Math.floor(Math.random() * 1000),
      place: place.name,
      counter: form.counter,
      peopleAhead: 5,
      estimatedWait: 30,
      time: new Date().toLocaleTimeString(),
    };

    onSuccess(token);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{place.name}</h2>
        <p>Pay ₹20.00 — Queue booking / service charge</p>

        <img
          src="/qr-placeholder.png"
          alt="QR"
          style={{ width: 180 }}
        />

        <input
          placeholder="Enter Name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="date"
          onChange={(e) => setForm({ ...form, dob: e.target.value })}
        />

        <select onChange={(e) => setForm({ ...form, counter: e.target.value })}>
          <option>Select Counter</option>
          {place.sections.map((s) => (
            <option key={s.name}>{s.name}</option>
          ))}
        </select>

        <select onChange={(e) => setForm({ ...form, slot: e.target.value })}>
          <option>Select Time Slot (Optional)</option>
          <option>Morning</option>
          <option>Afternoon</option>
          <option>Evening</option>
        </select>

        <button className="primary-btn" onClick={submitPayment}>
          Pay Now
        </button>

        <button className="text-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
