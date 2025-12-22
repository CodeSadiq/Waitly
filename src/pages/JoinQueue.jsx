import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import PLACES from "../utils/PlacesData";

export default function JoinQueue() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const place = PLACES.find(p => p.id === placeId);

  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    name: "",
    dob: "",
    counter: "",
  });

  if (!place) return <p>Invalid place</p>;

  const token = {
    number: Math.floor(100 + Math.random() * 900),
    time: new Date().toLocaleTimeString(),
  };

  return (
    <div className="join-page">
      {step === "form" && (
        <>
          <h2>Join Queue – {place.name}</h2>

          <input
            placeholder="Name"
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

          <select
            onChange={e => setForm({ ...form, counter: e.target.value })}
          >
            <option>Select Counter</option>
            {Object.keys(place.waits).map(w => (
              <option key={w}>{w}</option>
            ))}
          </select>

          <button onClick={() => setStep("success")}>
            Pay ₹20 & Join
          </button>

          <button onClick={() => navigate("/")}>Cancel</button>
        </>
      )}

      {step === "success" && (
        <>
          <h2>Token Confirmed 🎉</h2>
          <p>Token No: {token.number}</p>
          <p>Time: {token.time}</p>

          <button onClick={() => navigate("/")}>
            Back to Home
          </button>
        </>
      )}
    </div>
  );
}
