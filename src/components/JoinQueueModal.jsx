import { useState } from "react";

export default function JoinQueueModal({ place, onClose }) {
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    name: "",
    dob: "",
    counter: "",
    slot: "",
  });

  const generateToken = () => {
    return {
      tokenNo: Math.floor(100 + Math.random() * 900),
      placeName: place.name,
      counter: form.counter,
      peopleAhead: Math.floor(Math.random() * 10) + 1,
      estimatedWait: Math.floor(Math.random() * 30) + 10,
      time: new Date().toLocaleTimeString(),
    };
  };

  const [token, setToken] = useState(null);

  const handlePay = () => {
    const newToken = generateToken();
    setToken(newToken);
    setStep("success");
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        {step === "form" && (
          <>
            <h3>Join Virtual Queue</h3>
            <p className="modal-sub">
              {place.name} • ₹20 service charge
            </p>

            <input
              placeholder="Full Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <input
              type="date"
              value={form.dob}
              onChange={(e) =>
                setForm({ ...form, dob: e.target.value })
              }
            />

            <select
              value={form.counter}
              onChange={(e) =>
                setForm({ ...form, counter: e.target.value })
              }
            >
              <option value="">Select Counter</option>
              {Object.keys(place.waits).map((w) => (
                <option key={w} value={w}>
                  {w.charAt(0).toUpperCase() + w.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={form.slot}
              onChange={(e) =>
                setForm({ ...form, slot: e.target.value })
              }
            >
              <option value="">Select Time Slot</option>
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Evening</option>
            </select>

            <button
              className="pay-btn"
              disabled={!form.name || !form.counter}
              onClick={handlePay}
            >
              Pay ₹20 & Join
            </button>

            <button className="text-btn" onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {step === "success" && token && (
          <>
            <h3>Token Confirmed 🎉</h3>

            <div className="token-box">
              <p><strong>Token No:</strong> {token.tokenNo}</p>
              <p><strong>Counter:</strong> {token.counter}</p>
              <p><strong>People Ahead:</strong> {token.peopleAhead}</p>
              <p><strong>Estimated Wait:</strong> {token.estimatedWait} min</p>
              <p><strong>Issued At:</strong> {token.time}</p>
            </div>

            <button className="pay-btn" onClick={onClose}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
