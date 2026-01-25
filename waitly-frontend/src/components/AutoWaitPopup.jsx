import { useState, useRef } from "react";
import { dismissPopup } from "../utils/waitStorage.js";
import "./AutoWaitPopup.css";
import API_BASE from "../config/api";

export default function AutoWaitPopup({ place, onClose, onWaitUpdated }) {
  const [step, setStep] = useState(1);
  const [wait, setWait] = useState(20);
  const [counter, setCounter] = useState("");
  const [otherCounter, setOtherCounter] = useState("");

  /* =====================================================
     🔒 FIX: PERSIST ORIGINAL COUNTERS (DO NOT LOSE THEM)
     ===================================================== */
  const initialCountersRef = useRef(
    Array.isArray(place?.counters) && place.counters.length > 0
      ? place.counters.map((c) => c.name)
      : ["General"]
  );

  /* ================= GET COUNTERS (SAFE) ================= */
  const counters =
    Array.isArray(place?.counters) && place.counters.length > 0
      ? place.counters.map((c) => c.name)
      : initialCountersRef.current;

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => s - 1);

  const handleNo = () => {
    dismissPopup(place._id || place.id);
    onClose();
  };

  /* ================= SUBMIT WAIT ================= */
  const submitWait = async () => {
    const selectedCounter =
      counter === "other"
        ? otherCounter.trim() || "Other"
        : counter;

    try {
      await fetch(`${API_BASE}/api/location/update-wait`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: place._id,
          counter: selectedCounter,
          waitTime: wait
        })
      });

      // 🔥 re-fetch updated place (Home.jsx)
      if (typeof onWaitUpdated === "function") {
        await onWaitUpdated();
      }
    } catch (err) {
      console.error("Failed to update wait time", err);
    }

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <h3>{place.name}</h3>
            <p>Have you completed your work here today?</p>

            <div className="modal-actions">
              <button className="outline-btn" onClick={goNext}>
                Yes
              </button>
              <button className="solid-btn" onClick={handleNo}>
                No
              </button>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <h3>{place.name}</h3>
            <p>How long did you wait?</p>

            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={wait}
              onChange={(e) => setWait(Number(e.target.value))}
            />

            <div className="wait-value">{wait} min</div>

            <div className="modal-actions">
              <button className="solid-btn" onClick={goNext}>
                Next
              </button>
              <button className="outline-btn" onClick={goBack}>
                Back
              </button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <h3>{place.name}</h3>
            <p>Which counter did you use?</p>

            <div className="counter-grid">
              {counters.map((c) => (
                <button
                  key={c}
                  className={`counter-btn ${counter === c ? "active" : ""}`}
                  onClick={() => setCounter(c)}
                >
                  {c}
                </button>
              ))}

              <button
                className={`counter-btn ${counter === "other" ? "active" : ""}`}
                onClick={() => setCounter("other")}
              >
                Other
              </button>
            </div>

            {counter === "other" && (
              <input
                className="other-input"
                placeholder="Enter other counter (optional)"
                value={otherCounter}
                onChange={(e) => setOtherCounter(e.target.value)}
              />
            )}

            <div className="modal-actions">
              <button
                className="solid-btn"
                disabled={!counter}
                onClick={submitWait}
              >
                Submit
              </button>

              <button className="outline-btn" onClick={goBack}>
                Back
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
