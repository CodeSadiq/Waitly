import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./JoinQueue.css";

export default function JoinQueue() {
  const { placeId } = useParams();
  const navigate = useNavigate();

  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState("form");
  const [token, setToken] = useState(null);

  const [form, setForm] = useState({
    name: "",
    dob: "",
    counterIndex: "",   // ✅ single source of truth
    slotDateTime: ""
  });

  /* =========================
     FETCH PLACE BY ID
     ========================= */
  useEffect(() => {
    const loadPlace = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/location/place/${placeId}`
        );

        if (!res.ok) throw new Error("Place not found");

        const data = await res.json();
        setPlace(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPlace();
  }, [placeId]);

  if (loading) {
    return <p style={{ padding: 20 }}>Loading place…</p>;
  }

  if (!place) {
    return <p style={{ padding: 20 }}>Invalid place</p>;
  }

  /* =========================
     COUNTER LOGIC
     ========================= */
  const counters = place.counters || [];

  const selectedCounter =
    form.counterIndex !== ""
      ? counters[Number(form.counterIndex)]
      : null;

  const peopleAhead =
    selectedCounter?.queueWait?.peopleAhead ?? 0;

  const estimatedWait =
    selectedCounter?.queueWait?.avgTime ?? 0;

  /* =========================
     TOKEN GENERATION
     ========================= */
  const generateToken = () => ({
    tokenNo: Math.floor(100 + Math.random() * 900),
    placeName: place.name,
    counter: selectedCounter?.name,
    peopleAhead,
    estimatedWait,
    time: new Date().toLocaleTimeString()
  });

  const handlePay = () => {
    setToken(generateToken());
    setStep("success");
  };

  /* =========================
     UI
     ========================= */
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
            onBlur={(e) =>
              !e.target.value && (e.target.type = "text")
            }
            value={form.dob}
            onChange={(e) =>
              setForm({ ...form, dob: e.target.value })
            }
          />

          {/* ✅ COUNTER SELECT */}
          <select
            value={form.counterIndex}
            onChange={(e) =>
              setForm({
                ...form,
                counterIndex: e.target.value
              })
            }
          >
            <option value="">Select Counter</option>
            {counters.map((counter, index) => (
              <option key={counter.name} value={index}>
                {counter.name}
              </option>
            ))}
          </select>

          {/* ✅ LIVE COUNTER INFO */}
          {selectedCounter && (
            <div className="counter-info">
              <p>
                <strong>People ahead:</strong> {peopleAhead}
              </p>
              <p>
                <strong>Estimated wait:</strong>{" "}
                {estimatedWait} min
              </p>
            </div>
          )}

          <div className="input-wrapper">
            {!form.slotDateTime && (
              <span className="input-placeholder">
                Preferred Time Slot (Optional)
              </span>
            )}
            <input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={form.slotDateTime}
              onChange={(e) =>
                setForm({
                  ...form,
                  slotDateTime: e.target.value
                })
              }
            />
          </div>

          <button
            className="pay-btn"
            disabled={!form.name || form.counterIndex === ""}
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

      {/* ================= SUCCESS ================= */}
      {step === "success" && token && (
        <div className="join-card">
          <h2>Token Confirmed 🎉</h2>

          <div className="token-box">
            <p><strong>Token No:</strong> {token.tokenNo}</p>
            <p><strong>Place:</strong> {token.placeName}</p>
            <p><strong>Counter:</strong> {token.counter}</p>
            <p><strong>People Ahead:</strong> {token.peopleAhead}</p>
            <p>
              <strong>Estimated Wait:</strong>{" "}
              {token.estimatedWait} min
            </p>
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
