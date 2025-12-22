import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PLACES from "../utils/PlacesData";
import "./JoinQueue.css";


export default function JoinQueue() {
  const { placeId } = useParams();
  const navigate = useNavigate();

  const place = PLACES.find(p => p.id === placeId);

  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    name: "",
    dob: "",
    counter: "",
    otherCounter: "",
    slotDateTime: "",
  });
  
  if (!place) {
    return <p style={{ padding: 20 }}>Invalid place</p>;
  }

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

  const handlePay = () => {
    const newToken = generateToken();
    setToken(newToken);
    setStep("success");
  };

  return (
    <div className="join-page">
      {step === "form" && (
        <div className="join-card">
          <h2>Join Virtual Queue</h2>
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
  type="text"
  placeholder="Date of Birth"
  onFocus={(e) => (e.target.type = "date")}
  onBlur={(e) => !e.target.value && (e.target.type = "text")}
  value={form.dob}
  onChange={(e) =>
    setForm({ ...form, dob: e.target.value })
  }
/>



          <select
  value={form.counter}
  onChange={(e) =>
    setForm({ 
      ...form, 
      counter: e.target.value,
      otherCounter: "" // reset when changed
    })
  }
>
  <option value="">Select Counter</option>

  {Object.keys(place.waits).map((w) => (
    <option key={w} value={w}>
      {w.charAt(0).toUpperCase() + w.slice(1)}
    </option>
  ))}

  <option value="other">Other</option>
</select>


{form.counter === "other" && (
  <input
    type="text"
    placeholder="Enter other counter name (optional)"
    value={form.otherCounter}
    onChange={(e) =>
      setForm({ ...form, otherCounter: e.target.value })
    }
  />
)}



         <div className="input-wrapper">
  {!form.slotDateTime && (
    <span className="input-placeholder">
      Preferred Time Slot
    </span>
  )}

  <input
    type="datetime-local"
    min={new Date().toISOString().slice(0, 16)}
    value={form.slotDateTime}
    onChange={(e) =>
      setForm({ ...form, slotDateTime: e.target.value })
    }
  />
</div>



          <button
            className="pay-btn"
            disabled={!form.name || !form.counter}
            onClick={handlePay}
          >
            Pay ₹20 & Join
          </button>

          <button
            className="text-btn"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
        </div>
      )}

      {step === "success" && token && (
        <div className="join-card">
          <h2>Token Confirmed 🎉</h2>

          <div className="token-box">
            <p><strong>Token No:</strong> {token.tokenNo}</p>
            <p><strong>Place:</strong> {token.placeName}</p>
            <p><strong>Counter:</strong> {token.counter}</p>
            <p><strong>People Ahead:</strong> {token.peopleAhead}</p>
            <p><strong>Estimated Wait:</strong> {token.estimatedWait} min</p>
            <p><strong>Issued At:</strong> {token.time}</p>
          </div>

          <button
            className="pay-btn"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}




