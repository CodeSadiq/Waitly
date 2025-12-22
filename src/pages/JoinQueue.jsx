import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Temporary dummy data (later replace with context / API)
import { PlacesData } from "../utils/PlacesData.js";

export default function JoinQueue() {
  const { placeId } = useParams();
  const navigate = useNavigate();

  const place = PLACES.find(p => p.id === placeId);

  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    name: "",
    dob: "",
    counter: "",
    slot: "",
  });

  const [token, setToken] = useState(null);

  if (!place) {
    return <p style={{ padding: 20 }}>Place not found</p>;
  }

  const generateToken = () => ({
    tokenNo: Math.floor(100 + Math.random() * 900),
    placeName: place.name,
    counter: form.counter,
    peopleAhead: Math.floor(Math.random() * 10) + 1,
    estimatedWait: Math.floor(Math.random() * 30) + 10,
    time: new Date().toLocaleTimeString(),
  });

  const handlePay = () => {
    const newToken = generateToken();
    setToken(newToken);
    setStep("success");

    // Later you can store this in context / localStorage
    // saveToken(newToken)
  };

  return (
    <div className="join-page">
      {step === "form" && (
        <div className="card">
          <h2>Join Virtual Queue</h2>
          <p className="sub">
            {place.name} • ₹20 service charge
          </p>

          <input
            placeholder="Full Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

          <input
            type="date"
            value={form.dob}
            onChange={e => setForm({ ...form, dob: e.target.value })}
          />

          <select
            value={form.counter}
            onChange={e => setForm({ ...form, counter: e.target.value })}
          >
            <option value="">Select Counter</option>
            {Object.keys(place.waits).map(w => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>

          <select
            value={form.slot}
            onChange={e => setForm({ ...form, slot: e.target.value })}
          >
            <option value="">Select Time Slot</option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>

          <button
            disabled={!form.name || !form.counter}
            onClick={handlePay}
          >
            Pay ₹20 & Join
          </button>

          <button className="text-btn" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      )}

      {step === "success" && token && (
        <div className="card">
          <h2>Token Confirmed 🎉</h2>

          <div className="token-box">
            <p><strong>Token No:</strong> {token.tokenNo}</p>
            <p><strong>Place:</strong> {token.placeName}</p>
            <p><strong>Counter:</strong> {token.counter}</p>
            <p><strong>People Ahead:</strong> {token.peopleAhead}</p>
            <p><strong>Estimated Wait:</strong> {token.estimatedWait} min</p>
            <p><strong>Issued At:</strong> {token.time}</p>
          </div>

          <button onClick={() => navigate("/my-tokens")}>
            View My Tokens
          </button>
        </div>
      )}
    </div>
  );
}
