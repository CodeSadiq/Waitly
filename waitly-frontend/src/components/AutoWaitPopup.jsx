import { useState, useRef } from "react";
import { dismissPopup, saveWaitFeedback, isCounterThrottled } from "../utils/waitStorage.js";
import { formatWaitTime } from "../utils/timeFormat.js";
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

    const throttle = isCounterThrottled(place._id, selectedCounter);
    if (throttle.throttled) {
      alert(`Slow down! You already updated "${selectedCounter}" recently.`);
      return;
    }

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

    // 💾 Save feedback so auto-popup doesn't trigger again
    saveWaitFeedback({
      placeId: place._id,
      counter: selectedCounter,
      waitTime: wait
    });

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
              max="300"
              step="5"
              value={wait}
              onChange={(e) => setWait(Number(e.target.value))}
            />

            <div className="wait-value">{formatWaitTime(wait)}</div>

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

            {counter && (
              <div className="throttle-check">
                {(() => {
                  const selectedName = counter === "other" ? (otherCounter.trim() || "Other") : counter;
                  const { throttled, timeLeftMs } = isCounterThrottled(place._id, selectedName);
                  if (throttled) {
                    const mins = Math.ceil(timeLeftMs / 60000);
                    return (
                      <div className="throttle-msg">
                        <svg className="throttle-icon" viewBox="0 0 24 24" fill="none">
                          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Already updated recently. Please wait <strong>{mins} min</strong>.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="solid-btn"
                disabled={!counter || (counter === "other" && !otherCounter.trim()) || isCounterThrottled(place._id, counter === "other" ? (otherCounter.trim() || "Other") : counter).throttled}
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
