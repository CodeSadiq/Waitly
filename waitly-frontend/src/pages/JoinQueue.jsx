import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./JoinQueue.css";
import API_BASE from "../config/api";

export default function JoinQueue() {
  const { placeId } = useParams();
  const navigate = useNavigate();

  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  // form → payment → success
  const [step, setStep] = useState("form");

  const [form, setForm] = useState({
    name: "",
    dob: "",
    counterIndex: "",
    slotDateTime: ""
  });

  /* =========================
     FETCH PLACE BY ID
     ========================= */
  useEffect(() => {
    const loadPlace = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/location/place/${placeId}`
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

  const counters = place.counters || [];

  const proceedToPayment = () => {
    setStep("payment");
  };

  /* =========================
     STEP 2 → CREATE TOKEN
     ========================= */
  const confirmPayment = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/queue/join`, {
        method: "POST",
        credentials: "include",       // 🔥 ONLY CHANGE
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId,
          counterIndex: form.counterIndex,
          userName: form.name,
          userDob: form.dob
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Unable to create ticket");
      }

      const data = await res.json();

      localStorage.setItem("waitly_token_id", data.tokenId);

      setStep("success");
    } catch (err) {
      console.error(err);
      alert(err.message || "Unable to create ticket");
    }
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
            onClick={proceedToPayment}
          >
            Pay ₹20 & Continue
          </button>

          <button
            className="text-btn"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
        </div>
      )}

      {step === "payment" && (
        <div className="join-card">
          <h2>Confirm Payment</h2>

          <p>
            You are paying <strong>₹20</strong> to join the virtual
            queue at <strong>{place.name}</strong>.
          </p>

          <p style={{ fontSize: 13, color: "#6b7280" }}>
            (Payment gateway will be added later)
          </p>

          <button
            className="pay-btn"
            onClick={confirmPayment}
          >
            Confirm & Pay ₹20
          </button>

          <button
            className="text-btn"
            onClick={() => setStep("form")}
          >
            Back
          </button>
        </div>
      )}

      {step === "success" && (
        <div className="join-card">
          <h2>🎉 Token Generated</h2>

          <p>
            Your virtual queue ticket has been created successfully.
          </p>

          <p style={{ fontSize: 14, color: "#6b7280" }}>
            You can now track live updates in <strong>My Ticket</strong>.
          </p>

          <button
            className="pay-btn"
            onClick={() => navigate("/my-ticket")}
          >
            View My Ticket
          </button>

          <button
            className="text-btn"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}
