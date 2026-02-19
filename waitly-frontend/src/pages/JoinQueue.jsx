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

  /* =========================
     STATE MANAGEMENT
     ========================= */
  const [step, setStep] = useState(1); // 1: Identity, 2: Category, 3: Type, 4: Details/Pay, 5: Success
  const [bookingType, setBookingType] = useState(null); // 'walkin' | 'slot'

  const [form, setForm] = useState({
    name: "",
    counterIndex: "",
    slotDateTime: "",
    categoryId: "general"
  });

  const [queueStats, setQueueStats] = useState(null);
  const [generatedToken, setGeneratedToken] = useState(null);

  // Date & Slot Logic
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotInfo, setSlotInfo] = useState(null); // { openingTime, backlogMinutes }

  useEffect(() => {
    if (form.counterIndex === "" || form.counterIndex === undefined) {
      setQueueStats(null);
      setAvailableSlots([]);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/queue/stats?placeId=${placeId}&counterIndex=${form.counterIndex}&categoryId=${form.categoryId}`);
        if (res.ok) {
          const data = await res.json();
          setQueueStats(data);
        }
      } catch (e) {
        console.error("Failed to fetch queue stats", e);
      }
    };

    const fetchSlots = async () => {
      if (!selectedDate) {
        setAvailableSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const res = await fetch(`${API_BASE}/api/queue/available-slots?placeId=${placeId}&counterIndex=${form.counterIndex}&date=${selectedDate}&categoryId=${form.categoryId}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.slots || []);
          setSlotInfo({
            openingTime: data.openingTime,
            closingTime: data.closingTime,
            backlogMinutes: data.backlogMinutes,
            message: data.message // Store the message
          });
        } else {
          setAvailableSlots([]);
        }
      } catch (e) {
        console.error("Slot fetch error", e);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchStats();
    fetchSlots();
  }, [form.counterIndex, placeId, selectedDate, form.categoryId]);

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

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const selectType = (type) => {
    setBookingType(type);
    if (type === 'walkin') {
      setForm(f => ({ ...f, slotDateTime: "" }));
    } else {
      // For slots, reset to default state so it shows "choose date..." message
      setSelectedDate("");
      setForm(f => ({ ...f, slotDateTime: "" }));
    }
    nextStep();
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
        userName: form.name,
        categoryId: form.categoryId
      };

      if (bookingType === 'slot' && form.slotDateTime) {
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

      setStep(5);
    } catch (err) {
      console.error(err);
      alert(err.message || "Unable to create ticket");
    }
  };

  /* =========================
     RENDER STEPS
     ========================= */
  return (
    <div className="join-page">

      {/* STEP 1: IDENTITY */}
      {step === 1 && (
        <div className="join-card fade-in">
          <h2>Join Queue</h2>
          <p className="modal-sub">{place.name}</p>

          <div className="input-group">
            <input
              placeholder="Enter Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>

          <div className="input-group">
            <select
              value={form.counterIndex}
              onChange={(e) => setForm({ ...form, counterIndex: e.target.value })}
            >
              <option value="" disabled hidden>Select Counter</option>
              {counters.map((counter, index) => (
                <option key={counter.name} value={index}>
                  {counter.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="pay-btn"
            disabled={!form.name || form.counterIndex === ""}
            onClick={nextStep}
          >
            Next
          </button>

          <button className="text-btn" onClick={() => navigate("/")}>Cancel</button>
        </div>
      )}

      {/* STEP 2: CATEGORY SELECTION */}
      {step === 2 && (
        <div className="join-card fade-in">
          <button className="back-link-btn" onClick={prevStep}>← Back</button>
          <h2>Type of Work</h2>
          <p className="modal-sub">Tell us what you need help with</p>

          <div className="category-selection-grid">
            {(counters[form.counterIndex]?.services?.length > 0
              ? counters[form.counterIndex].services
              : [{ name: "General Service", categoryId: "general" }]
            ).map((cat) => (
              <button
                key={cat.categoryId}
                className={`category-chip ${form.categoryId === cat.categoryId ? 'selected' : ''}`}
                onClick={() => { setForm({ ...form, categoryId: cat.categoryId }); nextStep(); }}
              >
                <div className="chip-content">
                  <span className="cat-name">{cat.name}</span>
                </div>
                <div className="cat-arrow">→</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: BOOKING TYPE */}
      {step === 3 && (
        <div className="join-card fade-in">
          <button className="back-link-btn" onClick={prevStep}>← Back</button>
          <h2>Choose Option</h2>
          <p className="modal-sub">How would you like to join?</p>

          <div className="booking-options">
            <button className="option-card" onClick={() => selectType('walkin')}>
              <div className="icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                </svg>
              </div>
              <div className="info">
                <h3>Join Ongoing Queue</h3>
                <p>Wait in the current line directly. Best if you are nearby.</p>
              </div>
              <div className="arrow">→</div>
            </button>

            <button className="option-card" onClick={() => selectType('slot')}>
              <div className="icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="info">
                <h3>Book a Future Slot</h3>
                <p>Schedule a specific available time slot.</p>
              </div>
              <div className="arrow">→</div>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DETAILS & PAYMENT */}
      {step === 4 && (
        <div className="join-card fade-in">
          <button className="back-link-btn" onClick={prevStep}>← Back</button>

          {bookingType === 'walkin' ? (
            <>
              <h2>Queue Overview</h2>
              {queueStats && (
                <div className="stats-summary-box">
                  <div className="stat-item">
                    <span className="lbl">People Ahead</span>
                    <span className="val">{queueStats.peopleAhead}</span>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat-item">
                    <span className="lbl">Est. Wait</span>
                    <span className="val">{queueStats.estimatedWait}m</span>
                  </div>
                </div>
              )}
              <p style={{ textAlign: 'center', margin: '20px 0', color: '#64748b' }}>
                You are joining counter <strong>{counters[form.counterIndex]?.name}</strong>.
              </p>
            </>
          ) : (
            <>
              <h2>Select Time Slot</h2>
              <p style={{ textAlign: 'center', margin: '10px 0 20px', color: '#64748b' }}>
                You are booking for counter <strong>{counters[form.counterIndex]?.name}</strong>.
              </p>
              <div className="slot-selection-area">
                <label className="form-label-small">Select Date</label>
                <input
                  type="date"
                  min={(() => {
                    const d = new Date();
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); setForm({ ...form, slotDateTime: "" }); }}
                  className="date-input-styled"
                />

                {loadingSlots ? (
                  <div className="loading-slots">Finding available slots...</div>
                ) : (
                  <div className="slots-reveal-wrapper">
                    <label className="form-label-small">Available Slots</label>
                    {availableSlots.length > 0 ? (
                      <div className="slots-grid">
                        {availableSlots.map(slot => {
                          const timeLabel = new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const isSelected = form.slotDateTime === slot;
                          return (
                            <button
                              key={slot}
                              className={`slot-btn ${isSelected ? 'selected' : ''}`}
                              onClick={() => setForm({ ...form, slotDateTime: slot })}
                            >
                              {timeLabel}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="no-slots-msg">
                        {!selectedDate
                          ? "Choose a date to see available slots"
                          : (slotInfo?.message || "No slots available for this date.")}
                      </div>
                    )}
                  </div>
                )}

                {form.slotDateTime && (
                  <div className="selected-slot-msg">
                    Selected: <strong>{new Date(form.slotDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                    <br />
                    <span style={{ fontSize: '12px', color: '#ea580c' }}>Slotted Ticket</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="payment-footer">
            <div className="price-tag">
              <span>Total to Pay</span>
              <strong>₹20</strong>
            </div>
            <button
              className="pay-btn"
              onClick={confirmPayment}
              disabled={bookingType === 'slot' && !form.slotDateTime}
            >
              Pay & Join Queue
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS */}
      {step === 5 && (
        <div className="join-card fade-in">
          <div className="success-animation">
            <svg viewBox="0 0 24 24" fill="none" class="checkmark">
              <circle cx="12" cy="12" r="12" fill="#dcfce7" />
              <path d="M7 13l3 3 7-7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>Access Granted</h2>

          <div className="token-reveal">
            <span className="lbl">YOUR TOKEN</span>
            <span className="val">{generatedToken}</span>
          </div>

          <p className="success-msg">
            {bookingType === 'slot'
              ? "You've been added to the ongoing queue with a slotted time."
              : "You've been added to the queue."}
          </p>

          <button className="pay-btn" onClick={() => navigate("/user/dashboard")}>
            View Ticket
          </button>

          <button className="text-btn" onClick={() => navigate("/")}>Return Home</button>
        </div>
      )}
    </div>
  );
}
