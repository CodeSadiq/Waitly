import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./JoinQueue.css";
import API_BASE from "../config/api";

export default function JoinQueue() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  // form → payment → success
  const [step, setStep] = useState("form");

  const [form, setForm] = useState({
    name: "",
    counterIndex: "",
    slotDateTime: ""
  });

  const [queueStats, setQueueStats] = useState(null);
  const [generatedToken, setGeneratedToken] = useState(null);

  useEffect(() => {
    if (form.counterIndex === "" || form.counterIndex === undefined) {
      setQueueStats(null);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/queue/stats?placeId=${placeId}&counterIndex=${form.counterIndex}`);
        if (res.ok) {
          const data = await res.json();
          setQueueStats(data);
        }
      } catch (e) {
        console.error("Failed to fetch queue stats", e);
      }
    };
    fetchStats();
  }, [form.counterIndex, placeId]);

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
      const token = localStorage.getItem('waitly_token');
      const headers = { "Content-Type": "application/json" };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        placeId,
        counterIndex: form.counterIndex,
        userName: form.name
      };

      if (form.slotDateTime) {
        const dateObj = new Date(form.slotDateTime);
        payload.scheduledTime = dateObj.toISOString();

        // Format label: "10:30 AM" or "Feb 23, 10:30 AM"
        // Let's keep it simple: "Happy Hours: 10:30 AM"
        // actually just time is better
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

        payload.timeSlotLabel = `${dateStr}, ${timeStr}`;
      }

      const res = await fetch(`${API_BASE}/api/queue/join`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Unable to create ticket");
      }

      const data = await res.json();

      localStorage.setItem("waitly_token_id", data.tokenId);
      setGeneratedToken(data.tokenCode);

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

          {queueStats && form.counterIndex !== "" && (
            <div style={{
              marginTop: '15px',
              marginBottom: '15px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>People Ahead</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{queueStats.peopleAhead}</span>
              </div>
              <div style={{ width: '1px', height: '30px', background: '#cbd5e1' }}></div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Est. Wait</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{queueStats.estimatedWait}<span style={{ fontSize: '14px', fontWeight: '600' }}>m</span></span>
              </div>
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
          <h2>Token Generated</h2>

          {generatedToken && (
            <div style={{
              background: '#f0fdf4',
              padding: '16px',
              borderRadius: '12px',
              margin: '20px 0',
              border: '2px dashed #4ade80',
              textAlign: 'center'
            }}>
              <div style={{ marginBottom: '8px', color: '#16a34a' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <span style={{ display: 'block', fontSize: '12px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Your Token Number</span>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#15803d', letterSpacing: '1px' }}>{generatedToken}</span>
            </div>
          )}

          <p>
            Your virtual queue ticket has been created successfully.
          </p>

          <p style={{ fontSize: 14, color: "#6b7280" }}>
            You can now track live updates in <strong>My Ticket</strong>.
          </p>

          <button
            className="pay-btn"
            onClick={() => navigate("/user/dashboard")}
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
