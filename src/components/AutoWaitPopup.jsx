import { useState } from "react";
import {
  saveWaitFeedback,
  dismissPopup,
} from "../utils/waitStorage.js";
import "./AutoWaitPopup.css";

export default function AutoWaitPopup({ place, onClose }) {
  const [step, setStep] = useState(1); // 1 → ask, 2 → wait, 3 → counter
  const [wait, setWait] = useState(20);
  const [counter, setCounter] = useState("");
  const [otherCounter, setOtherCounter] = useState("");

  const counters = place?.waits
    ? Object.keys(place.waits)
    : ["general"];

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => s - 1);

  const handleNo = () => {
    dismissPopup(place.id);
    onClose();
  };

  const submitWait = () => {
    saveWaitFeedback({
      placeId: place.id,
      counter:
        counter === "other"
          ? otherCounter || "other"
          : counter,
      waitTime: wait,
      source: "auto",
      createdAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">

        {/* STEP 1 — ASK */}
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

        {/* STEP 2 — WAIT TIME */}
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
              onChange={(e) => setWait(+e.target.value)}
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

        {/* STEP 3 — COUNTER */}
        {step === 3 && (
          <>
            <h3>{place.name}</h3>
            <p>Which counter did you use?</p>

            <div className="counter-grid">
              {counters.map((c) => (
                <button
                  key={c}
                  className={`counter-btn ${
                    counter === c ? "active" : ""
                  }`}
                  onClick={() => setCounter(c)}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}

              <button
                className={`counter-btn ${
                  counter === "other" ? "active" : ""
                }`}
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
                onChange={(e) =>
                  setOtherCounter(e.target.value)
                }
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
